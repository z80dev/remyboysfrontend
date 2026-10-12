import {T} from './timeline.js';
// Original 'Crownfall': D Phrygian pedal, irregular 3+3+2 drum cells,
// rising string answer and a luminous D-major release after the finishing slam.
export function score(k){
 k.wind(0,15,.035,220,680);
 k.choir(0,[38,45,50],3.1,.037,'o',.32,.55);
 k.strings(0,[50,57,62],3.8,.025,.18,.4,1700);
 k.choir(4.1,[39,46,51],2.05,.032,'u',.3,.5);
 k.strings(4.1,[51,58,63],2,.022,.18,.5,2100);
 k.choir(6.25,[38,45,53],2.5,.046,'a',.35,.65);
 k.strings(6.25,[50,57,65],2.65,.03,.15,.3,2200);
 k.choir(9.1,[45,50,57],2.1,.042,'a',.15,.35);
 k.strings(9.1,[62,65,69],2.2,.033,.1,.5,3000);
 k.choir(12.05,[50,57,66],2.05,.05,'a',.18,.75);
 k.strings(12.05,[62,66,69,74],2.1,.03,.2,.7,2800);
 for(let i=0;i<26;i++){const t=i*.4;if(t<10.5)k.taiko(t,i%8===0?.48:i%3===0?.3:.14,i%2?94:63);}
 const melody=[62,63,69,65,62,58,57,62];
 melody.forEach((m,i)=>k.strings(1+i*.4,[m],.21,.014,.045,.1,2300));
 [65,69,70,74,77].forEach((m,i)=>k.strings(9.12+i*.38,[m],.3,.022,.04,.15,3000));
 for(const t of T.hits){k.whoosh(t-.22,.34,.18,350,2500);k.taiko(t,.42,105);k.bell(t,630,.055,.3,2.76,1.8);for(let j=0;j<5;j++)k.bell(t-.14+j*.047,1300+j*91,.016,.13,2.3,2.2);}
 k.whoosh(T.dodge,.55,.16,260,1600);k.impact(T.stomp,.5,51);
 k.impact(T.reveal,.42,43);
 for(let i=0;i<4;i++)k.bell(4.9+i*.23,k.hz(74+i*3),.055,.42,2,1);
 k.whoosh(8,.64,.18,400,3100);k.bell(T.hook,810,.13,.4,2.7,2);k.taiko(T.hook,.5,110);
 k.whoosh(T.leap,.7,.13,300,1900);
 k.whoosh(T.slam-.45,.45,.25,800,4200);k.impact(T.slam,.85,43);k.taiko(T.slam,.6,76);k.glass(T.slam,.075,.55);
 [0,.2,.4].forEach((d,i)=>k.taiko(12.05+d,.25-i*.06,80+i*18));
 [74,78,81].forEach((m,i)=>k.bell(12.2+i*.17,k.hz(m),.055,1.5,2,1));
}
