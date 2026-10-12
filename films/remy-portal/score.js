import { T } from './timeline.js';
// Original 112 BPM laboratory electronica: glass FM answers, soft syncopated
// sub pulses, filtered relay ticks. The solved chord replaces the questioning 9th.
export function score(k){
 const tone=(t,f,d,g=.08,end=f,pan=0,ratio=2,index=.7)=>k.at(t,()=>{const o=k.osc('sine',f,t,d),m=k.osc('sine',f*ratio,t,d),mg=k.ac.createGain(),a=k.ac.createGain();mg.gain.setValueAtTime(f*index,t);mg.gain.exponentialRampToValueAtTime(.1,t+d);m.connect(mg).connect(o.frequency);o.frequency.exponentialRampToValueAtTime(end,t+d);a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(g,t+.012);a.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(a);k.out(a,1,.14,pan);});
 const hiss=(t,d,g,cut,pan=0)=>k.at(t,()=>{const n=k.noise(t,d),f=k.ac.createBiquadFilter(),a=k.ac.createGain();f.type='bandpass';f.frequency.setValueAtTime(cut,t);f.frequency.exponentialRampToValueAtTime(cut*.4,t+d);f.Q.value=1.1;a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(g,t+.009);a.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(f).connect(a);k.out(a,1,.07,pan);});
 const beat=60/112;const motif=[69,76,72,79,76,67,74,72];for(let i=0;i<27;i++){const t=.2+i*beat; if(t>14.2)break;tone(t,k.hz(motif[i%8]),.42,.048,k.hz(motif[i%8]),i%2?.35:-.35,3,.32);if(i%2===0)tone(t,k.hz(i<16?45:48),.43,.12,k.hz(i<16?45:48),0,1,.08);hiss(t+.26,.04,.037,5400,i%2?.2:-.2);if(i%4===2)hiss(t,.11,.035,1800);}
 k.pad(.05,[45,52,59,64],4.2,.026,850,.5);k.pad(4.3,[45,55,59,64],3.8,.025,1000,.4);k.pad(8.1,[48,55,60,64],3.4,.024,1200,.3);k.pad(11.5,[48,55,60,67],3.2,.028,1600,.3);
 for(const [t,f,p] of [[T.blue,260,-.5],[T.orange,370,.3]]){tone(t-.16,160,.38,.13,f*3,p,2.5,1.5);hiss(t,.32,.12,2400,p);tone(t, f*2,.55,.07,f,p,1.5,.5);}
 for(const t of [3.45,3.72,4.02,6.35,6.8,7.15,7.5,7.9,8.3,8.7,9.1,9.5,9.9,10.3,12.3,12.65,13,13.35,13.7,14.05]){tone(t,110,.08,.07,65,0,1,.1);hiss(t,.055,.04,700);}
 tone(T.drop,520,.8,.055,100,-.3,1,.2);hiss(T.transit,.42,.18,3800);tone(T.transit,180,.52,.15,900,0,3,1.2);tone(T.land,110,.2,.16,42);hiss(T.land,.15,.10,900);
 for(const t of [7.65,8.2,8.75,9.75,10.2])hiss(t,.32,.038,380);
 tone(T.hit,240,.48,.22,38,.35,2.7,2.2);hiss(T.hit,.32,.21,1800,.3);tone(T.hit+.07,850,.45,.08,140,.5,4,1);tone(T.pad,120,.18,.17,60);tone(T.pad+.08,660,.22,.07,660,.1,1,.1);
 [60,64,67,72].forEach((n,i)=>tone(T.open+i*.105,k.hz(n),1.35,.10,k.hz(n),i*.16-.24,2,.3));hiss(T.open,.7,.047,520);tone(T.open,95,.7,.07,155);tone(14.1,k.hz(79),.8,.075,k.hz(79),.2,3,.2);
}
