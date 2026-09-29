import { afterEach, describe, expect, spyOn, test } from "bun:test";
import worker, { Admission, generateImage, validateInput, type Env } from "./worker";

const png = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("remix request validation", () => {
  test("accepts the full artwork range and trims a bounded prompt", () => {
    expect(validateInput({ artIndex: 4489, prompt: "  red jacket  ", model: "openai/gpt-image-2.5-flare" })).toEqual({
      artIndex: 4489,
      prompt: "red jacket",
      model: "openai/gpt-image-2.5-flare",
    });
  });

  test("rejects artwork outside the catalog and models outside the fixed allowlist", () => {
    expect(validateInput({ artIndex: 4490, prompt: "ok", model: "openai/gpt-image-2.5-flare" })).toBeNull();
    expect(validateInput({ artIndex: 0, prompt: "ok", model: "provider/arbitrary" })).toBeNull();
    expect(validateInput({ artIndex: 0, prompt: "x".repeat(2001), model: "openai/gpt-image-2.5-flare" })).toBeNull();
  });
});

test("rejects provider HTML rather than returning a downloadable image", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return Response.json({ data: [{ b64_json: btoa("<html>upstream error</html>"), media_type: "image/png" }] });
  }) as typeof fetch;
  await expect(generateImage("test-key", "openai/gpt-image-2.5-flare", "astronaut", png)).rejects.toThrow(
    "provider-image-invalid",
  );
  expect(calls).toBe(1);
});

test("rejects invalid artwork, models, and cross-site requests before any paid work", async () => {
  globalThis.fetch = (() => {
    throw new Error("Unexpected external request");
  }) as typeof fetch;
  const env = { OPENROUTER_API_KEY: "test-key" } as Env;
  for (const body of [
    { artIndex: -1, prompt: "astronaut", model: "openai/gpt-image-2.5-flare" },
    { artIndex: 0, prompt: "astronaut", model: "arbitrary/model" },
    { artIndex: 0, prompt: "astronaut", model: "qwen/qwen-image-3" },
  ]) {
    const response = await worker.fetch(
      new Request("https://basedremyboys.club/api/remix", {
        method: "POST",
        headers: { origin: "https://basedremyboys.club" },
        body: JSON.stringify(body),
      }),
      env,
    );
    expect(response.status).toBe(400);
  }
  const response = await worker.fetch(
    new Request("https://basedremyboys.club/api/remix", {
      method: "POST",
      headers: { origin: "https://unrelated.example" },
      body: "{}",
    }),
    env,
  );
  expect(response.status).toBe(403);
});

test("rejects invalid uploaded references before fetching artwork or spending an allowance", async () => {
  globalThis.fetch = (() => {
    throw new Error("Unexpected external request");
  }) as typeof fetch;
  const image = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  const invalidReferences: unknown[] = [
    "https://example.com/reference.png",
    "",
    null,
    [image],
    { url: image },
    "data:image/svg+xml;base64," + btoa("<svg/>"),
    "data:image/png;base64," + btoa("<html>not an image</html>"),
    image.replace("image/png", "image/jpeg"),
    "data:image/png;base64,not-valid-base64!",
  ];
  for (const referenceImage of invalidReferences) {
    const response = await worker.fetch(
      new Request("https://basedremyboys.club/api/remix", {
        method: "POST",
        headers: { origin: "https://basedremyboys.club" },
        body: JSON.stringify({
          artIndex: 777,
          prompt: "Use image 2 as the outfit.",
          model: "openai/gpt-image-2.5-flare",
          referenceImage,
        }),
      }),
      { OPENROUTER_API_KEY: "test-key" } as Env,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("invalid_input");
  }
});

test("rejects an upload one byte above the decoded limit even when its base64 fits the encoded bound", async () => {
  globalThis.fetch = (() => {
    throw new Error("Unexpected external request");
  }) as typeof fetch;
  const bytes = Buffer.alloc(4 * 1024 * 1024 + 1);
  bytes.set(png);
  const response = await worker.fetch(
    new Request("https://basedremyboys.club/api/remix", {
      method: "POST",
      headers: { origin: "https://basedremyboys.club" },
      body: JSON.stringify({
        artIndex: 777,
        prompt: "Use image 2.",
        model: "openai/gpt-image-2.5-flare",
        referenceImage: `data:image/png;base64,${bytes.toString("base64")}`,
      }),
    }),
    { OPENROUTER_API_KEY: "test-key" } as Env,
  );
  expect(response.status).toBe(400);
  expect((await response.json()).code).toBe("invalid_input");
});

// Serialize transactions like Durable Object storage; retain state across object restarts.
function admissionFixture() {
  let value: unknown;
  let queue = Promise.resolve();
  const state = {
    storage: {
      transaction<T>(callback: (tx: unknown) => Promise<T>) {
        const result = queue.then(() =>
          callback({
            get: async () => structuredClone(value),
            put: async (_key: string, next: unknown) => {
              value = structuredClone(next);
            },
          }),
        );
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  } as unknown as DurableObjectState;
  let admission = new Admission(state);
  return {
    restart: () => {
      admission = new Admission(state);
    },
    reserve: (ip: string) => admission.fetch(new Request(`https://admission/reserve?ip=${ip}`, { method: "POST" })),
    release: (id: string) => admission.fetch(new Request(`https://admission/release?id=${id}`, { method: "DELETE" })),
  };
}

test("daily IP allowance persists across object restarts and releases do not refund paid attempts", async () => {
  const fixture = admissionFixture();
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fixture.reserve("one-ip");
    expect(response.status).toBe(200);
    await fixture.release((await response.json()).id);
    fixture.restart();
  }
  const blocked = await fixture.reserve("one-ip");
  expect(blocked.status).toBe(429);
  expect((await blocked.json()).code).toBe("daily_limit");
  expect((await fixture.reserve("another-ip")).status).toBe(200);
});

test("concurrent reservations are capped at three and abandoned leases expire", async () => {
  const clock = spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-29T12:00:00Z"));
  try {
    const fixture = admissionFixture();
    const responses = await Promise.all(["a", "b", "c", "d"].map((ip) => fixture.reserve(ip)));
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 429]);
    expect((await responses[3].json()).code).toBe("busy");
    clock.mockReturnValue(Date.parse("2026-09-29T12:02:31Z"));
    expect((await fixture.reserve("d")).status).toBe(200);
  } finally {
    clock.mockRestore();
  }
});

test("global allowance resets at midnight without discarding live leases", async () => {
  const clock = spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-29T23:59:30Z"));
  try {
    const fixture = admissionFixture();
    for (let attempt = 0; attempt < 100; attempt++) {
      const response = await fixture.reserve(`ip-${attempt}`);
      expect(response.status).toBe(200);
      await fixture.release((await response.json()).id);
    }
    const blocked = await fixture.reserve("fresh-ip");
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).code).toBe("global_daily_limit");
    clock.mockReturnValue(Date.parse("2026-09-30T00:00:10Z"));
    expect((await fixture.reserve("fresh-ip")).status).toBe(200);

    const live = admissionFixture();
    clock.mockReturnValue(Date.parse("2026-09-30T23:59:30Z"));
    for (const ip of ["a", "b", "c"]) expect((await live.reserve(ip)).status).toBe(200);
    clock.mockReturnValue(Date.parse("2026-10-01T00:00:10Z"));
    const busy = await live.reserve("d");
    expect(busy.status).toBe(429);
    expect((await busy.json()).code).toBe("busy");
  } finally {
    clock.mockRestore();
  }
});
