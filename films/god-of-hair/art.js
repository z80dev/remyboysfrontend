import {THREE,Stage,canvasTexture} from 'filmkit/stage3d.js';
import {skyDome,lightCone,glowSprite} from 'filmkit/fx3d.js';
import {rand} from './timeline.js';
export {THREE};
const mat=(color,metalness=0,roughness=.75)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
export function mesh(parent,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,m,x,y,z,w,h,d)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const ell=(p,m,x,y,z,a,b,c)=>{const o=mesh(p,new THREE.SphereGeometry(1,20,16),m,x,y,z);o.scale.set(a,b,c);return o;};
export function actor(hero=false,titan=false){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const skin=mat(hero?0xeec39e:0xae8666),gold=mat(0xcda44f,.7,.3),dark=mat(0x22252d),cloth=mat(hero?0x8e2025:titan?0xede0bb:0x6b552e),hair=mat(0x982e25,.1,.55);
 const torso=mesh(body,new THREE.CylinderGeometry(.49,.6,.92,8),cloth,0,1.2,0);
 box(body,gold,0,.88,0,1.12,.17,.71);box(body,dark,0,.66,0,.95,.35,.65);
 const strap=box(body,gold,0,1.3,.36,.14,1.08,.06);strap.rotation.z=-.5;
 for(let i=-2;i<=2;i++)box(body,cloth,i*.2,.61,.39,.15,.47,.07);
 const head=new THREE.Group();head.position.y=2.22;body.add(head);
 ell(head,skin,0,0,0,.82,.8,.65);ell(head,skin,-.82,-.1,0,.13,.22,.16);ell(head,skin,.82,-.1,0,.13,.22,.16);
 // Remy #42's huge olive eyes and red sculpted fringe; bald #5/#1217 keep clean crowns.
 const white=mat(0xfff5dc),ink=mat(0x100e13),iris=mat(hero?0x7f7b25:0x625079);
 for(const s of [-1,1]){ell(head,white,s*.32,-.03,.564,.225,.29,.105);ell(head,iris,s*.32,-.035,.65,.16,.23,.065);ell(head,ink,s*.32,-.015,.693,.103,.18,.035);ell(head,white,s*.28,.09,.722,.044,.06,.02);const b=box(head,ink,s*.33,.32,.6,.48,.075,.07);b.rotation.z=s*.16;}
 ell(head,skin,0,-.18,.65,.09,.09,.11);const mouth=ell(head,ink,0,-.43,.54,.19,.07,.045);
 if(hero){ell(head,hair,0,.42,-.06,.83,.49,.66);for(let i=0;i<13;i++){const a=i*2.399;const tuft=mesh(head,new THREE.ConeGeometry(.19,.62,5),hair,Math.sin(a)*.64,.49+rand(i)*.28,Math.cos(a)*.51);tuft.rotation.set(.4*Math.cos(a),a,-.6*Math.sin(a));}for(let i=0;i<6;i++){const q=mesh(head,new THREE.ConeGeometry(.17,.53,5),hair,-.64+i*.25,.27+rand(i+30)*.13,.53);q.rotation.z=Math.PI+.3;}for(const s of [-1,1])ell(head,hair,s*.64,-.22,-.2,.19,.49,.32);const ring=mesh(head,new THREE.TorusGeometry(.12,.027,6,16),gold,-.83,-.3,.13);}
 const arms=[],hands=[],legs=[];
 for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*.64,1.58,0);body.add(a);ell(a,gold,0,-.05,0,.29,.22,.28);mesh(a,new THREE.CylinderGeometry(.14,.17,.51,8),skin,0,-.34,0);const fore=new THREE.Group();fore.position.y=-.58;a.add(fore);mesh(fore,new THREE.CylinderGeometry(.19,.16,.4,8),gold,0,-.14,0);ell(fore,skin,0,-.38,0,.19,.2,.18);const hand=new THREE.Object3D();hand.position.y=-.42;fore.add(hand);arms.push(a);hands.push(hand);
 const l=new THREE.Group();l.position.set(s*.28,.67,0);body.add(l);mesh(l,new THREE.CylinderGeometry(.19,.15,.5,8),skin,0,-.22,0);box(l,dark,0,-.52,.1,.39,.3,.58);box(l,gold,0,-.38,.29,.34,.12,.04);legs.push(l);}
 if(titan){for(const s of [-1,1]){ell(body,gold,s*.69,1.57,0,.36,.3,.4);for(let j=0;j<3;j++)mesh(body,new THREE.ConeGeometry(.11,.4,5),gold,s*(.55+j*.15),1.93,0);}const emblem=mesh(body,new THREE.TorusGeometry(.25,.06,6,20),gold,0,1.3,.48);}
 return {root,body,head,arms,hands,legs,hair,mouth};
}
export function comb(){const g=new THREE.Group(),gold=mat(0xffc44f,.8,.24);gold.emissive=new THREE.Color(0x9f4606);gold.emissiveIntensity=.4;box(g,gold,0,0,0,.15,1.12,.12);for(let i=0;i<7;i++){const tooth=box(g,gold,.24,-.42+i*.145,0,.5,.068,.09);tooth.rotation.z=-.2;}box(g,mat(0x5b2615),0,-.76,0,.14,.36,.14);return g;}
export function arena(){
 const stage=new Stage({fov:43,dof:false,background:0x955846,exposure:1.03});const s=stage.scene;s.fog=new THREE.FogExp2(0xa37459,.022);
 const sky=skyDome(180);sky.mat.uniforms.uTop.value.set(0x21243d);sky.mat.uniforms.uMid.value.set(0xb34d3e);sky.mat.uniforms.uHorizon.value.set(0xf2b366);sky.mat.uniforms.uSunDir.value.set(-.5,.16,-1).normalize();s.add(sky);
 s.add(new THREE.HemisphereLight(0xbac3f5,0x493221,2));const sun=new THREE.DirectionalLight(0xffd59c,3.5);sun.position.set(-9,16,-8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.1,far:60});sun.shadow.bias=-.001;s.add(sun);const fill=new THREE.DirectionalLight(0xbad7ff,1.7);fill.position.set(3,7,12);s.add(fill);
 const tex=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#98856b';c.fillRect(0,0,w,h);for(let i=0;i<5500;i++){const a=rand(i);c.fillStyle=a>.5?'rgba(252,221,177,.12)':'rgba(45,29,26,.13)';c.fillRect(rand(i+6)*w,rand(i+99)*h,2+rand(i+88)*12,2);}for(let i=0;i<14;i++){c.beginPath();let x=rand(i+100)*512,y=rand(i+400)*512;c.moveTo(x,y);for(let j=0;j<5;j++){x+=(rand(i*9+j)-.5)*80;y+=rand(i*7+j)*35;c.lineTo(x,y);}c.strokeStyle='#53463b';c.lineWidth=1.5;c.stroke();}});
 const stone=new THREE.MeshStandardMaterial({map:tex,color:0xd4c19a,roughness:.87}),edge=mat(0x685344),gold=mat(0xb08a43,.55,.45);
 mesh(s,new THREE.CylinderGeometry(12.4,13,.65,64),edge,0,-.5,0);
 const tiles=[];for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++)if(x*x+z*z<44){const tile=box(s,stone,x*1.75,-.1,z*1.75,1.7,.18,1.7);tile.rotation.y=(rand(x*29+z)-.5)*.025;if(x*x+z*z>1&&x*x+z*z<10)tiles.push({mesh:tile,x:x*1.75,z:z*1.75});}
 for(const r of [4.8,9.8,11.6]){const m=mesh(s,new THREE.TorusGeometry(r,.035,6,100),gold,0,.012,0);m.rotation.x=Math.PI/2;}
 for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10;const x=Math.cos(a)*10.3,z=Math.sin(a)*10.3-1.5;const g=new THREE.Group();g.position.set(x,0,z);s.add(g);box(g,edge,0,.25,0,1.55,.5,1.55);mesh(g,new THREE.CylinderGeometry(.65,.75,.25,12),gold,0,.62,0);const h=i===3?3.8:6.8;mesh(g,new THREE.CylinderGeometry(.46,.56,h,16),stone,0,.8+h/2,0);for(let j=0;j<10;j++){const a=j*Math.PI/5;mesh(g,new THREE.CylinderGeometry(.042,.05,h,5),edge,Math.cos(a)*.49,.8+h/2,Math.sin(a)*.49);}box(g,stone,0,h+1,0,1.35,.45,1.35);if(i!==3)box(g,stone,0,h+1.45,0,2.9,.5,1.5);}
 // Rear sanctuary stairs and distant mountainous silhouettes.
 for(let j=0;j<4;j++)box(s,stone,0,j*.24,-8-j*.6,7-j*.4,.3,3);
 for(let i=0;i<14;i++){const m=mesh(s,new THREE.ConeGeometry(5+rand(i)*6,8+rand(i+22)*13,5),mat(0x584653),-40+i*6,-1,-33-rand(i+66)*15);m.rotation.y=rand(i)*6;}
 const fires=[];for(const x of [-7,7])for(const z of [-5,3]){const g=new THREE.Group();g.position.set(x,0,z);s.add(g);mesh(g,new THREE.CylinderGeometry(.35,.65,1.7,8),edge,0,.85,0);mesh(g,new THREE.CylinderGeometry(.77,.3,.42,10),gold,0,1.8,0);for(let i=0;i<4;i++){const f=mesh(g,new THREE.ConeGeometry(.29,1.45,6),new THREE.MeshBasicMaterial({color:i%2?0xffbe38:0xf25c20}),Math.sin(i*2)*.26,2.4,Math.cos(i*2)*.26);fires.push(f);}const glow=glowSprite(0xff7b24,3,.55);glow.position.y=2.4;g.add(glow);const l=new THREE.PointLight(0xff7020,14,9,2);l.position.y=2.5;g.add(l);}
 for(let i=0;i<3;i++){const cone=lightCone(2.5,15,0xffb670,.035);cone.position.set(-7+i*5,13,-6);cone.rotation.z=-.55;s.add(cone);}
 const cracks=new THREE.Group();s.add(cracks);for(let i=0;i<20;i++){const a=i*2.399;const g=new THREE.Group();g.rotation.y=a;cracks.add(g);for(let j=0;j<4;j++){const b=box(g,mat(0xff9d29),.12*j,.025,1+j*.85,.045,.012,.95);b.rotation.y=(rand(i*4+j)-.5)*.7;}}
 return {stage,fires,cracks,stone,tiles};
}
