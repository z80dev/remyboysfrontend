// Shared HTML building blocks for meme sets rendered by scripts/meme/render.mjs (1080 CSS px stage).
// Asset paths are relative to output/meme/: cut/<id>.png (cutout.py), art/<name>.png (paint.py),
// ../../media/halloween/<id>.webp (Halloween collection originals).

export const ring = (px, col = '#000') => {
  const s = [];
  for (let a = 0; a < 16; a++) s.push(`${(Math.cos((a / 16) * Math.PI * 2) * px).toFixed(1)}px ${(Math.sin((a / 16) * Math.PI * 2) * px).toFixed(1)}px 0 ${col}`);
  return s.join(',');
};
export const sticker = (px) =>
  `drop-shadow(${px}px 0 0 #fff) drop-shadow(-${px}px 0 0 #fff) drop-shadow(0 ${px}px 0 #fff) drop-shadow(0 -${px}px 0 #fff) drop-shadow(0 8px 12px rgba(0,0,0,.35))`;

// Remy cut-out anchored by bottom-centre.
export const R = (id, { cx, bottom, h, flip = false, rot = 0, z = 2, filter = '', style = '' }) =>
  `<img src="cut/${id}.png" style="position:absolute;left:${cx}px;bottom:${bottom}px;height:${h}px;z-index:${z};transform:translateX(-50%)${flip ? ' scaleX(-1)' : ''} rotate(${rot}deg);filter:${filter || 'none'};${style}">`;
// Painted art filling a box (object-fit cover; pos = object-position).
export const art = (name, x, y, w, h, { pos = 'center', style = '' } = {}) =>
  `<img src="art/${name}.png" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;object-fit:cover;object-position:${pos};${style}">`;
export const box = (x, y, w, h, style = '', inner = '') =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${style}">${inner}</div>`;
// Halloween collection original (1024 px, opaque) filling a box.
export const hw = (id, x, y, w, h, { pos = 'center', style = '' } = {}) =>
  `<img src="../../media/halloween/${id}.webp" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;object-fit:cover;object-position:${pos};${style}">`;
export const emoji = (e, x, y, s, extra = '') =>
  `<div style="position:absolute;left:${x}px;top:${y}px;font-size:${s}px;line-height:1;font-family:'Apple Color Emoji';${extra}">${e}</div>`;
// Comic speech bubble; the tail hangs from x = tx along the bottom edge.
export const bubble = (x, y, w, text, { size = 38, tail = 'left', tx = 60, z = 6, font = 'Arial', weight = 800 } = {}) =>
  `<div class="bubble t-${tail}" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;z-index:${z};font-family:${font};font-weight:${weight};--tx:${tx}px">${text}</div>`;
export const wm = (col = 'rgba(0,0,0,.55)', side = 'right') =>
  `<div class="wm" style="color:${col};${side === 'left' ? 'left:22px;right:auto' : side === 'top' ? 'top:16px;bottom:auto' : ''}">REMY BOYS</div>`;
// Deterministic RNG for confetti / stars.
export const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export const css = `
.cap { position:absolute; left:0; top:0; width:1080px; background:#fff; color:#000; font-family: Arial, Helvetica, sans-serif;
  padding: 34px 44px; font-size: 52px; line-height: 1.18; font-weight: 400; letter-spacing: -0.5px; z-index: 20; }
.impact { font-family: Impact, 'Anton', sans-serif; color:#fff; text-transform:uppercase; text-shadow:${ring(5)}; letter-spacing: 1px; }
.bubble { position:absolute; background:#fff; border:5px solid #111; border-radius: 34px; padding: 20px 26px; line-height:1.12;
  color:#111; text-align:center; box-shadow: 0 8px 0 rgba(0,0,0,.18); }
.bubble::after, .bubble::before { content:''; position:absolute; bottom:-38px; left:var(--tx); border-style:solid; }
.bubble::before { border-width: 38px 18px 0 18px; border-color:#111 transparent transparent transparent; bottom:-42px; margin-left:-3px; }
.bubble::after { border-width: 30px 13px 0 13px; border-color:#fff transparent transparent transparent; margin-left:2px; }
.t-left::before, .t-left::after { transform: skewX(25deg); }
.t-right::before, .t-right::after { transform: skewX(-25deg); }
.wm { position:absolute; right:22px; bottom:16px; font-family: Anton, Impact, sans-serif; letter-spacing: 4px; font-size: 22px; z-index: 50; }
.label { position:absolute; font-family: Arial, Helvetica, sans-serif; font-size: 27px; line-height:1.15; color:#000; }
.drop { position:absolute; width:34px; height:34px; background: radial-gradient(circle at 35% 35%, #e8fbff, #6cc9f0 45%, #2a8fd0);
  border-radius: 0 50% 50% 50%; transform: rotate(45deg); border:2px solid #1d6ea8; z-index: 9; }
.btn { position:absolute; width:250px; height:250px; border-radius:50%; background: radial-gradient(circle at 50% 60%, #8d8d8d, #5c5c5c 70%);
  box-shadow: inset 0 -10px 0 rgba(0,0,0,.35), 0 14px 24px rgba(0,0,0,.35); }
.btn::after { content:''; position:absolute; left:32px; top:24px; width:186px; height:186px; border-radius:50%;
  background: radial-gradient(circle at 38% 32%, #ff9a8a, #e3261c 45%, #a5110b); box-shadow: 0 10px 0 #6e0905; }
.strip { position:absolute; background:#fffef6; border:3px solid #222; padding: 16px 20px; font-family: Arial; font-weight:700;
  font-size: 36px; line-height:1.12; text-align:center; box-shadow: 0 6px 14px rgba(0,0,0,.25); z-index:5; }
.marker { font-family: 'Marker Felt', 'Chalkboard SE', cursive; }
`;

