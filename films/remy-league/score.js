import { T } from './timeline.js';
// Original "Aerial Hairtime": 128 BPM electro-house in D minor, rising suspended
// harmony through takeoff; goal-aligned downbeat then a bright F-major answer.
export function score(k){
 const beat=60/128,notes=[62,69,72,77,74,72,69,65];
 for(let i=0;i<32;i++){const t=i*beat;if(t>14.4)break;const build=t>5.5&&t<T.goal;
  if(!build)k.kick(t,.67);if(i%2)k.clap(t,.25);k.hat(t,.095);k.hat(t+beat/2,.055,.035);
  if(!build)k.bass(t,[38,38,34,41][Math.floor(i/8)%4],beat*.73,.14,'sawtooth',540);
  k.pluck(t+beat/2,notes[i%8]+(t>12?12:0),.085,2800,.22);
 }
 k.pad(0,[50,57,65],3.8,.025,1900,.3);k.pad(3.8,[46,53,62],4.5,.025,2300,.2);
 k.riser(4.5,T.goal,.13);
 for(let i=0;i<12;i++)k.clap(7+i*.125,.075+i*.007);
 k.impact(T.goal,.65,62);k.crash(T.goal,.24);k.kick(T.goal,.9);
 for(let i=0;i<12;i++){const t=T.goal+i*beat;if(t>14.5)break;k.kick(t,.65);k.bass(t,[41,48,45,48][i%4],.3,.13,'sawtooth',950);for(const n of [65,69,72])k.pluck(t,n+(i%4===3?12:0),.055,3600,.3);}
 k.pad(12,[53,60,65,69],2.8,.045,2400,.15);
 const motor=(t,d,f,g)=>k.at(t,()=>{const o=k.osc('sawtooth',f,t,d),lp=k.ac.createBiquadFilter(),a=k.ac.createGain();lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.linearRampToValueAtTime(950,t+d*.7);o.frequency.linearRampToValueAtTime(f*1.8,t+d);a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(g,t+.08);a.gain.setValueAtTime(g,t+d-.12);a.gain.linearRampToValueAtTime(0,t+d);o.connect(lp).connect(a);k.out(a,1,.015,-.25);});
 motor(.05,3.8,58,.065);motor(4.4,3.6,105,.06);motor(12,2.7,68,.05);
 const hiss=(t,d,g,f)=>k.at(t,()=>{const n=k.noise(t,d),bp=k.ac.createBiquadFilter(),a=k.ac.createGain();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=.6;a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(g,t+.04);a.gain.linearRampToValueAtTime(0,t+d);n.connect(bp).connect(a);k.out(a,1,.1,.2,.2);});
 hiss(T.jump,1.6,.13,2200);hiss(6.05,1.9,.09,3600);hiss(T.goal,2.2,.15,1200);
 for(const t of [1.3,2.7,T.pop,T.touch,10.5]){k.sweepDown(t,.19,230,70,.22,'sine');hiss(t,.09,.07,1300);}
 k.sweepDown(8.52,.7,600,140,.16,'sine');k.sweepDown(14.45,.42,440,220,.08,'sine');
}
