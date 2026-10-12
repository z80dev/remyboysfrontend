// One timing truth for blades, stamina, boss vitality, camera and the original score.
export const T = Object.freeze({ end: 15, windup: 1.65, roll: 3.0, slam: 3.45, land: 4.05, sweep: 5.5, parry: 6.65, riposte: 8.65, crumble: 9.25, fire: 10.6, victory: 11.2 });
export const clamp = (x) => Math.max(0, Math.min(1, x));
export const u = (t,a,b) => clamp((t-a)/(b-a));
export const ease = (x) => x*x*(3-2*x);
export const mix = (a,b,x) => a+(b-a)*x;
export const C = Object.freeze({ parry: [0.02,1.72,0.23], chest: [0.92,1.6,-0.08], slam: [-1.4,0.12,1.05] });
export function track(t, knots, out) {
 let i=0; while(i<knots.length-2 && t>knots[i+1][0]) i++;
 const a=knots[i], b=knots[i+1], v=ease(u(t,a[0],b[0]));
 for(let k=0;k<3;k++) out[k]=mix(a[k+1],b[k+1],v);
 return out;
}
export const HERO = [[0,-1.7,0,2.8],[1.65,-1.4,0,1.05],[3,-1.4,0,1.05],[4.05,-2.3,0,-0.9],[5.6,-1.2,0,0.65],[6.65,-1.2,0,0.65],[7.8,-1.2,0,0.65],[8.65,-0.55,0,0.15],[9.6,-0.8,0,0.4],[11,-1.7,0,2],[15,-1.7,0,2]];
export function stamina(t) {
 return clamp(1-0.43*u(t,3,3.18)+0.32*u(t,4.05,5.6)-0.28*u(t,6.55,6.65)+0.22*u(t,7,8.2)-0.5*u(t,8.3,8.65)+0.67*u(t,9.25,12));
}
export function vitality(t) { return 1-u(t,T.riposte,T.riposte+0.22); }
