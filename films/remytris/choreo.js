// REMYTRIS choreography: a real, legal falling-block game, simulated once at load and then read as a pure
// function of film time. Every lock lands on the score's beat grid (bt), so drops, clears and music agree.
// Board rows are indexed bottom-up (h = 0 is the floor); screen y = FY + (ROWS - 1 - h) * CELL.

export const INTRO = 1.5; // title card
export const END_T = 12.5; // ending scene
export const DURATION = 15;
export const LW = 960, LH = 540;
export const CELL = 24, COLS = 10, ROWS = 20, FX = 360, FY = 36;

const hsh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };

// ---------- tempo map (beats → film seconds), music and game share it ----------
// 150 BPM, level-up jumps to 172, then an accelerando into the TETRIS (Russian dance style).
const TEMPO = [[0, 150], [13, 150], [13, 172], [20, 172], [24, 212], [64, 212]];
const bpmAt = (b) => {
  for (let i = TEMPO.length - 1; i >= 0; i--) if (b >= TEMPO[i][0]) {
    const [b0, v0] = TEMPO[i], nx = TEMPO[i + 1];
    if (!nx || nx[0] === b0) return v0;
    return v0 + (nx[1] - v0) * ((b - b0) / (nx[0] - b0));
  }
  return TEMPO[0][1];
};
const DB = 1 / 96, NB = 64 * 96 + 2, BT = new Float64Array(NB);
for (let i = 1; i < NB; i++) BT[i] = BT[i - 1] + (60 / bpmAt((i - 0.5) * DB)) * DB;
export const bt = (b) => {
  if (b <= 0) return INTRO + b * 0.4;
  const f = b / DB, i = Math.min(NB - 2, Math.floor(f));
  return INTRO + BT[i] + (BT[i + 1] - BT[i]) * (f - i);
};
export const beatAt = (t) => {
  if (t <= INTRO) return (t - INTRO) / 0.4;
  let lo = 0, hi = NB - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (INTRO + BT[m] <= t) lo = m; else hi = m; }
  return (lo + (t - INTRO - BT[lo]) / (BT[lo + 1] - BT[lo])) * DB;
};

// ---------- tetrominoes (SRS states; [row from box top, col]) ----------
export const SHAPES = {
  T: [[[0, 1], [1, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [1, 2], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 1]], [[0, 1], [1, 0], [1, 1], [2, 1]]],
  J: [[[0, 0], [1, 0], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 0], [2, 1]]],
  L: [[[0, 2], [1, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [1, 2], [2, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]]],
  S: [[[0, 1], [0, 2], [1, 0], [1, 1]], [[0, 1], [1, 1], [1, 2], [2, 2]], [[1, 1], [1, 2], [2, 0], [2, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]],
  Z: [[[0, 0], [0, 1], [1, 1], [1, 2]], [[0, 2], [1, 1], [1, 2], [2, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]], [[0, 1], [1, 0], [1, 1], [2, 0]]],
  I: [[[1, 0], [1, 1], [1, 2], [1, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 1], [1, 1], [2, 1], [3, 1]]],
  O: [[[0, 1], [0, 2], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 1], [1, 2]]],
};
export const BOX = { I: 4, O: 4, T: 3, J: 3, L: 3, S: 3, Z: 3 };
export const cellsOf = (p, rot, bx, yTop) => SHAPES[p][rot].map(([r, c]) => [yTop - r, bx + c]);

// The Cabald: every block is a bald Remy (quest ids from scripts/quest-bald.json).
export const BALD = [0, 5, 23, 48, 73, 98, 125, 129, 142, 152, 159, 167, 174, 183, 197, 219, 222, 224, 225, 233, 287, 307, 315, 321, 347, 368, 382, 389, 410, 419, 452, 456, 458, 468, 471, 482, 554, 555, 556, 559, 564, 582, 585, 645, 651, 685, 690, 704, 763, 804, 808, 834, 839, 840, 845, 882, 892, 908, 931, 952, 980, 1017, 1033, 1034];
const headFor = (k) => BALD[Math.floor(hsh(k * 3.7 + 11) * BALD.length) % BALD.length];

