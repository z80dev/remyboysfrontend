import { memo, useState, type ReactNode } from 'react'
import { MATRIX_GLYPHS, matrixLines, matrixWidth } from './matrix'
import { PANEL_COPY, ruleMessage } from './strings'

export type PanelProps = {
  score: number
  player: number
  ball: number
  rank: string
  rankIndex: number
  message: string
  goal: string
  portrait?: string
  paused: boolean
  testMode: boolean
  fuel: number
  multiplier: number
}

const panelStyle = `
.base-cadet-panel{box-sizing:border-box;flex:0 0 225px;width:225px;height:416px;padding:9px;border:2px solid #5a6680;border-top-color:#e8eef8;border-left-color:#aebecb;border-bottom-color:#27313d;box-shadow:inset 1px 1px #edf5fa,inset -1px -1px #080e17;background:linear-gradient(#23354e,#111d30 48%,#03070e);color:#d3e4ee;font:11px var(--font),Tahoma,sans-serif;overflow:hidden}
.base-cadet-backglass{height:100%;display:grid;grid-template-rows:22px 110px 28px 52px 42px 91px 35px;gap:2px}
.base-cadet-brand{text-align:center;letter-spacing:3px;font-weight:bold;font-size:13px;color:#c4e7ff;text-shadow:1px 1px #000,-1px -1px #06101d;border-bottom:1px solid #526478}
.base-cadet-pilot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:radial-gradient(ellipse at center,#263c59,transparent 72%)}
.base-cadet-porthole{position:relative;width:80px;height:80px;flex-shrink:0;border-radius:50%;border:5px solid #8799ad;background:linear-gradient(140deg,#d9e7ee,#4b607b 30%,#182b46 60%,#a6bacd);box-shadow:0 2px 4px #000,inset 0 0 0 2px #0a1425,0 0 0 1px #d5e0e7,0 0 10px #194a83;overflow:hidden}
.base-cadet-porthole img,.base-cadet-silhouette{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);border-radius:50%;object-fit:cover;image-rendering:pixelated}
.base-cadet-silhouette{background:#142740}
.base-cadet-chevrons{height:17px;width:68px;filter:drop-shadow(1px 1px #070e18)}
.base-cadet-rank{display:flex;flex-direction:column;justify-content:center;text-align:center;background:linear-gradient(90deg,transparent,#10243a,transparent);border-top:1px solid #54647a;border-bottom:1px solid #080e18}
.base-cadet-label{font-size:9px;letter-spacing:1px;color:#97aebf;text-transform:uppercase}
.base-cadet-rank strong{font-size:11px;color:#e3edf4}
.base-cadet-score{padding:3px 5px;background:#02080a;border:2px solid #07101d;border-right-color:#597087;border-bottom-color:#597087;box-shadow:inset 0 1px 4px #000}
.base-cadet-score .base-cadet-label{color:#9ebcc4}
.base-cadet-score svg{display:block;width:100%;height:29px;margin-top:2px;color:#39ff6a;filter:drop-shadow(0 0 2px #3dae65)}
.base-cadet-stats{display:flex;align-items:center;justify-content:space-around;text-align:center;border-bottom:1px solid #69798b;background:linear-gradient(#35485d,#15283e)}
.base-cadet-stats strong{display:block;font-size:16px;color:#f0f5f7;text-shadow:1px 2px #060e19}
.base-cadet-lcd{padding:7px 5px;border:2px solid #070c12;border-right-color:#718191;border-bottom-color:#718191;background-color:#031006;background-image:radial-gradient(#0b2a12 .5px,transparent .7px);background-size:3px 3px;box-shadow:inset 0 0 8px #000;overflow:hidden}
.base-cadet-lcd svg{display:block;width:100%;height:100%;color:#39ff6a;filter:drop-shadow(0 0 1px #289647)}
.base-cadet-completion{height:100%;display:flex;align-items:center;overflow:hidden}.base-cadet-completion-track{height:14px;flex-shrink:0;animation:base-cadet-completion 12s linear 1 both}.base-cadet-completion[data-paused=true] .base-cadet-completion-track{animation-play-state:paused}
@keyframes base-cadet-completion{from{transform:translateX(191px)}to{transform:translateX(-100%)}}
@media(prefers-reduced-motion:reduce){.base-cadet-completion-track{animation:none;width:100%!important;transform:none}}
.base-cadet-resources{display:flex;align-items:center;gap:8px;padding:2px 5px;background:linear-gradient(#142338,#263d54);border-top:1px solid #63778a}
.base-cadet-gas{flex:1;min-width:0}.base-cadet-gas-meter{display:flex;gap:3px;height:8px;margin-top:4px}.base-cadet-gas-meter i{flex:1;border:1px solid #51677a;background:#0a1520}.base-cadet-gas-meter i[data-lit=true]{background:#8ee0c2;border-color:#b4f4d7;box-shadow:0 0 2px #5ba791}.base-cadet-bonus{text-align:center;white-space:nowrap}.base-cadet-bonus strong{margin-left:4px;color:#e0dcb3;font-size:16px}
.base-cadet-pocket{display:none}
@media (max-width: 720px), (pointer: coarse) and (max-height: 480px){.base-cadet-panel{order:-1;flex:0 0 40px;width:100%;height:40px;padding:2px 5px;border-width:2px}.base-cadet-backglass{display:none}.base-cadet-pocket{height:100%;display:grid;grid-template-rows:16px 15px;gap:1px}.base-cadet-pocket-stats{display:flex;align-items:center;gap:10px;white-space:nowrap;font-size:10px;overflow:hidden}.base-cadet-pocket-stats span:last-child{overflow:hidden;text-overflow:ellipsis}.base-cadet-pocket-stats b{color:#c2ffcb;margin-left:3px}.base-cadet-pocket-ticker{background:#020c06;border-top:1px solid #07110b;border-bottom:1px solid #50695c;overflow:hidden}.base-cadet-pocket-ticker svg{display:block;height:12px;width:100%;color:#72f696}}
.base-cadet-ticker-track{display:flex;width:max-content;gap:32px;animation:base-cadet-ticker 24s linear infinite}.base-cadet-ticker-track>div{flex-shrink:0}.base-cadet-pocket-ticker[data-paused=true] .base-cadet-ticker-track{animation-play-state:paused}
@keyframes base-cadet-ticker{to{transform:translateX(calc(-50% - 16px))}}
@media(prefers-reduced-motion:reduce){.base-cadet-ticker-track{animation:none}.base-cadet-pocket-ticker{overflow-x:auto}.base-cadet-ticker-track>div+div{display:none}}
`

