// One timing truth for sightlines, physical contact, HUD and the original score.
export const T = Object.freeze({ peek: 2.5, peekOpen: 2.85, peekClose: 3.3, peekEnd: 3.65, emerge: 4.35, spotted: 5.25, dodge: 5.8, rush: 6.5, contact: 7.25, down: 8.3, pickup: 9.65, launch: 10.25, zip: 10.85, land: 12.2, codec: 12.35, end: 15 });
export const clamp = x => Math.max(0, Math.min(1, x));
export const seg = (t,a,b) => clamp((t-a)/(b-a));
export const ease = x => x*x*(3-2*x);
export const mix = (a,b,u) => a+(b-a)*u;
export function heroAt(t) {
  if(t<4.35) return {x:mix(-4.5,-1.9,ease(seg(t,.5,4))),z:1.4,y:0,ry:Math.PI/2};
  if(t<5.8) return {x:-1.9,z:1.4,y:0,ry:Math.PI/2};
  if(t<6.5) {const u=ease(seg(t,5.8,6.35));return {x:mix(-1.9,-.5,u),z:mix(1.4,2.1,u),y:.18*Math.sin(Math.PI*u),ry:Math.PI/2};}
  if(t<7.25) {const u=ease(seg(t,6.5,7.25));return {x:mix(-.5,.2,u),z:mix(2.1,.5,u),y:0,ry:Math.PI/2};}
  if(t<8.4) return {x:.2,z:.5,y:0,ry:Math.PI/2};
  if(t<9.65) {const u=ease(seg(t,8.4,9.65));return {x:mix(.2,4,u),z:mix(.5,-1.8,u),y:0,ry:.97};}
  if(t<10.25) return {x:4,z:-1.8,y:0,ry:Math.PI};
  if(t<10.85) {const u=seg(t,10.25,10.85);return {x:4,z:-1.8,y:2.2*Math.sin(u*Math.PI/2),ry:Math.PI};}
  if(t<12.2) {const u=ease(seg(t,10.85,12.2));return {x:mix(4,-4,u),z:mix(-1.8,-6.3,u),y:mix(2.2,.45,u),ry:-Math.PI/2};}
  return {x:-4,z:-6.3,y:mix(.45,0,ease(seg(t,12.2,12.45))),ry:mix(-Math.PI/2,0,ease(seg(t,12.2,12.65)))};
}
export function guardAt(t) {
 const turn=ease(seg(t,3.5,5.25));
 return {x:mix(2.1,1.7,ease(seg(t,0,4))),z:mix(-1,.5,ease(seg(t,0,4))),ry:mix(0,-1.22,turn)};
}
export function sight(t,h,g) {
 const dx=h.x-g.x,dz=h.z-g.z,d=Math.hypot(dx,dz);
 const dot=(dx*Math.sin(g.ry)+dz*Math.cos(g.ry))/d;
 return t>=T.spotted&&t<T.down&&d<5.5&&dot>Math.cos(.62);
}