// ---------- the board ----------
const empty = () => Array.from({ length: 24 }, () => Array(COLS).fill(null));
const cloneB = (b) => b.map((r) => r.slice());
const INIT = [
  'SSZ.......',
  'JSZZ......',
  'JJJOO.....',
  'IIIITTLLL.',
  'ZZOOTSSJL.',
]; // top → bottom; cols 0-8 of the two floor rows stay until the final TETRIS
function initBoard() {
  const b = empty();
  INIT.forEach((row, i) => {
    const h = INIT.length - 1 - i;
    [...row].forEach((ch, c) => { if (ch !== '.') b[h][c] = { t: ch, head: headFor(1000 + h * 10 + c), born: -99 }; });
  });
  return b;
}
export function landing(b, p, rot, bx, from = 21) {
  const fits = (yt) => cellsOf(p, rot, bx, yt).every(([y, c]) => c >= 0 && c < COLS && y >= 0 && (y >= 24 || !b[y][c]));
  let y = from;
  while (fits(y - 1)) y--;
  return y;
}

// Turns, in spawn order. Times are beats (bt converts). hold: the piece goes to the hold box at that beat.
// The placements come from a search for a legal 7-bag sequence: SINGLE → DOUBLE → (garbage) → TRIPLE → TETRIS + ALL CLEAR.
const TURNS = [
  { p: 'J', s: 0, rot: 2, bx: 1, l: 1.5 },
  { p: 'Z', s: 1.75, rot: 0, bx: 4, l: 3 },
  { p: 'O', s: 3.25, rot: 0, bx: 3, l: 4.5, soft: true },
  { p: 'I', s: 4.75, rot: 0, bx: 6, l: 6 },
  { p: 'L', s: 7, rot: 3, bx: 5, l: 8 },
  { p: 'T', s: 8.25, rot: 1, bx: -1, l: 9.25 },
  { p: 'S', s: 9.5, rot: 0, bx: 3, l: 10.5, soft: true },
  { p: 'I', s: 10.75, hold: 11.125 },
  { p: 'J', s: 11.125, rot: 2, bx: 7, l: 12 },
  { p: 'O', s: 15, rot: 0, bx: 6, l: 15.75 },
  { p: 'Z', s: 16, rot: 0, bx: 6, l: 16.75 },
  { p: 'T', s: 17, rot: 2, bx: 1, l: 17.75 },
  { p: 'L', s: 18, rot: 3, bx: 8, l: 19 },
  { p: 'S', s: 20.25, hold: 20.6 },
  { p: 'I', s: 20.6, rot: 1, bx: 7, l: 24, fromHold: true },
];
export const QUEUE = ['J', 'Z', 'O', 'I', 'L', 'T', 'S', 'I', 'J', 'O', 'Z', 'T', 'L', 'S', 'Z', 'T', 'O', 'J', 'L', 'I'];
export const GARBAGE = { throw: 13.25, hit: 14, rise: 0.22, rows: 2 }; // beats; rise in seconds
export const LEVELUP_B = 12.75;
export const TETRIS_B = 24;
export const LEVEL0 = 4, LINES0 = 37, SCORE0 = 52340;
export const SPAWN_ROW = (p) => (p === 'I' ? 20 : 19);
export const SPAWN_BX = 3;
export const gravityAt = (t) => (t < bt(LEVELUP_B) ? 0.22 : 0.1); // seconds per row
export const CLEAR_D = 0.36, TETRIS_D = 1.15; // clear animation lengths (s)
export const HARD_D = 0.05; // hard-drop flight

// Simulate: every placed turn gets board-before, landing, cleared rows, board-after (and garbage applied).
export const STEPS = [];
{
  let b = initBoard(), pieceNo = 0;
  for (let i = 0; i < TURNS.length; i++) {
    const tu = TURNS[i];
    if (tu.hold != null) continue;
    const yTop = landing(b, tu.p, tu.rot, tu.bx);
    const cells = cellsOf(tu.p, tu.rot, tu.bx, yTop);
    const before = cloneB(b);
    const tl = bt(tu.l);
    const placed = cloneB(b);
    cells.forEach(([y, c], k) => { placed[y][c] = { t: tu.p, head: headFor(pieceNo * 4 + k), born: tl, piece: pieceNo }; });
    const full = [];
    for (let y = 0; y < 24; y++) if (placed[y].every(Boolean)) full.push(y);
    let after = placed.filter((_, y) => !full.includes(y));
    while (after.length < 24) after.push(Array(COLS).fill(null));
    const st = { ...tu, turn: i, piece: pieceNo, ts: bt(tu.s), tl, yTop, cells, before, placed, full, after, clearEnd: tl + (full.length === 4 ? TETRIS_D : full.length ? CLEAR_D : 0) };
    if (full.length === 2) {
      // the Cabald answers the double with two garbage rows (hole under the well)
      const g = [0, 1].map((r) => Array.from({ length: COLS }, (_, c) => (c === 9 ? null : { t: 'G', head: headFor(5000 + r * 10 + c), born: bt(GARBAGE.hit) })));
      st.garbage = [...g, ...after.slice(0, 22)];
    }
    STEPS.push(st);
    b = st.garbage ?? after;
    pieceNo++;
  }
  // sanity: no holes, the well (col 9) empty, the TETRIS leaves an empty board
  const last = STEPS[STEPS.length - 1];
  if (last.full.length !== 4 || last.after.some((r) => r.some(Boolean))) throw new Error('REMYTRIS: final TETRIS is not an all clear');
  const clears = STEPS.filter((s) => s.full.length).map((s) => s.full.length).join(',');
  if (clears !== '1,2,3,4') throw new Error('REMYTRIS: clear sequence ' + clears);
}
export const LAST = STEPS[STEPS.length - 1];
export const TETRIS_T = LAST.tl;
export const HOLDS = TURNS.filter((t) => t.hold != null).map((t) => ({ p: t.p, t: bt(t.hold) }));
export const garbageT = () => bt(GARBAGE.hit);