// Diamond strip (generic geometric band) as inline SVG.
export function band(w, h, { bg = '#22140f', a = '#d0623a', b = '#38b2a6', c = '#f5e7c9', d = '#e3a33a' } = {}) {
  const cell = h / 10, step = h * 1.4;
  let s = `<rect width="${w}" height="${h}" fill="${bg}"/><rect y="${cell}" width="${w}" height="${cell * 0.7}" fill="${d}"/><rect y="${h - cell * 1.7}" width="${w}" height="${cell * 0.7}" fill="${d}"/>`;
  let k = 0;
  for (let x = step / 2; x < w + step; x += step, k++) {
    const cy = h / 2;
    for (const [r, col] of [[3, k % 2 ? a : b], [2, c], [1, k % 2 ? b : a]]) {
      const pts = [];
      for (let i = -r; i <= r; i++) {
        const span = r - Math.abs(i);
        pts.push(`M${x - (span + 0.5) * cell} ${cy + (i - 0.5) * cell}h${(span * 2 + 1) * cell}v${cell}h${-(span * 2 + 1) * cell}z`);
      }
      s += `<path d="${pts.join('')}" fill="${col}"/>`;
    }
    const tx = x + step / 2;
    s += `<path d="M${tx - cell * 1.3} ${cell * 2.6}L${tx} ${cy}L${tx + cell * 1.3} ${cell * 2.6}zM${tx - cell * 1.3} ${h - cell * 2.6}L${tx} ${cy}L${tx + cell * 1.3} ${h - cell * 2.6}z" fill="${c}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">${s}</svg>`;
}

export function confetti(seed, n, x0, y0, w, h) {
  const r = rng(seed), cols = ['#e3a33a', '#d0623a', '#38b2a6', '#f5e7c9', '#7e9a5c', '#ffd34d'];
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w, y = y0 + r() * h, cw = 10 + r() * 12, ch = 18 + r() * 14;
    s += box(x, y, cw, ch, `background:${cols[i % cols.length]};transform:rotate(${(r() * 180) | 0}deg);border-radius:2px;z-index:1;opacity:.95`);
  }
  return s;
}
export function stars(seed, n, x0, y0, w, h, col = '#fff') {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const z = r() < 0.1 ? 5 : r() < 0.4 ? 3 : 2;
    s += box(x0 + r() * w, y0 + r() * h, z, z, `background:${col};border-radius:50%;opacity:${0.4 + r() * 0.6}`);
  }
  return s;
}
// A small "claimed" flag on a pole; (x, y) = pole top.
export const flag = (x, y, poleH, text, scale = 1) => `
<svg style="position:absolute;left:${x}px;top:${y}px;z-index:7;overflow:visible" width="${200 * scale}" height="${poleH}">
  <rect x="0" y="0" width="${10 * scale}" height="${poleH}" rx="${4 * scale}" fill="#6b4226"/>
  <circle cx="${5 * scale}" cy="0" r="${10 * scale}" fill="#e3a33a"/>
  <path d="M${10 * scale} ${8 * scale} C ${70 * scale} ${-14 * scale}, ${120 * scale} ${34 * scale}, ${190 * scale} ${8 * scale} L ${190 * scale} ${118 * scale} C ${120 * scale} ${144 * scale}, ${70 * scale} ${96 * scale}, ${10 * scale} ${118 * scale} Z" fill="#fff" stroke="#111" stroke-width="${4 * scale}"/>
  <text x="${100 * scale}" y="${76 * scale}" text-anchor="middle" font-family="Impact" font-size="${46 * scale}" fill="#c0261c">${text}</text>
</svg>`;
