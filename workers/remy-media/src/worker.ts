/**
 * remy-media: serves the site art from the private R2 bucket at basedremyboys.club/media/<key>.
 *
 * Every public key is immutable (versioned by recipe or content hash; see src/lib/media.ts), so responses carry a
 * one-year immutable Cache-Control and are kept in the edge cache. scripts/media.mjs uploads with the
 * MEDIA_UPLOAD_TOKEN secret: PUT /media/<key> and GET /media/_admin/list?prefix=&cursor= (key + MD5 ETag).
 */

export interface Env {
  MEDIA: R2Bucket;
  MEDIA_UPLOAD_TOKEN?: string;
}

const PREFIX = "/media/";
const IMMUTABLE = "public, max-age=31536000, immutable";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** (remy|halloween)/<recipe>/<width>/<id>.webp and quest/<hash>/<path>.(webp|json); no dot segments. */
const KEY = /^(?:(?:remy|halloween)\/v\d+\/\d+\/\d+\.webp|quest\/[0-9a-f]{16}\/[\w-]+(?:\/[\w-]+)*\.(?:webp|json))$/;
const TYPES: Record<string, string> = { webp: "image/webp", json: "application/json" };

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

async function authorized(request: Request, env: Env): Promise<boolean> {
  const token = env.MEDIA_UPLOAD_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  if (!token || !header.startsWith("Bearer ")) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(header.slice(7))),
    crypto.subtle.digest("SHA-256", enc.encode(token)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function list(url: URL, request: Request, env: Env): Promise<Response> {
  if (!(await authorized(request, env))) return text("Unauthorized", 401);
  const prefix = url.searchParams.get("prefix") ?? "";
  if (!/^(?:remy|halloween|quest)\//.test(prefix)) return text("Bad prefix", 400);
  const page = await env.MEDIA.list({ prefix, cursor: url.searchParams.get("cursor") || undefined, limit: 1000 });
  return Response.json(
    {
      objects: page.objects.map((o) => ({ key: o.key, etag: o.etag })),
      cursor: page.truncated ? page.cursor : undefined,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

async function put(key: string, request: Request, env: Env): Promise<Response> {
  if (!(await authorized(request, env))) return text("Unauthorized", 401);
  const size = Number(request.headers.get("content-length"));
  if (!request.body || !Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) return text("Bad body", 400);
  const type = TYPES[key.slice(key.lastIndexOf(".") + 1)];
  const object = await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
  return Response.json({ key, etag: object?.etag }, { headers: { "cache-control": "no-store" } });
}

async function get(key: string, request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + PREFIX + key, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) {
    if (request.headers.get("if-none-match") === hit.headers.get("etag"))
      return new Response(null, { status: 304, headers: hit.headers });
    return request.method === "HEAD" ? new Response(null, { headers: hit.headers }) : hit;
  }
  const object = await env.MEDIA.get(key);
  if (!object) return text("Not found", 404);
  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType ?? TYPES[key.slice(key.lastIndexOf(".") + 1)],
    "cache-control": IMMUTABLE,
    etag: object.httpEtag,
    "content-length": String(object.size),
  });
  const response = new Response(object.body, { headers });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  if (request.method === "HEAD") return new Response(null, { headers });
  if (request.headers.get("if-none-match") === object.httpEtag) return new Response(null, { status: 304, headers });
  return response;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PREFIX)) return text("Not found", 404);
    const key = url.pathname.slice(PREFIX.length);
    if (key === "_admin/list" && request.method === "GET") return list(url, request, env);
    if (!KEY.test(key)) return text("Not found", 404);
    if (request.method === "PUT") return put(key, request, env);
    if (request.method === "GET" || request.method === "HEAD") return get(key, request, env, ctx);
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, PUT" } });
  },
};
