import {T} from './timeline.js';
// Original 128 BPM, D-minor / B-flat neon breakbeat. Side-pulsed bass,
// metallic FM accents, airy pads, tuned hack handshake and mechanical foley.
export function score(k){
 const beat=60/128;
 k.pad(0,[50,57,62,65],5.5,.025,1400,.6);k.pad(5.6,[46,53,58,62],5.8,.027,1800,.35);k.pad(11.65,[50,57,62,69],3.2,.034,2400,.15);
 const motif=[74,77,81,79,74,72,69,77];
 for(let i=0;i<31;i++){const t=i*beat;if(t>14.35)break;const dodge=t>3.5&&t<5.6;const g=dodge?.34:.54;k.kick(t,g);if(i%2===1)k.clap(t,.20);k.hat(t,.048,.045);k.hat(t+beat*.5,.035,.035);const root=t<5.6?38:t<11.5?34:38;k.bass(t+.04,root+(i%4===3?7:0),beat*.70,.14,'sawtooth',dodge?420:950);if(i%2===0)k.pluck(t+.13,motif[(i/2)%8],.043,3400,.28,'triangle');}
 for(let t=.22;t<13.8;t+=.9375)k.bell(t,620+(Math.round(t*4)%3)*155,.018,.5,2.02,.7);
 k.at(0,()=>{const n=k.noise(0,15);const f=k.ac.createBiquadFilter();f.type='highpass';f.frequency.value=2100;const g=k.ac.createGain();g.gain.setValueAtTime(.018,0);g.gain.setValueAtTime(.018,14.2);g.gain.linearRampToValueAtTime(0,15);n.connect(f).connect(g);k.out(g,1,.1,0,.8);});
 function tone(t,f,d=.22,g=.1,end=f,pan=0){k.at(t,()=>{const o=k.osc('sine',f,t,d);o.frequency.exponentialRampToValueAtTime(end,t+d);const a=k.ac.createGain();k.env(a.gain,t,.008,g,d-.01,0,.015);o.connect(a);k.out(a,1,.12,pan);});}
 k.glitch(T.hack,.15,.042);[480,720,960,1440].forEach((f,i)=>tone(T.hack+i*.085,f,.16,.085));k.whoosh(T.hack,.85,.09,700,2700);
 k.flutter(3.15,8.0,.035);for(let i=0;i<4;i++)tone(3.55+i*.36,1600,.20,.085,250,.25);
 k.whoosh(T.dash-.15,.7,.13,400,2600);tone(T.dash,180,.55,.08,65);
 for(const t of [T.sliceA,T.sliceB]){k.whoosh(t-.2,.30,.18,900,6400);k.clunk(t,.26);k.glass(t+.025,.028,.4);tone(t,95,.26,.14,42);k.glitch(t+.08,.19,.035);}
 k.riser(9.25,T.leap,.08);k.whoosh(T.leap,.9,.16,300,3000);k.clunk(T.land,.24);tone(T.land,88,.35,.12,45);[62,69,74,81].forEach((m,i)=>k.pluck(T.complete+i*.12,m,.095,3600,.65,'triangle'));
 k.at(12,()=>{const o=k.osc('sawtooth',70,12,3);o.frequency.exponentialRampToValueAtTime(230,14.8);const f=k.ac.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(350,12);f.frequency.linearRampToValueAtTime(1100,14.8);const a=k.ac.createGain();a.gain.setValueAtTime(0,12);a.gain.linearRampToValueAtTime(.047,12.5);a.gain.linearRampToValueAtTime(.02,14.8);a.gain.linearRampToValueAtTime(0,15);o.connect(f).connect(a);k.out(a,1,.18,-.3,.4);});
 k.bell(14.15,k.hz(86),.052,.75,2,.9);
}
