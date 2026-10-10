/**
 * Cloudflare Pages middleware for /assets/*. Pages answers a missing path with the SPA fallback (index.html, 200),
 * and _headers marks /assets/* immutable for a year, so the edge would cache that HTML as the asset. That happens
 * during a deploy, when a new index.html sends a request for a new fingerprinted file to the old deployment.
 * An HTML answer here is never a real asset: turn it into an uncached 404 so the next request gets the real file.
 */

interface Context {
  next: () => Promise<Response>
}

export async function onRequest({ next }: Context): Promise<Response> {
  const res = await next()
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}
