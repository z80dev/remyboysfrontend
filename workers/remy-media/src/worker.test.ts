import { beforeEach, expect, test } from "bun:test";
import { createHash, timingSafeEqual } from "node:crypto";
import worker, { type Env } from "./worker";

// Workers-only globals: crypto.subtle.timingSafeEqual and the edge cache.
const subtle: SubtleCrypto & { timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean } = crypto.subtle;
subtle.timingSafeEqual = (a, b) => timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
const edge = new Map<string, Response>();
const scope: typeof globalThis & { caches?: unknown } = globalThis;
scope.caches = {
  default: {
    match: async (r: Request) => edge.get(r.url)?.clone(),
    put: async (r: Request, res: Response) => void edge.set(r.url, res),
  },
};

type Stored = { body: Uint8Array; type?: string; etag: string };

/** In-memory stand-in for the R2 calls the Worker makes. */
class FakeBucket {
  objects = new Map<string, Stored>();
  async put(key: string, body: ReadableStream | string, opts: { httpMetadata?: { contentType?: string } } = {}) {
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    const etag = createHash("md5").update(bytes).digest("hex");
    this.objects.set(key, { body: bytes, type: opts.httpMetadata?.contentType, etag });
    return { etag };
  }
  async get(key: string) {
    const o = this.objects.get(key);
    if (!o) return null;
    return { body: new Response(o.body).body, size: o.body.length, httpEtag: `"${o.etag}"`, httpMetadata: { contentType: o.type } };
  }
  async list({ prefix, cursor, limit }: { prefix: string; cursor?: string; limit: number }) {
    const keys = [...this.objects.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) : 0;
    const truncated = start + limit < keys.length;
    return {
      objects: keys.slice(start, start + limit).map((key) => ({ key, etag: this.objects.get(key)?.etag })),
      truncated,
      cursor: truncated ? String(start + limit) : undefined,
    };
  }
}

type ListPage = { objects: { key: string; etag: string }[]; cursor?: string };

let r2: FakeBucket;
let env: Env;
const ctx = { waitUntil: (p: Promise<unknown>) => void p, passThroughOnException() {} } as unknown as ExecutionContext;
const call = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://basedremyboys.club${path}`, init), env, ctx);
const auth = { authorization: "Bearer secret" };
const upload = (key: string, body: string, headers: Record<string, string> = auth) =>
  call(`/media/${key}`, { method: "PUT", body, headers: { ...headers, "content-length": String(body.length) } });
const KEY = "remy/v1/128/7.webp";
const ART = "quest/0123456789abcdef/art.json";

beforeEach(() => {
  edge.clear();
  r2 = new FakeBucket();
  // The fake implements only the members the Worker calls.
  const media = r2 as unknown as R2Bucket;
  env = { MEDIA: media, MEDIA_UPLOAD_TOKEN: "secret" };
});

test("uploads need the token and a valid key", async () => {
  expect((await upload(KEY, "abc", {})).status).toBe(401);
  expect((await upload(KEY, "abc", { authorization: "Bearer nope" })).status).toBe(401);
  env.MEDIA_UPLOAD_TOKEN = undefined;
  expect((await upload(KEY, "abc", { authorization: "Bearer " })).status).toBe(401);
  env.MEDIA_UPLOAD_TOKEN = "secret";
  for (const bad of ["remy/v1/128/../x.webp", "halloween/v1/128/7.json", "halloweens/v1/128/7.webp", "quest/abc/art.json", "secrets.txt", "quest/0123456789abcdef/.env"])
    expect((await upload(bad, "abc")).status).toBe(404);
  expect(r2.objects.size).toBe(0);
  expect((await upload(KEY, "abc")).status).toBe(200);
  expect(r2.objects.get(KEY)?.type).toBe("image/webp");
  expect((await upload("halloween/v1/320/666.webp", "abc")).status).toBe(200);
});

test("serves objects immutable, from the edge cache after the first hit, with 304 revalidation", async () => {
  await upload(ART, "{}");
  const first = await call(`/media/${ART}`);
  expect(first.status).toBe(200);
  expect(first.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  expect(first.headers.get("content-type")).toBe("application/json");
  expect(await first.text()).toBe("{}");
  const etag = first.headers.get("etag") ?? "";

  r2.objects.clear(); // a repeat request must not need R2
  expect(await (await call(`/media/${ART}`)).text()).toBe("{}");
  expect((await call(`/media/${ART}`, { headers: { "if-none-match": etag } })).status).toBe(304);
  expect((await call(`/media/${KEY}`)).status).toBe(404);
});

test("list is authenticated, prefix-scoped and paginated", async () => {
  expect((await call("/media/_admin/list?prefix=remy/")).status).toBe(401);
  expect((await call("/media/_admin/list?prefix=", { headers: auth })).status).toBe(400);
  for (let i = 0; i < 1001; i++) await r2.put(`remy/v1/128/${i}.webp`, String(i));
  await r2.put(ART, "{}");
  const one: ListPage = await (await call("/media/_admin/list?prefix=remy/v1/", { headers: auth })).json();
  expect(one.objects.length).toBe(1000);
  expect(one.cursor).toBeDefined();
  const two: ListPage = await (await call(`/media/_admin/list?prefix=remy/v1/&cursor=${one.cursor}`, { headers: auth })).json();
  expect(two.objects.map((o) => o.key)).toEqual(["remy/v1/128/999.webp"]);
  expect(two.cursor).toBeUndefined();
});
