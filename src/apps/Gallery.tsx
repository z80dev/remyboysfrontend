import { useEffect, useState } from 'react'
import { useReadContracts } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR } from '../config'
import { artIndexFromUri, artSrc, ipfsToHttp, useMetadata } from '../lib/art'
import { shortAddr } from '../lib/format'
import type { AppProps } from '../os/apps'
import { Group, StatusBar } from '../os/ui'

export function Gallery({ param, navigate }: AppProps) {
  const id = param !== undefined && /^\d+$/.test(param) ? Number(param) : 0
  const [input, setInput] = useState(String(id))
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => (setInput(String(id)), setImgFailed(false)), [id])

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

  return (
    <div className="app-col">
      <div className="toolbar">
        <button type="button" className="btn small" onClick={() => go(id - 1)} aria-label="Previous">
          ‹
        </button>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^\d+$/.test(input)) navigate(`gallery/${input}`)
          }}
        >
          <label className="muted small" htmlFor="gid">
            Token #
          </label>
          <input id="gid" className="input num" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} />
          <button type="submit" className="btn small">
            Go
          </button>
        </form>
        <button type="button" className="btn small" onClick={() => go(id + 1)} aria-label="Next">
          ›
        </button>
        <button type="button" className="btn small" onClick={() => go(Math.floor(Math.random() * supply))}>
          Random
        </button>
      </div>
      <div className="scroll grow">
        {missing ? (
          <div className="empty-state">
            <p>
              <b>Token #{id} does not exist.</b>
            </p>
            <p className="muted">Ids run from 0 to {supply - 1}.</p>
          </div>
        ) : (
          <div className="gallery">
            <div className="frame">
              {src ? <img src={src} alt={`Remy Boy #${id}`} onError={() => setImgFailed(true)} /> : <div className="thumb-ph big" />}
            </div>
            <div className="gallery-info">
              <h2>{meta.data?.name ?? `Remy Boy #${id}`}</h2>
              <div className="kv">
                <span>Token id</span>
                <b>#{id}</b>
                <span>Art</span>
                <b>{art !== undefined ? `Character ${art}` : '…'}</b>
                <span>Owner</span>
                <b className="mono">{owner ? shortAddr(owner) : '…'}</b>
              </div>
              {art !== undefined && art !== id && <p className="muted small">Re-mint of original art #{art}.</p>}
              <Group title="Traits">
                {meta.isLoading ? (
                  <span className="muted small">Loading traits from IPFS…</span>
                ) : meta.data?.attributes?.length ? (
                  <div className="traits">
                    {meta.data.attributes.map((a) => (
                      <div key={a.trait_type} className="trait">
                        <span>{a.trait_type}</span>
                        <b>{String(a.value)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="muted small">Traits unavailable right now (IPFS gateway did not answer).</span>
                )}
              </Group>
              <div className="row wrap">
                <a className="btn small" href={`https://opensea.io/assets/base/${ADDR.remy}/${id}`} target="_blank" rel="noreferrer">
                  OpenSea
                </a>
                {art !== undefined && (
                  <a className="btn small" href={artSrc(art)} download={`remy-${id}.webp`}>
                    Download art
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <StatusBar>{uri ? uri.replace(/^ipfs:\/\/(.{10}).*\//, 'ipfs://$1…/') : 'Reading token…'}</StatusBar>
    </div>
  )
}
