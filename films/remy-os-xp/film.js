// REMY OS xp — THE COMMERCIAL · 72 s launch film, 120 BPM, all cuts on 2 s bars.
// A boot, a log-on, a desktop that grows on you — then the Cabald tries an illegal
// haircut and System Restore puts every hair back. Original art, original score.
import { lerp, seg, F } from 'filmkit/lib.js';
import { DURATION, S, EV } from './timeline.js';
import { init } from './art.js';
import { score } from './score.js';
import {
  sceneBoot, sceneLogon, sceneDesktop, sceneWinamp, sceneMines, sceneJezz, scenePinball,
  sceneSwitch, sceneCabald, sceneRestore, sceneTitle, sceneOutro,
} from './scenes.js';

const gameFx = () => ({ grain: 0.01, vignette: 0.28, bloom: 0.05, bloomThresh: 0.86 });

export default {
  title: 'Remy OS xp — The Commercial',
  output: 'remy-os-xp.mp4',
  duration: DURATION,
  grid: { bar: 2 },
  async prepare() { await init(); },
  shots: [
    { name: 'boot', t0: S.boot, t1: S.logon, draw: (c, lt, d, t) => sceneBoot(c, lt, t), fx: () => ({ vignette: 0.35, grain: 0.008 }) },
    { name: 'logon', t0: S.logon, t1: S.desktop, draw: (c, lt, d, t) => sceneLogon(c, lt, t), fx: () => ({ vignette: 0.3, grain: 0.008 }) },
    { name: 'desktop', t0: S.desktop, t1: S.winamp, draw: (c, lt, d, t) => sceneDesktop(c, lt, t), fx: () => ({ grain: 0.01, vignette: 0.22, bloom: 0.04 }) },
    { name: 'winamp', t0: S.winamp, t1: S.mines, draw: (c, lt, d, t, o) => sceneWinamp(c, lt, t, o), fx: gameFx },
    { name: 'mines', t0: S.mines, t1: S.jezzbald, draw: (c, lt, d, t, o) => sceneMines(c, lt, t, o), fx: gameFx },
    { name: 'jezzbald', t0: S.jezzbald, t1: S.pinball, draw: (c, lt, d, t, o) => sceneJezz(c, lt, t, o), fx: gameFx },
    { name: 'pinball', t0: S.pinball, t1: S.switchA, draw: (c, lt, d, t, o) => scenePinball(c, lt, t, o), fx: gameFx },
    { name: 'switch-a', t0: S.switchA, t1: S.switchB, draw: (c, lt, d, t) => sceneSwitch(c, lt, t, 'a'), fx: () => ({ vignette: 0.5, grain: 0.012, warm: 0.03 }) },
    { name: 'switch-b', t0: S.switchB, t1: S.cabald, draw: (c, lt, d, t) => sceneSwitch(c, lt, t, 'b'), fx: () => ({ vignette: 0.5, grain: 0.012, warm: 0.03 }) },
    {
      name: 'cabald', t0: S.cabald, t1: S.restore, draw: (c, lt, d, t) => sceneCabald(c, lt, t),
      fx: (lt) => ({ sat: 0.52, exposure: 0.96, vignette: 0.5, grain: 0.018, glitch: Math.max(0, 0.025 + 0.025 * Math.sin(lt * 6.3)) }),
    },
    {
      name: 'restore', t0: S.restore, t1: S.title, draw: (c, lt, d, t) => sceneRestore(c, lt, t),
      fx: (lt) => ({ sat: lerp(0.52, 1, seg(lt, 2, 6.5)), vignette: 0.35, grain: 0.012 }),
    },
    { name: 'title', t0: S.title, t1: S.outro, draw: (c, lt, d, t) => sceneTitle(c, lt, t), fx: () => ({ bloom: 0.1, bloomThresh: 0.88, vignette: 0.26, grain: 0.01 }) },
    { name: 'outro', t0: S.outro, t1: DURATION, draw: (c, lt, d, t) => sceneOutro(c, lt, t), fx: () => ({ vignette: 0.6, grain: 0.006 }) },
  ],
  captionStyles: {
    quote: { font: F.grot, size: 46, weight: '600', color: '#ffffff', align: 'center', x: 1290, y: 480, lineHeight: 1.34, anim: 'rise', in: 0.3, out: 0.3 },
    qname: { font: F.grot, size: 26, weight: '700', color: '#ffd9a0', align: 'center', x: 1290, y: 640, track: 3, anim: 'fade', in: 0.1, out: 0.1 },
  },
  captions: [
    { id: 'boot-kick', style: 'kicker', text: 'October 2026. Hair gets an operating system.', t0: 2.4, t1: 7.6, y: 975 },
    { id: 'desk-lower', style: 'lower', text: 'The desktop grows on you.', t0: 17.8, t1: 23.2, y: 962 },
    { id: 'qa', style: 'quote', text: '“I run a rug-detection\nclinic on it.”', t0: 40.2, t1: 43.9 },
    { id: 'qa-n', style: 'qname', text: 'DR. GREEN FLOW · REMY #909', t0: 40.6, t1: 43.9 },
    { id: 'qb', style: 'quote', text: '“My hair portfolio has never\nbeen this organized.”', t0: 44.2, t1: 47.9 },
    { id: 'qb-n', style: 'qname', text: 'SILVER · REMY #908', t0: 44.6, t1: 47.9 },
    { id: 'cab-kick', style: 'kicker', text: 'somewhere, a barber is smiling.', t0: 49.4, t1: 53.5, y: 170, glow: 'rgba(8,16,44,.9)', glowBlur: 16 },
    { id: 'res-lower', style: 'lower', text: 'System Restore — undoing illegal haircuts.', t0: 56.4, t1: 60.6, y: 962 },
    { id: 'tag', style: 'title', text: 'Where do you want to grow today?', t0: 63.9, t1: 68.0, size: 64, y: 880, in: 0.4, out: 0.4 },
  ],
  flashes: [
    [8, 0.14, 0.12], [EV.curClick1, 0.22, 0.1],
    [24, 0.2, 0.08], [28, 0.2, 0.08], [32, 0.2, 0.08], [36, 0.2, 0.08],
    [EV.flagPlant, 0.14, 0.1], [EV.boxed, 0.16, 0.1], [EV.flip, 0.13, 0.08],
    [EV.bigDlg, 0.24, 0.14], [EV.done, 0.16, 0.1],
    [EV.slamTitle, 0.3, 0.16], [EV.curClick2, 0.2, 0.09],
  ],
  score,
  audio: { seed: 11, reverb: 1.4, reverbGain: 0.22 },
  lint: { safe: { margin: 0.05 } },
};
