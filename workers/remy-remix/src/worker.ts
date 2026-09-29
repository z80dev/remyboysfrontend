const MODELS = {
  "openai/gpt-image-2.5-flare": { label: "GPT Image 2.5 Flare", priceLabel: "Provider token pricing" },
} as const;
const DEFAULT_MODEL = "openai/gpt-image-2.5-flare";
const MAX_PROMPT_LENGTH = 2000;
const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
const MAX_REFERENCE_BASE64 = Math.ceil(MAX_REFERENCE_BYTES / 3) * 4;
const MAX_BODY_BYTES = MAX_REFERENCE_BASE64 + 12_000;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;
const SOURCE_ORIGIN = "https://basedremyboys.club";
const DAILY_IP_LIMIT = 5;
const DAILY_GLOBAL_LIMIT = 100;
const MAX_CONCURRENT = 3;
const LEASE_MS = REQUEST_TIMEOUT_MS + 30_000;

export interface Env {
  OPENROUTER_API_KEY?: string;
  REMIX_ADMISSION: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

interface AdmissionState {
  day: string;
  globalCount: number;
  ipCounts: Record<string, number>;
  leases: Record<string, number>;
}

export class Admission {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const id = new URL(request.url).searchParams.get("id");
    const ipHash = new URL(request.url).searchParams.get("ip");
    const result = await this.state.storage.transaction(async (transaction) => {
      const state = (await transaction.get<AdmissionState>("state")) ?? {
        day,
        globalCount: 0,
        ipCounts: {},
        leases: {},
      };
      if (state.day !== day) {
        state.day = day;
        state.globalCount = 0;
        state.ipCounts = {};
      }
      for (const [leaseId, expiry] of Object.entries(state.leases)) {
        if (expiry <= now) delete state.leases[leaseId];
      }

      if (request.method === "DELETE") {
        if (id) delete state.leases[id];
        await transaction.put("state", state);
        return { id: null, status: 200, code: "released" };
      }
      if (!ipHash) return { id: null, status: 400, code: "invalid" };
      if ((state.ipCounts[ipHash] ?? 0) >= DAILY_IP_LIMIT || state.globalCount >= DAILY_GLOBAL_LIMIT) {
        await transaction.put("state", state);
        return {
          id: null,
          status: 429,
          code: state.globalCount >= DAILY_GLOBAL_LIMIT ? "global_daily_limit" : "daily_limit",
        };
      }
      if (Object.keys(state.leases).length >= MAX_CONCURRENT) {
        await transaction.put("state", state);
        return { id: null, status: 429, code: "busy" };
      }
      const reservationId = crypto.randomUUID();
      state.leases[reservationId] = now + LEASE_MS;
      state.ipCounts[ipHash] = (state.ipCounts[ipHash] ?? 0) + 1;
      state.globalCount++;
      await transaction.put("state", state);
      return { id: reservationId, status: 200, code: "reserved" };
    });
    return Response.json({ id: result.id, code: result.code }, { status: result.status });
  }
}

function allowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  if (origin === "https://basedremyboys.club" || origin === "https://www.basedremyboys.club") return true;
  return env.ENVIRONMENT === "development" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

async function readBounded(response: Response | Request, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("empty-response");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("response-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function json(body: unknown, status = 200, origin?: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
  });
  if (origin) headers.set("access-control-allow-origin", origin);
  return new Response(JSON.stringify(body), { status, headers });
}

function failure(error: string, code: string, status: number, origin?: string) {
  return json({ error, code }, status, origin);
}

