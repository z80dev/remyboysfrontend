import { useEffect, useState } from 'react'
import { useReadContracts } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR } from '../config'
import { artIndexFromUri, artSrc, ipfsToHttp, useMetadata } from '../lib/art'
import { shortAddr } from '../lib/format'
import type { AppProps } from '../os/apps'
import { Icon } from '../os/icons'
import { balloon, setPrefs, useIsMobile } from '../os/shell'
import { Loading, StatusBar, TaskBox, TaskLink, TaskPane } from '../os/ui'

export function Gallery({ param, navigate }: AppProps) {
  const mobile = useIsMobile()
  const id = param !== undefined && /^\d+$/.test(param) ? Number(param) : 0
  const [input, setInput] = useState(String(id))
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setInput(String(id))
    setImgFailed(false)
  }, [id])

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: ADDR.remy, abi: remyAbi, functionName: 'tokenURI', args: [BigInt(id)] },
      { address: ADDR.remy, abi: remyAbi, functionName: 'ownerOf', args: [BigInt(id)] },
      { address: ADDR.remy, abi: remyAbi, functionName: 'totalSupply' },
    ],
    allowFailure: true,
  })
  const uri = data?.[0]?.status === 'success' ? (data[0].result as string) : undefined
  const owner = data?.[1]?.status === 'success' ? (data[1].result as string) : undefined
  const supply = data?.[2]?.status === 'success' ? Number(data[2].result) : 4490
  const art = artIndexFromUri(uri)
  const meta = useMetadata(uri)
  const missing = !isLoading && data && !uri

  const go = (n: number) => navigate(`gallery/${((n % supply) + supply) % supply}`)
  const src = art === undefined ? undefined : imgFailed && meta.data?.image ? ipfsToHttp(meta.data.image) : artSrc(art)
  const setWallpaper = () => {
    if (art === undefined) return
    setPrefs({ wallpaper: { kind: 'remy', art, fit: 'stretch' } })
    balloon(
      {
        key: `wall-${art}-${Date.now()}`,
        icon: 'display',
        title: 'Desktop background changed',
        text: `Remy Boy #${id} is now your wallpaper. Right-click the desktop to change it back.`,
      },
      true,
    )
  }

  const traits = meta.isLoading ? (
    <span className="muted small">Loading traits from IPFS…</span>
  ) : meta.data?.attributes?.length ? (
    <dl className="kv tight traits">
      {meta.data.attributes.map((a) => (
        <div key={a.trait_type} className="trait">
          <dt>{a.trait_type}</dt>
          <dd>{String(a.value)}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <span className="muted small">Traits unavailable right now (IPFS gateway did not answer).</span>
  )

  return (
    <div className="app-col explorer">
      <form
        className="addressbar"
        onSubmit={(e) => {
          e.preventDefault()
          if (/^\d+$/.test(input)) navigate(`gallery/${input}`)
        }}
      >
        <label className="addr-label" htmlFor="gid">
          Token #
        </label>
        <div className="addr-field">
          <Icon name="gallery" size={16} />
          {!mobile && <span className="addr-path">Remy Boys\Gallery\</span>}
          <input id="gid" className="addr-input" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button type="submit" className="go-btn">
          <Icon name="go" size={20} />
          Go
        </button>
      </form>
      <div className="split">
        {!mobile && (
          <TaskPane>
            <TaskBox title="Picture Tasks" primary>
              <TaskLink icon="display" onClick={setWallpaper} disabled={art === undefined}>
                Set as desktop background
              </TaskLink>
              {art !== undefined && (
                <a className="tasklink" href={artSrc(art)} download={`remy-${id}.webp`}>
                  <Icon name="download" size={16} />
                  <span>Download this picture</span>
                </a>
              )}
              <TaskLink icon="globe" href={`https://opensea.io/assets/base/${ADDR.remy}/${id}`}>
                View on OpenSea
              </TaskLink>
            </TaskBox>
            <TaskBox title="Details">
              <b className="detail-name">{meta.data?.name ?? `Remy Boy #${id}`}</b>
              <dl className="kv tight">
                <dt>Token id</dt>
                <dd>#{id}</dd>
                <dt>Art</dt>
                <dd>{art !== undefined ? `Character ${art}` : '…'}</dd>
                <dt>Owner</dt>
                <dd className="mono" title={owner}>
                  {owner ? shortAddr(owner) : '…'}
                </dd>
              </dl>
              {art !== undefined && art !== id && <p className="muted small">Re-mint of original art #{art}.</p>}
            </TaskBox>
            <TaskBox title="Traits">{traits}</TaskBox>
          </TaskPane>
        )}
        <main className="split-main viewer">
          {missing ? (
            <div className="empty-folder">
              <Icon name="warning" size={48} />
              <p>
                <b>Token #{id} does not exist.</b>
              </p>
              <p className="muted">Ids run from 0 to {supply - 1}.</p>
            </div>
          ) : (
            <div className="viewer-stage">
              {src ? <img src={src} alt={`Remy Boy #${id}`} onError={() => setImgFailed(true)} /> : <Loading>Opening picture…</Loading>}
            </div>
          )}
          <div className="viewer-bar" role="toolbar" aria-label="Picture viewer">
            <button type="button" className="round-btn" onClick={() => go(id - 1)} aria-label="Previous Remy" title="Previous Remy">
              <Icon name="back" size={26} />
            </button>
            <button type="button" className="round-btn" onClick={() => go(id + 1)} aria-label="Next Remy" title="Next Remy">
              <Icon name="forward" size={26} />
            </button>
            <span className="viewer-sep" />
            <button type="button" className="round-btn" onClick={() => go(Math.floor(Math.random() * supply))} aria-label="Random Remy" title="Random Remy">
              <Icon name="random" size={26} />
            </button>
            <button
              type="button"
              className="round-btn"
              onClick={setWallpaper}
              disabled={art === undefined}
              aria-label="Set as desktop background"
              title="Set as desktop background"
            >
              <Icon name="display" size={26} />
            </button>
            {art !== undefined && (
              <a className="round-btn" href={artSrc(art)} download={`remy-${id}.webp`} aria-label="Download art" title="Download art">
                <Icon name="download" size={26} />
              </a>
            )}
          </div>
        </main>
        {mobile && (
          <section className="viewer-details">
            <h2>{meta.data?.name ?? `Remy Boy #${id}`}</h2>
            <p className="small">
              Owner <span className="mono">{owner ? shortAddr(owner) : '…'}</span>
              {art !== undefined && art !== id && ` · re-mint of art #${art}`}
            </p>
            {traits}
            <a className="btn" href={`https://opensea.io/assets/base/${ADDR.remy}/${id}`} target="_blank" rel="noreferrer">
              View on OpenSea
            </a>
          </section>
        )}
      </div>
      <StatusBar right={`#${id} of ${supply}`}>{uri ? uri.replace(/^ipfs:\/\/(.{10}).*\//, 'ipfs://$1…/') : 'Reading token…'}</StatusBar>
    </div>
  )
}
