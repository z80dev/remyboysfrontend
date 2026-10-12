import {T} from './timeline.js';
// Original 100 BPM open-fifth choir/synth march, not a quotation of a game theme.
export function score(k){
  const chords=[[50,57,64],[46,53,60],[48,55,62],[50,57,66],[50,57,62]];
  chords.forEach((c,i)=>{k.choir(i*3,c,2.7,.029,i%2?'u':'o',.55,.65);k.pad(i*3,c.map(n=>n-12),2.9,.018,900,.3);});
  for(let t=1.2;t<11.5;t+=.6){k.taiko(t,t%1.2<.1?.31:.19,72);k.pluck(t+.3,[74,69,76,72,69,77,74,81][Math.round(t/.6)%8],.028,1800,.32,'triangle');}
  for(const [t,m] of [[.3,74],[1.2,81],[2.4,78],[3.3,76],[4.5,69],[7.8,74],[11.6,74],[12.2,78],[12.8,81],[13.7,86]])k.bell(t,k.hz(m),.07,1.1,2,.5);
  function energy(t,f,d,g,pan=0){k.at(t,()=>{const o=k.osc('sine',f,t,d),a=k.ac.createGain();o.frequency.exponentialRampToValueAtTime(f*.28,t+d);k.env(a.gain,t,.008,g,d-.012);o.connect(a);k.out(a,1,.18,pan);});}
  function noise(t,d,g,cut){k.at(t,()=>{const n=k.noise(t,d),f=k.ac.createBiquadFilter(),a=k.ac.createGain();f.type='lowpass';f.frequency.setValueAtTime(cut,t);f.frequency.exponentialRampToValueAtTime(160,t+d);k.env(a.gain,t,.005,g,d-.01);n.connect(f).connect(a);k.out(a,1,.15);});}
  // Engine harmonics follow the same drive span; no sampled commercial assets.
  k.at(0,()=>{const a=k.ac.createGain();a.gain.setValueAtTime(.025,0);a.gain.linearRampToValueAtTime(.045,2);a.gain.linearRampToValueAtTime(.014,4);a.gain.linearRampToValueAtTime(0,5);for(const f of [54,108,162]){const o=k.osc('triangle',f,0,5);o.frequency.linearRampToValueAtTime(f*1.8,2);o.frequency.linearRampToValueAtTime(f*.7,4);o.connect(a);}k.out(a,1,.1);});
  noise(T.land,.45,.2,1100);k.taiko(T.land,.45,56);
  energy(5.5,780,.45,.13,.45);energy(T.shield,1550,.65,.19,-.25);noise(T.shield,.24,.07,6000);
  for(const t of T.fire){energy(t,180,.12,.19,-.2);noise(t,.13,.17,4000);}
  energy(T.throw,450,.3,.08);energy(T.stick,1300,.5,.11,.3);
  k.impact(T.blast,.68,48);noise(T.blast,1.3,.25,4500);k.impact(T.chain,.8,40);noise(T.chain,1.8,.32,5500);
  for(const t of [T.checkpoint,T.checkpoint+.16,T.checkpoint+.32])energy(t,850+(t-T.checkpoint)*1500,.24,.085);
  k.taiko(12,.28,82);k.choir(12,[62,66,69,74],2,.032,'a',.4,.65);
}