export function validateInput(value: unknown): {
  artIndex: number;
  prompt: string;
  model: keyof typeof MODELS;
  referenceImage?: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (!Number.isInteger(body.artIndex) || (body.artIndex as number) < 0 || (body.artIndex as number) > 4489)
    return null;
  if (typeof body.prompt !== "string") return null;
  const prompt = body.prompt.trim();
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return null;
  if (typeof body.model !== "string" || !Object.hasOwn(MODELS, body.model)) return null;
  let referenceImage: string | undefined;
  if (body.referenceImage !== undefined) {
    if (typeof body.referenceImage !== "string" || body.referenceImage.length > MAX_REFERENCE_BASE64 + 32) return null;
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.referenceImage);
    if (!match || match[2].length % 4 !== 0) return null;
    let bytes: string;
    try {
      bytes = atob(match[2]);
    } catch {
      return null;
    }
    if (bytes.length === 0 || bytes.length > MAX_REFERENCE_BYTES) return null;
    const signature = Uint8Array.from(bytes.slice(0, 12), (char) => char.charCodeAt(0));
    if (imageMime(signature) !== match[1]) return null;
    referenceImage = body.referenceImage;
  }
  return {
    artIndex: body.artIndex as number,
    prompt,
    model: body.model as keyof typeof MODELS,
    ...(referenceImage ? { referenceImage } : {}),
  };
}

function imageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export async function generateImage(
  apiKey: string,
  model: keyof typeof MODELS,
  prompt: string,
  source: Uint8Array,
  referenceImage?: string,
): Promise<{ dataUrl: string; cost: number | null }> {
  const mime = imageMime(source);
  if (!mime || source.byteLength > MAX_SOURCE_BYTES) throw new Error("source-image");
  // Reference order is part of the user-facing prompt contract; never accept a client-provided list.
  const inputReferences = [{ type: "image_url", image_url: { url: `data:${mime};base64,${base64(source)}` } }];
  if (referenceImage) inputReferences.push({ type: "image_url", image_url: { url: referenceImage } });
  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": SOURCE_ORIGIN,
      "x-title": "Remy Remix",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      input_references: inputReferences,
      size: "1024x1024",
      quality: "low",
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("provider-failed");
  const rawResult = await readBounded(response, Math.ceil((MAX_OUTPUT_BYTES * 4) / 3) + 64_000);
  const result = JSON.parse(new TextDecoder().decode(rawResult)) as {
    data?: Array<{ b64_json?: unknown; media_type?: unknown }>;
    usage?: { cost?: unknown };
  };
  const encoded = result.data?.[0]?.b64_json;
  if (
    typeof encoded !== "string" ||
    encoded.length > Math.ceil((MAX_OUTPUT_BYTES * 4) / 3) + 8 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  )
    throw new Error("provider-image-invalid");
  let raw: string;
  try {
    raw = atob(encoded);
  } catch {
    throw new Error("provider-image-invalid");
  }
  if (raw.length > MAX_OUTPUT_BYTES) throw new Error("provider-image-invalid");
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const outputMime = imageMime(bytes);
  if (!outputMime) throw new Error("provider-image-invalid");
  const cost =
    typeof result.usage?.cost === "number" && Number.isFinite(result.usage.cost) && result.usage.cost >= 0
      ? result.usage.cost
      : null;
  return { dataUrl: `data:${outputMime};base64,${encoded}`, cost };
}

