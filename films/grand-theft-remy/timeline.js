// Shared picture/music cues. One continuous city: northbound boulevard, right turn, eastbound escape.
export const T = Object.freeze({ door:1.6, seated:2.5, launch:3, turn:6, turnEnd:7.8, ramp:9.05, airborne:9.4, land:10.8, crash:10.25, passed:11.65, end:15 });
export const clamp = x => Math.max(0, Math.min(1,x));
export const smooth = x => {x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,u)=>a+(b-a)*u;
export function drive(t){
  let x=0,z=0,a=0,y=0,pitch=0;
  if(t<T.launch) return {x,z,a,y,pitch};
  if(t<T.turn){const u=(t-3)/3;z=46*u*u;}
  else if(t<T.turnEnd){const u=(t-6)/1.8;a=u*Math.PI/2;x=14*(1-Math.cos(a));z=46+14*Math.sin(a);}
  else {a=Math.PI/2;x=14+(t-7.8)*15;z=60;}
  if(t>=T.ramp && t<T.airborne){const u=(t-T.ramp)/(T.airborne-T.ramp);y=u*1.7;pitch=-0.24;}
  if(t>=T.airborne && t<T.land){const u=(t-T.airborne)/(T.land-T.airborne);y=1.7*(1-u)+4.4*Math.sin(Math.PI*u);pitch=mix(-0.24,0.18,u);}
  if(t>=T.land){y=Math.sin((t-T.land)*19)*Math.exp(-(t-T.land)*5)*0.12;pitch=0.06*Math.sin((t-T.land)*16)*Math.exp(-(t-T.land)*5);}
  return {x,z,a,y,pitch};
}
