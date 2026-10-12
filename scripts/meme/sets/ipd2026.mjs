// Indigenous Peoples' Day 2026 — ten square Remy Boys memes (1080×1080 CSS px).
// The jokes punch at Columbus and the Cabald (bald Remys, the villains), never at Indigenous people.
// Cast (cut-outs via scripts/meme/cutout.py, checked on a green-screen sheet):
//   heroes 42 (red hair, open grin), 143 (smile, frog tee), 127 (grin), 13, 39, 108, 114, 131, 4, 7, 24
//   Cabald 1217 (white gi, stern) as the "discoverer"
// Facts used: Columbus believed he had reached the Indies; Berkeley, CA first celebrated Indigenous Peoples' Day
// in 1992; tomatoes, corn, beans and squash were domesticated by Indigenous peoples of the Americas.

import { R, band, box, bubble, confetti, css as kitCss, emoji, flag, ring, stars, sticker, wm } from '../kit.mjs';

export const size = 1080;
export const css = kitCss;

const squash = (x, y, s) => `<svg style="position:absolute;left:${x}px;top:${y}px;transform:rotate(18deg)" width="${s}" height="${s * 1.15}" viewBox="0 0 130 150">
  <defs><radialGradient id="sq" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="#ffd38a"/><stop offset=".55" stop-color="#eda54c"/><stop offset="1" stop-color="#c47524"/></radialGradient></defs>
  <rect x="58" y="2" width="12" height="18" rx="4" fill="#6b8a3a"/>
  <ellipse cx="65" cy="52" rx="25" ry="38" fill="url(#sq)"/><ellipse cx="65" cy="106" rx="46" ry="40" fill="url(#sq)"/>
  <ellipse cx="50" cy="94" rx="10" ry="20" fill="rgba(255,255,255,.35)"/></svg>`;

