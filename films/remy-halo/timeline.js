// One encounter: ridge jump → shielded firefight → sticky-core chain → checkpoint.
export const T = Object.freeze({ end:15, jump:2, land:3.45, stop:4, exit:4.25, ground:5.15, shield:5.95, fire:[6.2,6.42,6.64,7.15,7.37], fall:6.82, throw:8.35, stick:9.65, blast:10.2, chain:10.62, checkpoint:11.55 });
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const seg=(t,a,b)=>clamp((t-a)/(b-a));
export const ease=u=>u*u*(3-2*u);
export const mix=(a,b,u)=>a+(b-a)*u;
export const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};
export function jeepPath(t){const u=ease(seg(t,0,T.stop));return {x:mix(-4,1,u),z:mix(17,-1,u),y:t>=T.jump&&t<T.land?Math.sin(seg(t,T.jump,T.land)*Math.PI)*2.25:0};}
export function heroPath(t){const j=jeepPath(t);if(t<T.exit)return{x:j.x-.5,y:j.y+.85,z:j.z+.2};const u=ease(seg(t,T.exit,T.ground));return{x:mix(.5,-3,u),y:mix(.85,0,u)+Math.sin(u*Math.PI)*1.3,z:mix(-.8,-3,u)};}
