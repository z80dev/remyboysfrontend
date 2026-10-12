// One causal puzzle: link the drop to the wall, conserve speed, use the Cabald cube.
export const T = Object.freeze({ blue: 1.1, orange: 2.35, run: 3.3, drop: 4.25, transit: 5.35, emerge: 5.65, land: 6.35, push: 7.6, hit: 9.3, pad: 10.65, open: 11.1, exit: 12.1, end: 15 });
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const prog = (t, a, b) => clamp((t-a)/(b-a));
export const smooth = x => x*x*(3-2*x);
export const mix = (a,b,u) => a+(b-a)*u;
