// One clock for the original 128 BPM arena track, contact geometry and replay.
export const T = Object.freeze({ pop:4, jump:4.5, touch:6, goal:8.5, replay:9, live:12, end:15 });
export const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix = (a,b,u)=>a+(b-a)*u;
export const smooth = u=>{u=clamp(u);return u*u*(3-2*u);};
export const worldTime = t=>t<T.replay?t:t<T.live?5.25+(t-T.replay)*.5:9+(t-T.live);
export function heroAt(t){
 if(t<4)return {x:-16+3*t,y:.65,z:.45*Math.sin(t*1.5),pitch:.02*Math.sin(t*9),yaw:0};
 if(t<4.5)return {x:-4+4*(t-4),y:.65-.12*Math.sin((t-4)*Math.PI*2),z:0,pitch:-.08*Math.sin((t-4)*Math.PI*2),yaw:0};
 if(t<6){const u=(t-4.5)/1.5;return{x:mix(-2,3,u),y:mix(.65,4.5,Math.sin(u*Math.PI/2)),z:0,pitch:.25*Math.sin(u*Math.PI/2),yaw:0};}
 if(t<8.5){const u=(t-6)/2.5;return{x:mix(3,17,u),y:.65+3.85*Math.cos(u*Math.PI/2),z:0,pitch:.25*(1-u)-.18*Math.sin(u*Math.PI),yaw:0};}
 const u=clamp((t-8.5)/3.5);return{x:17+2*Math.sin(u*Math.PI),y:.65-.13*Math.exp(-(t-8.5)*5)*Math.sin((t-8.5)*14),z:3*u,pitch:0,yaw:-u*Math.PI*1.8};
}
export function ballAt(t){
 if(t<4){const h=heroAt(t);return{x:h.x+3.22,y:1.35+.14*Math.abs(Math.sin(t*Math.PI*1.5)),z:h.z};}
 if(t<6){const u=(t-4)/2;return{x:mix(-.78,5.94,u),y:mix(1.35,5.25,u)+.65*Math.sin(u*Math.PI),z:0};}
 const u=clamp((t-6)/2.5);return{x:mix(5.94,26.4,u),y:mix(5.25,3,u)+.8*Math.sin(u*Math.PI),z:0};
}
