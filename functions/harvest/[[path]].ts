/**
 * Cloudflare Pages Function for /harvest/. A shared score link (?s=<score>&c=<catches>) gets its own X card: the title
 * dares the reader to beat the score, and the player iframe carries the same query so the embedded game opens on that
 * challenge. Every other request passes through untouched.
 */

interface Context {
  request: Request
  next: () => Promise<Response>
}

interface Element {
  setAttribute(name: string, value: string): void
}

declare class HTMLRewriter {
  on(selector: string, handler: { element(el: Element): void }): HTMLRewriter
  transform(response: Response): Response
}

export async function onRequestGet({ request, next }: Context): Promise<Response> {
  const res = await next()
  const url = new URL(request.url)
  if (url.pathname !== '/harvest/' || !(res.headers.get('content-type') ?? '').includes('text/html')) return res
  const score = Number(url.searchParams.get('s'))
  const corn = Number(url.searchParams.get('c'))
  if (!Number.isSafeInteger(score) || score <= 0 || !Number.isInteger(corn) || corn < 0 || corn > 99999) return res
  const query = `?s=${score}&c=${corn}`
  const title = `Remy harvested ${score.toLocaleString('en-US')} pts (${corn} catches). Beat it 🌽`
  const set = (name: string, value: string) => ({ element: (el: Element) => el.setAttribute(name, value) })
  return new HTMLRewriter()
    .on('meta[name="twitter:player"]', set('content', `${url.origin}/harvest/${query}`))
    .on('meta[property="og:url"]', set('content', `${url.origin}/harvest/${query}`))
    .on('meta[name="twitter:title"]', set('content', title))
    .on('meta[property="og:title"]', set('content', title))
    .transform(res)
}
