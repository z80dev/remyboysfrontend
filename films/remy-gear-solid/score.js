import {T} from './timeline.js';
// Original 128 BPM minor-sixth ostinato. Sparse surveillance becomes a syncopated
// break at discovery; recovery resolves upward, never quoting a game soundtrack.
function tone(k,t,m,d,g=.06,pan=0){k.at(t,()=>{const o=k.osc('triangle',k.hz(m),t,d);const a=k.ac.createGain();a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(g,t+.012);a.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(a);k.out(a,1,.13,pan,.15);});}
function foley(k,t,d,f,g,pan=0){k.at(t,()=>{const n=k.noise(t,d),b=k.ac.createBiquadFilter(),a=k.ac.createGain();b.type='bandpass';b.frequency.value=f;b.Q.value=.8;a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(g,t+.006);a.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(b).connect(a);k.out(a,1,.04,pan);});}
export function score(k){
 const q=60/128;
 k.rain(0,15,.019);
 k.pad(0,[45,52,59],5.1,.026,1100,.6);k.pad(5.25,[45,48,52,58],3.1,.031,1900,.14);k.pad(8.4,[50,57,60,64],3.8,.028,1500,.3);k.pad(12.2,[57,60,64,69],2.55,.036,2300,.15);
 for(let i=0;i<64;i++){const t=i*q/2;if(t>=14.5)break;const full=t>=T.spotted&&t<12.2;
  if(i%4===0||full&&i%8===3)k.kick(t,full?.33:.22);
  if(full&&i%8===4){foley(k,t,.14,1700,.18);tone(k,t,47,.12,.03);}
  if(i%2===1||full)k.hat(t,i%4===3?.045:.022,.033);
  if(i%2===0)k.bass(t,[45,45,52,48,45,57,52,43][(i/2)%8],q*.34,.065,'triangle',500);
  const notes=t<8.4?[69,76,72,70,64,67,76,71]:[74,81,77,76,69,72,81,76];
  if(i%2===1)tone(k,t,notes[(i>>1)%8],.19,full?.05:.038,Math.sin(i)*.5);
 }
 for(let t=.65;t<4;t+=.52){foley(k,t,.09,310,.06,-.4);k.tick(t+.04,.023,950);}
 for(let t=6.55;t<7.2;t+=.19)foley(k,t,.08,290,.1);
 for(let t=8.45;t<9.55;t+=.21)foley(k,t,.08,320,.09,.4);
 for(const t of [.3,1.7,3.1,4.2])k.blip(t,940,.036,.07,'sine');
 foley(k,T.peek,.25,780,.05,-.5);foley(k,T.peekClose,.2,560,.05,-.4);
 foley(k,T.emerge,.42,620,.13);k.clunk(4.95,.14);
 tone(k,T.spotted,91,.16,.21);tone(k,T.spotted+.13,84,.32,.16);foley(k,T.spotted,.25,2400,.12);
 k.whoosh(T.dodge,.38,.14,250,2000);
 k.whoosh(T.contact-.16,.22,.13,500,2600);foley(k,T.contact,.16,420,.3);tone(k,T.contact,36,.23,.15);k.clunk(T.down,.22);
 [76,81,88].forEach((m,i)=>tone(k,T.pickup+i*.08,m,.38,.12));
 foley(k,T.launch,.24,500,.12);k.whoosh(T.zip,1.2,.09,1200,3500);k.clunk(T.land,.17);
 [69,72,76,81].forEach((m,i)=>tone(k,T.codec+i*.12,m,.8,.1,i*.2-.3));
 for(const t of [12.4,12.56])k.blip(t,1420,.07,.055,'sine');
 tone(k,14.3,81,.55,.06);tone(k,14.3,76,.55,.04);
}
