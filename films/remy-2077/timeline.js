// One clock for physical contact, UI, camera cuts and original score.
export const T = Object.freeze({ hack: 2.0, laser: 3.7, dash: 4.2, sliceA: 6.65, sliceB: 8.05, leap: 9.6, land: 11.35, complete: 11.65, depart: 12.0, end: 15 });
export const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const seg=(t,a,b)=>clamp((t-a)/(b-a));
export const ease=x=>x*x*(3-2*x);
export const mix=(a,b,u)=>a+(b-a)*u;
export const H=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function heroPath(t) {
  if(t<3)return [-6+seg(t,.3,1.6)*1.1,0,0];
  if(t<6)return [mix(-4.9,.8,ease(seg(t,3.7,5.35))),0,-1.5*Math.sin(Math.PI*seg(t,3.8,5.55))];
  if(t<T.sliceA)return [mix(.8,1.45,ease(seg(t,6,T.sliceA))),0,0];
  if(t<T.sliceB)return [mix(1.45,4.25,ease(seg(t,T.sliceA,T.sliceB))),0,0];
  if(t<T.leap)return [mix(4.25,8,ease(seg(t,T.sliceB,T.leap))),0,0];
  if(t<11.35){const u=seg(t,T.leap,T.land);return [mix(8,16,u),Math.sin(Math.PI*u)*4.0+.7*u,0];}
  const u=ease(seg(t,12,15));return [16+9*u,.7+2.4*u,0];
}
