import { Stage, THREE, canvasTexture } from 'filmkit/stage3d.js';
import { T, clamp, mix, heroAt, ballAt, worldTime } from './timeline.js';
let stage, hero, foes, ball, sparks, trail, rings, shadows;
const C={blue:0x18c8ff,orange:0xff7428};
const mat=(color,metalness=0,roughness=.55)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const glow=c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2.5,roughness:.35});
function mesh(g,m,p,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
const box=(p,m,x,y,z,w,h,d)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
const sphere=(p,m,x,y,z,r,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,20,14),m,p,x,y,z);o.scale.set(sx,sy,sz);return o;};
function rod(p,a,b,r,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),m,p);o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function driver(parent,hairy){
 const g=new THREE.Group();parent.add(g);g.position.set(-.1,.78,0);g.rotation.y=Math.PI/2;
 const skin=mat(hairy?0xf4cba9:0xb88967),shirt=mat(hairy?0x263f56:0xffdc39),black=mat(0x100e1b),white=mat(0xf7fcff),hair=mat(0x9e323e);
 sphere(g,shirt,0,.25,0,.47,1,.9,.7);
 const head=new THREE.Group();head.position.y=1;g.add(head);
 sphere(head,skin,0,0,0,.65,1,1,.88);
 for(const s of [-1,1]){
  sphere(head,skin,s*.61,-.06,0,.16,.6,1,.7);
  sphere(head,white,s*.25,.02,.488,.235,.78,1,.24);
  sphere(head,black,s*.25,.02,.535,.193,.73,1,.23);
  sphere(head,mat(hairy?0xb4a04c:0xae6ba7),s*.25,-.03,.568,.125,.7,1,.16);
  sphere(head,black,s*.25,.01,.581,.095,.7,1,.15);
  sphere(head,white,s*.25-.035,.075,.598,.055,.7,1,.12);
  const brow=box(head,black,s*.25,.29,.51,.38,.065,.055);brow.rotation.z=s*.12;
 }
 sphere(head,mat(0x823c3f),0,-.30,.513,.18,1,.43,.22);
 box(head,white,0,-.265,.557,.23,.035,.028);
 if(hairy){
  const cap=mesh(new THREE.SphereGeometry(.67,18,10,0,Math.PI*2,0,Math.PI*.48),hair,head,0,.025,0);
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2;const tuft=mesh(new THREE.ConeGeometry(.18,.61,5),hair,head,Math.sin(a)*.52,.30+(.08*(i%3)),Math.cos(a)*.44);tuft.rotation.z=Math.sin(a)*-.5;tuft.rotation.x=Math.cos(a)*.5;}
  for(let i=0;i<5;i++){const tuft=mesh(new THREE.ConeGeometry(.18,.45,5),hair,head,(i-2)*.22,.39,.50);tuft.rotation.z=Math.PI+.25;}
  const hoop=mesh(new THREE.TorusGeometry(.12,.024,6,16),mat(0xffdc55,.75),head,-.68,-.17,.08);hoop.rotation.y=.2;
 }
 const arms=[];
 for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.38,.42,.05);g.add(arm);rod(arm,[0,0,0],[s*.04,-.15,.38],.115,shirt);sphere(arm,skin,s*.04,-.15,.4,.13);arms.push(arm);}
 const wheel=mesh(new THREE.TorusGeometry(.32,.04,8,20),black,g,0,.17,.55);wheel.rotation.x=.7;
 return{g,head,arms};
}
function car(hairy,color){
 const root=new THREE.Group();stage.scene.add(root);const body=new THREE.Group();root.add(body);
 const paint=mat(color,.65,.27),dark=mat(0x111a2b,.4,.4),chrome=mat(0xa1bfca,.85,.2),light=glow(hairy?0xaaf4ff:0xffd27c);
 box(body,dark,0,0,0,3.5,.38,1.75);box(body,paint,0,.23,0,3.15,.52,1.62);
 const hood=box(body,paint,1,.52,0,1.1,.25,1.54);hood.rotation.z=-.11;
 box(body,dark,-.25,.56,0,1.15,.14,1.12);
 for(const z of [-.69,.69]){box(body,paint,-.3,.67,z,1.5,.25,.16);box(body,light,1.69,.3,z*.75,.08,.17,.36);box(body,glow(0xff2847),-1.65,.29,z*.8,.08,.13,.3);}
 box(body,chrome,1.8,.06,0,.12,.22,1.62);
 for(const z of [-.58,.58]){box(body,dark,-1.28,.8,z,.1,.56,.1);}
 box(body,paint,-1.33,1.07,0,.48,.12,2.02);
 for(const z of [-.37,.37])box(body,light,.99,.67,z,.9,.025,.09);
 const tires=[];
 for(const x of [-1.1,1.08])for(const z of [-.92,.92]){
  const w=new THREE.Group();w.position.set(x,-.13,z);body.add(w);
  const tire=mesh(new THREE.CylinderGeometry(.47,.47,.3,20),mat(0x10101b),w);tire.rotation.x=Math.PI/2;
  const hub=mesh(new THREE.CylinderGeometry(.29,.29,.32,12),chrome,w);hub.rotation.x=Math.PI/2;
  for(let i=0;i<5;i++){const spoke=box(w,light,Math.sin(i*1.256)*.16,Math.cos(i*1.256)*.16,z>0?.18:-.18,.045,.28,.03);spoke.rotation.z=-i*1.256;}
  tires.push(w);
 }
 for(const z of [-.48,.48]){const nozzle=mesh(new THREE.CylinderGeometry(.25,.21,.4,12),dark,body,-1.77,.21,z);nozzle.rotation.z=Math.PI/2;}
 const person=driver(body,hairy);
 return{root,body,tires,person};
}
export function prepare(){
 stage=new Stage({fov:47,dof:false,background:0x080e26,exposure:1.1});
 stage.scene.fog=new THREE.Fog(0x080e26,50,125);
 stage.scene.add(new THREE.HemisphereLight(0xaecaff,0x133341,2));
 const key=new THREE.DirectionalLight(0xf4f2ff,3.6);key.position.set(-8,25,14);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-35,right:35,top:26,bottom:-26,near:1,far:80});key.shadow.bias=-.0005;stage.scene.add(key);
 const turf=canvasTexture(2048,1024,(c,w,h)=>{c.fillStyle='#143b45';c.fillRect(0,0,w,h);for(let i=0;i<16;i++){c.fillStyle=i%2?'#17414b':'#123944';c.fillRect(i*w/16,0,w/16,h);}for(let i=0;i<24000;i++){const x=(i*373)%w,y=(i*197)%h;c.fillStyle=i%2?'#20535c':'#0f323e';c.fillRect(x,y,2,4);}c.strokeStyle='#7ea3ad';c.lineWidth=5;c.strokeRect(45,45,w-90,h-90);c.beginPath();c.moveTo(w/2,45);c.lineTo(w/2,h-45);c.stroke();c.beginPath();c.ellipse(w/2,h/2,180,180,0,0,7);c.stroke();for(const x of [45,w-320])c.strokeRect(x,h/2-225,275,450);});
 const field=mesh(new THREE.PlaneGeometry(52,30),new THREE.MeshStandardMaterial({map:turf,roughness:.72,metalness:.18}),stage.scene);field.rotation.x=-Math.PI/2;
 const dark=mat(0x111c36,.45),steel=mat(0x36556c,.65),blue=glow(C.blue),orange=glow(C.orange);
 for(const z of [-15,15]){
  box(stage.scene,dark,0,.5,z,53,1,1);
  box(stage.scene,blue,-13,1.06,z,26,.08,.17);box(stage.scene,orange,13,1.06,z,26,.08,.17);
  box(stage.scene,new THREE.MeshPhysicalMaterial({color:0x75c2df,transparent:true,opacity:.09,roughness:.1,side:THREE.DoubleSide,depthWrite:false}),0,3,z,53,4,.07);
  for(let x=-26;x<=26;x+=4)rod(stage.scene,[x,1,z],[x,5.4,z],.045,steel);
  for(let row=0;row<5;row++)box(stage.scene,dark,0,1.7+row*.95,z+Math.sign(z)*(1.5+row*1.3),58,.45,1.3);
 }
 const crowd=new THREE.InstancedMesh(new THREE.SphereGeometry(.19,7,5),mat(0xffffff),700);const ob=new THREE.Object3D();const col=new THREE.Color();for(let i=0;i<700;i++){const side=i<350?-1:1,j=i%350,row=Math.floor(j/70);ob.position.set((j%70-34.5)*.78,2.3+row*.95,side*(16.5+row*1.3));ob.scale.set(1,1.2,1);ob.updateMatrix();crowd.setMatrixAt(i,ob.matrix);col.setHex(i%7<3?C.blue:i%7<6?C.orange:0xc7e7ff);crowd.setColorAt(i,col);}stage.scene.add(crowd);
 for(const x of [-25,25]){
  const gm=x<0?blue:orange;
  for(const z of [-5,5])rod(stage.scene,[x,0,z],[x,6,z],.14,gm);
  rod(stage.scene,[x,6,-5],[x,6,5],.14,gm);
  for(let z=-5;z<=5;z+=.5)rod(stage.scene,[x+Math.sign(x)*2,0,z],[x+Math.sign(x)*2,6,z],.018,steel);
  for(let y=.5;y<=6;y+=.5)rod(stage.scene,[x+Math.sign(x)*2,y,-5],[x+Math.sign(x)*2,y,5],.018,steel);
  for(const z of [-10,10])box(stage.scene,dark,x,2.5,z,.6,5,10);
 }
 for(let x=-24;x<=24;x+=8)for(const z of [-19,19]){
  rod(stage.scene,[x,5,z],[x,15,z],.15,steel);rod(stage.scene,[x,15,z],[x,16,z*.65],.12,steel);
  box(stage.scene,glow(0xc7eaff),x,15.7,z*.68,3,.12,1.3);
 }
 for(const x of [-16,0,16]){rod(stage.scene,[x,16,-20],[x,16,20],.12,steel);rod(stage.scene,[x,17,-20],[x,17,20],.1,steel);for(let z=-20;z<20;z+=4)rod(stage.scene,[x,16,z],[x,17,z+4],.06,steel);}
 for(let x=-20;x<=20;x+=5)for(const z of [-10,10]){const pad=mesh(new THREE.TorusGeometry(.65,.035,6,24),x<0?blue:orange,stage.scene,x,.025,z);pad.rotation.x=Math.PI/2;}
 hero=car(true,C.blue);foes=[car(false,C.orange),car(false,0xe14d20)];
 ball=new THREE.Group();stage.scene.add(ball);sphere(ball,mat(0xe6edf0,.25,.3),0,0,0,1.35);
 // Twelve inset pentagonal panels on a true spherical ball, aligned to icosahedron vertices.
 const ico=new THREE.IcosahedronGeometry(1,0);const pos=ico.attributes.position;const seen=new Set();for(let i=0;i<pos.count;i++){const v=new THREE.Vector3().fromBufferAttribute(pos,i).normalize();const k=v.toArray().map(n=>n.toFixed(2)).join();if(seen.has(k))continue;seen.add(k);const panel=mesh(new THREE.CircleGeometry(.48,5),mat(0x152135,.35,.3),ball);panel.position.copy(v.multiplyScalar(1.325));panel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v.normalize());}
 shadows=[hero,...foes,ball].map(()=>{const o=mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x020916,transparent:true,opacity:.36,depthWrite:false}),stage.scene);o.rotation.x=-Math.PI/2;o.position.y=.012;return o;});
 sparks=Array.from({length:110},(_,i)=>mesh(new THREE.IcosahedronGeometry(.12+(i%3)*.035,0),glow(i%2?C.blue:0xffbf65),stage.scene));
 trail=Array.from({length:36},(_,i)=>mesh(new THREE.SphereGeometry(.16,7,5),glow(i%3?0x36d9ff:0xffe0a1),stage.scene));
 rings=Array.from({length:3},()=>mesh(new THREE.TorusGeometry(1,.06,8,64),blue,stage.scene));
}
function pose(c,p,t){c.root.position.set(p.x,p.y,p.z);c.root.rotation.set(0,p.yaw,p.pitch);c.body.rotation.set(.012*Math.sin(t*14),0,0);for(const w of c.tires)w.rotation.z=-t*8;c.person.head.rotation.set(0,.12*Math.sin(t*2),-.06*Math.sin(t*3));for(const a of c.person.arms)a.rotation.set(0,0,0);}
export function draw(ctx,t,o){
 const w=worldTime(t),h=heroAt(w),b=ballAt(w);pose(hero,h,w);
 const challenge=clamp((w-2)/3);const f1={x:mix(4,-2,challenge)+(w>5?(w-5)*2:0),y:.65,z:mix(-7,-2.7,challenge),yaw:Math.PI*.78,pitch:0};
 const f2={x:20-1.5*Math.sin(w),y:.65+(w>6&&w<8?1.5*Math.sin((w-6)*Math.PI/2):0),z:4*Math.cos(w*.5),yaw:Math.PI*.9,pitch:w>6&&w<8?.2:0};
 if(w>7.5){const u=clamp((w-7.5)/1.5);f2.x=mix(20-1.5*Math.sin(7.5),22,u);f2.z=mix(4*Math.cos(3.75),-8,u);f2.y=.65+1.5*Math.sin(Math.PI*.75)*clamp(1-(w-7.5)/.5);f2.pitch=.2*(1-u);f2.yaw=mix(Math.PI*.9,Math.PI*.5,u);}
 pose(foes[0],f1,w);pose(foes[1],f2,w);
 ball.position.set(b.x,b.y,b.z);ball.rotation.set(w*.8,0,-w*2);ball.visible=w<T.goal;
 const ps=[h,f1,f2,b];for(let i=0;i<4;i++){const s=shadows[i],p=ps[i];s.position.set(p.x,.015+i*.001,p.z);s.scale.set(i===3?1.4:2.1, i===3?1.4:1.05,1);s.material.opacity=.34/(1+p.y*.16);s.visible=i<3||ball.visible;}
 const boost=w>4.4&&w<8.35;for(let i=0;i<trail.length;i++){const p=trail[i],age=(i%18)/18*.65,ht=heroAt(Math.max(0,w-age));p.visible=boost;p.position.set(ht.x-1.85-age*5,ht.y+.17,ht.z+(i<18?-.45:.45));p.scale.setScalar((1-age)*(.8+.2*Math.sin(w*35+i)));}
 const ga=w-T.goal;for(let i=0;i<sparks.length;i++){const p=sparks[i],a=i*2.399,s=.7+(i%11)*.25;p.visible=ga>=0&&ga<3.4;p.position.set(26.4-Math.abs(Math.cos(a))*ga*s*5,3+Math.sin(a)*ga*s*3+3*ga-1.4*ga*ga,Math.sin(a*1.7)*ga*s*5);p.rotation.set(ga+i,ga*2,0);p.scale.setScalar(Math.max(.02,1.8-ga/2));}
 // The live-goal shockwave must not resume around the close victory camera.
 for(let i=0;i<3;i++){const r=rings[i],age=ga-i*.1;r.visible=t<T.replay&&age>0&&age<1.4;r.position.set(25.3-age*8,3,0);r.rotation.set(0,Math.PI/2,0);r.scale.setScalar(1+Math.max(0,age)*12);}
 if(t<2.5)stage.look([h.x+6,4.2,10.5],[h.x+.7,1.25,0],0,46);
 else if(t<4.5)stage.look([h.x-5,7.4,13],[h.x+3,1.4,0],0,49);
 else if(t<6.65)stage.look([h.x+4,7.5,14],[h.x+2,3.5,0],-.025,48);
 else if(t<9)stage.look([13,9.5,20],[19,3,0],0,54);
 else if(t<12)stage.look([h.x+6,6.6,-10.5],[h.x+1.6,4.8,0],.035,44);
 else{const a=(t-12)*.24;stage.look([h.x-7*Math.cos(a),4.6,h.z+8+2*Math.sin(a)],[h.x,1.5,h.z],0,45);hero.person.arms[0].rotation.z=-1.6+.25*Math.sin(t*10);}
 stage.draw(ctx);
 // Broadcast graphics remain sharp after the 3D bloom pass.
 o.fillStyle='rgba(4,12,30,.88)';o.fillRect(640,48,640,86);o.fillStyle='#23c8ff';o.fillRect(640,48,12,86);o.fillStyle='#ff8239';o.fillRect(1268,48,12,86);
 o.textAlign='center';o.font='700 29px "Space Grotesk"';o.fillStyle='#b4ecff';o.fillText('REMY',744,100);o.fillStyle='#ffc291';o.fillText('CABALD',1170,100);o.fillStyle='white';o.font='44px Anton';
 o.fillText(':   0',994,109);o.save();o.translate(908,92);o.scale(1,t>=T.goal&&t<T.goal+.3?Math.max(.08,Math.abs(Math.cos((t-T.goal)/.3*Math.PI))):1);o.fillText(t>=T.goal?'1':'0',0,17);o.restore();
 o.textAlign='left';o.font='700 22px "Space Grotesk"';o.fillStyle='#d5eaff';o.fillText('FOLLICLE FIELD  /  OVERTIME',90,74);
 if(t<T.replay||t>=T.live){const meter=t<T.replay?Math.round(100-clamp((w-4.4)/4)*78):22;o.fillStyle='rgba(4,12,30,.85)';o.fillRect(1570,886,260,110);o.fillStyle='#87e5ff';o.font='700 21px "Space Grotesk"';o.fillText('BOOST',1590,920);o.font='43px Anton';o.fillText(String(meter).padStart(2,'0'),1590,970);o.fillStyle='#1c455b';o.fillRect(1665,942,140,13);o.fillStyle='#36ddff';o.fillRect(1665,942,140*meter/100,13);}
 if(t>=9&&t<12){o.fillStyle='#061223dd';o.fillRect(90,906,350,67);o.fillStyle='#8eeaff';o.font='700 28px "Space Grotesk"';o.fillText('REPLAY  /  0.5×',115,950);}
}
