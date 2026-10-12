// Halloween 2026 — 25 Remy Boys memes. Two sources:
//   • the Halloween collection originals (media/halloween/<token>.webp, claymation costumes) as reaction pictures;
//   • new claymation scenes painted with those same Remys as references:
//     scripts/meme/paint.py scripts/meme/sets/halloween2026.json → output/meme/art/hw-*.png.
// Lore: hairy Remys are the heroes; bald Remys are the Cabald (Halloween tokens 175, 207 are bald).
import { art, box, bubble, css as kitCss, hw, ring, wm } from '../kit.mjs';

export const size = 1080;
export const css = `${kitCss}
.ui { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
.lab { position:absolute; z-index:12; font: 900 54px/1 Impact, Anton, sans-serif; color:#fff; text-shadow:${ring(5)}; text-transform:uppercase; text-align:center; }
`;
const cap = (text, h = 130, size = 50) => `<div class="cap" style="height:${h}px;font-size:${size}px;display:flex;align-items:center">${text}</div>`;
const rule = (y) => box(0, y - 2, 1080, 4, 'background:#000;z-index:30');
const bottom = (text, size = 64, b = 36) =>
  `<div class="impact" style="position:absolute;left:30px;bottom:${b}px;width:1020px;text-align:center;font-size:${size}px;line-height:1.02;z-index:20">${text}</div>`;
// Classic: caption bar over a Halloween original.
const react = (id, text, { h = 130, size = 50, pos = 'center 35%', punch = '', punchSize = 64 } = {}) =>
  `${cap(text, h, size)}${hw(id, 0, h, 1080, 1080 - h, { pos })}${rule(h)}${punch ? bottom(punch, punchSize, 70) : ''}${wm('rgba(255,255,255,.85)')}`;
const W = wm('rgba(255,255,255,.85)');

