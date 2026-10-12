// Seconds are the single truth for choreography, crash age, HUD and score.
export const T = Object.freeze({ reveal:1.2, boost:2.0, near:3.75, contact:6.2, resume:9.4, combo:11.05, chain:11.65, payoff:12.1, end:15 });
export const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth = x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,u)=>a+(b-a)*u;
export function distance(t) { return 31*Math.min(t,T.contact)+2.8*clamp(t-T.contact,0,T.resume-T.contact)+35*Math.max(0,t-T.resume); }
export function crashAge(t,onset) { if(onset===T.contact) return Math.max(0,Math.min(t,T.resume)-onset)*0.37+Math.max(0,t-T.resume); return Math.max(0,t-onset)*0.8; }
export function heroX(t) {
  if(t<2) return -2;
  if(t<4.5) return mix(-2,1,smooth((t-2)/2.5));
  if(t<5.75) return 1;
  if(t<6.2) return mix(1,1.5,smooth((t-5.75)/.45));
  if(t<9.4) return mix(1.5,-1.4,smooth((t-6.2)/3.2));
  if(t<11.05) return mix(-1.4,1.5,smooth((t-9.4)/1.65));
  return mix(1.5,-2,smooth((t-11.05)/2));
}
export function boost(t) {return (t>=T.boost&&t<T.contact)||(t>=T.resume&&t<13.3);}
export const SHOTS = [ ['redline',0,T.reveal],['thread-the-needle',T.reveal,T.contact],['takedown-camera',T.contact,T.resume],['back-to-redline',T.resume,T.combo],['chain-reaction',T.combo,13],['hair-raising-finish',13,T.end] ];