// Which board to draw at film time t: { board, step (clearing step or null), rise (garbage offset 0..1) }.
export function boardAt(t) {
  let b = initBoard(), clearing = null, rise = 0;
  for (const s of STEPS) {
    if (t < s.tl) break;
    if (t < s.clearEnd) { clearing = s; b = s.placed; break; }
    b = s.after;
    if (s.garbage) {
      const tg = garbageT();
      if (t >= tg) { b = s.garbage; rise = Math.min(1, (t - tg) / GARBAGE.rise); }
    }
  }
  return { board: b, clearing, rise };
}

// The active (falling) piece at film time t, or null.
export function activeAt(t) {
  for (let i = 0; i < TURNS.length; i++) {
    const tu = TURNS[i];
    const ts = bt(tu.s);
    const end = tu.hold != null ? bt(tu.hold) : bt(tu.l);
    if (t < ts || t >= end) continue;
    const st = STEPS.find((s) => s.turn === i);
    const before = st ? st.before : boardAt(ts).board;
    const lt = t - ts;
    // input script: rotations first, then shifts (DAS-like taps)
    const rots = tu.rot == null ? 0 : tu.rot === 3 ? 1 : tu.rot;
    const rotDir = tu.rot === 3 ? -1 : 1;
    const fast = ts > bt(LEVELUP_B);
    const target = tu.bx ?? SPAWN_BX, dist = Math.abs(target - SPAWN_BX), dir = Math.sign(target - SPAWN_BX);
    const baseT = fast ? 0.04 : 0.08, baseR = fast ? 0.045 : 0.06, baseS = fast ? 0.032 : 0.045;
    const inputEnd = baseT + rots * baseR + 0.02 + Math.max(0, dist - 1) * baseS + 0.04;
    const scale = Math.min(1, Math.max(0.05, end - ts - (tu.soft ? 0.24 : HARD_D) - 0.02) / inputEnd);
    const t0 = baseT * scale, dr = baseR * scale, ds = baseS * scale;
    let rot = 0, rotAge = 9, shiftAge = 9, bx = SPAWN_BX;
    const nRot = Math.floor(Math.max(0, lt - t0) / dr) + (lt >= t0 ? 1 : 0);
    const doneRot = Math.min(rots, nRot);
    if (doneRot > 0) { rot = ((rotDir * doneRot) % 4 + 4) % 4; rotAge = lt - (t0 + (doneRot - 1) * dr); }
    const tShift0 = t0 + rots * dr + 0.02 * scale;
    const doneSh = lt < tShift0 ? 0 : Math.min(dist, Math.floor((lt - tShift0) / ds) + 1);
    bx = SPAWN_BX + dir * doneSh;
    if (doneSh > 0) shiftAge = lt - (tShift0 + (doneSh - 1) * ds);
    // the tetris I takes its time: slides to the well, then hovers while the music climbs
    if (tu.fromHold && tu.rot != null) {
      const slow = 0.07;
      const nR = lt >= 0.12 ? 1 : 0;
      rot = nR ? tu.rot : 0; rotAge = lt - 0.12;
      const sh = lt < 0.26 ? 0 : Math.min(dist, Math.floor((lt - 0.26) / slow) + 1);
      bx = SPAWN_BX + dir * sh; shiftAge = sh ? lt - (0.26 + (sh - 1) * slow) : 9;
    }
    // gravity, then the drop
    const land = tu.hold != null ? null : landing(before, tu.p, tu.rot, tu.bx);
    const ghost = landing(before, tu.p, rot, bx);
    const spawnY = SPAWN_ROW(tu.p);
    let y = spawnY - Math.floor(lt / gravityAt(t));
    y = Math.max(y, ghost);
    let drop = null;
    if (land != null) {
      const tl = bt(tu.l);
      if (tu.soft) {
        const s0 = tl - 0.24;
        if (t >= s0) {
          const yS = Math.max(ghost, spawnY - Math.floor((s0 - ts) / gravityAt(t)));
          const rowTime = Math.min(0.03, 0.22 / Math.max(1, yS - land));
          y = Math.max(land, yS - Math.floor((t - s0) / rowTime));
          drop = { kind: 'soft', from: yS };
        }
      } else if (t >= tl - HARD_D) {
        const yH = Math.max(land, spawnY - Math.floor((tl - HARD_D - ts) / gravityAt(t)));
        const u = (t - (tl - HARD_D)) / HARD_D;
        y = yH + (land - yH) * u * u;
        drop = { kind: 'hard', from: yH, u };
      }
    }
    return { turn: tu, i, p: tu.p, rot, bx, y, ghost, rotAge, rotDir, shiftAge, shiftDir: dir, lt, drop, held: tu.hold != null ? { at: bt(tu.hold) } : null };
  }
  return null;
}