export const memes = [
  {
    name: 'cabald-door',
    html: `${cap('Cabald trick-or-treating:')}${art('hw-cabald-door', 0, 130, 1080, 950)}${rule(130)}
${bubble(560, 170, 480, 'and what are you supposed to be?', { tail: 'right', tx: 230, size: 36 })}
${bubble(36, 170, 400, '…this is just my head', { tx: 170, size: 38 })}${W}`,
  },
  { name: 'frozen', html: react(54, 'Me trick-or-treating without a jacket because it “ruins the fit”:') },
  {
    name: 'buttons',
    html: `${art('hw-buttons', 0, 0, 1080, 1080)}
<div class="strip" style="left:60px;top:40px;width:440px;transform:rotate(-4deg)">give out the full-size bars</div>
<div class="strip" style="left:580px;top:34px;width:440px;transform:rotate(3deg)">eat the full-size bars myself</div>${W}`,
  },
  { name: 'sleep-paralysis', html: react(114, 'Me and my sleep paralysis demon pulling up as a couples costume:') },
  {
    name: 'raccoon',
    html: `${art('hw-raccoon', 0, 0, 1080, 1080)}${bottom('the raccoon costume<br>was a lifestyle')}${wm('rgba(255,255,255,.85)', 'top')}`,
  },
  { name: 'box-costume', html: react(11, 'My costume budget after buying the dip all October:') },
  {
    name: 'group-costume',
    html: `${cap('Us: “let’s do a group costume this year”<br>The group costume:', 170, 46)}${art('hw-group', 0, 170, 1080, 910)}${rule(170)}${W}`,
  },
  { name: 'sugar-coma', html: react(27, 'Me at 1am after eating my entire candy haul in one sitting:') },
  {
    name: 'teen',
    html: `${cap('Every year at 9:45pm:')}${art('hw-teen', 0, 130, 1080, 950)}${rule(130)}
${bubble(36, 170, 470, 'what are you supposed to be?', { tx: 300, size: 36 })}
${bubble(600, 170, 440, 'a guy who wants candy', { tail: 'right', tx: 140, size: 38 })}${W}`,
  },
  { name: 'toothbrush', html: react(132, 'When the house hands out toothbrushes instead of candy:') },
  {
    name: 'candy-market',
    html: `${cap('The candy market on November 1st:', 120, 52)}
<div class="ui" style="position:absolute;left:0;top:120px;width:1080px;height:64px;background:#0b0b0f;z-index:25;display:flex;align-items:center;gap:30px;padding:0 24px;white-space:nowrap;overflow:hidden;font:800 28px -apple-system,Arial">
<span style="color:#2ecc71">SNICKERS ▲12%</span><span style="color:#2ecc71">REESE’S ▲9%</span><span style="color:#2ecc71">KIT KAT ▲4%</span><span style="color:#ff4d4d">CANDY CORN ▼61%</span><span style="color:#ff4d4d">RAISINS ▼99%</span></div>
${art('hw-candy-market', 0, 184, 1080, 896)}${rule(120)}${W}`,
  },
  { name: 'ghosted', html: react(662, 'My crush after I texted “happy halloween 👻” first:') },
  {
    name: 'split-up',
    html: `${art('hw-split-up', 0, 0, 1080, 1080)}
${bubble(40, 40, 380, 'ok let’s split up', { tx: 200, size: 40 })}
${bubble(620, 40, 420, 'absolutely not', { tail: 'right', tx: 200, size: 44 })}${W}`,
  },
  {
    name: 'cabald-contest',
    html: react(207, 'Cabald costume contest, 1st place: scariest costume', { punch: 'he wasn’t wearing a costume' }),
  },
  {
    name: 'pumpkin-carving',
    html: `${cap('Pumpkin carving:')}${art('hw-pumpkin-exp', 0, 130, 540, 950)}${art('hw-pumpkin-real', 540, 130, 540, 950)}
${rule(130)}${box(538, 130, 4, 950, 'background:#000;z-index:30')}
<div class="lab" style="left:0;top:156px;width:540px">what I pictured</div><div class="lab" style="left:540px;top:156px;width:540px">what I made</div>${W}`,
  },
  {
    name: 'bloodwork',
    html: react(152, 'Vampires after reading your bloodwork from 40 fun-size Snickers:', { punch: 'nah I’m good' }),
  },
  {
    name: 'bedsheet',
    html: `${cap('Spent 3 weeks on my costume.<br>Lost to a bedsheet with 2 holes in it.', 170, 46)}${art('hw-bedsheet', 0, 170, 1080, 910)}${rule(170)}${W}`,
  },
  { name: 'reaper', html: react(33, 'The Grim Reaper when you say “one more Snickers won’t kill me”:') },
  {
    name: 'full-size',
    html: `${cap('When word gets out a house is giving out full-size bars:')}${art('hw-fullsize', 0, 130, 1080, 950)}${rule(130)}${W}`,
  },
  {
    name: 'candy-corn',
    html: react(163, 'Candy corn when everyone says it tastes like a candle:', { punch: 'and yet you buy me every year' }),
  },
  {
    name: 'nov-1',
    html: `${cap('The real holiday:')}${art('hw-nov1-a', 0, 130, 540, 950)}${art('hw-nov1-b', 540, 130, 540, 950)}
${rule(130)}${box(538, 130, 4, 950, 'background:#000;z-index:30')}
<div class="lab" style="left:0;top:156px;width:540px">oct 31, 11pm</div><div class="lab" style="left:540px;top:156px;width:540px;font-size:48px">nov 1, 7am:<br>75% off candy</div>${W}`,
  },
  { name: 'blend-in', html: react(8, 'Me blending in with the 12-year-olds to trick-or-treat at 27:') },
  {
    name: 'cabald-wig',
    html: `${cap('The Cabald trying to blend in at the Remy Halloween party:', 130, 46)}${art('hw-cabald-wig', 0, 130, 1080, 950)}${rule(130)}${W}`,
  },
  { name: 'raisins', html: react(56, 'Me walking past the house that gives out raisins:') },
  {
    name: 'portfolio',
    html: `${cap('Scariest thing I saw this Halloween:')}${art('hw-portfolio', 0, 130, 1080, 950)}${rule(130)}${W}`,
  },
];
