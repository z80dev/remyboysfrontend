import { Stage, THREE, canvasTexture } from 'filmkit/stage3d.js';
import { hash } from 'filmkit/lib.js';
import { T, MINES, BUILD, heroPath, u, ease } from './timeline.js';
const BOX = new THREE.BoxGeometry(1, 1, 1);
const GEM = new THREE.OctahedronGeometry(.39);
const gemTarget = new THREE.Vector3();
const mats = {};
let stage, sun, hero, foes, mineBlocks, crackPlanes, drops, built, tnt, fuse, debris, dust, diamond, waterGlints, clouds, ember, splashes, sunDisc;
const C = { grass: ['#579937','#63a440','#43822c','#78b04e'], dirt: ['#826040','#9d7750','#684a34','#b78a5a'], stone: ['#848f9a','#6c7987','#a4adb6','#535f70'], wood: ['#b08b50','#d2ae6b','#886437','#c5a269'], bark: ['#674827','#856037','#493520','#986f43'], leaf: ['#3c8a42','#26713b','#59a14c','#7db551'], sand: ['#dec886','#c8b476','#e9d999','#bbaa6f'], ore: ['#7b8b96','#65727e','#40dedc','#a0f8e6'], tnt: ['#d74939','#b33130','#f3644f','#e85c46'] };
function texture(kind) {
  return canvasTexture(32, 32, c => {
    c.imageSmoothingEnabled = false;
    const p = C[kind]; c.fillStyle = p[0]; c.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 125; i++) { c.fillStyle = p[Math.floor(hash(i + kind.length * 28) * p.length)]; const x = Math.floor(hash(i * 7 + 6) * 16) * 2, y = Math.floor(hash(i * 11 + 3) * 16) * 2; c.fillRect(x, y, 2 + (i % 3), 2); }
    if (kind === 'wood' || kind === 'bark') { c.fillStyle = '#614325'; for (let y = 0; y < 32; y += 8) c.fillRect(0, y, 32, 1); }
    if (kind === 'tnt') { c.fillStyle = '#f8e9c9'; c.fillRect(0, 11, 32, 12); c.fillStyle = '#663123'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText('TNT', 16, 21); }
  });
}
function mat(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .86, ...extra }); }
function cube(parent, material, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(BOX, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function instances(points, material) {
  const m = new THREE.InstancedMesh(BOX, material, points.length), obj = new THREE.Object3D();
  points.forEach((p, i) => { obj.position.set(p[0], p[1], p[2]); obj.scale.set(p[3] || 1, p[4] || 1, p[5] || 1); obj.updateMatrix(); m.setMatrixAt(i, obj.matrix); });
  m.castShadow = true; m.receiveShadow = true; stage.scene.add(m); return m;
}
async function face(id, crop) {
  const im = new Image(); im.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href; await im.decode();
  const tex = canvasTexture(128, 128, c => { c.drawImage(im, ...crop, 0, 0, 128, 128); });
  tex.magFilter = THREE.NearestFilter; return mat('#ffffff', { map: tex, roughness: 1 });
}
function rig(id, facial, hairy, shirt) {
  const root = new THREE.Group(); stage.scene.add(root);
  const skin = mat(hairy ? '#dcc0a8' : '#a8896a'), cloth = mat(shirt), dark = mat('#253344');
  cube(root, cloth, 0, 1.25, 0, .9, .9, .48);
  cube(root, mats.wood, 0, .9, .26, .86, .12, .08);
  const head = new THREE.Group(); head.position.y = 2; root.add(head);
  cube(head, skin, 0, 0, 0, 1.1, 1.04, .91);
  const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(.99, .79), facial); faceMesh.position.set(0, -.045, .46); head.add(faceMesh);
  if (hairy) {
    const hair = mat('#973c31'), light = mat('#b64e3c');
    cube(head, hair, 0, .55, -.07, 1.18, .25, 1.05);
    cube(head, hair, -.52, .12, -.06, .19, .74, .9); cube(head, hair, .52, .18, -.15, .18, .64, .75);
    for (let i = 0; i < 5; i++) { const tuft = cube(head, i % 2 ? light : hair, -.45 + i * .22, .35 - (i % 2) * .11, .47, .21, .4, .14); tuft.rotation.z = (i - 2) * .08; }
    cube(head, light, -.21, .74, -.16, .37, .17, .42);
  } else { cube(head, mat('#b99b7d'), -.22, .48, .03, .44, .035, .52); }
  const limbs = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); const arm = i < 2; g.position.set((i % 2 ? 1 : -1) * (arm ? .6 : .24), arm ? 1.62 : .83, 0); root.add(g);
    cube(g, arm ? cloth : dark, 0, -.31, 0, arm ? .3 : .37, .63, .37);
    cube(g, arm ? skin : mat('#172130'), 0, -.69, arm ? 0 : .055, arm ? .32 : .4, arm ? .23 : .18, .4); limbs.push(g);
  }
  const tool = new THREE.Group(); limbs[0].add(tool); tool.position.set(0, -.68, .04);
  cube(tool, mats.bark, 0, -.35, 0, .1, .9, .1);
  cube(tool, mat('#64ced7', { metalness: .3 }), 0, -.79, 0, .9, .15, .15);
  cube(tool, mats.stone, -.4, -.9, 0, .13, .25, .14);
  const held = cube(limbs[0], mats.wood, 0, -.78, .12, .4); held.visible = false;
  const gem = new THREE.Group(); limbs[1].add(gem); gem.position.set(0, -.8, .18);
  const jewel = new THREE.Mesh(GEM, mat('#49eee1', { metalness: .35, roughness: .2, flatShading: true, emissive: '#08736f', emissiveIntensity: .3 })); gem.add(jewel); jewel.rotation.set(.2, .6, .05); gem.visible = false;
  return { root, head, limbs, tool, held, gem, id };
}
function setRig(r, p, yaw, stride, arm = 0) {
  r.root.position.set(...p); r.root.rotation.set(0, yaw, 0); r.root.scale.set(1, 1, 1);
  r.head.rotation.set(0, 0, .035 * Math.sin(stride));
  r.limbs.forEach((l, i) => l.rotation.set((i % 2 ? 1 : -1) * .48 * Math.sin(stride), 0, 0));
  r.limbs[0].rotation.x = arm; r.tool.visible = false; r.held.visible = false; r.gem.visible = false;
}
export async function prepare() {
  stage = new Stage({ background: '#8ecbe5', fov: 43, dof: false, exposure: 1.03 });
  stage.scene.fog = new THREE.Fog('#9dc9da', 32, 78);
  for (const kind of Object.keys(C)) { const tex = texture(kind); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestMipmapNearestFilter; mats[kind] = mat('#ffffff', { map: tex }); }
  stage.scene.add(new THREE.HemisphereLight('#d5efff', '#57713c', 2.15));
  sun = new THREE.DirectionalLight('#fff3cc', 3); sun.position.set(-9, 15, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -20; sun.shadow.camera.right = 20; sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18; sun.shadow.bias = -.0005; stage.scene.add(sun);
  const land = [], dirt = [], sand = [], water = [], leaf = [], bark = [];
  for (let x = -25; x <= 25; x++) for (let z = -18; z <= 15; z++) {
    const river = x >= -3 && x <= 0;
    if (river) { water.push([x, -1.05, z, 1, .17, 1]); sand.push([x, -1.7, z]); }
    else { const h = z < -7 ? Math.floor((Math.sin(x * .28) + Math.cos(z * .32) + 2) * 1.1) : 0; if (!(z === 0 && x >= 1 && x <= 3)) land.push([x, h, z]); for (let y = -2; y < h; y++) dirt.push([x, y, z]); }
  }
  instances(land, mats.grass); instances(dirt, mats.dirt); instances(sand, mats.sand);
  instances(water, mat('#26a8bf', { roughness: .24, metalness: .3 }));
  for (let n = 0; n < 32; n++) {
    const x = -22 + Math.floor(hash(n * 17) * 44), z = -15 + Math.floor(hash(n * 19 + 3) * 23);
    if ((x > -9 && x < 10 && z > -5) || (x >= -4 && x <= 1)) continue;
    const base = z < -7 ? Math.floor((Math.sin(x * .28) + Math.cos(z * .32) + 2) * 1.1) : 0;
    for (let y = 1; y <= 4; y++) bark.push([x, base + y, z]);
    for (let xx = -2; xx <= 2; xx++) for (let zz = -2; zz <= 2; zz++) for (let y = 3; y <= 5; y++) if (Math.abs(xx) + Math.abs(zz) < (y === 5 ? 3 : 4)) leaf.push([x + xx, base + y, z + zz]);
  }
  instances(bark, mats.bark); instances(leaf, mats.leaf);
  const flower = mat('#ffcf68'); for (let n = 0; n < 40; n++) { const x = -15 + hash(n * 8) * 30, z = hash(n * 13) * 7 + 2; if (x > -4 && x < 1) continue; cube(stage.scene, flower, x, .67, z, .17, .25, .17); }
  clouds = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(); g.position.set(-32 + i * 8, 13 + (i % 3) * 2, -25 - (i % 2) * 4); stage.scene.add(g); for (let j = 0; j < 4; j++) cube(g, mat('#f9f4df'), j * 1.6, j % 2 * .5, 0, 2.5, 1.2, 2.3); clouds.push(g); }
  const heroFace = await face(42, [212, 230, 222, 175]), face5 = await face(5, [206, 239, 235, 157]), face1217 = await face(1217, [208, 238, 230, 163]);
  hero = rig(42, heroFace, true, '#305168'); foes = [rig(5, face5, false, '#dbb740'), rig(1217, face1217, false, '#765076'), rig(5, face5, false, '#9e5444')];
  mineBlocks = MINES.map(m => cube(stage.scene, mats.ore, ...m.p));
  crackPlanes = MINES.map(m => {
    const stages = [];
    for (let k = 1; k <= 3; k++) {
      const tex = canvasTexture(32, 32, c => { c.strokeStyle = '#182831'; c.lineWidth = 1 + k * .4; for (let j = 0; j < k * 5; j++) { const x = hash(j * 14) * 32, y = hash(j * 9) * 32; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(j * 5) - .5) * 18, y + 9); c.lineTo(x + 5, y + 16); c.stroke(); } });
      const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), group = new THREE.Group(); group.position.set(...m.p);
      for (const [x, z, yaw] of [[-.503, 0, -Math.PI / 2], [.503, 0, Math.PI / 2], [0, .503, 0]]) { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.005, 1.005), material); mesh.position.set(x, 0, z); mesh.rotation.y = yaw; group.add(mesh); }
      stage.scene.add(group); stages.push(group);
    } return stages;
  });
  drops = MINES.map(m => cube(stage.scene, mats.stone, ...m.p, .32));
  built = BUILD.map(b => cube(stage.scene, mats.wood, ...b.p));
  tnt = cube(stage.scene, mats.tnt, -1, 1, 0); fuse = cube(stage.scene, mat('#ffe47b', { emissive: '#ffa42c', emissiveIntensity: 2 }), -1, 1.62, 0, .11);
  debris = Array.from({ length: 100 }, (_, i) => cube(stage.scene, i % 7 === 0 ? mats.tnt : mats.wood, 0, 0, 0, .18 + hash(i + 7) * .22));
  dust = Array.from({ length: 32 }, (_, i) => cube(stage.scene, mat(i % 2 ? '#ffe299' : '#f88d42', { transparent: true, opacity: .8, emissive: '#d56827', emissiveIntensity: .5 }), 0, 0, 0, .3));
  diamond = new THREE.Mesh(GEM, mat('#66f1e5', { metalness: .35, roughness: .2, flatShading: true, emissive: '#0c897c', emissiveIntensity: .25 })); stage.scene.add(diamond);
  waterGlints = Array.from({ length: 24 }, (_, i) => cube(stage.scene, mat('#9ce8e5', { emissive: '#4c9396', emissiveIntensity: .2 }), -3 + (i % 4), -.945, -8 + Math.floor(i / 4) * 3, .45, .01, .06));
  ember = cube(stage.scene, mat('#fff099', { emissive: '#ff851b', emissiveIntensity: 2 }), 0, 0, 0, .2);
  splashes = Array.from({ length: 36 }, () => cube(stage.scene, mat('#adffec', { emissive: '#439d9d', emissiveIntensity: .3 }), 0, 0, 0, .12));
  sunDisc = cube(stage.scene, new THREE.MeshBasicMaterial({ color: '#ffe199' }), -9, 10, -32, 4.2, 4.2, .4);
}
export function drawWorld(ctx, t) {
  const sunset = ease(u(t, 11.5, 15)); stage.scene.background.setRGB(.48 + .45 * sunset, .75 - .3 * sunset, .87 - .61 * sunset); stage.scene.fog.color.copy(stage.scene.background);
  sun.color.setRGB(1, .93 - .24 * sunset, .77 - .31 * sunset); sun.position.set(-9, 15 - 11 * sunset, 8); sun.intensity = 3 - .4 * sunset;
  sunDisc.position.y = 11 - 4 * sunset;
  const hp = heroPath(t); let yaw = Math.PI / 2, stride = t >= 3.35 && t < 7.05 ? t * 17 : 0, arm = -.3;
  if (t < 3.35) {
    const m = MINES[t < 2.3 ? 0 : 1]; yaw = Math.PI / 2;
    arm = -.4; for (const hit of m.hits) { const a = t - hit; if (a >= -.25 && a < .2) arm = a < 0 ? -1.9 + 1.03 * ease(u(a, -.25, 0)) : -.87 - .35 * Math.sin(a * 15); }
  }
  if (t >= 7.05) yaw = -.45 * ease(u(t, 7.05, 8));
  if (t >= 8 && t < 8.75) yaw = -Math.PI / 2 + (Math.PI / 2 - .45) * ease(u(t, 8.55, 8.75));
  setRig(hero, hp, yaw, stride, arm);
  hero.tool.visible = t < 3.35;
  hero.held.visible = t >= 4 && t < 7.05;
  if (hero.held.visible) hero.limbs[0].rotation.x = -.9 - .35 * Math.sin(t * 18);
  if (t >= 8 && t < 10.5) { hero.limbs[0].rotation.x = t < 8.25 ? -1.8 : -.7; hero.limbs[1].rotation.z = .2; }
  if (t >= 11.5) { hero.gem.visible = t >= T.reward; hero.limbs[1].rotation.set(-.35, 0, 2.1 * ease(u(t, 11.5, T.reward))); hero.limbs[0].rotation.set(-.2, 0, -.4); hero.head.rotation.z = .06 * Math.sin(t * 4); }
  MINES.forEach((m, i) => {
    mineBlocks[i].visible = t < m.pop;
    const cracks = m.hits.filter(h => t >= h).length; crackPlanes[i].forEach((p, k) => p.visible = t < m.pop && cracks === k + 1);
    const a = t - m.pop; drops[i].visible = a >= 0 && a < .65; drops[i].rotation.set(a * 4, a * 6, 0); drops[i].scale.setScalar(.32 * (1 - .6 * u(a, .4, .65))); drops[i].position.set(m.p[0] - 1.5 * u(a, 0, .65), m.p[1] + .75 * Math.sin(u(a, 0, .65) * Math.PI), m.p[2] - .6 * u(a, 0, .65));
  });
  built.forEach((m, i) => { m.visible = t >= BUILD[i].t && !(t >= T.blast && BUILD[i].p[0] >= -2 && BUILD[i].p[0] <= 0); m.position.set(...BUILD[i].p); m.scale.setScalar(1); m.rotation.set(0, 0, 0); });
  tnt.visible = t >= 5.65 && t < T.blast; tnt.material.emissive.set(t >= T.fuse && Math.floor(t * 9) % 2 ? '#7d251c' : '#000000');
  fuse.visible = t >= T.fuse && t < T.blast; fuse.scale.setScalar(.8 + .3 * Math.sin(t * 40));
  const flight = u(t, 8.25, T.fuse); ember.visible = t >= 8.25 && t < T.fuse; ember.position.set(3 - 4 * flight, 4.6 - 2.95 * flight + .7 * Math.sin(flight * Math.PI), -.6 * (1 - flight)); ember.rotation.set(t * 8, t * 6, 0);
  foes.forEach((r, i) => {
    const q = u(t, 4.6 + i * .16, 10.5); let p = [-11 - i * 1.3 + q * 8.7, .5, (i - 1) * .24]; let yawF = Math.PI / 2;
    const a = t - T.blast;
    if (a >= 0) { p = [-2.3 - i * 1.3 + (.3 + i * 1.9) / 1.35 * a, .5 + 6 * a - 5.5 * a * a, (i - 1) * .24 - 3 * a]; }
    setRig(r, p, yawF, t * 16 + i, -.2); r.root.visible = t >= 4.3 && (a < 1.55); if (a >= 0) { r.root.rotation.z = (i % 2 ? 1 : -1) * a * 4; r.limbs[0].rotation.z = 1; r.limbs[1].rotation.z = -1; }
  });
  const a = t - T.blast;
  debris.forEach((m, i) => { m.visible = a >= 0 && a < 2.2; const angle = hash(i * 7) * Math.PI * 2, v = 2 + hash(i * 13) * 6; m.position.set(-1 + Math.cos(angle) * v * a, .7 + (3 + hash(i * 19) * 6) * a - 6 * a * a, Math.sin(angle) * v * a); m.rotation.set(a * (2 + i % 5), a * 3, a * 4); m.scale.setScalar((.18 + hash(i + 7) * .22) * (1 - u(a, 1.7, 2.2))); });
  dust.forEach((m, i) => { m.visible = a >= 0 && a < 1; const angle = hash(i * 31) * 6.28; m.position.set(-1 + Math.cos(angle) * a * 4, .8 + hash(i + 20) * a * 5, Math.sin(angle) * a * 4); m.scale.setScalar(.2 + a * .8); m.material.opacity = .7 * (1 - u(a, .1, 1)); });
  const splashAge = t - 11.8;
  splashes.forEach((m, i) => { const who = Math.floor(i / 12), angle = hash(i * 51) * 6.28; m.visible = splashAge >= 0 && splashAge < .75; m.position.set(-2 + who * .6 + Math.cos(angle) * splashAge * 1.5, -1 + 2 * splashAge - 4 * splashAge * splashAge, -3.9 + (who - 1) * .24 + Math.sin(angle) * splashAge * 1.5); m.scale.setScalar(.14 * (1 - u(splashAge, .4, .75))); });
  hero.root.updateMatrixWorld(true); hero.gem.getWorldPosition(gemTarget);
  const pickup = ease(u(t, 11.5, T.reward)); diamond.visible = t >= 11.5 && t < T.reward; diamond.position.set(3.6 + (gemTarget.x - 3.6) * pickup, 4.5 + (gemTarget.y - 4.5) * pickup + .2 * Math.sin(pickup * Math.PI), .7 + (gemTarget.z - .7) * pickup); diamond.rotation.set(.2, t * 2, .05);
  waterGlints.forEach((m, i) => { m.scale.x = .3 + .3 * Math.sin(t * 1.3 + i); });
  clouds.forEach((g, i) => g.position.x = -32 + i * 8 + t * .06);
  let pos, target;
  if (t < 4) { const q = ease(u(t, 0, 4)); pos = [-2.5 - q * .35, 4.6 - q * .25, 7.5 - q * .5]; target = [-5.8, 1.55, -.3]; }
  else if (t < 8) { const q = ease(u(t, 4, 8)); pos = [-3.5 + q * 5.5, 7.8 + q * 1.8, 12.5]; target = [-1 + q * 3, 1.4 + q * 1.3, 0]; }
  else if (t < 11.5) { const q = ease(u(t, 8, 11.5)); const shake = a >= 0 && a < .45 ? .15 * Math.sin(a * 90) * (1 - a / .45) : 0; pos = [3.7 + shake, 7.7, 12.8]; target = [.4, 2.3, 0]; }
  else { const q = ease(u(t, 11.5, 15)); pos = [7 - q * 1.1, 7.2 - q * .1, 10 - q * 1.4]; target = [3, 4.7, 0]; }
  stage.look(pos, target, 0, t >= 11.5 ? 39 : 43); stage.draw(ctx);
}