async function hashedIp(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/remix" && !url.pathname.startsWith("/api/remix/"))
      return failure("Not found", "not_found", 404);
    const origin = request.headers.get("origin");
    if (!allowedOrigin(origin, env) && !(request.method === "GET" && !origin))
      return failure("Origin not allowed", "origin_not_allowed", 403);
    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "access-control-allow-origin": origin!,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
        vary: "Origin",
      });
      return new Response(null, { status: 204, headers });
    }
    if (request.method === "GET") {
      return json(
        {
          available: Boolean(env.OPENROUTER_API_KEY),
          defaultModel: DEFAULT_MODEL,
          models: Object.entries(MODELS).map(([id, info]) => ({ id, ...info })),
          limits: { perIpDaily: DAILY_IP_LIMIT, globalDaily: DAILY_GLOBAL_LIMIT },
        },
        200,
        origin!,
      );
    }
    if (request.method !== "POST") return failure("Method not allowed", "method_not_allowed", 405, origin!);
    if (!env.OPENROUTER_API_KEY) return failure("Remix is temporarily unavailable", "unavailable", 503, origin!);
    let raw: string;
    try {
      raw = new TextDecoder().decode(await readBounded(request, MAX_BODY_BYTES));
    } catch (error) {
      const oversized = error instanceof Error && error.message === "response-too-large";
      return failure(
        oversized ? "Request is too large" : "Invalid request body",
        oversized ? "request_too_large" : "invalid_json",
        oversized ? 413 : 400,
        origin!,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return failure("Invalid request body", "invalid_json", 400, origin!);
    }
    const input = validateInput(parsed);
    if (!input) return failure("Invalid remix request", "invalid_input", 400, origin!);

    const sourceUrl = `${SOURCE_ORIGIN}/images/Character${input.artIndex}.webp`;
    let sourceResponse: Response;
    try {
      sourceResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000), redirect: "manual" });
    } catch {
      return failure("Source artwork could not be loaded", "source_unavailable", 502, origin!);
    }
    if (!sourceResponse.ok) return failure("Source artwork could not be loaded", "source_unavailable", 502, origin!);
    if (Number(sourceResponse.headers.get("content-length")) > MAX_SOURCE_BYTES)
      return failure("Source artwork is invalid", "source_invalid", 502, origin!);
    let source: Uint8Array;
    try {
      source = await readBounded(sourceResponse, MAX_SOURCE_BYTES);
    } catch {
      return failure("Source artwork is invalid", "source_invalid", 502, origin!);
    }
    if (!imageMime(source)) return failure("Source artwork is invalid", "source_invalid", 502, origin!);

    const admission = env.REMIX_ADMISSION.get(env.REMIX_ADMISSION.idFromName("global"));
    let reservation: Response;
    try {
      reservation = await admission.fetch(`https://admission/reserve?ip=${await hashedIp(request)}`, {
        method: "POST",
      });
    } catch {
      return failure("Remix is temporarily unavailable", "admission_unavailable", 503, origin!);
    }
    if (!reservation.ok) {
      if (reservation.status !== 429)
        return failure("Remix is temporarily unavailable", "admission_unavailable", 503, origin!);
      const limit = (await reservation.json()) as { code: string };
      const message =
        limit.code === "busy"
          ? "All three studio slots are busy. Try again in a couple of minutes."
          : limit.code === "global_daily_limit"
            ? "Today’s sponsored studio allowance is used up. It resets at midnight UTC."
            : "Your network has used its five daily attempts. The allowance resets at midnight UTC.";
      return failure(message, limit.code, 429, origin!);
    }
    const { id } = (await reservation.json()) as { id: string };
    try {
      const generated = await generateImage(
        env.OPENROUTER_API_KEY,
        input.model,
        input.prompt,
        source,
        input.referenceImage,
      );
      return json(
        {
          imageDataUrl: generated.dataUrl,
          model: input.model,
          costUsd: generated.cost,
          artIndex: input.artIndex,
          prompt: input.prompt,
          createdAt: new Date().toISOString(),
          referenceImageUsed: Boolean(input.referenceImage),
        },
        200,
        origin!,
      );
    } catch (error) {
      const code =
        error instanceof Error && error.message === "source-image"
          ? "source_invalid"
          : error instanceof Error && error.name === "TimeoutError"
            ? "provider_timeout"
            : "provider_failed";
      const status = code === "provider_timeout" ? 504 : 502;
      return failure(
        code === "provider_timeout" ? "Image generation timed out" : "Image generation failed",
        code,
        status,
        origin!,
      );
    } finally {
      try {
        await admission.fetch(`https://admission/release?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {
        /* The admission lease expires automatically if release is unavailable. */
      }
    }
  },
} satisfies ExportedHandler<Env>;