// ---------- queue / hold ----------
export function queueAt(t) {
  // number of pieces taken from the queue (hold swaps with a held piece don't take one)
  let taken = 0;
  for (const tu of TURNS) if (!tu.fromHold && t >= bt(tu.s)) taken++;
  return QUEUE.slice(taken, taken + 5);
}
export const queueShiftT = TURNS.filter((tu) => !tu.fromHold).map((tu) => bt(tu.s));
export function holdAt(t) {
  let h = null, since = -9;
  for (const x of HOLDS) if (t >= x.t) { h = x.p; since = x.t; }
  return { p: h, since };
}

// ---------- HUD ----------
const PTS = [0, 100, 300, 500, 800];
export const EVENTS = []; // { t, kind, ... } for score/particles/reactions
{
  let level = LEVEL0, lines = LINES0;
  for (const s of STEPS) {
    const d = s.soft ? 0 : (SPAWN_ROW(s.p) - s.yTop);
    EVENTS.push({ t: s.tl, kind: s.soft ? 'soft' : 'lock', step: s, pts: s.soft ? 0 : d * 2 });
    if (s.full.length) {
      const n = s.full.length;
      let pts = PTS[n] * level;
      if (n === 4) pts += 2000 * level; // all clear bonus
      EVENTS.push({ t: s.tl, kind: 'clear', n, step: s, pts, level });
      lines += n;
      const nl = LEVEL0 + Math.floor((lines - 30) / 10) - 0;
      if (nl > level) { level = nl; EVENTS.push({ t: bt(LEVELUP_B), kind: 'levelup', level }); }
    }
  }
  EVENTS.push({ t: bt(GARBAGE.throw), kind: 'throw' });
  EVENTS.push({ t: bt(GARBAGE.hit), kind: 'garbage' });
  for (const h of HOLDS) EVENTS.push({ t: h.t, kind: 'hold', p: h.p });
  EVENTS.sort((a, b) => a.t - b.t);
}
export const SCORE_FINAL = SCORE0 + EVENTS.reduce((a, e) => a + (e.pts ?? 0), 0);
export function hud(t) {
  let score = SCORE0, lines = LINES0, level = LEVEL0, roll = 0;
  for (const e of EVENTS) {
    if (t < e.t) break;
    if (e.pts) {
      const u = Math.min(1, (t - e.t) / (e.kind === 'clear' ? 0.45 : 0.08));
      score += Math.round(e.pts * u);
      if (u < 1) roll = 1;
    }
    if (e.kind === 'clear') lines += e.n;
    if (e.kind === 'levelup') level = e.level;
  }
  return { score, lines, level, roll };
}
export const CLEARS = EVENTS.filter((e) => e.kind === 'clear');
export const LOCKS = EVENTS.filter((e) => e.kind === 'lock' || e.kind === 'soft');
// Boss HP: each clear knocks a chunk off; the TETRIS empties it.
const HP_HIT = { 1: 12, 2: 22, 3: 30, 4: 36 };
export function bossHP(t) {
  let hp = 100;
  for (const e of CLEARS) if (t >= e.t + 0.06) hp -= HP_HIT[e.n] * Math.min(1, (t - e.t - 0.06) / 0.25);
  return Math.max(0, hp);
}
