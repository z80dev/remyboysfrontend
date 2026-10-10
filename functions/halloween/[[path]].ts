/**
 * Cloudflare Pages Function for /halloween/. A shared score link (?s=<score>&w=<wave>&r=<remy>) gets its own X card:
 * the title dares the reader to beat the score, and the player iframe carries the same query so the embedded game
 * opens on that challenge. Every other request passes through untouched.
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

const REMY_COUNT = 4490

export async function onRequestGet({ request, next }: Context): Promise<Response> {
  const res = await next()
  const url = new URL(request.url)
  if (url.pathname !== '/halloween/' || !(res.headers.get('content-type') ?? '').includes('text/html')) return res
  const score = Number(url.searchParams.get('s'))
  const wave = Number(url.searchParams.get('w'))
  const remy = Number(url.searchParams.get('r'))
  if (!Number.isSafeInteger(score) || score <= 0 || !Number.isInteger(wave) || wave < 1 || wave > 9999) return res
  if (!Number.isInteger(remy) || remy < 0 || remy >= REMY_COUNT) return res
  const query = `?s=${score}&w=${wave}&r=${remy}`
  const title = `Remy #${remy} survived ${wave} wave${wave === 1 ? '' : 's'}: ${score.toLocaleString('en-US')} pts. Beat it 🎃`
  const set = (name: string, value: string) => ({ element: (el: Element) => el.setAttribute(name, value) })
  return new HTMLRewriter()
    .on('meta[name="twitter:player"]', set('content', `${url.origin}/halloween/${query}`))
    .on('meta[property="og:url"]', set('content', `${url.origin}/halloween/${query}`))
    .on('meta[name="twitter:title"]', set('content', title))
    .on('meta[property="og:title"]', set('content', title))
    .transform(res)
}