export const memes = [
  // 1 ── approve / reject (two-panel reaction format, Remy edition)
  {
    name: 'nah-yeah',
    html: `
${box(0, 0, 540, 540, 'background:linear-gradient(160deg,#f2c79a,#c98652);overflow:hidden', R(42, { cx: 300, bottom: -30, h: 560, rot: -8, filter: 'grayscale(.55) brightness(.92)' }) + emoji('✋', 150, 150, 250, 'transform:rotate(-12deg);z-index:5;filter:drop-shadow(0 10px 10px rgba(0,0,0,.35))'))}
${box(540, 0, 540, 540, 'background:#fff;display:flex;align-items:center;padding:40px;font-size:56px;line-height:1.15', 'Celebrating the guy who got lost looking for India')}
${box(0, 540, 540, 540, 'background:radial-gradient(circle at 50% 40%,#ffe9a8,#e7a443);overflow:hidden', R(42, { cx: 260, bottom: -30, h: 560 }) + emoji('👉', 360, 300, 170, 'z-index:5;filter:drop-shadow(0 10px 10px rgba(0,0,0,.3))') + emoji('✨', 40, 40, 90) + emoji('✨', 420, 90, 70))}
${box(540, 540, 540, 540, 'background:#fff;display:flex;align-items:center;padding:40px;font-size:56px;line-height:1.15', 'Celebrating the people who were already here')}
${box(0, 538, 1080, 4, 'background:#222;z-index:10')}${box(538, 0, 4, 1080, 'background:#222;z-index:10')}
${wm()}`,
  },

  // 2 ── "I discovered this land"
  {
    name: 'discovered',
    html: `
<div class="cap" style="font-size:60px;padding:36px 46px">Columbus in 1492:</div>
${box(0, 146, 1080, 420, 'background:linear-gradient(#5db5ec,#bfe8fb)')}
${box(760, 200, 120, 120, 'background:radial-gradient(circle,#fff8c8,#ffd65a 60%,rgba(255,214,90,0) 72%)')}
${box(0, 540, 1080, 150, 'background:linear-gradient(#2b8fc4,#4fc0d8)')}
${box(0, 556, 1080, 6, 'background:rgba(255,255,255,.55)')}${box(0, 600, 1080, 5, 'background:rgba(255,255,255,.4)')}${box(0, 646, 1080, 4, 'background:rgba(255,255,255,.35)')}
${box(-40, 660, 1160, 460, 'background:linear-gradient(#f4d896,#e3b866);border-radius:50% 50% 0 0 / 60px 60px 0 0')}
${emoji('🌴', 860, 330, 300, 'z-index:1')}
${R(108, { cx: 560, bottom: 330, h: 300, z: 2 })}${R(114, { cx: 980, bottom: 335, h: 300, z: 2 })}${R(131, { cx: 770, bottom: 340, h: 290, z: 2 })}
${box(380, 700, 760, 120, 'background:#ebc477;border-radius:50% 50% 0 0 / 50px 50px 0 0;z-index:3')}
${R(39, { cx: 680, bottom: 120, h: 400, z: 4 })}${R(143, { cx: 905, bottom: 110, h: 420, z: 4 })}
${box(380, 920, 760, 200, 'background:#e8bf72;border-radius:50% 50% 0 0 / 40px 40px 0 0;z-index:5')}
${R(1217, { cx: 240, bottom: -60, h: 640, z: 6 })}
${flag(430, 360, 720, 'MINE')}
${bubble(36, 176, 450, 'I HAVE DISCOVERED THIS LAND', { tx: 150, size: 44 })}
${bubble(600, 186, 430, 'bro we literally live here 💀', { tail: 'right', tx: 300, size: 40, weight: 700 })}
${wm('rgba(60,30,10,.6)')}`,
  },

  // 3 ── the fridge
  {
    name: 'fridge',
    html: `
<div class="cap" style="font-size:46px;line-height:1.2">Columbus “discovering” America is like me walking into your house and “discovering” your fridge</div>
${box(0, 250, 1080, 650, 'background-color:#f3ead9;background-image:linear-gradient(90deg,rgba(0,0,0,.07) 2px,transparent 2px),linear-gradient(rgba(0,0,0,.07) 2px,transparent 2px);background-size:90px 90px')}
${box(0, 900, 1080, 180, 'background:linear-gradient(#b98856,#94653b)')}
${box(0, 896, 1080, 8, 'background:#7a5230')}
${box(420, 330, 360, 640, 'background:linear-gradient(90deg,#d9dde2,#f4f6f8 40%,#c9ced4);border-radius:22px;box-shadow:0 20px 40px rgba(0,0,0,.25)')}
${box(440, 350, 320, 600, 'background:radial-gradient(circle at 50% 20%,#fffef2,#f6efd0 70%,#e2d6aa);border-radius:12px;box-shadow:inset 0 0 40px rgba(255,240,170,.9),0 0 90px rgba(255,236,160,.85)')}
${[520, 680, 830].map((y) => box(446, y, 308, 10, 'background:rgba(180,200,215,.9);border-radius:4px;box-shadow:0 3px 0 rgba(0,0,0,.1)')).join('')}
${emoji('🥛', 460, 410, 100)}${emoji('🧀', 580, 430, 80)}${emoji('🍉', 670, 440, 70)}
${emoji('🍗', 470, 580, 90)}${emoji('🍕', 610, 575, 95)}
${emoji('🥚', 470, 740, 80)}${emoji('🧃', 570, 730, 90)}${emoji('🥤', 670, 730, 80)}
${flag(650, 460, 130, 'MINE', 0.55)}
${box(778, 340, 70, 620, 'background:linear-gradient(90deg,#c6ccd2,#eef1f4);border-radius:0 18px 18px 0;transform:skewY(-6deg);transform-origin:left top;box-shadow:8px 10px 20px rgba(0,0,0,.2)')}
${R(1217, { cx: 300, bottom: -40, h: 560, z: 6, rot: 4 })}
${R(127, { cx: 950, bottom: -40, h: 470, z: 6, flip: true })}
${bubble(40, 300, 360, 'a new world… full of snacks', { tx: 200, size: 36 })}
${bubble(760, 520, 300, 'sir that’s MY fridge', { tail: 'right', tx: 170, size: 36 })}
${wm('rgba(0,0,0,.6)', 'left')}`,
  },

  // 4 ── expanding brain
  {
    name: 'expanding-brain',
    html: [
      ['Columbus Day', 1217, 'background:#1b1b1b', 'brightness(.75) grayscale(.3)'],
      ['Columbus Day but you feel kinda weird about it', 114, 'background:radial-gradient(circle at 50% 55%,#3d6dbd,#0f1a3a 70%)', 'drop-shadow(0 0 14px rgba(140,190,255,.7))'],
      ['Indigenous Peoples’ Day', 42, 'background:radial-gradient(circle at 50% 55%,#fff7d0,#ffbf47 35%,#c1501f 80%)', 'drop-shadow(0 0 26px rgba(255,240,180,1))'],
      ['Looking up whose land you’re on at <span style="white-space:nowrap">native-land.ca</span>', 143, 'background:conic-gradient(from 0deg at 50% 60%,#ff6b6b,#ffd93d,#6bff95,#4dd8ff,#b06bff,#ff6b6b)', 'drop-shadow(0 0 30px #fff) drop-shadow(0 0 60px #fff)'],
    ]
      .map(([t, id, bg, f], i) => {
        const y = i * 270;
        let extra = '';
        if (i === 2) extra = box(0, 0, 540, 270, 'background:repeating-conic-gradient(from 0deg at 50% 60%,rgba(255,255,255,.35) 0 6deg,transparent 6deg 18deg)');
        if (i === 3) extra = box(0, 0, 540, 270, 'background:radial-gradient(circle at 50% 60%,rgba(255,255,255,.95),rgba(255,255,255,.2) 45%,transparent 70%)') + stars(7, 60, 0, 0, 540, 270);
        return box(0, y, 540, 270, 'background:#fff;display:flex;align-items:center;padding:0 36px;font-size:44px;line-height:1.15', `<div>${t}</div>`) +
          box(540, y, 540, 270, `${bg};overflow:hidden`, extra + R(id, { cx: 270, bottom: -40, h: 300, filter: f }));
      })
      .join('') +
      [270, 540, 810].map((y) => box(0, y - 2, 1080, 4, 'background:#000;z-index:10')).join('') +
      box(538, 0, 4, 1080, 'background:#000;z-index:10') +
      wm('rgba(255,255,255,.8)'),
  },

  // 5 ── starter pack
  {
    name: 'starter-pack',
    html: `
<div style="position:absolute;left:40px;top:34px;font-family:Arial;font-weight:700;font-size:58px;letter-spacing:-1px">Indigenous Peoples’ Day starter pack</div>
${box(40, 118, 1000, 4, 'background:#000')}
${emoji('🌽', 60, 160, 130)}${emoji('🫘', 190, 200, 110)}${squash(320, 150, 130)}
<div class="label" style="left:60px;top:315px;width:400px">the Three Sisters<br><span style="color:#555">(corn, beans &amp; squash)</span></div>
${box(520, 150, 520, 300, 'background:#fff;border:3px solid #333;border-radius:14px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.2)',
      box(0, 0, 520, 46, 'background:#e8e8e8;border-bottom:2px solid #bbb') +
      box(16, 15, 16, 16, 'background:#ff5f57;border-radius:50%') + box(40, 15, 16, 16, 'background:#febc2e;border-radius:50%') + box(64, 15, 16, 16, 'background:#28c840;border-radius:50%') +
      box(100, 8, 400, 30, 'background:#fff;border-radius:15px;font:600 20px Arial;color:#333;padding:4px 16px', '🔒 native-land.ca') +
      box(0, 46, 520, 254, 'background:linear-gradient(135deg,#c9e4c5,#a7d3e8)') +
      box(30, 80, 190, 120, 'background:rgba(208,98,58,.55);border-radius:40% 60% 50% 40%') + box(170, 120, 200, 140, 'background:rgba(56,178,166,.55);border-radius:60% 40% 40% 60%') +
      box(320, 70, 170, 130, 'background:rgba(227,163,58,.6);border-radius:50% 40% 60% 50%') + box(250, 200, 160, 80, 'background:rgba(126,154,92,.6);border-radius:50%') +
      box(120, 150, 300, 56, 'background:#fff;border-radius:28px;font:700 26px Arial;text-align:center;padding-top:13px;box-shadow:0 4px 10px rgba(0,0,0,.2)', '🔍 Whose land am I on?'))}
<div class="label" style="left:530px;top:462px;width:500px">looking up whose land you’re on</div>
${box(60, 440, 290, 330, 'background:#fff;border:3px solid #333;border-radius:12px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.2);transform:rotate(-4deg)',
      box(0, 0, 290, 66, 'background:#d93a2b;color:#fff;font:700 34px Arial;text-align:center;padding-top:14px;letter-spacing:3px', 'OCTOBER') +
      box(0, 70, 290, 120, 'font:700 110px Arial;text-align:center;line-height:120px', '12') +
      box(0, 196, 290, 40, 'font:600 28px Arial;text-align:center;color:#666;text-decoration:line-through;text-decoration-color:#d93a2b;text-decoration-thickness:5px', 'Columbus Day') +
      box(0, 236, 290, 90, 'font-size:34px;text-align:center;color:#c0261c;line-height:1.05;transform:rotate(-3deg)', '<span class="marker">Indigenous Peoples’ Day ♥</span>'))}
<div class="label" style="left:60px;top:790px;width:330px">updating your calendar</div>
${R(143, { cx: 560, bottom: 120, h: 360, filter: sticker(7) })}
<div class="label" style="left:420px;top:968px;width:290px;text-align:center">the friend who actually read the history</div>
${box(770, 560, 260, 150, 'background:#fff6d8;border:3px solid #333;border-radius:10px 40px 40px 10px;box-shadow:0 8px 18px rgba(0,0,0,.2);transform:rotate(6deg);padding:28px 22px 0 58px;font:700 27px Arial;line-height:1.2',
      box(20, 62, 22, 22, 'background:#fff;border:3px solid #333;border-radius:50%') + '✅ made by a Native artist')}
<div class="label" style="left:760px;top:730px;width:280px">buying the real thing, not knockoffs</div>
${box(800, 820, 200, 230, 'background:linear-gradient(90deg,#5b2a1a 0 14px,#8c3b22 14px);border-radius:4px 12px 12px 4px;box-shadow:0 10px 20px rgba(0,0,0,.3);transform:rotate(-5deg);color:#f5e7c9;font:700 30px Georgia;text-align:center;padding:40px 14px 0 26px;line-height:1.1',
      '1492:<br><span style="font-size:24px;font-weight:400">a guy gets very, very lost</span>')}
${wm()}`,
  },

  // 6 ── tomatoes
  {
    name: 'tomatoes',
    html: `
<div class="cap" style="font-size:46px;line-height:1.18">Italian food before vs. after Indigenous farmers in the Americas gave the world tomatoes 🍅</div>
${box(0, 196, 540, 884, 'background:linear-gradient(#9aa3ad,#6c7680);overflow:hidden',
      `<div class="impact" style="position:absolute;top:24px;width:540px;text-align:center;font-size:72px">BEFORE</div>` +
      emoji('🍞', 150, 170, 230, 'filter:grayscale(.6)') +
      R(131, { cx: 280, bottom: -40, h: 470, filter: 'grayscale(.7) brightness(.85)' }) +
      emoji('💧', 330, 700, 46, 'z-index:5') +
      `<div class="impact" style="position:absolute;bottom:30px;width:540px;text-align:center;font-size:44px;z-index:6">just bread</div>`)}
${box(540, 196, 540, 884, 'background-color:#fff;background-image:linear-gradient(45deg,rgba(214,48,40,.85) 25%,transparent 25%,transparent 75%,rgba(214,48,40,.85) 75%),linear-gradient(45deg,rgba(214,48,40,.85) 25%,transparent 25%,transparent 75%,rgba(214,48,40,.85) 75%);background-size:120px 120px;background-position:0 0,60px 60px;overflow:hidden',
      `<div class="impact" style="position:absolute;top:24px;width:540px;text-align:center;font-size:72px;z-index:6">AFTER</div>` +
      emoji('🍕', 40, 140, 190, 'z-index:3;filter:drop-shadow(0 10px 10px rgba(0,0,0,.3))') + emoji('🍝', 300, 150, 180, 'z-index:3;filter:drop-shadow(0 10px 10px rgba(0,0,0,.3))') + emoji('🍅', 210, 300, 130, 'z-index:3') +
      R(42, { cx: 250, bottom: -40, h: 500, z: 4 }) + emoji('🤌', 400, 640, 110, 'z-index:5;filter:drop-shadow(0 8px 8px rgba(0,0,0,.35))') +
      `<div class="impact" style="position:absolute;bottom:58px;width:540px;text-align:center;font-size:46px;line-height:1.05;z-index:6">grazie,<br>Indigenous farmers</div>`)}
${box(538, 196, 4, 884, 'background:#111;z-index:10')}
${wm('rgba(255,255,255,.9)')}`,
  },

  // 7 ── change my mind
  {
    name: 'change-my-mind',
    html: `
${box(0, 0, 1080, 560, 'background:linear-gradient(#8fd0f5,#dff3fc)')}
${[[-60, 180, 320], [180, 230, 260], [760, 200, 300], [960, 240, 260]].map(([x, y, s]) => box(x, y, s, s, 'background:radial-gradient(circle at 40% 35%,#5f9a45,#2f5e2a 70%);border-radius:50%')).join('')}
${box(0, 480, 1080, 600, 'background:linear-gradient(#7cbf55,#4f8f35)')}
${R(42, { cx: 540, bottom: 360, h: 540, z: 2 })}
${box(80, 690, 920, 30, 'background:linear-gradient(#f2f2f2,#cfcfcf);border-radius:8px;z-index:3;box-shadow:0 6px 0 #999')}
${box(110, 720, 860, 280, 'background:linear-gradient(#2c5aa0,#1f437a);z-index:3')}
${box(150, 1000, 24, 80, 'background:#555;z-index:2')}${box(906, 1000, 24, 80, 'background:#555;z-index:2')}
${emoji('☕', 760, 570, 120, 'z-index:4')}${emoji('📚', 190, 590, 100, 'z-index:4')}
${box(190, 740, 700, 230, 'background:#fff;z-index:5;transform:rotate(-1.5deg);box-shadow:0 6px 14px rgba(0,0,0,.35);text-align:center;padding-top:26px;font-family:Arial;font-weight:900;color:#111',
      '<div style="font-size:46px;line-height:1.05;letter-spacing:-1px">COLUMBUS DIDN’T<br>DISCOVER ANYTHING</div><div style="font-size:62px;margin-top:14px;letter-spacing:-1px">CHANGE MY MIND</div>')}
${box(170, 726, 60, 26, 'background:rgba(230,220,170,.85);z-index:6;transform:rotate(-30deg)')}${box(850, 726, 60, 26, 'background:rgba(230,220,170,.85);z-index:6;transform:rotate(30deg)')}
${wm('rgba(255,255,255,.85)')}`,
  },

  // 8 ── they don't know
  {
    name: 'they-dont-know',
    html: `
${box(0, 0, 1080, 1080, 'background:radial-gradient(circle at 60% 30%,#5a2a7a,#1d0f2e 70%)')}
${box(560, -120, 300, 1100, 'background:linear-gradient(rgba(255,90,200,.35),transparent);transform:rotate(18deg);transform-origin:top center;filter:blur(6px)')}
${box(820, -120, 260, 1100, 'background:linear-gradient(rgba(80,220,255,.35),transparent);transform:rotate(-14deg);transform-origin:top center;filter:blur(6px)')}
${box(380, -120, 240, 1100, 'background:linear-gradient(rgba(255,220,80,.3),transparent);transform:rotate(-24deg);transform-origin:top center;filter:blur(6px)')}
${emoji('🪩', 680, 10, 170, 'filter:drop-shadow(0 0 30px rgba(255,255,255,.8))')}
${R(114, { cx: 560, bottom: 330, h: 300 })}${R(108, { cx: 760, bottom: 345, h: 290, flip: true })}${R(131, { cx: 960, bottom: 335, h: 300 })}
${box(380, 700, 760, 400, 'background:linear-gradient(rgba(29,15,46,0),#1d0f2e 22%);z-index:3')}
${R(127, { cx: 650, bottom: 120, h: 380, z: 4, rot: -5 })}${R(7, { cx: 880, bottom: 110, h: 400, z: 4, rot: 6 })}
${box(380, 900, 760, 220, 'background:linear-gradient(rgba(29,15,46,0),#140a20 30%);z-index:5')}
${emoji('🎉', 470, 380, 110, 'z-index:6')}${emoji('🎶', 1000, 640, 70, 'z-index:6')}${emoji('🥳', 760, 560, 80, 'z-index:6')}
${R(39, { cx: 190, bottom: -50, h: 470, z: 7, filter: 'brightness(.88) saturate(.9)' })}
<svg style="position:absolute;left:112px;top:560px;z-index:8;transform:rotate(-10deg)" width="150" height="150"><path d="M20 120 L75 10 L130 112 Z" fill="#38b2a6" stroke="#111" stroke-width="5"/><path d="M45 70 L105 70 M33 95 L118 95" stroke="#e3a33a" stroke-width="10"/><circle cx="75" cy="10" r="12" fill="#ffd34d" stroke="#111" stroke-width="4"/></svg>
${box(20, 60, 560, 330, 'background:#fff;border-radius:50%;border:5px solid #111;z-index:9;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 60px;font:700 34px Arial;line-height:1.15',
      'they don’t know Berkeley has celebrated Indigenous Peoples’ Day since 1992')}
${box(200, 410, 60, 44, 'background:#fff;border-radius:50%;border:5px solid #111;z-index:9')}${box(190, 470, 34, 26, 'background:#fff;border-radius:50%;border:4px solid #111;z-index:9')}
${wm('rgba(255,255,255,.75)')}`,
  },

  // 9 ── two buttons
  {
    name: 'two-buttons',
    html: `
${box(0, 0, 1080, 560, 'background:linear-gradient(#cfd3d6,#a9aeb2)')}
${box(60, 230, 960, 300, 'background:linear-gradient(#7b8084,#5a5f63);border-radius:30px;box-shadow:inset 0 6px 0 rgba(255,255,255,.25),0 16px 30px rgba(0,0,0,.3)')}
<div class="btn" style="left:150px;top:255px"></div><div class="btn" style="left:680px;top:255px"></div>
<div class="strip" style="left:60px;top:40px;width:430px;transform:rotate(-5deg)">Keep defending Columbus</div>
<div class="strip" style="left:590px;top:30px;width:440px;transform:rotate(4deg)">Admit he thought he was in India</div>
${emoji('👆', 470, 330, 170, 'transform:rotate(-20deg);z-index:6;filter:drop-shadow(0 10px 10px rgba(0,0,0,.35))')}
${box(0, 560, 1080, 520, 'background:radial-gradient(circle at 50% 40%,#f7d27a,#d98b3a 75%);overflow:hidden',
      R(1217, { cx: 540, bottom: -40, h: 560, z: 2 }) +
      [[330, 120, -20], [700, 90, 15], [300, 260, -30], [760, 230, 20], [390, 30, -10], [660, 20, 10]].map(([x, y, r]) => `<div class="drop" style="left:${x}px;top:${y}px;transform:rotate(${45 + r}deg)"></div>`).join(''))}
${box(0, 558, 1080, 4, 'background:#111;z-index:10')}
<div class="impact" style="position:absolute;left:0;top:960px;width:1080px;text-align:center;font-size:60px;z-index:11">the Cabald on October 12</div>
${wm('rgba(255,255,255,.85)')}`,
  },

  // 10 ── nobody: / Remy Boys on October 12:
  {
    name: 'nobody',
    html: `
<div class="cap" style="font-size:52px;line-height:1.25;padding:30px 46px">Nobody:<br><br>Remy Boys on October 12:</div>
${box(0, 280, 1080, 800, 'background:radial-gradient(circle at 50% 70%,#fff2c2,#f7b955 45%,#d06a35 100%)')}
${box(0, 280, 1080, 800, 'background:repeating-conic-gradient(from 0deg at 50% 85%,rgba(255,255,255,.18) 0 7deg,transparent 7deg 20deg)')}
${confetti(12, 70, 0, 290, 1080, 380)}
${[[114, 190], [24, 410], [4, 630], [108, 860]].map(([id, x]) => R(id, { cx: x, bottom: 390, h: 270, z: 2 })).join('')}
${[[131, 90], [42, 280], [143, 460], [127, 640], [7, 820], [39, 1000]].map(([id, x]) => R(id, { cx: x, bottom: 230, h: 340, z: 3 })).join('')}
${box(0, 760, 1080, 320, 'background:#f5e7c9;z-index:4;box-shadow:0 -10px 24px rgba(0,0,0,.25)')}
${box(0, 760, 1080, 60, 'z-index:5', band(1080, 60))}
${box(0, 1020, 1080, 60, 'z-index:5', band(1080, 60, { a: '#38b2a6', b: '#d0623a' }))}
<div class="impact" style="position:absolute;left:0;top:832px;width:1080px;text-align:center;font-size:80px;line-height:1.05;z-index:6;color:#fff;text-shadow:${ring(6, '#22140f')}">HAPPY INDIGENOUS<br>PEOPLES’ DAY</div>
${wm('rgba(255,255,255,.0)')}`,
  },
];
