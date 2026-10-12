// Fighter rig: a quest Remy sprite cut into legs + body, with procedural fists, sleeves and a kicking leg,
// composed at native sprite resolution and placed with integer (nearest) scaling on the 960×540 game canvas.
const MEDIA = new URL('../../media/quest/', import.meta.url);
export const INK = '#140c22';

export const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
};
export async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

export async function loadFighter(id, far = false) {
  const img = await loadImg(new URL(`sprites/${far ? 'far/' : ''}${id}.webp`, MEDIA).href);
  const f = far ? 9 : 6, PAD = 2, bodyH = 576 / f, bodyW = 432 / f, hem = Math.max(2, Math.round((3 * 6) / f));
  const c = canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, d = x.getImageData(0, 0, W, H).data;
  const A = (xx, yy) => d[(yy * W + xx) * 4 + 3];
  const C = (xx, yy) => { const i = (yy * W + xx) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  let top = H, bottom = 0;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (A(xx, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const legTop = PAD + bodyH + hem, cx = PAD + Math.floor(bodyW / 2);
  // body right edge a little above the hem; shoulder a bit higher
  const er = legTop - 14;
  let edge = cx;
  for (let xx = W - 1; xx > cx; xx--) if (A(xx, er)) { edge = xx; break; }
  const shirt = hex(...C(edge - 4, er));
  // skin: most common light colour across the cheeks
  const counts = new Map();
  for (let y = top + 34; y < top + 50; y++)
    for (let xx = cx - 18; xx < cx + 18; xx++) {
      if (!A(xx, y)) continue;
      const [r, g, b] = C(xx, y);
      if (r < 150 || g < r * 0.62 || b < r * 0.45 || b > g || r - b < 25) continue;
      const k = hex(r & 0xf8, g & 0xf8, b & 0xf8);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  const skin = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '#e0b090';
  const mix = (h, t, k) => { const a = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return hex(...a.map((v) => Math.round(v + (t - v) * k))); };
  const skinHi = mix(skin, 255, 0.4), skinLo = mix(skin, 40, 0.3);
  const pants = hex(...C(cx - 5, legTop + 4)), shoe = hex(...C(cx - 5, bottom - 1));
  const sil = canvas(W, H), sx = sil.getContext('2d');
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#fff';
  sx.fillRect(0, 0, W, H);
  return { id, c, sil, w: W, h: H, legTop, cx, top, bottom, edge, shoulder: legTop - 26, shirt, skin, skinHi, skinLo, pants, shoe };
}

// Head crop (portraits): the sprite from its crown to the chin.
export function headCrop(F, k = 1) {
  const h = 58, c = canvas(F.w * k, h * k), x = c.getContext('2d');
  x.drawImage(F.c, 0, F.top, F.w, h, 0, 0, F.w * k, h * k);
  return c;
}

const M = 48; // composition margin (native px)
const scratch = {};
function getScratch(k, w, h) {
  let s = scratch[k];
  if (!s || s.width < w || s.height < h) s = scratch[k] = canvas(w, h);
  const x = s.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.clearRect(0, 0, s.width, s.height);
  return s;
}

const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
// rounded pixel fist (12×10, facing right) or open palm (9×13), centred at (fx, fy)
function fist(x, F, fx, fy, open = false) {
  if (open) {
    const a = Math.round(fx) - 4, b = Math.round(fy) - 6;
    R(x, INK, a + 1, b - 3, 4, 4); R(x, F.skin, a + 2, b - 2, 2, 3);
    R(x, INK, a + 1, b, 7, 13); R(x, INK, a, b + 1, 9, 11);
    R(x, F.skin, a + 1, b + 1, 7, 11);
    R(x, F.skinHi, a + 1, b + 1, 2, 10);
    R(x, F.skinLo, a + 4, b + 3, 4, 1); R(x, F.skinLo, a + 4, b + 6, 4, 1); R(x, F.skinLo, a + 4, b + 9, 4, 1);
    R(x, F.skinLo, a + 1, b + 11, 7, 1);
    return;
  }
  const a = Math.round(fx) - 6, b = Math.round(fy) - 5;
  R(x, INK, a + 2, b, 8, 10); R(x, INK, a + 1, b + 1, 10, 8); R(x, INK, a, b + 2, 12, 6);
  R(x, F.skin, a + 2, b + 1, 8, 8); R(x, F.skin, a + 1, b + 2, 10, 6);
  R(x, F.skinHi, a + 2, b + 1, 7, 2); R(x, F.skinHi, a + 1, b + 2, 2, 3);
  R(x, F.skinLo, a + 2, b + 8, 8, 1); R(x, F.skinLo, a + 1, b + 6, 1, 2);
  R(x, F.skinLo, a + 8, b + 3, 2, 1); R(x, F.skinLo, a + 8, b + 5, 2, 1);
  R(x, INK, a + 10, b + 3, 1, 1); R(x, INK, a + 10, b + 5, 1, 1);
  R(x, INK, a + 3, b + 6, 5, 1); R(x, F.skinHi, a + 3, b + 5, 4, 1);
}
// sleeve from shoulder (sx, sy) to (ex, ey), thickness 7
function sleeve(x, F, sx, sy, ex, ey) {
  const dx = ex - sx, dy = ey - sy, L = Math.hypot(dx, dy);
  x.save();
  x.translate(sx, sy);
  x.rotate(Math.atan2(dy, dx));
  R(x, INK, 0, -4, L, 9);
  R(x, F.shirt, 0, -3, L - 1, 7);
  R(x, 'rgba(255,255,255,0.25)', 0, -3, L - 1, 2);
  R(x, 'rgba(0,0,0,0.25)', 0, 2, L - 1, 2);
  R(x, F.skin, L - 4, -3, 3, 7);
  x.restore();
}

// Compose a posed fighter (facing right) into a scratch canvas.
// o: { lift:[l,r], stride:[l,r], lean, crouch, arm: 'guard'|'punch'|'block'|'palm'|'raise'|'hurt'|null, ext (0..1),
//      kick (0..1 leg raise), kickAng (radians from down), tuck, white, glow, glowA }
function compose(F, o, slot) {
  const W = F.w + M * 2, H = F.h + M * 2;
  const s = getScratch(slot, W, H), x = s.getContext('2d');
  const [ll, lr] = o.lift ?? [0, 0], [sl, sr] = o.stride ?? [0, 0], lean = o.lean ?? 0;
  const lh = F.h - F.legTop, crouch = Math.round(o.crouch ?? 0);
  // legs
  x.drawImage(F.c, 0, F.legTop, F.cx, lh, M + sl, M + F.legTop - ll + crouch, F.cx, lh - crouch);
  if (!o.kick) x.drawImage(F.c, F.cx, F.legTop, F.w - F.cx, lh, M + F.cx + sr, M + F.legTop - lr + crouch, F.w - F.cx, lh - crouch);
  // body, sheared by lean (top moves forward), dropped by crouch
  for (let y = 0; y < F.legTop; y += 2) {
    const hh = Math.min(2, F.legTop - y), dx = Math.round((F.legTop - y) * lean);
    x.drawImage(F.c, 0, y, F.w, hh, M + dx, M + y + crouch, F.w, hh);
  }
  // kicking leg: the front leg cut from the sprite, stretched and swung about the hip, drawn over the shirt
  if (o.kick) {
    const ang = o.kickAng ?? Math.PI * 0.55 * o.kick, len = lh * (1 + 1.5 * o.kick);
    x.save();
    x.translate(M + F.cx + 6, M + F.legTop - 2 + crouch);
    x.rotate(-ang);
    x.drawImage(F.c, F.cx, F.legTop, F.w - F.cx, lh, -4, 0, F.w - F.cx, len);
    x.restore();
  }
  // front arm
  const shX = M + F.edge - 6 + Math.round(26 * lean), shY = M + F.shoulder + 6 + crouch;
  const ext = o.ext ?? 0;
  switch (o.arm) {
    case 'guard': sleeve(x, F, shX, shY + 4, shX + 9, shY - 2); fist(x, F, shX + 12, shY - 3); break;
    case 'punch': { const ex = shX + 6 + 24 * ext * (o.reach ?? 1); sleeve(x, F, shX, shY + 2, ex, shY); fist(x, F, ex + 3, shY); break; }
    case 'block': sleeve(x, F, shX - 2, shY + 6, shX + 6, shY - 10); fist(x, F, shX + 7, shY - 14); fist(x, F, shX + 2, shY - 2); break;
    case 'palm': { const ex = shX + 8 + 18 * ext; sleeve(x, F, shX, shY + 4, ex, shY + 2); fist(x, F, ex + 3, shY - 2, true); fist(x, F, ex + 2, shY + 7, true); break; }
    case 'raise': sleeve(x, F, shX - 4, shY + 2, shX + 2, shY - 30); fist(x, F, shX + 2, shY - 34); break;
    case 'hurt': sleeve(x, F, shX - 2, shY + 2, shX + 4, shY - 16); fist(x, F, shX + 5, shY - 19, true); break;
    default: break;
  }
  if (o.white) {
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = typeof o.white === 'string' ? o.white : '#ffffff';
    x.globalAlpha = o.whiteA ?? 1;
    x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
  }
  return s;
}

// Draw a posed fighter with feet at (x, feet), integer scale S, facing right unless o.flip.
// Extra o: sx, sy (squash), rot, alpha, glow (colour), glowA, shadow (bool)
export function drawFighter(ctx, F, x, feet, S, o = {}) {
  const s = compose(F, o, 0);
  const ax = M + F.w / 2, ay = M + F.bottom + 1;
  const put = (img, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(feet));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((o.flip ? -1 : 1) * S * (o.sx ?? 1), S * (o.sy ?? 1));
    ctx.drawImage(img, -ax, -ay);
    ctx.restore();
  };
  if (o.glow) {
    const g = getScratch(1, s.width, s.height), gc = g.getContext('2d');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [-1, -1], [1, -1]]) gc.drawImage(s, dx, dy);
    gc.globalCompositeOperation = 'source-in';
    gc.fillStyle = o.glow;
    gc.fillRect(0, 0, g.width, g.height);
    put(g, (o.alpha ?? 1) * (o.glowA ?? 1));
  }
  put(s, o.alpha ?? 1);
}

// Static sprite blit (crowd, portraits): feet at (x, feet), integer scale.
export function blit(ctx, F, x, feet, S = 1, { flip = false, alpha = 1, white = false } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(feet));
  ctx.scale(flip ? -S : S, S);
  ctx.drawImage(white ? F.sil : F.c, -Math.round(F.w / 2), -(F.bottom + 1));
  ctx.restore();
}
