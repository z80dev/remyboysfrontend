// Cue sheet — every number the picture and the score share. 120 BPM, bar = 2 s, all cuts on bars.
// Cast (chosen from inspected contact sheets, one-word reasons):
//   42  hero — red hair, sword, clean read (the app's own default user)
//   5   Cabald — bald, yellow tee (frequent villain)
//   1217 Cabald — bald, white tee, clean
//   909 testimonial — green hair, scrubs (doctor)
//   908 testimonial — silver hair, suit (finance)
//   2069/420/777/42 — the wallpaper kite quadrants, exactly as the real app composes them

export const DURATION = 72;
export const BAR = 2; // 120 BPM

// shot boundaries (film seconds, all even → on the bar grid)
export const S = {
  boot: 0, logon: 8, desktop: 14, winamp: 24, mines: 28, jezzbald: 32, pinball: 36,
  switchA: 40, switchB: 44, cabald: 48, restore: 54, title: 62, outro: 70, end: 72,
};

// events (film seconds)
export const EV = {
  flagIn: 0.6, mark: 1.4, chime: 6.5,           // boot
  tiles: 8.6, curClick1: 11.0, welcome: 11.5,    // logon
  taskbarUp: 14.4, iconsAt: 14.8, dblClick: 16.7, winOpen: 17.2, winClose: 21.6,
  slamA: 24, slamB: 28, slamC: 32, slamD: 36,    // montage window slams
  sweep0: 28.8, sweep1: 30.6, flagPlant: 31.2,   // minesweeper
  boxed: 35.3,                                    // jezzbald
  flip: 38.4, mult: 38.6,                         // pinball
  portA: 40.4, portB: 44.4,                       // testimonials
  turn: 48.0, d0: 48.4, dStep: 0.4, dN: 6, bigDlg: 51.2, // cabald pile-up
  menu: 54.2, pick: 55.0, bar0: 56.0, bar1: 60.6, done: 60.7, // restore
  slamTitle: 62.6, subTitle: 63.4, tagline: 64.2, url: 66.4, // title card
  startIn: 70.3, curClick2: 71.5, blackout: 71.9, // outro
};

// cabald dialog spawn times (immutable)
export const DLG = Array.from({ length: EV.dN }, (_, i) => EV.d0 + i * EV.dStep);

// clock shown in the tray: starts 4:19, one minute every 10 s of film
export const clock = (t) => {
  const m = 19 + Math.floor(t / 10);
  return `4:${String(m % 60).padStart(2, '0')}`;
};

// beat helpers (groove runs desktop→turn)
export const GROOVE0 = S.desktop, GROOVE1 = S.cabald - 0.5;
export const barRoot = (t) => [38, 45, 47, 43][Math.floor((t - GROOVE0) / BAR) % 4]; // D2 A2 B2 G2
