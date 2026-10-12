/* REMYCRAFT — Oak & Ember (15s, real three.js voxel survival).
   Cue sheet: 0–4 mine two diamond-veined stones (three contact/crack stages each);
   4–8 lay a legal grid bridge and supported stair-tower while the Cabald approaches;
   8–11.5 bait the TNT fuse, blow the deck into individual cubes, send raiders tumbling;
   11.5–15 diamond pickup and a warm, moving sunset victory, with inventory truth.
   Cast reviewed in original portraits: #42 red fringe and expressive eyes (hero);
   #5 and #1217 clean bald faces (Cabald). Only face crops are mapped; every torso,
   oversized head, scalp, hair tuft, articulated limb and tool is actual voxel geometry.
   All scenery/texture/music is original; no commercial game art, logos or audio.
   Scene graph is baked once. Every animated transform/visibility/material resets from t.
   The score leaves 0.3 LU of AAC encode headroom after the draft's measured +0.2 dB
   true-peak overshoot. Imperative game HUD is inspected in encoded frames, not captions.
*/
import { prepare, drawWorld } from './world.js';
import { score } from './score.js';
import { T, MINES, countBuilt } from './timeline.js';
function label(c, text, x, y, size = 26, color = '#fff9db', align = 'left') {
  c.font = `700 ${size}px "JetBrains Mono"`; c.textAlign = align; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#18352b'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
}
function icon(c, kind, x, y) {
  c.save(); c.translate(x, y);
  if (kind === 'wood' || kind === 'stone' || kind === 'tnt') {
    c.fillStyle = kind === 'wood' ? '#bb965a' : kind === 'stone' ? '#94a0ac' : '#e55849'; c.fillRect(-19, -20, 38, 38); c.fillStyle = '#0003'; c.fillRect(8, -20, 11, 38); c.fillStyle = '#fff4'; c.fillRect(-19, -20, 38, 7);
    if (kind === 'tnt') { c.fillStyle = '#fff0d4'; c.fillRect(-19, -5, 38, 15); c.fillStyle = '#83312c'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('TNT', 0, 7); }
    else { c.fillStyle = '#28332955'; c.fillRect(-12, -1, 23, 3); c.fillRect(-9, 11, 21, 3); }
  } else if (kind === 'pick') { c.rotate(-.6); c.fillStyle = '#a87c4d'; c.fillRect(-4, -16, 8, 43); c.fillStyle = '#75e5e4'; c.fillRect(-24, -23, 49, 9); c.fillRect(-24, -23, 8, 21); }
  else { c.fillStyle = '#65f3df'; c.beginPath(); c.moveTo(0, -23); c.lineTo(23, -3); c.lineTo(0, 23); c.lineTo(-23, -3); c.closePath(); c.fill(); c.fillStyle = '#d9fff1'; c.fillRect(-5, -14, 10, 8); }
  c.restore();
}
function hud(c, t) {
  c.fillStyle = '#17392ae0'; c.fillRect(75, 68, 338, 60); label(c, 'REMYCRAFT', 98, 99, 32, '#ffefb8');
  const objective = t < 4 ? 'MINE • GATHER' : t < 8 ? 'BUILD • ESCAPE' : t < 10.5 ? 'CABALD RAID  3' : t < 12 ? 'TRAP ACTIVATED' : 'DIAMOND SECURED';
  c.fillStyle = '#17392acc'; c.fillRect(1370, 68, 475, 60); label(c, objective, 1607, 99, 24, t >= 12 ? '#83ffe4' : '#ffefb8', 'center');
  const wood = 24 - countBuilt(t), stone = MINES.filter(m => t >= m.pop + .65).length;
  const kinds = ['pick', 'wood', 'stone', 'tnt', 'diamond'], counts = ['', wood, stone, t < 5.65 ? 1 : 0, t >= 12 ? 1 : 0];
  const selected = t < 4 ? 0 : t < 5.55 ? 1 : t < 5.9 ? 3 : t < 8 ? 1 : t < 12 ? 3 : 4;
  c.fillStyle = '#142820dd'; c.fillRect(677, 926, 566, 103);
  for (let i = 0; i < 5; i++) { const x = 691 + i * 110; c.fillStyle = i === selected ? '#7c9471' : '#3a4d40'; c.fillRect(x, 938, 96, 78); c.strokeStyle = i === selected ? '#fff5c5' : '#879a79'; c.lineWidth = i === selected ? 5 : 2; c.strokeRect(x, 938, 96, 78); icon(c, kinds[i], x + 43, 973); if (counts[i] !== '') label(c, `${counts[i]}`, x + 82, 1001, 22, '#fffbe5', 'right'); }
  for (let i = 0; i < 10; i++) { const x = 699 + i * 30, y = 894; c.fillStyle = '#253829'; c.fillRect(x - 2, y - 4, 25, 25); c.fillStyle = '#ed6763'; c.fillRect(x, y, 8, 8); c.fillRect(x + 12, y, 8, 8); c.fillRect(x + 4, y + 6, 12, 10); c.fillRect(x + 8, y + 16, 5, 5); }
  label(c, 'LV 42', 1220, 901, 22, '#b8f28b', 'right');
  if (t < 11.5) { c.strokeStyle = '#fff8d6cc'; c.lineWidth = 3; c.beginPath(); c.moveTo(950, 540); c.lineTo(970, 540); c.moveTo(960, 530); c.lineTo(960, 550); c.stroke(); }
  if (t >= 12) { c.fillStyle = '#19372adb'; c.fillRect(651, 160, 618, 88); label(c, 'BUILD. BAIT. BEAUTIFUL.', 960, 204, 33, '#fff1b9', 'center'); }
}
const shot = (name, t0, t1) => ({ name, t0, t1, draw(ctx, lt, dur, t, overlay) { drawWorld(ctx, t); hud(overlay, t); }, fx: () => ({ bloom: .055, bloomThresh: .94, vignette: .22, sat: 1.06, grain: .003 }) });
export default { title: 'REMYCRAFT — Oak & Ember', duration: T.end, output: 'remycraft.mp4', prepare, score, audio: { seed: 424242, reverb: 1.5, reverbGain: .17, lufs: -14.3 }, shots: [shot('mine', 0, 4), shot('bridge-tower', 4, 8), shot('tnt-raid', 8, 11.5), shot('sunset-diamond', 11.5, 15)], captions: [] };
