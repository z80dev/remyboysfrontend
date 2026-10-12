import { Stage, THREE, canvasTexture } from 'filmkit/stage3d.js';
import { rain } from 'filmkit/fx3d.js';
import { hash } from 'filmkit/lib.js';
export const V = THREE.Vector3;
const UP=new V(0,1,0), va=new V(), vb=new V();
const sphere=new THREE.SphereGeometry(1,20,14), box=new THREE.BoxGeometry(1,1,1), cylinder=new THREE.CylinderGeometry(1,1,1,10);
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:0.7,...o});
export function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1) {
 const a=new THREE.Mesh(g,m); a.position.set(x,y,z); a.scale.set(sx,sy,sz); a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;
}
export function link(m,a,b,r=0.1) {
 va.fromArray(a);vb.fromArray(b);m.position.copy(va).add(vb).multiplyScalar(0.5);vb.sub(va);m.scale.set(r,vb.length(),r);m.quaternion.setFromUnitVectors(UP,vb.normalize());
}
function stoneTexture() {
 return canvasTexture(512,512,(c)=>{
 c.fillStyle='#49505b';c.fillRect(0,0,512,512);
 for(let i=0;i<8000;i++){const x=hash(i*7)*512,y=hash(i*7+1)*512;const v=45+Math.floor(hash(i*7+2)*55);c.fillStyle=`rgba(${v},${v+5},${v+9},.28)`;c.fillRect(x,y,2+hash(i)*7,1+hash(i+3)*5);}
 for(let y=0;y<512;y+=64){c.strokeStyle='#272e37';c.lineWidth=4;c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();for(let x=(y%128?32:0);x<512;x+=128){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+64);c.stroke();}}
 },{repeat:[2,2]});
}
function faceTexture(bald) {
 return canvasTexture(512,512,c=>{
 c.clearRect(0,0,512,512);
 // Hand-painted Remy eyes, brows and smirk: #42 gold-eyed redhead; #1217 violet-eyed Cabald.
 for(const x of [156,356]){
 c.fillStyle='#f4e9d8';c.beginPath();c.ellipse(x,258,63,80,0,0,Math.PI*2);c.fill();
 c.fillStyle='#141018';c.beginPath();c.ellipse(x,250,52,77,0,0,Math.PI*2);c.fill();
 c.fillStyle=bald?'#8b739b':'#aaa052';c.beginPath();c.ellipse(x,284,36,42,0,0,Math.PI*2);c.fill();
 c.fillStyle='#11101b';c.beginPath();c.ellipse(x,246,24,51,0,0,Math.PI*2);c.fill();
 c.fillStyle='#fff';c.beginPath();c.ellipse(x-18,219,14,20,-.3,0,Math.PI*2);c.fill();c.beginPath();c.arc(x+19,260,7,0,Math.PI*2);c.fill();
 c.strokeStyle='#26191c';c.lineWidth=16;c.lineCap='round';c.beginPath();c.moveTo(x-61,157+(x>200?14:0));c.lineTo(x+55,170-(x>200?14:0));c.stroke();
 }
 c.fillStyle='#9a6056';c.beginPath();c.moveTo(222,370);c.quadraticCurveTo(263,395,299,361);c.quadraticCurveTo(267,405,245,400);c.closePath();c.fill();
 c.fillStyle='#ffcebe';c.beginPath();c.ellipse(260,329,12,7,0,0,Math.PI*2);c.fill();
 });
}
export function actor(parent,bald=false) {
 const root=new THREE.Group(), pivot=new THREE.Group(), body=new THREE.Group();parent.add(root);root.add(pivot);pivot.position.y=1.3;pivot.add(body);body.position.y=-1.3;
 const skin=mat(bald?'#b99072':'#eed2b6',{roughness:.62}), armor=mat(bald?'#394955':'#394457',{metalness:bald?.78:.4,roughness:.34}), edge=mat('#b99558',{metalness:.8,roughness:.3}), dark=mat('#151c26'), cloth=mat(bald?'#372439':'#522e36');
 const torso=mesh(body,new THREE.CylinderGeometry(.39,.5,.85,8),armor,0,1.08,0);torso.rotation.z=0;
 mesh(body,box,edge,0,.86,.38,.62,.06,.07);mesh(body,box,edge,0,1.36,.37,.18,.19,.05);
 const head=mesh(body,sphere,skin,0,2,0,.63,.65,.59);
 for(const s of [-1,1])mesh(body,sphere,skin,s*.61,1.92,0,.14,.21,.11);
 // Curved facial decal follows the sculpted head, not a billboard character.
 const geo=new THREE.SphereGeometry(1,24,16,-.79,1.58,.72,1.65);
 const face=mesh(body,geo,new THREE.MeshBasicMaterial({map:faceTexture(bald),transparent:true,side:THREE.DoubleSide,depthWrite:false}),0,2,0,.639,.659,.60);
 face.rotation.y=Math.PI/2;
 if(!bald){
 const hair=mat('#9d3937',{roughness:.77}),hairHi=mat('#b44942');
 mesh(body,new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,1.7),hair,0,2.13,-.04,.69,.64,.64);
 for(let i=0;i<12;i++){
 const angle=i/12*Math.PI*2;const tuft=mesh(body,new THREE.ConeGeometry(.19,.67,5),i%3?hair:hairHi,Math.cos(angle)*.55,1.99+hash(i)*.2,Math.sin(angle)*.55,.9,1,.8);tuft.rotation.z=Math.cos(angle)*.6;tuft.rotation.x=-Math.sin(angle)*.55;
 }
 for(let i=0;i<5;i++){const bang=mesh(body,new THREE.ConeGeometry(.18,.5,5),hairHi,(i-2)*.22,2.31,.49);bang.rotation.z=(i-2)*.12;bang.rotation.x=.28;}
 const ring=mesh(body,new THREE.TorusGeometry(.09,.018,6,16),edge,-.65,1.83,.08);ring.rotation.y=.25;
 } else {
 // Completely bald dome remains visible above the gorget and imposing plate shoulders.
 mesh(body,new THREE.TorusGeometry(.44,.10,6,12),edge,0,1.55,0).rotation.x=Math.PI/2;
 }
 const capeGeo=new THREE.PlaneGeometry(1.15,1.2,8,10);const p=capeGeo.attributes.position;
 const cape=mesh(body,capeGeo,new THREE.MeshStandardMaterial({color:bald?'#452d41':'#762f3a',roughness:.95,side:THREE.DoubleSide}),0,.91,-.34);cape.rotation.x=.24;
 const capeBase=new Float32Array(p.array);
 const legs=[],arms=[];
 for(const s of [-1,1]){
 const hip=new THREE.Group();hip.position.set(s*.24,.72,0);body.add(hip);mesh(hip,cylinder,dark,0,-.2,0,.17,.43,.17);mesh(hip,box,armor,0,-.5,.08,.31,.18,.48);mesh(hip,sphere,edge,0,-.23,.15,.17,.12,.075);legs.push(hip);
 mesh(body,sphere,armor,s*.53,1.38,0,bald?.36:.24,.23,.27);
 const upper=mesh(body,cylinder,armor,0,0,0),lower=mesh(body,cylinder,armor,0,0,0),hand=mesh(body,sphere,skin,0,0,0,.13,.14,.13);
 arms.push({upper,lower,hand,s});
 }
 const hilt=new V(),local=new V();
 return {root,pivot,body,legs,arms,cape,capeBase,bald,hilt,local,scale:bald?1.34:1};
}
export function pose(a,t,position,yaw,roll,lean,grip) {
 a.root.position.set(...position);a.root.rotation.set(0,yaw,0);a.root.scale.setScalar(a.scale);
 a.pivot.rotation.set(roll,0,lean);a.pivot.position.y=1.3+(roll?Math.sin(Math.min(Math.PI,Math.abs(roll)%Math.PI))*.11:0);
 const stride=(t<1.65||t>9.6&&t<11)?Math.sin(t*11)*.38:Math.sin(t*2)*.04;
 a.legs[0].rotation.set(stride,0,-.05);a.legs[1].rotation.set(-stride,0,.05);
 const pp=a.cape.geometry.attributes.position;
 for(let i=0;i<pp.count;i++){const y=a.capeBase[i*3+1],w=(.6-y)/1.2;pp.setXYZ(i,a.capeBase[i*3],y,a.capeBase[i*3+2]+Math.sin(t*5+a.capeBase[i*3]*5+y*2)*.12*w);}
 pp.needsUpdate=true;
 a.root.updateMatrixWorld(true);a.hilt.fromArray(grip);a.local.copy(a.hilt);a.body.worldToLocal(a.local);
 for(const arm of a.arms){
 const s=arm.s;const sh=[s*.51,1.37,0], target=s===1?[a.local.x,a.local.y,a.local.z]:[-.45,1.07,.36];
 const elbow=[(sh[0]+target[0])*.5+s*.14,(sh[1]+target[1])*.5-.13,(sh[2]+target[2])*.5+.15];
 link(arm.upper,sh,elbow,.12);link(arm.lower,elbow,target,.10);arm.hand.position.set(...target);
 }
}
export function sword(parent,boss=false) {
 const group=new THREE.Group();parent.add(group);const steel=mat(boss?'#a0adb6':'#d4e4df',{metalness:.85,roughness:.21}),gold=mat('#b79b58',{metalness:.8,roughness:.3});
 const blade=mesh(group,box,steel,0,.9,0,boss?.27:.14,1.55,.07);const tip=mesh(group,new THREE.ConeGeometry(boss?.19:.1,.3,4),steel,0,1.8,0);tip.rotation.y=Math.PI/4;
 mesh(group,box,gold,0,.05,0,boss?.75:.48,.10,.13);mesh(group,cylinder,mat('#382f28'),0,-.14,0,.06,.28,.06);mesh(group,sphere,gold,0,-.31,0,.1,.1,.1);
 return {group,blade,tip,dir:new V(),length:boss?2.3:1.65};
}
export function aimSword(s,grip,tip) {
 s.group.position.set(...grip);s.dir.fromArray(tip).sub(s.group.position);const len=s.dir.length();s.group.quaternion.setFromUnitVectors(UP,s.dir.normalize());s.group.scale.set(1,len/1.95,1);
}
export function makeWorld() {
 const stage=new Stage({fov:44,dof:false,background:0x242b3d,exposure:1.17});const scene=stage.scene;scene.fog=new THREE.FogExp2(0x313b51,.025);
 scene.add(new THREE.HemisphereLight(0x9bb2d5,0x30313c,2.1));
 const moon=new THREE.DirectionalLight(0xb9d4ff,3.2);moon.position.set(-7,13,5);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);moon.shadow.camera.left=-13;moon.shadow.camera.right=13;moon.shadow.camera.top=13;moon.shadow.camera.bottom=-13;moon.shadow.bias=-.001;scene.add(moon);
 const warm=new THREE.PointLight(0xffa24f,45,20,2);warm.position.set(4,4,-4);scene.add(warm);
 const st=stoneTexture(),stone=mat('#697382',{map:st,roughness:.81}),stoneDark=mat('#434c5a',{map:st}),moss=mat('#354a42'),gold=mat('#ad8954',{metalness:.6,roughness:.4});
 const ground=mesh(scene,box,mat('#343e4b',{map:st,roughness:.24,metalness:.18}),0,-.13,0,30,.25,30);
 // Individually hewn wet flags and a radial ritual rosette.
 for(let x=-7;x<=7;x++)for(let z=-7;z<=7;z++){
 if(Math.abs(x)<3&&Math.abs(z)<3)continue;
 const tile=mesh(scene,box,x%3?stone:stoneDark,x*1.1,-.015,z*1.1,1.07,.055,1.07);tile.rotation.y=(hash(x*501+z)*2-1)*.015;
 }
 mesh(scene,new THREE.CylinderGeometry(4.2,4.2,.09,64),stoneDark,0,-.005,0);
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const p=mesh(scene,box,gold,Math.sin(a)*3.95,.055,Math.cos(a)*3.95,.035,.015,.42);p.rotation.y=a;}
 for(let ring=1;ring<=3;ring++)mesh(scene,new THREE.TorusGeometry(ring*1.02,.012,4,80),gold,0,.047,0).rotation.x=Math.PI/2;
 const arch=(x,z,w=2.2,h=5)=>{
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 for(const s of [-1,1]){
 mesh(g,box,stone,s*w,1.8,0,.65,3.6,.9);mesh(g,box,stoneDark,s*w,.2,0,1,.4,1.25);mesh(g,box,stone,s*w,3.45,0,.95,.25,1.05);
 for(let k=0;k<13;k++){const a=k/12*Math.PI/2;const m=mesh(g,box,k%3?stone:stoneDark,s*w*Math.cos(a),3.5+w*Math.sin(a),0,.49,.58,.9);m.rotation.z=-s*a;}
 }
 return g;
 };
 arch(0,-6,2.9);arch(-6,-6,1.9);arch(6,-6,1.9);
 for(const s of [-1,1]){
 for(let k=0;k<4;k++){
 const z=-5+k*3.3;const a=arch(s*9,z,1.35);a.rotation.y=Math.PI/2;
 mesh(scene,box,stoneDark,s*10,2,z,1,4,2.1);
 mesh(scene,new THREE.ConeGeometry(.9,1.3,4),stone,s*9.9,5.7,z);
 }
 for(let k=0;k<5;k++){
 const x=s*(5.0+hash(k+17)*2.2),z=2+k*1.25;
 const grave=mesh(scene,box,stoneDark,x,.65,z,.6,1.2,.22);grave.rotation.z=(hash(k+91)-.5)*.2;
 mesh(scene,new THREE.CylinderGeometry(.3,.3,.22,12),stone,x,1.26,z).rotation.x=Math.PI/2;
 mesh(scene,box,stone,x,.08,z,.85,.14,.6);mesh(scene,box,gold,x,.83,z+.125,.06,.31,.018);mesh(scene,box,gold,x,.88,z+.13,.22,.06,.018);
 }
 }
 // Cathedral apse, lancets, stained glass shards and ruined crenellations.
 for(const s of [-1,1]){mesh(scene,box,stoneDark,s*4.3,3,-7.1,1.25,6,1.1);mesh(scene,box,stone,s*4.3,6,-7.1,1.65,.5,1.35);}
 const glass=[mat('#527886',{emissive:0x294854,emissiveIntensity:.5}),mat('#7a5b78'),mat('#ad8053')];
 for(let i=0;i<20;i++)mesh(scene,new THREE.OctahedronGeometry(.23),glass[i%3],(hash(i)*2-1)*2.5,4+hash(i+50)*2,-7.2,.5,1,.18);
 for(let i=0;i<65;i++){
 const side=i%2?1:-1,x=side*(5+hash(i*7)*4),z=-4+hash(i*13)*13;
 const rubble=mesh(scene,new THREE.DodecahedronGeometry(.16+hash(i+31)*.33,0),i%5?stoneDark:moss,x,.15,z,1,.6,1);rubble.rotation.set(hash(i)*3,hash(i+1)*3,hash(i+2));
 }
 // Rain-wet reflection pools, with designed broken silhouettes rather than a mirror plane.
 for(let i=0;i<16;i++){const p=mesh(scene,new THREE.CircleGeometry(.3+hash(i+32)*.7,24),mat('#5b7084',{metalness:.7,roughness:.07,transparent:true,opacity:.36}),-6+hash(i)*12,.061,-4+hash(i+1)*12);p.rotation.x=-Math.PI/2;p.scale.x=1.7;}
 const fire=new THREE.Group();fire.position.set(-3.3,0,2.9);scene.add(fire);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2;mesh(fire,new THREE.DodecahedronGeometry(.23),stoneDark,Math.sin(a)*.7,.15,Math.cos(a)*.7,1,.7,1);}
 for(let i=0;i<5;i++){const log=mesh(fire,cylinder,mat('#32251f'),0,.2,0,.09,1.25,.09);log.rotation.set(Math.PI/2,0,i*Math.PI/5);}
 const flames=[];for(let i=0;i<12;i++)flames.push(mesh(fire,new THREE.ConeGeometry(.18,.9,7),new THREE.MeshBasicMaterial({color:i%3?0xffae38:0xffe197,transparent:true,opacity:.86}),0,.55,0));
 const fireLight=new THREE.PointLight(0xff9b38,0,12,2);fireLight.position.set(-3.3,1.1,2.9);scene.add(fireLight);
 const rainObj=rain(1300,[-13,13,.2,12,-10,14],{speed:12,len:.21,base:.15,gain:.3});scene.add(rainObj);
 const hero=actor(scene,false),boss=actor(scene,true),heroSword=sword(scene),bossSword=sword(scene,true);
 const particles=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.065),new THREE.MeshBasicMaterial({color:0xffd377}),460);particles.frustumCulled=false;scene.add(particles);
 const sparks=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,.025,.25),new THREE.MeshBasicMaterial({color:0xffebae}),72);sparks.frustumCulled=false;scene.add(sparks);
 const dust=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.09),stoneDark,30);dust.frustumCulled=false;scene.add(dust);
 return {stage,hero,boss,heroSword,bossSword,rainObj,flames,fireLight,particles,sparks,dust};
}
