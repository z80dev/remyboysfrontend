// Indigenous Peoples' Day 2026 — the ten Remy Boys memes as painted illustrations.
// Art: scripts/meme/paint.py scripts/meme/sets/ipd2026-art.json → output/meme/art/<name>.png (gouache storybook style,
// Remy originals as character references). Captions, bubbles and labels stay crisp HTML type on top.
// Same jokes and facts as ipd2026.mjs: aimed at Columbus and the Cabald (bald Remys), never at Indigenous people.
import { art, band, box, bubble, css as kitCss, ring, wm } from '../kit.mjs';

export const size = 1080;
export const css = `${kitCss}
.paper { position:absolute; inset:0; pointer-events:none; z-index:40; mix-blend-mode:multiply; opacity:.5;
  background-image: radial-gradient(rgba(120,90,50,.10) 1px, transparent 1.4px); background-size: 5px 5px; }
.cap { font-family: Georgia, 'Times New Roman', serif; background:#fbf5e8; color:#23160f; }
.bubble { font-family: Georgia, serif !important; background:#fffaf0; border-color:#2a1a12; }
.bubble::before { border-color:#2a1a12 transparent transparent transparent; }
.bubble::after { border-color:#fffaf0 transparent transparent transparent; }
.lbl { position:absolute; font: italic 600 27px Georgia, serif; color:#2a1a12; line-height:1.15; }
`;
const paper = '<div class="paper"></div>';
const rule = (y) => box(0, y - 3, 1080, 6, 'background:#2a1a12;z-index:30');

