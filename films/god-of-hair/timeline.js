// Shared picture / score truth. Four readable combat phrases, then a living victory pose.
export const T = { sweep: 1.65, hits: [2.15, 2.75, 3.35, 3.95], dodge: 4.8, stomp: 5.45, reveal: 6.25, hook: 8.65, leap: 9.1, crown: 10.25, slam: 11.55, victory: 12.15, end: 15 };
export const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const u=(t,a,b)=>clamp((t-a)/(b-a));
export const ease=v=>v*v*(3-2*v);
export const mix=(a,b,v)=>a+(b-a)*v;
export const rand=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
export const angles=T.hits.map(t=>(t-T.sweep)*Math.PI*2/2.4);
