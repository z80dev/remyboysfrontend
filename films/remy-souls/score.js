import { T } from './timeline.js';
// Original "Ashes of the Fringe": D-minor choral lament, rising string ostinato,
// ringing blade parry, then a D-major release. No borrowed melody or sample.
export function score(k) {
 k.rain(0,15,.026);k.wind(0,15,.016,260,670);
 k.choir(0,[50,57,65],3.3,.021,'u',.8,1.1);
 k.strings(.15,[50,57,62],3.2,.012,.7,.8,1500);
 k.piano(.3,74,.07,2.0);k.piano(1.2,69,.06,2);k.piano(2.3,65,.06,1.6);
 k.choir(3.5,[46,53,62],2.6,.024,'o',.65,.9);
 k.strings(3.7,[58,65,69],2.5,.014,.45,.7,1900);
 k.choir(6.7,[45,52,61],2.1,.026,'a',.45,.7);
 for(let i=0;i<12;i++){
 const t=4.5+i*.34;if(t>8.5)break;
 k.strings(t,[[62,65],[60,64],[61,67],[65,69]][i%4],.18,.008,.045,.13,1900+i*60);
 }
 for(const [t,g] of [[1.65,.14],[2.55,.15],[3.45,.26],[5.5,.14],[6.25,.19],[8.05,.20],[8.4,.22],[8.65,.31]])k.taiko(t,g,65);
 k.whoosh(3.05,.4,.14,190,2200);k.clunk(T.slam,.28);
 k.whoosh(5.99,.58,.13,400,3100);
 // Distinct high metallic partials at exact visible blade intersection.
 k.at(T.parry,()=>{
 for(const [f,g] of [[930,.11],[1470,.09],[2390,.055],[3640,.025]]){
 const o=k.osc('sine',f,T.parry,.65),a=k.ac.createGain();k.env(a.gain,T.parry,.002,g,.43,0,.2);o.connect(a);k.out(a,1,.32,-.12);
 }
 const n=k.noise(T.parry,.08),a=k.ac.createGain(),b=k.ac.createBiquadFilter();b.type='highpass';b.frequency.value=2000;k.env(a.gain,T.parry,.001,.13,.07);n.connect(b).connect(a);k.out(a,1,.12);
 });
 k.whoosh(8.3,.35,.12,270,2600);k.impact(T.riposte,.23,65);k.clunk(T.riposte,.20);
 k.swell(7.5,8.65,.10,5000);k.glass(T.crumble,.05,1.1);
 k.choir(9.55,[50,57,66,73],3.6,.027,'o',.6,.85);
 k.strings(9.8,[62,66,69,74],3.4,.017,.6,.8,2300);
 for(const [t,m] of [[10.6,74],[11.1,78],[11.65,81],[12.3,78],[13,74],[13.7,69]])k.piano(t,m,.085,1.2);
 k.whoosh(T.fire,.9,.09,160,1100);k.hiss(T.fire,4,.02);
 for(const t of [.72,1.14,1.52,4.45,4.85,5.25,9.9,10.3,10.7])k.clunk(t,.04);
}