export const memes = [
  // 1 ── approve / reject
  {
    name: 'nah-yeah',
    html: `
${art('nah-a', 0, 0, 540, 540)}
${box(540, 0, 540, 540, 'background:#fbf5e8;display:flex;align-items:center;padding:40px;font:400 54px/1.15 Georgia,serif;color:#23160f', '<div>Celebrating the guy who got lost looking for India</div>')}
${art('nah-b', 0, 540, 540, 540)}
${box(540, 540, 540, 540, 'background:#fbf5e8;display:flex;align-items:center;padding:40px;font:400 54px/1.15 Georgia,serif;color:#23160f', '<div>Celebrating the people who were already here</div>')}
${rule(540)}${box(537, 0, 6, 1080, 'background:#2a1a12;z-index:30')}
${paper}${wm('rgba(42,26,18,.6)')}`,
  },

  // 2 ── "I discovered this land" (the painted MINE flag carries the Cabald's line)
  {
    name: 'discovered',
    html: `
<div class="cap" style="font-size:58px;padding:36px 46px;height:146px">Columbus in 1492:</div>
${art('discovered', 0, 146, 1080, 934, { pos: 'center bottom' })}${rule(146)}
${bubble(640, 170, 410, 'bro we literally live here 💀', { tail: 'right', tx: 200, size: 38, weight: 700 })}
${paper}${wm('rgba(255,250,240,.85)')}`,
  },

  // 3 ── the fridge
  {
    name: 'fridge',
    html: `
<div class="cap" style="font-size:44px;line-height:1.2;height:250px">Columbus “discovering” America is like me walking into your house and “discovering” your fridge</div>
${art('fridge', 0, 250, 1080, 830, { pos: 'center bottom' })}${rule(250)}
${bubble(36, 286, 380, 'a new world… full of snacks', { tx: 230, size: 36 })}
${bubble(720, 286, 320, 'sir that’s MY fridge', { tail: 'right', tx: 180, size: 36 })}
${paper}${wm('rgba(255,250,240,.85)')}`,
  },

  // 4 ── expanding brain
  {
    name: 'expanding-brain',
    html:
      [
        'Columbus Day',
        'Columbus Day but you feel kinda weird about it',
        'Indigenous Peoples’ Day',
        'Looking up whose land you’re on at <span style="white-space:nowrap">native-land.ca</span>',
      ]
        .map((t, i) =>
          box(0, i * 270, 540, 270, 'background:#fbf5e8;display:flex;align-items:center;padding:0 36px;font:400 44px/1.15 Georgia,serif;color:#23160f', `<div>${t}</div>`) +
          art(`brain-${i + 1}`, 540, i * 270, 540, 270))
        .join('') +
      [270, 540, 810].map(rule).join('') +
      box(537, 0, 6, 1080, 'background:#2a1a12;z-index:30') +
      paper +
      wm('rgba(255,250,240,.85)'),
  },

  // 5 ── starter pack (painted objects on paper)
  {
    name: 'starter-pack',
    html: `
${box(0, 0, 1080, 1080, 'background:#fbf5e8')}
<div style="position:absolute;left:40px;top:30px;font:700 56px Georgia,serif;color:#23160f;letter-spacing:-1px">Indigenous Peoples’ Day starter pack</div>
${box(40, 112, 1000, 4, 'background:#2a1a12')}
${[
  ['item-sisters', 30, 130, 'the Three Sisters<br>(corn, beans &amp; squash)'],
  ['item-laptop', 375, 130, 'looking up whose land<br>you’re on'],
  ['item-calendar', 720, 130, 'updating your calendar'],
  ['item-pottery', 30, 590, 'buying from Native artists,<br>not knockoffs'],
  ['item-friend', 375, 590, 'the friend who actually<br>read the history'],
  ['item-book', 720, 590, 'required reading'],
]
  .map(([n, x, y, l]) => art(n, x, y, 330, 330, { style: 'mix-blend-mode:multiply' }) + `<div class="lbl" style="left:${x}px;top:${y + 338}px;width:330px;text-align:center">${l}</div>`)
  .join('')}
${paper}${wm('rgba(42,26,18,.6)')}`,
  },

  // 6 ── tomatoes
  {
    name: 'tomatoes',
    html: `
<div class="cap" style="font-size:44px;line-height:1.18;height:196px">Italian food before vs. after Indigenous farmers in the Americas gave the world tomatoes 🍅</div>
${art('tomato-before', 0, 196, 540, 884)}${art('tomato-after', 540, 196, 540, 884)}
${rule(196)}${box(537, 196, 6, 884, 'background:#2a1a12;z-index:30')}
<div class="impact" style="position:absolute;left:0;top:216px;width:540px;text-align:center;font-size:74px;z-index:6">BEFORE</div>
<div class="impact" style="position:absolute;left:540px;top:216px;width:540px;text-align:center;font-size:74px;z-index:6">AFTER</div>
<div class="impact" style="position:absolute;left:0;bottom:56px;width:540px;text-align:center;font-size:50px;z-index:6">just bread</div>
<div class="impact" style="position:absolute;left:540px;bottom:56px;width:540px;text-align:center;font-size:46px;line-height:1.05;z-index:6">grazie,<br>Indigenous farmers</div>
${paper}${wm('rgba(255,250,240,.9)')}`,
  },

  // 7 ── change my mind (sign lettering is painted)
  {
    name: 'change-my-mind',
    html: `${art('change', 0, 0, 1080, 1080)}${paper}${wm('rgba(255,250,240,.9)')}`,
  },

  // 8 ── they don't know
  {
    name: 'they-dont-know',
    html: `
${art('party', 0, 0, 1080, 1080)}
${box(20, 10, 540, 250, 'background:#fffaf0;border-radius:50%;border:5px solid #2a1a12;z-index:9;display:flex;align-items:center;justify-content:center;text-align:center;padding:30px 60px;font:700 31px/1.16 Georgia,serif;color:#23160f;box-shadow:0 10px 0 rgba(0,0,0,.25)',
      'they don’t know Berkeley has celebrated Indigenous Peoples’ Day since 1992')}
${box(300, 262, 40, 30, 'background:#fffaf0;border-radius:50%;border:4px solid #2a1a12;z-index:9')}${box(278, 296, 22, 16, 'background:#fffaf0;border-radius:50%;border:3px solid #2a1a12;z-index:9')}
${paper}${wm('rgba(255,250,240,.85)')}`,
  },

  // 9 ── two buttons
  {
    name: 'two-buttons',
    html: `
${art('buttons-top', 0, 0, 1080, 560, { pos: 'center 70%' })}
<div class="strip" style="left:70px;top:36px;width:420px;transform:rotate(-5deg);font-family:Georgia,serif;background:#fbf5e8">Keep defending Columbus</div>
<div class="strip" style="left:590px;top:28px;width:430px;transform:rotate(4deg);font-family:Georgia,serif;background:#fbf5e8">Admit he thought he was in India</div>
${art('buttons-bottom', 0, 560, 1080, 520, { pos: 'center 35%' })}${rule(560)}
<div class="impact" style="position:absolute;left:0;top:966px;width:1080px;text-align:center;font-size:60px;z-index:11">the Cabald on October 12</div>
${paper}${wm('rgba(255,250,240,.85)')}`,
  },

  // 10 ── nobody: / Remy Boys on October 12:
  {
    name: 'nobody',
    html: `
<div class="cap" style="font-size:50px;line-height:1.25;padding:28px 46px;height:260px">Nobody:<br><br>Remy Boys on October 12:</div>
${art('nobody', 0, 260, 1080, 820, { pos: 'center bottom' })}${rule(260)}
${paper}${wm('rgba(255,250,240,.9)')}`,
  },
];
