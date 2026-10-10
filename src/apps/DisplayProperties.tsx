import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TOTAL_SUPPLY_HINT } from '../config'
import { useArtIndexes } from '../lib/art'
import { useOwnedIds } from '../lib/owned'
import type { AppProps } from '../os/apps'
import { wallpaperStyle } from '../os/Desktop'
import { FlagMark, Icon } from '../os/icons'
import { type Prefs, type Theme, setPrefs, useShell } from '../os/shell'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'blue', label: 'Default (blue)' },
  { id: 'olive', label: 'Olive Green' },
  { id: 'silver', label: 'Silver' },
  { id: 'halloween', label: 'Halloween' },
]

const FEATURED = [2069, 420, 777, 42, 1337, 7]

/** Display Properties: Desktop (wallpaper) and Appearance (Luna colour scheme) tabs with a live monitor preview. */
export function DisplayProperties({ close }: AppProps) {
  const saved = useShell((s) => s.prefs)
  const [draft, setDraft] = useState<Prefs>(saved)
  const [tab, setTab] = useState<'desktop' | 'appearance'>('desktop')
  const [custom, setCustom] = useState('')
  const { address } = useAccount()
  const { ids } = useOwnedIds(address, 0, 8)
  const { map } = useArtIndexes(ids)
  const mine = ids
    .map((id) => ({ id, art: map.get(id) }))
    .filter((x, i, all): x is { id: bigint; art: number } => x.art !== undefined && all.findIndex((y) => y.art === x.art) === i)

  const w = draft.wallpaper
  const fit = w.kind === 'remy' ? w.fit : 'stretch'
  const current = w.kind === 'remy' ? `remy-${w.art}` : w.kind === 'halloween' && w.art !== undefined ? `halloween-${w.art}` : w.kind
  const pickRemy = (art: number) => setDraft((d) => ({ ...d, wallpaper: { kind: 'remy', art, fit } }))
  const options: { key: string; label: string; icon: string; pick: () => void }[] = [
    { key: 'solid', label: '(None)', icon: 'display', pick: () => setDraft((d) => ({ ...d, wallpaper: { kind: 'solid' } })) },
    { key: 'bliss', label: 'Remy Bliss', icon: 'gallery', pick: () => setDraft((d) => ({ ...d, wallpaper: { kind: 'bliss' } })) },
    {
      key: 'halloween',
      label: 'Haunted Remys (new each visit)',
      icon: 'gallery',
      pick: () => setDraft((d) => ({ ...d, wallpaper: { kind: 'halloween' } })),
    },
    ...(w.kind === 'halloween' && w.art !== undefined
      ? [{ key: current, label: `Halloween Remy #${w.art}`, icon: 'gallery', pick: () => setDraft((d) => ({ ...d, wallpaper: w })) }]
      : []),
    ...mine.map((m) => ({ key: `remy-${m.art}`, label: `My Remy #${m.id}`, icon: 'gallery', pick: () => pickRemy(m.art) })),
    ...FEATURED.filter((art) => !mine.some((m) => m.art === art)).map((art) => ({
      key: `remy-${art}`,
      label: `Remy Boy #${art}`,
      icon: 'gallery',
      pick: () => pickRemy(art),
    })),
  ]
  if (w.kind === 'remy' && !options.some((o) => o.key === current)) {
    const { art } = w
    options.push({ key: current, label: `Remy Boy #${art}`, icon: 'gallery', pick: () => pickRemy(art) })
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  return (
    <div className="app-col props">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'desktop'} className={tab === 'desktop' ? 'on' : ''} onClick={() => setTab('desktop')}>
          Desktop
        </button>
        <button type="button" role="tab" aria-selected={tab === 'appearance'} className={tab === 'appearance' ? 'on' : ''} onClick={() => setTab('appearance')}>
          Appearance
        </button>
      </div>
      <div className="tab-panel">
        <div className="monitor" aria-hidden="true">
          <div className="monitor-screen">
            <div className={`mini-desk wallpaper ${draft.wallpaper.kind}`} style={wallpaperStyle(draft.wallpaper)}>
              {tab === 'appearance' && (
                <div className={`mini-win theme-${draft.theme}`}>
                  <span className="mini-title">Active Window</span>
                  <span className="mini-body">Window text</span>
                </div>
              )}
              <div className={`mini-bar theme-${draft.theme}`}>
                <span className="mini-start">
                  <FlagMark size={8} />
                </span>
              </div>
            </div>
          </div>
          <div className="monitor-stand" />
        </div>

        {tab === 'desktop' ? (
          <>
            <fieldset className="list-box">
              <legend className="field-label">Background:</legend>
              <div className="list-box-items">
                {options.map((o) => (
                  <label key={o.key} className={current === o.key ? 'on' : ''}>
                    <input type="radio" name="wallpaper" className="sr-only" checked={current === o.key} onChange={o.pick} />
                    <Icon name={o.icon} size={16} />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="row">
              <label className="field-label" htmlFor="wp-custom">
                Remy #
              </label>
              <input
                id="wp-custom"
                className="input num"
                inputMode="numeric"
                placeholder="0–4489"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
              />
              <button
                type="button"
                className="btn"
                disabled={!custom || Number(custom) >= TOTAL_SUPPLY_HINT}
                onClick={() => pickRemy(Number(custom))}
                title="Uses the original art with that number"
              >
                Use
              </button>
              <span className="grow" />
              <label className="field-label" htmlFor="wp-fit">
                Position:
              </label>
              <select
                id="wp-fit"
                className="select"
                value={fit}
                disabled={draft.wallpaper.kind !== 'remy'}
                onChange={(e) =>
                  setDraft((d) =>
                    d.wallpaper.kind === 'remy' ? { ...d, wallpaper: { ...d.wallpaper, fit: e.target.value as 'stretch' | 'center' | 'tile' } } : d,
                  )
                }
              >
                <option value="stretch">Stretch</option>
                <option value="center">Center</option>
                <option value="tile">Tile</option>
              </select>
            </div>
          </>
        ) : (
          <div className="row">
            <label className="field-label" htmlFor="theme">
              Color scheme:
            </label>
            <select id="theme" className="select grow" value={draft.theme} onChange={(e) => setDraft((d) => ({ ...d, theme: e.target.value as Theme }))}>
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="dialog-buttons">
        <button
          type="button"
          className="btn default"
          onClick={() => {
            setPrefs(draft)
            close()
          }}
        >
          OK
        </button>
        <button type="button" className="btn" onClick={close}>
          Cancel
        </button>
        <button type="button" className="btn" disabled={!dirty} onClick={() => setPrefs(draft)}>
          Apply
        </button>
      </div>
    </div>
  )
}
