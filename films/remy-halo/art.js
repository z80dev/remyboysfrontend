import {THREE,Stage,canvasTexture} from 'filmkit/stage3d.js';
import {skyDome} from 'filmkit/fx3d.js';
import {hash} from './timeline.js';
export {THREE};
const boxGeo=new THREE.BoxGeometry(1,1,1),ballGeo=new THREE.SphereGeometry(1,20,14),rockGeo=new THREE.IcosahedronGeometry(1,0);
const materials=new Map();
export function mat(c,metal=0,emissive=0){const key=c+':'+metal+':'+emissive;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:c,roughness:.72,metalness:metal,emissive:c,emissiveIntensity:emissive}));return materials.get(key);}
export function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export const box=(p,c,x,y,z,sx,sy,sz)=>mesh(p,boxGeo,typeof c==='number'?mat(c):c,x,y,z,sx,sy,sz);
export const ball=(p,c,x,y,z,sx,sy,sz)=>mesh(p,ballGeo,typeof c==='number'?mat(c):c,x,y,z,sx,sy,sz);
function limb(parent,x,y,color){const g=new THREE.Group();g.position.set(x,y,0);parent.add(g);box(g,0x18232d,0,-.25,0,.31,.52,.34);box(g,color,0,-.23,.07,.39,.38,.42);const end=new THREE.Group();end.position.y=-.5;g.add(end);box(end,color,0,-.2,.06,.34,.4,.38);ball(end,0x202d36,0,-.43,.1,.2,.18,.22);return {g,end};}
export function remy(hero=false){
 const g=new THREE.Group(),armor=hero?0x496b54:0x695487,skin=hero?0xe6c4a1:0xae876b;
 box(g,0x192a30,0,1.05,0,.76,.82,.47);box(g,armor,0,1.2,.15,.92,.62,.53);
 box(g,mat(hero?0x76e0f2:0xbf78fc,.2,.7),0,1.3,.44,.32,.09,.035);
 for(const x of [-.31,.31])box(g,armor,x,.73,.13,.32,.25,.47);
 const head=new THREE.Group();head.position.y=2.08;g.add(head);
 ball(head,skin,0,0,0,.69,.67,.6);ball(head,skin,-.65,-.05,0,.14,.2,.14);ball(head,skin,.65,-.05,0,.14,.2,.14);
 // Sculpted anime eyes, catchlights and brows deliberately follow inspected #42/#1217 portraits.
 for(const x of [-.27,.27]){ball(head,0x211d20,x,-.025,.535,.225,.29,.1);ball(head,0xfaf9e8,x,-.035,.59,.185,.235,.057);ball(head,hero?0x716d29:0x5b405d,x,-.04,.639,.134,.205,.033);ball(head,0x050810,x,-.025,.665,.096,.17,.024);ball(head,0xffffff,x-.036,.065,.69,.046,.058,.012);const b=box(head,0x241a19,x,.31,.57,.37,.055,.055);b.rotation.z=x<0?-.12:.12;}
 ball(head,skin,0,-.22,.58,.07,.08,.08);box(head,0x54292b,0,-.4,.535,.25,.045,.03);
 // Open-face combat helmet leaves face and red crown visible; Cabald domes stay completely bare.
 for(const x of [-.65,.65]){box(head,armor,x,-.22,-.07,.13,.49,.43);box(head,mat(0x77ebff,.3,.4),x,-.2,.17,.14,.09,.1);}
 box(head,armor,0,-.55,0,1.04,.13,.7);
 const tufts=[];
 if(hero){ball(head,0x813c31,0,.39,-.13,.7,.44,.6);for(let i=0;i<9;i++){const a=i/8*Math.PI;const m=mesh(head,new THREE.ConeGeometry(.19,.57,5),mat(i%2?0xa74c39:0x963b30),Math.cos(a)*.54,.44+Math.sin(a)*.19,.38,.9,1,.65);m.rotation.z=Math.PI+(.5-i/8)*.85;tufts.push(m);}for(let i=0;i<5;i++){const m=mesh(head,new THREE.ConeGeometry(.22,.6,5),mat(0x893b32),(i-2)*.25,-.08,-.44,1,1,.7);m.rotation.z=Math.PI;tufts.push(m);}}
 if(hero)ball(head,0x893b32,0,-.05,-.43,.63,.5,.31);
 const left=limb(g,-.64,1.42,armor),right=limb(g,.64,1.42,armor),legs=[];
 for(const x of [-.26,.26]){const l=new THREE.Group();l.position.set(x,.77,0);g.add(l);box(l,0x1d2930,0,-.28,0,.34,.5,.34);box(l,armor,0,-.38,.07,.37,.28,.4);box(l,0x18252d,0,-.68,.14,.4,.2,.61);legs.push(l);}
 const gun=new THREE.Group();right.end.add(gun);gun.position.set(0,-.32,.22);box(gun,0x1b2d37,0,.02,.25,.26,.26,.85);box(gun,armor,0,.13,.15,.33,.17,.48);box(gun,mat(0x8aeeff,.3,1),0,.17,.45,.12,.08,.1);box(gun,0x172229,0,0,.75,.13,.15,.32);
 return {g,head,left,right,legs,gun,tufts};
}
export function jeep(){const g=new THREE.Group();box(g,0x283b39,0,.65,0,2.6,.5,4.1);box(g,0x617960,0,1.05,1.2,2.55,.55,1.5);box(g,0x3b5447,0,.96,-1.4,2.4,.36,.85);box(g,0x101c20,0,.65,2.14,2.7,.19,.18);for(const x of [-.95,.95]){box(g,mat(0xffedba,0,1.5),x,1,1.98,.35,.17,.1);box(g,0x718272,x,1.15,-1.3,.4,.23,.8);box(g,0x283c3c,x,1.85,-.6,.12,1.35,.12);}box(g,0x283c3c,0,2.49,-.6,2,.12,.12);for(const x of [-.55,.55]){box(g,0x1d292b,x,1.12,-.4,.7,.15,.72);box(g,0x1d292b,x,1.39,-.73,.7,.65,.15);}const wheels=[];for(const x of [-1.37,1.37])for(const z of [-1.3,1.3]){const w=new THREE.Group();w.position.set(x,.56,z);g.add(w);const tire=mesh(w,new THREE.CylinderGeometry(.56,.56,.43,14),mat(0x172027),0,0,0);tire.rotation.z=Math.PI/2;const hub=mesh(w,new THREE.CylinderGeometry(.29,.29,.45,8),mat(0x87938f,.6),0,0,0);hub.rotation.z=Math.PI/2;for(let i=0;i<10;i++){const a=i*Math.PI/5;const b=box(w,0x344044,0,Math.sin(a)*.53,Math.cos(a)*.53,.47,.13,.2);b.rotation.x=-a;}wheels.push(w);}return{g,wheels};}
export function buildWorld(){
 const stage=new Stage({fov:52,dof:false,background:0x9bd1e8,exposure:1.1}),scene=stage.scene;
 scene.fog=new THREE.Fog(0xa5cfdb,48,170);
 const sky=skyDome(380);sky.mat.uniforms.uTop.value.set(0x317eb2);sky.mat.uniforms.uMid.value.set(0x9acbde);sky.mat.uniforms.uHorizon.value.set(0xd0e2df);sky.mat.uniforms.uSunDir.value.set(-.5,.65,-.3);sky.mat.uniforms.uSunGlow.value=.12;scene.add(sky);
 scene.add(new THREE.HemisphereLight(0xc6eafa,0x5a6541,2.0));const sun=new THREE.DirectionalLight(0xffe3ba,3.3);sun.position.set(-18,32,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:40,bottom:-35,near:1,far:110});sun.shadow.bias=-.0006;scene.add(sun);sun.target.position.set(0,0,-8);scene.add(sun.target);
 const panel=canvasTexture(128,128,c=>{c.fillStyle='#deded5';c.fillRect(0,0,128,128);c.strokeStyle='#969c98';c.lineWidth=5;c.strokeRect(7,7,114,114);c.strokeStyle='#f7f8ed';c.lineWidth=2;c.strokeRect(10,10,108,108);for(const x of [17,111])for(const y of [17,111]){c.fillStyle='#636b68';c.fillRect(x-2,y-2,4,4);}c.fillStyle='#a9b0aa';for(let i=0;i<16;i++)c.fillRect(hash(i+100)*110+9,hash(i+200)*110+9,hash(i+300)*9+1,1);});
 for(const color of [0x496b54,0x695487,0x617960,0x3b5447,0x82709a])mat(color).map=panel;
 const stone=canvasTexture(256,256,c=>{c.fillStyle='#d3d6d2';c.fillRect(0,0,256,256);for(let i=0;i<1500;i++){const v=hash(i+190);c.fillStyle=v<.3?'#a7b0ac':v<.6?'#bec6bd':'#e1e2d7';c.fillRect(hash(i+200)*256,hash(i+400)*256,1+v*8,1+v*3);}for(let i=0;i<12;i++){c.strokeStyle='#b8c1ba';c.beginPath();const y=hash(i+901)*256;c.moveTo(0,y);c.lineTo(256,y+30);c.stroke();}});
 for(const color of [0x718784,0x9ca997])mat(color).map=stone;
 const tex=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#6e8050';c.fillRect(0,0,w,h);for(let i=0;i<15000;i++){const v=hash(i);c.fillStyle=v<.35?'#425a3b':v<.7?'#a0a56a':'#7b8952';c.fillRect(hash(i+14)*w,hash(i+53)*h,1+v*4,1+v*5);}}, {repeat:[18,18]});
 const ground=mesh(scene,new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({map:tex,roughness:1}),0,-.06,-30);ground.rotation.x=-Math.PI/2;
 // Winding dusty trail with tire-track seams.
 for(let i=0;i<38;i++){const z=25-i*1.45,x=-2+Math.sin(z*.07)*1.2;const b=box(scene,0xa5a27c,x,-.012,z,5,.035,1.52);for(const s of [-1,1])box(scene,0x7e8260,x+s,.014,z,.25,.025,1.5);}
 for(let i=0;i<75;i++){const side=i%2?-1:1,x=side*(21+hash(i)*35),z=18-hash(i+5)*130;const m=mesh(scene,rockGeo,mat(i%3?0x718784:0x9ca997),x,.7+hash(i+2)*3,z,3+hash(i+4)*6,2+hash(i+9)*8,3+hash(i+6)*6);m.rotation.set(hash(i)*2,hash(i+1)*5,hash(i+2));}
 const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.045,.5,3),mat(0x758b45),900),dummy=new THREE.Object3D();for(let i=0;i<900;i++){let x=(hash(i+444)-.5)*65,z=(hash(i+888)-.5)*90;if(Math.abs(x)<5)x+=x<0?-5:5;dummy.position.set(x,.15,z);dummy.rotation.set((hash(i)-.5)*.4,hash(i+2)*6,0);dummy.scale.setScalar(.5+hash(i+3));dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);
 for(let i=0;i<46;i++){const x=(i%2?-1:1)*(5+hash(i+82)*11),z=20-hash(i+72)*45;const r=mesh(scene,rockGeo,mat(0x718784),x,.15,z,.3+hash(i+99)*.5,.2+hash(i+7)*.4,.3+hash(i+79)*.5);r.rotation.y=hash(i)*5;}
 for(const x of [-11,11]){box(scene,0x324f5b,x,.25,-8,1.3,.5,1.3);const p=box(scene,0x789aaa,x,1.4,-8,.52,2.4,.6);p.rotation.z=x<0?-.15:.15;box(scene,mat(0x8aeaff,.3,1),x,1.5,-7.65,.16,1.7,.05);}
 // Monumental ringworld is a real segmented annular ribbon with inset land and metallic rim.
 const ring=new THREE.Group();ring.position.set(-13,8,-112);ring.rotation.set(0,.24,-.24);scene.add(ring);
 const rim=new THREE.MeshStandardMaterial({color:0xb5d1dc,roughness:.7,metalness:.3,fog:false}),landMat=new THREE.MeshStandardMaterial({color:0x6d9885,roughness:1,fog:false});
 for(let i=0;i<120;i++){const a=i/120*Math.PI*2,r=51;const part=box(ring,rim,Math.cos(a)*r,Math.sin(a)*r,0,2.74,2.1,9);part.rotation.z=a+Math.PI/2;const land=box(ring,landMat,Math.cos(a)*(r-1.15),Math.sin(a)*(r-1.15),1.3,2.72,.25,6.5);land.rotation.z=a+Math.PI/2;}
 // Angular ancient gateway and inset panels.
 for(const x of [-8,8]){const p=box(scene,mat(0x748993,.35),x,5,-19,3,10,4);p.rotation.z=x<0?-.17:.17;box(scene,0x354d5d,x,4.9,-16.9,1.8,6,.13);box(scene,mat(0x7ae1ec,.2,.65),x,5,-16.78,.12,6,.09);for(let y=1;y<9;y+=1.4)box(scene,0xabc4c9,x,y,-16.7,2,.055,.06);}box(scene,mat(0x829ca6,.3),0,10,-19,18,1.4,4);box(scene,mat(0x83e5e8,.3,.7),0,9.1,-16.8,13,.12,.15);
 const ramp=box(scene,0x88917b,-2,.16,8,5,.3,3);ramp.rotation.x=-.16;
 const turret=new THREE.Group();turret.position.set(0,0,-16);scene.add(turret);mesh(turret,new THREE.CylinderGeometry(1.7,2.3,.5,8),mat(0x44395b,.3),0,.25,0);box(turret,0x463957,0,1.2,0,1.3,1.7,1.3);const top=new THREE.Group();top.position.y=2.2;turret.add(top);ball(top,0x82709a,0,0,0,1.4,.8,1.2);for(const x of [-.72,.72]){box(top,0x433852,x,.2,1.5,.46,.5,2.2);box(top,mat(0xb988ff,.3,1.5),x,.2,2.62,.32,.32,.08);}const core=ball(turret,mat(0x78e9ff,.2,2),0,1.35,1.02,.47,.5,.23);
 const barrels=[];for(const x of [-2.4,2.3]){const b=new THREE.Group();b.position.set(x,.7,-15);scene.add(b);mesh(b,new THREE.CylinderGeometry(.45,.45,1.4,8),mat(0x51466a,.4),0,0,0);for(const y of [-.4,.4])mesh(b,new THREE.TorusGeometry(.46,.05,6,16),mat(0xa290c3),0,y,0).rotation.x=Math.PI/2;box(b,mat(0x90f1ff,.2,1.3),0,0,.46,.15,.62,.03);barrels.push(b);}
 return{stage,scene,turret,top,core,barrels};
}