const MatrixText = memo(function MatrixText({ text, height = 7 }: { text: string; height?: number }) {
  const upper = text.toUpperCase()
  return <svg viewBox={`0 0 ${matrixWidth(upper)} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {Array.from(upper, (character, index) => <path key={index} d={(MATRIX_GLYPHS[character] ?? MATRIX_GLYPHS['?']).path} fill="currentColor" transform={`translate(${index * 6} 0)`} />)}
  </svg>
})

const CompletionScroll = memo(function CompletionScroll({ text, paused, enabled, children }: { text: string; paused: boolean; enabled: boolean; children: ReactNode }) {
  const [finished, setFinished] = useState(false)
  return !enabled || finished ? children : <div className="base-cadet-completion" data-paused={paused}>
    <div className="base-cadet-completion-track" style={{ width: matrixWidth(text) * 2 }} onAnimationEnd={() => setFinished(true)}>
      <MatrixText text={text} />
    </div>
  </div>
})

const insignia = Array.from({ length: 9 }, (_, index) => {
  const x = (index % 3) * 22 + 3
  const y = Math.floor(index / 3) * 5
  return `M${x} ${y}h4v2h3v2h3v-2h3v-2h4v3h-4v2h-3v2h-3v-2h-4z`
})
const gasSegments = [0, 1, 2, 3, 4, 5]

export const Panel = memo(function Panel({ score, player, ball, rank, rankIndex, message, goal, portrait, paused, testMode, fuel, multiplier }: PanelProps) {
  const [failedPortrait, setFailedPortrait] = useState<string>()
  const scoreText = Math.max(0, Math.trunc(score)).toLocaleString('en-US')
  const status = [paused ? PANEL_COPY.paused : '', testMode ? PANEL_COPY.testMode : ''].filter(Boolean).join(' / ')
  const displayMessage = status ? `${status}${message ? ': ' + message : ''}` : message
  const lines = [...matrixLines(displayMessage), ...matrixLines(goal)]
  const lcdHeight = Math.max(7, lines.length * 10 - 3)
  const ticker = [displayMessage, goal].filter(Boolean).join(' / ')
  const completionScroll = message.includes(ruleMessage('cabaldCompleted'))
  return <aside className="base-cadet-panel" aria-hidden="true">
    <style>{panelStyle}</style>
    <div className="base-cadet-backglass">
      <div className="base-cadet-brand">{PANEL_COPY.title}</div>
      <div className="base-cadet-pilot">
        <div className="base-cadet-porthole">
          <svg className="base-cadet-silhouette" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="29" r="15" fill="#61758a" /><path d="M10 80V66c0-18 13-24 30-24s30 6 30 24v14" fill="#61758a" /></svg>
          {portrait && portrait !== failedPortrait && <img src={portrait} alt="" draggable={false} onError={() => setFailedPortrait(portrait)} />}
        </div>
        <svg className="base-cadet-chevrons" viewBox="0 0 68 20" shapeRendering="crispEdges" aria-hidden="true">
          {insignia.map((path, index) => <path key={index} d={path} fill={index <= rankIndex ? '#ffd24a' : '#263647'} />)}
        </svg>
      </div>
      <div className="base-cadet-rank"><span className="base-cadet-label">{PANEL_COPY.rank}</span><strong>{rank}</strong></div>
      <div className="base-cadet-score"><div className="base-cadet-label">{PANEL_COPY.score}</div><MatrixText text={scoreText} /></div>
      <div className="base-cadet-stats">
        <div><span className="base-cadet-label">{PANEL_COPY.player}</span><strong>{player}</strong></div>
        <div><span className="base-cadet-label">{PANEL_COPY.ball}</span><strong>{ball}</strong></div>
      </div>
      <div className="base-cadet-lcd">
        <CompletionScroll key={message} text={displayMessage} paused={paused} enabled={completionScroll}>
          <svg viewBox={`0 0 191 ${lcdHeight}`} preserveAspectRatio="xMinYMid meet" aria-hidden="true">
            {lines.map((line, row) => Array.from(line, (character, column) => <path key={`${row}-${column}`} d={(MATRIX_GLYPHS[character] ?? MATRIX_GLYPHS['?']).path} fill="currentColor" transform={`translate(${column * 6} ${row * 10})`} />))}
          </svg>
        </CompletionScroll>
      </div>
      <div className="base-cadet-resources">
        <div className="base-cadet-gas"><span className="base-cadet-label">{PANEL_COPY.fuel}</span><div className="base-cadet-gas-meter">{gasSegments.map(index => <i key={index} data-lit={fuel > index * 100 / 6} />)}</div></div>
        <div className="base-cadet-bonus"><span className="base-cadet-label">{PANEL_COPY.multiplier}</span><strong>×{multiplier}</strong></div>
      </div>
    </div>
    <div className="base-cadet-pocket">
      <div className="base-cadet-pocket-stats">
        <span>{PANEL_COPY.score}<b>{scoreText}</b></span><span>{PANEL_COPY.ball}<b>{ball}</b></span><span>{PANEL_COPY.rank}<b>{rank}</b></span>
      </div>
      <div className="base-cadet-pocket-ticker" data-paused={paused}>
        {completionScroll ? <CompletionScroll key={message} text={ticker} paused={paused} enabled>
          <MatrixText text={ticker} />
        </CompletionScroll> : <div className="base-cadet-ticker-track" key={ticker}>
          <div style={{ width: Math.max(280, matrixWidth(ticker) * 1.5) }}><MatrixText text={ticker} /></div>
          <div style={{ width: Math.max(280, matrixWidth(ticker) * 1.5) }}><MatrixText text={ticker} /></div>
        </div>}
      </div>
    </div>
  </aside>
})

export default Panel
