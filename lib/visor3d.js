// Visor 3D realista del taller (Three.js r160) · ForBillyComputer
import * as THREE from './three.module.min.js';
import { OrbitControls } from './OrbitControls.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { RoomEnvironment } from './RoomEnvironment.js';

const ST = { cambiado: '#22c55e', revisado: '#3b82f6', dano: '#ef4444' };
const MATS = {
  O: { color: '#e8590c', roughness: .38, metalness: 0, clearcoat: .5, clearcoatRoughness: .3 },   // plástico naranja
  O2:{ color: '#e45f12', roughness: .5, metalness: 0 },
  H: { color: '#cfd3d9', roughness: .5, metalness: 0, clearcoat: .2 },                  // carcasa gris claro
  D: { color: '#1c1f24', roughness: .88, metalness: 0 },                  // goma / plástico negro
  D2:{ color: '#3a4049', roughness: .45, metalness: .55 },                // metal oscuro
  M: { color: '#a3a9b3', roughness: .32, metalness: .9 },                 // acero
  A: { color: '#d4d9e0', roughness: .28, metalness: .85 },                // aluminio
  W: { color: '#f4f6f8', roughness: .25, metalness: 0 },                  // cerámica
  Y: { color: '#e9c46a', roughness: .95, metalness: 0 },                  // papel filtro
  B: { color: '#0ea5e9', roughness: .4, metalness: 0 },
  C: { color: '#b8692e', roughness: .35, metalness: .85 },                // cobre
  R: { color: '#c8102e', roughness: .35, metalness: 0, clearcoat: .6, clearcoatRoughness: .25 },   // rojo Honda
  G: { color: '#2f7d32', roughness: .4, metalness: 0, clearcoat: .5 },                           // verde tractor
  Wd:{ color: '#8b5a2b', roughness: .9, metalness: 0 },                                         // madera
  T: { color: '#eef2f5', roughness: .2, metalness: 0, transparent: true, opacity: .55 }, // tanque translúcido
  Wp:{ color: '#f1f3f5', roughness: .45, metalness: 0, clearcoat: .3 },                        // plástico blanco
  Bm:{ color: '#1d4ed8', roughness: .35, metalness: .35, clearcoat: .4 },                       // motor eléctrico azul
  Yl:{ color: '#facc15', roughness: .45, metalness: 0, clearcoat: .4 },                         // amarillo
  Gl:{ color: '#84cc16', roughness: .45, metalness: 0, clearcoat: .4 },                         // verde claro
  Br:{ color: '#c9a227', roughness: .3, metalness: .85 },                                       // bronce / latón
  Rb:{ color: '#2b2f36', roughness: .95, metalness: 0 }                                         // hule
};

function build(kind, opt = {}) {
  const parts = [];
  let cur = null;
  const part = (k, l, e) => { cur = { k, l, e: e || null, meshes: [] }; parts.push(cur); };
  const add = (geo, m, pos, rot) => {
    const mat = new THREE.MeshPhysicalMaterial({ envMapIntensity: .6, ...(MATS[m] || MATS.H) });
    const mesh = new THREE.Mesh(geo, mat); if (pos) mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.k = cur.k; mesh.userData.base = mat.color.clone(); cur.meshes.push(mesh); return mesh;
  };
  const AX = { y: null, x: [0, 0, -Math.PI / 2], z: [Math.PI / 2, 0, 0] };
  const box = (cx, cy, cz, sx, sy, sz, m, r) => add(new RoundedBoxGeometry(sx, sy, sz, 3, r ?? Math.min(sx, sy, sz) * .18), m, [cx, cy, cz]);
  const cyl = (cx, cy, cz, r, h, ax, m, seg = 36, r2) => add(new THREE.CylinderGeometry(r2 ?? r, r, h, seg), m, [cx, cy, cz], AX[ax]);
  const tor = (cx, cy, cz, R, r, ax, m, arc = Math.PI * 2) => add(new THREE.TorusGeometry(R, r, 12, 56, arc), m, [cx, cy, cz], ax === 'y' ? [Math.PI / 2, 0, 0] : ax === 'x' ? [0, Math.PI / 2, 0] : null);
  const tube = (pts, r, m, closed) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), !!closed), 64, r, 14, !!closed), m);
  const fins = (cx, cy, cz, r, h, ax, n, rf, m) => { cyl(cx, cy, cz, r, h, ax, m); for (let i = 0; i < n; i++) { const t = -h / 2 + h * (i + .5) / n; const p = ax === 'y' ? [cx, cy + t, cz] : ax === 'x' ? [cx + t, cy, cz] : [cx, cy, cz + t]; add(new THREE.CylinderGeometry(rf, rf, h / n * .32, 40), m, p, AX[ax]); } };
  const radial = (cx, cy, cz, r1, r2, n, th, ax, m) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const g = new THREE.BoxGeometry(r2 - r1, .045, th); const ms = add(g, m); const c = (r1 + r2) / 2;
      if (ax === 'z') { ms.position.set(cx + Math.cos(a) * c, cy + Math.sin(a) * c, cz); ms.rotation.z = a; }
      else if (ax === 'y') { ms.position.set(cx + Math.cos(a) * c, cy, cz + Math.sin(a) * c); ms.rotation.set(Math.PI / 2, 0, -a); }
      else { ms.position.set(cx, cy + Math.cos(a) * c, cz + Math.sin(a) * c); ms.rotation.set(a, 0, Math.PI / 2); } } };
  const arcPts = (cx, cy, cz, R, a0, a1, n, ax) => { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, u = Math.cos(a) * R, w = Math.sin(a) * R; P.push(ax === 'x' ? [cx, cy + u, cz + w] : ax === 'y' ? [cx + u, cy, cz + w] : [cx + u, cy + w, cz]); } return P; };
  const barShape = (cx, cy, cz, len, h, th, m) => { const s = new THREE.Shape(); const r = h / 2; s.moveTo(-len / 2, -r); s.lineTo(len / 2 - r, -r); s.absarc(len / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-len / 2, r); s.lineTo(-len / 2, -r);
    const hole = new THREE.Path(); hole.absellipse(-len / 2 + .5, 0, .18, .045, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelSize: .015, bevelThickness: .012, bevelSegments: 2, curveSegments: 24 }); g.translate(0, 0, -th / 2); return add(g, m, [cx, cy, cz]); };
  const chain = (cx, cy, cz, len, hh) => { // eslabones con dientes (InstancedMesh)
    const pts = []; const n1 = 34, na = 12; const r = hh;
    for (let i = 0; i <= n1; i++) pts.push([cx - len / 2 + len * i / n1, cy + r, 0]);
    for (let i = 1; i < na; i++) { const a = Math.PI / 2 - Math.PI * i / na; pts.push([cx + len / 2 + Math.cos(a) * r, cy + Math.sin(a) * r, 0]); }
    for (let i = 0; i <= n1; i++) pts.push([cx + len / 2 - len * i / n1, cy - r, 0]);
    const mk = (geo, m, every, dy) => { const L = pts.filter((_, i) => i % every === 0); const im = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ envMapIntensity: .6, ...MATS[m] }), L.length); const o = new THREE.Object3D();
      L.forEach((p, i) => { const j = pts.indexOf(p); const q = pts[(j + 1) % pts.length]; const ang = Math.atan2(q[1] - p[1], q[0] - p[0]); o.position.set(p[0], p[1] + (p[1] > cy ? dy : -dy), cz); o.rotation.set(0, 0, ang); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.castShadow = true; im.userData.k = cur.k; im.userData.base = im.material.color.clone(); cur.meshes.push(im); };
    mk(new RoundedBoxGeometry(.13, .07, .07, 2, .02), 'M', 1, 0);
    mk(new RoundedBoxGeometry(.1, .09, .13, 2, .02), 'D2', 2, .01);
    mk(new THREE.BoxGeometry(.07, .07, .04), 'A', 3, .07);
  };

  if (kind === 'sierra') {
    part('tapa', 'Tapa superior', [0, 1.9, 0]);
    box(.05, 1.73, 0, 1.45, .2, 1.0, 'O', .09); box(-.62, 1.5, 0, .24, .48, 1.0, 'O', .08); box(.7, 1.5, 0, .18, .42, .95, 'O', .07); cyl(.3, 1.86, .1, .06, .1, 'y', 'D2', 12);
    part('filtro', 'Filtro de aire', [-.9, 1.25, 0]);
    box(-.3, 1.27, 0, .64, .18, .74, 'D', .04); for (let i = 0; i < 9; i++) box(-.3, 1.4, -.3 + i * .075, .58, .1, .035, 'Y', .01);
    part('bujia', 'Bujía', [1.0, 1.0, .6]);
    cyl(.42, 1.38, .32, .055, .3, 'y', 'W', 20); cyl(.42, 1.18, .32, .09, .1, 'y', 'M', 6); cyl(.42, 1.09, .32, .045, .12, 'y', 'M', 16); cyl(.42, 1.55, .32, .035, .06, 'y', 'M', 12);
    part('piston', 'Pistón y anillos', [0, 2.75, 0]);
    cyl(.15, 1.45, 0, .27, .34, 'y', 'A', 48); tor(.15, 1.55, 0, .272, .016, 'y', 'D2'); tor(.15, 1.49, 0, .272, .016, 'y', 'D2'); cyl(.15, 1.37, 0, .055, .62, 'z', 'M', 20);
    part('cilindro', 'Cilindro', [0, 1.65, 0]);
    fins(.15, 1.08, 0, .3, .6, 'y', 7, .45, 'A'); cyl(.15, 1.4, 0, .2, .06, 'y', 'D2', 32);
    part('carter', 'Cárter / bloque del motor', [0, 0, 0]);
    box(.15, .55, 0, .82, .5, .76, 'A', .08); cyl(.15, .55, 0, .34, .96, 'z', 'M', 40);
    part('cigueñal', 'Cigüeñal y biela', [0, -1.25, 0]);
    cyl(.15, .5, 0, .07, 1.55, 'z', 'M', 24); cyl(.15, .5, .18, .3, .08, 'z', 'M', 40); cyl(.15, .5, -.18, .3, .08, 'z', 'M', 40); box(.15, .8, 0, .1, .56, .07, 'C', .02); cyl(.15, 1.06, 0, .07, .1, 'z', 'C', 20);
    part('carburador', 'Carburador', [-1.1, .4, 1.1]);
    box(-.5, .85, .38, .32, .3, .3, 'A', .04); cyl(-.5, .85, .6, .1, .22, 'z', 'M', 24); cyl(-.5, 1.04, .38, .05, .1, 'y', 'D2', 12); box(-.62, .85, .38, .06, .2, .2, 'C', .02);
    part('bobina', 'Bobina de encendido', [.9, .8, -1.0]);
    box(.62, .95, -.35, .3, .36, .26, 'D', .05); box(.62, .95, -.2, .14, .14, .06, 'C', .02); tube([[.62, 1.12, -.35], [.55, 1.35, -.1], [.42, 1.5, .25]], .02, 'D');
    part('volante', 'Volante / magneto', [0, 0, -1.5]);
    cyl(.15, .55, -.55, .43, .08, 'z', 'M', 48); radial(.15, .55, -.61, .15, .42, 16, .12, 'z', 'A'); cyl(.15, .55, -.62, .1, .14, 'z', 'D2', 20);
    part('arrancador', 'Arrancador (cuerda)', [0, 0, -2.5]);
    cyl(.15, .55, -.84, .52, .16, 'z', 'H', 48); radial(.15, .55, -.93, .1, .48, 10, .03, 'z', 'D'); box(-.28, 1.08, -.95, .36, .1, .12, 'D', .04); tube([[.15, .55, -.93], [-.05, .85, -.94], [-.28, 1.04, -.95]], .012, 'W');
    part('embrague', 'Embrague', [0, 0, 1.25]);
    cyl(.15, .55, .55, .29, .1, 'z', 'M', 40); [0, 2.09, 4.19].forEach(a => box(.15 + Math.cos(a) * .2, .55 + Math.sin(a) * .2, .55, .17, .1, .12, 'D2', .03));
    part('tambor', 'Tambor y piñón', [0, 0, 1.95]);
    cyl(.15, .55, .76, .35, .18, 'z', 'A', 48); cyl(.15, .55, .9, .14, .12, 'z', 'D2', 9); cyl(.15, .55, .98, .05, .1, 'z', 'M', 16);
    part('freno', 'Freno de cadena', [.3, .2, 2.6]);
    tor(.15, .55, .78, .39, .025, 'z', 'M'); box(.75, 1.0, .8, .08, .78, .52, 'D', .03);
    part('cubierta', 'Tapa lateral / cubierta del piñón', [.5, 0, 3.2]);
    box(.6, .55, 1.0, 1.02, .72, .12, 'H', .05); cyl(.85, .55, 1.08, .08, .08, 'z', 'D', 20); cyl(.45, .55, 1.08, .08, .08, 'z', 'D', 20);
    part('silenciador', 'Silenciador / escape', [1.3, .6, -.3]);
    box(.83, .8, 0, .32, .44, .52, 'M', .06); box(1.0, .8, 0, .04, .3, .38, 'D2', .01);
    part('carcasa', 'Carcasa y tanque de combustible', [-.6, -1.0, 0]);
    box(-.45, .08, 0, 1.58, .44, .96, 'H', .14); box(-1.0, .42, 0, .52, .32, .9, 'H', .1); cyl(-.75, .34, .36, .1, .12, 'y', 'D', 24); cyl(-.25, .34, -.36, .1, .12, 'y', 'O', 24);
    part('manija_t', 'Manija trasera / acelerador', [-1.2, -.3, 0]);
    tube([[-1.25, .3, 0], [-1.85, .28, 0], [-2.12, .52, 0], [-2.05, .8, 0], [-1.25, .86, 0]], .1, 'H'); box(-1.6, .86, 0, .62, .11, .2, 'D', .05); box(-1.4, .66, 0, .12, .2, .07, 'O', .02);
    part('manija_d', 'Manija delantera', [.3, 1.0, -.9]);
    tube(arcPts(.3, .9, 0, .76, -.25, 3.39, 24, 'x'), .07, 'D');
    part('espada', 'Espada', [1.2, -.55, .9]);
    barShape(2.2, .5, 0, 2.62, .4, .055, 'A'); cyl(3.3, .5, 0, .11, .07, 'z', 'M', 24);
    part('cadena', 'Cadena', [1.2, -.4, 1.8]);
    chain(2.2, .5, 0, 2.62 - .2, .22);
  } else if (kind === 'desb') {
    part('carcasa', 'Carcasa y tanque'); box(-2.4, .15, 0, 1.2, .36, .9, 'H', .12); cyl(-2.6, .36, .3, .08, .1, 'y', 'D', 20);
    part('cilindro', 'Cilindro'); fins(-2.25, .85, 0, .28, .55, 'y', 6, .4, 'A');
    part('bujia', 'Bujía'); cyl(-2.25, 1.3, 0, .05, .3, 'y', 'W', 20); cyl(-2.25, 1.15, 0, .08, .08, 'y', 'M', 6);
    part('filtro', 'Filtro de aire'); box(-2.85, .75, .05, .42, .42, .66, 'O', .08);
    part('carburador', 'Carburador'); box(-2.7, .55, .5, .32, .28, .28, 'A', .04);
    part('arrancador', 'Arrancador'); cyl(-2.4, .55, -.56, .43, .15, 'z', 'H', 44); box(-2.4, .98, -.6, .3, .09, .1, 'D', .03);
    part('volante', 'Volante / magneto'); cyl(-2.4, .55, -.4, .36, .07, 'z', 'M', 44); radial(-2.4, .55, -.45, .12, .36, 14, .1, 'z', 'A');
    part('carter', 'Bloque del motor'); box(-2.25, .5, 0, .7, .5, .6, 'A', .06);
    part('embrague', 'Embrague'); cyl(-1.65, .6, 0, .3, .3, 'x', 'D2', 40);
    part('eje', 'Eje / tubo de transmisión'); cyl(.4, .65, 0, .09, 3.8, 'x', 'A', 28);
    part('manubrio', 'Manubrio'); tube(arcPts(-.6, 1.15, 0, 1.05, .35, 2.79, 20, 'x'), .055, 'D'); cyl(-.6, .95, 0, .06, .55, 'y', 'M', 16);
    part('acelerador', 'Acelerador'); box(-.6, 1.55, -1.0, .22, .26, .32, 'O', .06);
    part('cabezal', 'Caja de engranes'); box(2.4, .55, 0, .38, .42, .38, 'A', .08);
    part('cuchilla', 'Cuchilla / cabezal de nylon'); cyl(2.45, .2, 0, .85, .04, 'y', 'M', 60); [0, 1.57, 3.14, 4.71].forEach(a => box(2.45 + Math.cos(a) * .66, .2, Math.sin(a) * .66, .26, .05, .1, 'A', .01));
    part('protector', 'Protector'); add(new THREE.CylinderGeometry(.8, .8, .3, 32, 1, true, 2.2, 1.9), 'O', [2.45, .42, 0]);
    part('arnes', 'Arnés'); box(-.3, .66, 0, .45, .25, .45, 'B', .06);

  } else if (kind === 'carpi') {
    // ===== Bomba manual de espalda (tipo Carpi) =====
    part('tanque', 'Tanque', [0, 0, 0]); box(0, 1.15, 0, 1.25, 2.1, .72, 'Wp', .22); box(0, 2.2, 0, .9, .1, .5, 'Wp', .05);
    part('tapa', 'Tapa del tanque', [0, 1.3, 0]); cyl(.28, 2.36, 0, .27, .14, 'y', 'O', 36); radial(.28, 2.36, 0, .2, .27, 12, .12, 'y', 'O');
    part('colador', 'Colador / filtro de llenado', [0, .85, .9]); cyl(.28, 2.2, 0, .22, .22, 'y', 'D', 32, .17);
    part('cilindro_b', 'Cilindro de la bomba', [-1.0, 0, 0]); cyl(-.78, 1.15, 0, .12, 1.9, 'y', 'M', 32); cyl(-.78, 2.12, 0, .15, .1, 'y', 'D2', 32);
    part('piston_b', 'Pistón y copa de cuero', [-1.6, -.2, 0]); cyl(-.78, .55, 0, .1, .1, 'y', 'D2', 28); cyl(-.78, .44, 0, .115, .14, 'y', 'Wd', 28, .085);
    part('vastago', 'Vástago del pistón', [-1.6, .9, 0]); cyl(-.78, 1.5, 0, .028, 1.9, 'y', 'M', 14);
    part('valvula_e', 'Válvula de entrada (esfera)', [-1.3, -.8, 0]); add(new THREE.SphereGeometry(.06, 20, 14), 'D2', [-.78, .2, 0]); tor(-.78, .14, 0, .07, .014, 'y', 'Rb');
    part('empaques', 'Empaques y arandelas', [-1.9, .5, .5]); [2.08, .62, .32].forEach(y => tor(-.78, y, 0, .13, .016, 'y', 'Rb'));
    part('camara', 'Cámara de presión', [-.9, 0, -1.0]); cyl(-.78, .95, -.42, .17, 1.3, 'y', 'Wp', 32); add(new THREE.SphereGeometry(.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 'Wp', [-.78, 1.6, -.42]);
    part('abrazadera', 'Abrazadera / soporte', [-1.5, .3, -.6]); [1.75, .55].forEach(y => tor(-.78, y, -.2, .3, .022, 'y', 'M', Math.PI));
    part('palanca', 'Palanca de bombeo', [-.7, .8, 1.0]); tube([[-.78, 2.42, 0], [-.78, 2.5, .35], [-.78, 1.9, .62], [-.78, .7, .7]], .035, 'M'); box(-.78, .6, .7, .1, .3, .1, 'Rb', .04); cyl(-.78, 2.42, 0, .05, .14, 'x', 'D2', 16);
    part('manguera', 'Manguera', [.6, -.6, 1.2]); tube([[-.78, .25, -.42], [-.4, .1, .2], [.4, .2, .55], [.9, .7, .75], [1.05, 1.05, .9]], .04, 'Rb');
    part('llave', 'Llave de paso / gatillo', [1.0, .4, 1.4]); box(1.1, 1.1, .92, .16, .28, .12, 'D', .05); box(1.06, .95, .92, .05, .2, .05, 'Yl', .02);
    part('lanza', 'Lanza', [1.4, .7, 1.4]); { const ms = add(new THREE.CylinderGeometry(.028, .028, 1.7, 14), 'Br', [1.85, 1.38, .92]); ms.rotation.z = -Math.PI / 2 + .35; }
    part('boquilla', 'Boquilla', [2.0, 1.2, 1.4]); { const ms = add(new THREE.CylinderGeometry(.03, .065, .16, 18), 'Br', [2.65, 1.67, .92]); ms.rotation.z = -Math.PI / 2 + .35; }
    part('correas', 'Correas', [0, 0, -1.0]); [-.35, .35].forEach(x => box(x, 1.2, -.42, .14, 1.8, .06, 'D', .03));
    part('base', 'Base', [0, -.6, 0]); box(0, .05, 0, 1.3, .1, .78, 'D', .04);
  } else if (kind === 'carb2' || kind === 'carb4') {
    // ===== Despiece del carburador =====
    if (kind === 'carb2') {
      part('cuerpo', 'Cuerpo del carburador', [0, 0, 0]); box(0, 1, 0, .9, .6, .55, 'A', .06); cyl(0, 1, 0, .2, .95, 'x', 'A', 32); cyl(0, 1, 0, .15, .97, 'x', 'D2', 28);
      part('mariposa', 'Eje y mariposa de aceleración', [0, .9, 0]); cyl(0, 1.38, .0, .025, .7, 'y', 'M', 12); cyl(.2, 1, 0, .14, .015, 'x', 'M', 28);
      part('cebador', 'Cebador (choke)', [-.9, .7, 0]); cyl(-.25, 1.38, 0, .022, .55, 'y', 'M', 12); cyl(-.35, 1, 0, .14, .015, 'x', 'M', 28);
      part('tornillos_aj', 'Tornillos de ajuste H / L / ralentí', [.9, .8, .2]); [[.25, 1.15, .32], [.38, 1.15, .32], [.32, .85, .32]].forEach(p => { cyl(...p, .03, .25, 'z', 'Br', 12); cyl(p[0], p[1], p[2] + .12, .04, .03, 'z', 'Br', 12); });
      part('emp_bomba', 'Empaque de la bomba', [0, 0, -.55]); box(0, 1, -.3, .78, .5, .015, 'Rb', .01);
      part('membrana_b', 'Membrana de bomba', [0, 0, -.85]); box(0, 1, -.32, .74, .46, .01, 'D2', .01);
      part('tapa_b', 'Tapa de la bomba', [0, 0, -1.2]); box(0, 1, -.38, .82, .52, .07, 'A', .03); cyl(-.25, 1, -.45, .05, .14, 'z', 'M', 14);
      part('filtro_m', 'Filtro de malla', [0, .7, -1.0]); cyl(.25, 1, -.33, .08, .01, 'z', 'M', 24);
      part('aguja', 'Aguja de entrada', [0, -.2, .6]); cyl(0, 1, .3, .025, .2, 'y', 'M', 12, .006);
      part('palanca_a', 'Palanca de la aguja y resorte', [.2, -.4, .8]); box(0, .92, .33, .3, .03, .05, 'M', .01); tor(.12, .86, .33, .03, .01, 'y', 'M');
      part('membrana_d', 'Membrana dosificadora', [0, 0, 1.05]); box(0, 1, .3, .74, .46, .01, 'D', .01);
      part('emp_dos', 'Empaque de dosificación', [0, 0, .85]); box(0, 1, .29, .78, .5, .015, 'Rb', .01);
      part('tapa_d', 'Tapa de dosificación', [0, 0, 1.35]); box(0, 1, .36, .82, .52, .06, 'A', .03); cyl(0, 1, .41, .07, .04, 'z', 'D', 20);
      part('tornillos', 'Tornillos de las tapas', [0, .9, 1.6]); [[-.32, 1.2], [.32, 1.2], [-.32, .8], [.32, .8]].forEach(([x, y]) => cyl(x, y, .45, .025, .08, 'z', 'M', 8));
    } else {
      part('cuerpo', 'Cuerpo del carburador', [0, 0, 0]); box(0, 1.25, 0, .9, .55, .6, 'A', .06); cyl(0, 1.25, 0, .22, 1.0, 'x', 'A', 32); cyl(0, 1.25, 0, .17, 1.02, 'x', 'D2', 28);
      part('mariposa', 'Eje y mariposa de aceleración', [.5, .55, 0]); cyl(.25, 1.62, 0, .025, .6, 'y', 'M', 12); cyl(.25, 1.25, 0, .16, .015, 'x', 'M', 28);
      part('cebador', 'Cebador (choke)', [-.8, .5, 0]); cyl(-.3, 1.62, 0, .022, .5, 'y', 'M', 12); cyl(-.4, 1.25, 0, .16, .015, 'x', 'M', 28);
      part('tornillo_m', 'Tornillo de mezcla / ralentí', [.9, .5, .7]); cyl(.32, 1.4, .36, .03, .28, 'z', 'Br', 12); tor(.32, 1.4, .44, .04, .012, 'z', 'M');
      part('emulsor', 'Tubo emulsor', [0, -.5, .2]); cyl(0, .82, 0, .04, .4, 'y', 'Br', 16);
      part('chicler', 'Chicler principal', [0, -.95, .2]); cyl(0, .58, 0, .045, .08, 'y', 'Br', 6);
      part('chicler_b', 'Chicler de baja', [.6, -.3, .4]); cyl(.25, 1.0, .2, .03, .12, 'y', 'Br', 6);
      part('aguja', 'Aguja del flotador', [-.6, -.6, .5]); cyl(-.18, .9, .12, .022, .16, 'y', 'M', 12, .005);
      part('flotador', 'Flotador y pasador', [0, -1.1, 0]); [-.18, .18].forEach(z => box(0, .62, z, .52, .18, .14, 'D', .06)); cyl(0, .7, 0, .015, .55, 'z', 'M', 8);
      part('emp_cuba', 'Empaque de la cuba', [0, -1.35, 0]); tor(0, .95, 0, .36, .02, 'y', 'Rb');
      part('cuba', 'Cuba', [0, -1.5, 0]); add(new THREE.CylinderGeometry(.38, .3, .42, 36, 1, true), 'A', [0, .72, 0]); cyl(0, .5, 0, .3, .03, 'y', 'A', 36);
      part('drenaje', 'Tornillo de drenaje y perno de cuba', [.4, -1.9, .4]); cyl(0, .42, 0, .05, .1, 'y', 'M', 6); cyl(.22, .55, .26, .03, .1, 'x', 'M', 6);
    }
  } else if (kind === 'bombaHP') {
    // ===== Despiece de bomba de alta presión =====
    part('carter_b', 'Cárter de la bomba', [0, 0, 0]); box(0, 1, 0, .9, .75, .8, 'D2', .1);
    part('brida', 'Brida / acople al motor', [-1.1, 0, 0]); cyl(-.55, 1, 0, .42, .08, 'x', 'A', 40); cyl(-.62, 1, 0, .1, .12, 'x', 'M', 20);
    part('reten', 'Retén del eje', [-.8, .4, 0]); tor(-.5, 1, 0, .12, .025, 'x', 'Rb');
    part('rodamiento', 'Rodamiento', [-.6, .7, 0]); cyl(-.4, 1, 0, .2, .1, 'x', 'M', 32); tor(-.4, 1, 0, .16, .03, 'x', 'A');
    part('plato', 'Plato oscilante', [0, .9, 0]); { const ms = add(new THREE.CylinderGeometry(.34, .34, .07, 40), 'M', [-.05, 1, 0]); ms.rotation.z = Math.PI / 2 + .25; }
    part('pistones', 'Pistones (cerámicos)', [.9, .6, 0]); [[.18, .18], [.18, -.18], [-.18, 0]].forEach(([y, z]) => cyl(.55, 1 + y, z, .05, .7, 'x', 'W', 20));
    part('sellos', 'Sellos / empaques de alta', [1.4, .3, 0]); [[.18, .18], [.18, -.18], [-.18, 0]].forEach(([y, z]) => tor(.9, 1 + y, z, .07, .02, 'x', 'Rb'));
    part('culata_b', 'Cabeza / múltiple de latón', [2.0, 0, 0]); box(1.15, 1, 0, .4, .7, .75, 'Br', .06);
    part('valvulas_b', 'Válvulas de admisión y descarga', [2.3, .9, .6]); [[.28, .2], [.28, -.2], [-.28, .2], [-.28, -.2], [0, .3], [0, -.3]].forEach(([y, z]) => cyl(1.38, 1 + y, z, .05, .08, 'x', 'Br', 6));
    part('unloader', 'Válvula reguladora (unloader)', [1.6, 1.3, 0]); cyl(1.15, 1.55, 0, .07, .45, 'y', 'Br', 20); cyl(1.15, 1.85, 0, .09, .14, 'y', 'D', 20);
    part('inyector', 'Inyector de químico', [1.8, -.5, .7]); cyl(1.15, .55, .3, .04, .22, 'y', 'Br', 12);
    part('aceite_b', 'Tapón y mirilla de aceite', [0, 1.0, .3]); cyl(0, 1.42, 0, .1, .1, 'y', 'R', 20);
  } else if (kind === 'embr') {
    // ===== Motosierra: embrague y bomba de aceite =====
    part('eje', 'Punta del cigüeñal', [-.9, 0, 0]); cyl(-.4, 0, 0, .08, 1.0, 'x', 'M', 14);
    part('cubo', 'Cubo / araña del embrague', [0, .5, 0]); cyl(0, 0, 0, .17, .24, 'x', 'D2', 6);
    part('zapatas', 'Zapatas del embrague', [0, 1.0, 0]); [0, 1, 2].forEach(i => { const a = i * 2.094; box(0, Math.sin(a) * .3, Math.cos(a) * .3, .24, .16, .3, 'A', .04); });
    part('resortes', 'Resortes del embrague', [0, 1.5, .4]); tor(0, 0, 0, .42, .025, 'x', 'M');
    part('rodamiento', 'Rodamiento de agujas', [1.2, .7, 0]); cyl(.42, 0, 0, .1, .25, 'x', 'Br', 18);
    part('tambor', 'Campana (tambor) del embrague', [1.0, 0, 0]); cyl(.32, 0, 0, .55, .28, 'x', 'M', 40);
    part('pinon', 'Piñón de la cadena', [1.5, 0, 0]); cyl(.52, 0, 0, .3, .1, 'x', 'D2', 9);
    part('sinfin', 'Sinfín (impulsor de la bomba)', [2.0, .4, 0]); { const P = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 8; P.push([.62 + i / 60 * .2, Math.sin(a) * .1, Math.cos(a) * .1]); } tube(P, .02, 'Br'); }
    part('arandela', 'Arandela y seguro (clip E)', [2.5, 0, 0]); cyl(.86, 0, 0, .12, .03, 'x', 'M', 22);
    part('bomba', 'Bomba de aceite', [1.0, -1.0, .6]); box(.5, -.6, .2, .36, .24, .26, 'D2', .04);
    part('piston_b', 'Pistón de la bomba', [1.0, -1.0, 1.3]); cyl(.5, -.6, .45, .04, .3, 'z', 'M', 10);
    part('tornillo_r', 'Tornillo de regulación de caudal', [1.0, -1.6, .6]); cyl(.5, -.78, .2, .03, .16, 'y', 'M', 8);
    part('manguera', 'Manguera de succión y filtro de aceite', [0, -1.3, .7]); tube([[.4, -.65, .05], [0, -.75, 0], [-.4, -.85, .1]], .025, 'D'); cyl(-.45, -.9, .1, .06, .12, 'x', 'W', 14);
    part('tanque', 'Tanque de aceite y tapa', [-1.0, -1.2, 0]); box(-.6, -.85, 0, .5, .4, .6, 'T', .06); cyl(-.6, -.6, .15, .1, .08, 'y', 'D', 18);
  } else if (kind === 'frenoC') {
    // ===== Motosierra: freno de cadena =====
    part('tambor', 'Tambor (campana del embrague)', [0, 0, 0]); cyl(0, 0, 0, .55, .3, 'x', 'M', 40);
    part('banda', 'Banda del freno', [0, .5, 1.0]); tor(0, 0, 0, .6, .045, 'x', 'M');
    part('protector', 'Protector de mano (palanca del freno)', [0, 1.1, 0]); box(-.1, 1.05, 0, .08, .6, 1.0, 'O', .03);
    part('palanca', 'Palanca / leva de disparo', [-.6, 1.3, .2]); box(-.15, .62, .1, .32, .08, .08, 'D2', .02);
    part('resorte', 'Resorte del freno', [-.7, .8, 1.0]); for (let i = 0; i < 8; i++) tor(-.3, .3 + i * .04, .55, .06, .012, 'y', 'M');
    part('cubierta', 'Cubierta lateral (tapa del piñón)', [1.3, 0, 0]); box(.42, 0, 0, .12, 1.2, 1.4, 'D', .06);
    part('tuercas', 'Tuercas de la espada', [1.8, 0, 0]); [-.3, .3].forEach(z => cyl(.5, -.1, z, .06, .08, 'x', 'M', 6));
    part('tensor', 'Tensor de cadena', [.8, -.8, .7]); cyl(.3, -.4, .5, .03, .5, 'z', 'Br', 10);
    part('captor', 'Captor de cadena', [0, -1.0, -.7]); box(0, -.62, -.4, .15, .15, .08, 'D', .02);
    part('pernos', 'Amortiguadores / pernos de montaje', [-.7, -.8, -.7]); cyl(-.3, -.3, -.5, .03, .3, 'y', 'M', 8); cyl(-.3, -.3, -.5, .08, .12, 'y', 'Rb', 14);
  } else if (kind === 'altern') {
    // ===== Generador: alternador =====
    part('carcasa', 'Carcasa del alternador', [0, 1.8, 0]); cyl(0, 0, 0, .66, 1.0, 'x', 'D2', 40);
    part('estator', 'Estator (bobinado)', [0, 0, 0]); cyl(0, 0, 0, .55, .72, 'x', 'C', 36);
    part('rotor', 'Rotor y eje', [1.6, 0, 0]); cyl(.05, 0, 0, .34, .6, 'x', 'M', 30); cyl(.1, 0, 0, .06, 1.6, 'x', 'M', 14);
    part('anillos', 'Anillos colectores', [2.1, .6, 0]); cyl(.48, 0, 0, .12, .12, 'x', 'Br', 22);
    part('rodamiento', 'Rodamiento trasero', [2.4, 0, 0]); cyl(.6, 0, 0, .14, .1, 'x', 'M', 22);
    part('tapa_t', 'Tapa trasera', [2.9, 0, 0]); cyl(.66, 0, 0, .66, .1, 'x', 'D2', 40);
    part('escobillas', 'Escobillas (carbones) y portaescobillas', [2.9, 1.0, 0]); box(.68, .45, 0, .15, .2, .15, 'D', .03);
    part('ventilador', 'Ventilador de enfriamiento', [-1.3, 0, 0]); radial(-.6, 0, 0, .1, .5, 10, .08, 'x', 'D2');
    part('avr', 'Regulador de voltaje (AVR)', [0, 1.2, 1.1]); box(0, .85, .3, .4, .1, .3, 'G', .02);
    part('capacitor', 'Capacitor', [0, 1.2, -1.1]); cyl(0, .82, -.35, .1, .3, 'x', 'D', 18);
    part('panel', 'Panel de control', [0, -.4, 1.3]); box(0, -.1, 1.05, 1.2, .8, .06, 'D2', .02);
    part('tomas', 'Tomacorrientes', [0, -.4, 1.7]); [-.3, .1].forEach(x => box(x, -.2, 1.1, .2, .26, .05, 'W', .02));
    part('breaker', 'Breaker (protector térmico)', [.6, -.2, 1.7]); box(.42, .15, 1.1, .12, .18, .06, 'D', .02);
    part('voltimetro', 'Voltímetro / indicador', [-.6, .1, 1.7]); cyl(-.4, .15, 1.1, .1, .05, 'z', 'W', 24);
    part('cableado', 'Cableado del alternador', [0, -1.0, .8]); tube([[.0, -.55, .3], [.1, -.5, .7], [0, -.25, 1.0]], .02, 'R');
  } else if (kind === 'soplV') {
    // ===== Sopladora: soplador (voluta y ventilador) =====
    part('carcasa_a', 'Voluta lado motor', [-.6, 0, 0]); cyl(-.15, 0, 0, .8, .2, 'x', 'O', 44);
    part('sello', 'Empaque de la voluta', [.1, .9, .9]); tor(.0, 0, 0, .76, .02, 'x', 'Rb');
    part('ventilador', 'Rotor / ventilador', [.6, 0, 0]); cyl(.05, 0, 0, .66, .03, 'x', 'D2', 40); radial(.12, 0, 0, .12, .64, 12, .16, 'x', 'D2');
    part('tuerca', 'Tuerca y arandela del ventilador', [1.0, .5, 0]); cyl(.22, 0, 0, .07, .08, 'x', 'M', 6);
    part('carcasa_b', 'Tapa de la voluta', [1.4, 0, 0]); cyl(.3, 0, 0, .8, .2, 'x', 'O', 44);
    part('rejilla', 'Rejilla de entrada de aire', [2.0, 0, 0]); tor(.45, 0, 0, .45, .03, 'x', 'D2'); for (let i = 0; i < 6; i++) box(.45, 0, 0, .02, .9, .025, 'D2').rotation.x = i / 6 * Math.PI;
    part('boca', 'Boca de salida', [0, -.5, .4]); cyl(.05, -.9, 0, .2, .3, 'y', 'O', 24);
    part('tubo_f', 'Tubo flexible (corrugado)', [0, -.9, .8]); tube([[.05, -1.05, 0], [.05, -1.5, .3], [.05, -1.85, .8]], .18, 'D2'); for (let i = 0; i < 6; i++) { const t = i / 5; tor(.05, -1.12 - t * .65, .04 + t * .66, .2, .02, 'y', 'D'); }
    part('empunadura', 'Empuñadura / control en el tubo', [.6, -1.0, 1.0]); box(.05, -1.75, .95, .14, .28, .14, 'D', .03);
    part('tubo_r', 'Tubo recto y boquilla', [0, -1.2, 1.6]); tube([[.05, -1.85, .8], [.05, -2.25, 2.1]], .15, 'O');
    part('abrazaderas', 'Abrazaderas', [.6, -.6, .5]); tor(.05, -1.05, 0, .21, .025, 'y', 'M'); tor(.05, -1.85, .8, .2, .025, 'y', 'M');
  } else if (kind === 'caracol') {
    // ===== Bomba de caracol por dentro =====
    part('soporte', 'Carcasa trasera / soporte de la bomba', [-.8, 0, 0]); cyl(-1.2, 0, 0, .6, .3, 'x', 'A', 44);
    part('eje', 'Eje / manga del eje', [-1.4, -.7, 0]); cyl(-.95, 0, 0, .07, .9, 'x', 'M', 14);
    part('reten_m', 'Retén / deflector del eje', [-.5, .7, 0]); tor(-.98, 0, 0, .1, .03, 'x', 'Rb');
    part('sello_f', 'Sello mecánico (parte fija)', [-.2, .9, 0]); cyl(-.8, 0, 0, .15, .08, 'x', 'W', 24); tor(-.84, 0, 0, .15, .02, 'x', 'Rb');
    part('sello_g', 'Sello mecánico (parte giratoria y resorte)', [0, 1.2, 0]); cyl(-.7, 0, 0, .12, .07, 'x', 'Br', 22); for (let i = 0; i < 4; i++) tor(-.64 + i * .025, 0, 0, .08, .01, 'x', 'M');
    part('espaciador', 'Espaciadores / suplementos', [.2, 1.5, 0]); cyl(-.56, 0, 0, .1, .03, 'x', 'M', 20);
    part('impulsor', 'Impulsor', [.3, 0, 0]); cyl(-.45, 0, 0, .42, .06, 'x', 'C', 40); radial(-.42, 0, 0, .08, .4, 6, .1, 'x', 'C');
    part('tuerca_i', 'Tuerca / tornillo del impulsor', [.6, 1.0, 0]); cyl(-.34, 0, 0, .06, .06, 'x', 'M', 6);
    part('difusor', 'Difusor / placa de desgaste', [.8, 0, 0]); cyl(-.25, 0, 0, .48, .05, 'x', 'M', 40); cyl(-.25, 0, 0, .14, .06, 'x', 'D2', 24);
    part('oring', 'Empaque / O-ring de la voluta', [1.1, 0, .5]); tor(-.16, 0, 0, .55, .025, 'x', 'Rb');
    part('voluta', 'Caracol (cuerpo de la bomba)', [1.6, 0, 0]); cyl(.1, 0, 0, .6, .4, 'x', 'A', 48);
    part('descarga', 'Boca de descarga', [1.6, .9, 0]); cyl(.1, .75, 0, .17, .4, 'y', 'M', 28);
    part('succion', 'Boca de succión', [2.3, 0, 0]); cyl(.48, 0, 0, .17, .36, 'x', 'M', 28);
    part('check', 'Válvula check (clapeta) y empaque', [2.7, .3, 0]); cyl(.7, 0, 0, .16, .04, 'x', 'Rb', 24);
    part('tapon', 'Tapón de cebado', [1.8, 1.0, .6]); cyl(.25, .58, .3, .08, .12, 'y', 'D', 18);
    part('drenaje', 'Tapón de drenaje', [1.8, -.9, .3]); cyl(.2, -.62, 0, .07, .1, 'y', 'D', 18);
    part('perillas', 'Perillas / tornillos de la tapa', [1.9, 0, 1.0]); [[.45, .45], [-.45, .45], [.45, -.45], [-.45, -.45]].forEach(([y, z]) => cyl(.32, y, z, .04, .14, 'x', 'D2', 8));
    part('acoples', 'Acoples de manguera y empaques', [3.2, 0, 0]); cyl(1.0, 0, 0, .18, .3, 'x', 'D2', 24); tor(.86, 0, 0, .17, .02, 'x', 'Rb');
  } else if (kind === 'mot2') {
    // ===== Motor 2 tiempos por dentro =====
    part('cilindro', 'Cilindro', [0, 1.7, 0]); cyl(0, 1.4, 0, .34, .8, 'y', 'A', 32); fins(0, 1.4, 0, .36, .7, 'y', 7, .62, 'A');
    part('bujia', 'Bujía', [0, 2.6, 0]); cyl(0, 1.95, 0, .06, .32, 'y', 'W', 18); cyl(0, 1.84, 0, .09, .08, 'y', 'M', 6);
    part('descomp', 'Válvula de descompresión', [.6, 2.3, .4]); cyl(.2, 1.86, .15, .04, .14, 'y', 'D2', 10);
    part('empaque_cil', 'Empaque de la base del cilindro', [0, 1.05, 0]); box(0, .99, 0, .8, .015, .8, 'C', .004);
    part('piston', 'Pistón', [0, .95, 0]); cyl(0, 1.22, 0, .3, .42, 'y', 'A', 32);
    part('anillos', 'Anillos del pistón', [.9, 1.15, 0]); tor(0, 1.37, 0, .305, .015, 'y', 'D2'); tor(0, 1.3, 0, .305, .015, 'y', 'D2');
    part('pasador', 'Pasador y seguros', [0, .95, 1.0]); cyl(0, 1.13, 0, .065, .5, 'z', 'M', 14);
    part('rodillo_b', 'Rodamiento de agujas de la biela', [-.9, .95, .8]); cyl(0, 1.13, 0, .1, .14, 'z', 'Br', 18);
    part('biela', 'Biela', [0, .45, .5]); box(0, .77, 0, .13, .72, .08, 'M', .03);
    part('ciguenal', 'Cigüeñal', [0, 0, 0]); [-.17, .17].forEach(z => cyl(0, .4, z, .4, .1, 'z', 'M', 32)); cyl(0, .4, 0, .075, 1.8, 'z', 'M', 16); cyl(0, .4, 0, .06, .3, 'z', 'M', 12);
    part('rodamientos', 'Rodamientos del cigüeñal', [0, -.7, 0]); [-.55, .55].forEach(z => cyl(0, .4, z, .19, .12, 'z', 'M', 24));
    part('retenes', 'Retenes (sellos de aceite)', [0, -1.1, 0]); [-.7, .7].forEach(z => tor(0, .4, z, .13, .035, 'z', 'Rb'));
    part('carter_a', 'Cárter lado volante', [0, 0, -1.4]); box(0, .35, -.42, 1.1, .9, .32, 'A', .08);
    part('carter_b', 'Cárter lado embrague', [0, 0, 1.4]); box(0, .35, .42, 1.1, .9, .32, 'A', .08);
    part('empaque_c', 'Empaque del cárter', [0, -.4, 1.0]); box(0, .35, .25, 1.0, .82, .015, 'C', .004);
    part('escape', 'Silenciador / escape', [1.6, .4, 0]); box(.68, 1.3, 0, .38, .5, .45, 'M', .06);
    part('admision', 'Múltiple de admisión', [-1.5, .4, 0]); box(-.6, 1.25, 0, .32, .24, .3, 'Rb', .05);
  } else if (kind === 'mot4') {
    // ===== Motor 4 tiempos por dentro =====
    part('bloque', 'Bloque del motor', [0, 0, 0]); box(0, .6, 0, 1.2, 1.0, 1.0, 'A', .08); fins(0, 1.3, 0, .38, .5, 'y', 4, .6, 'A');
    part('empaque_t', 'Empaque de la tapa del cárter', [0, 0, .9]); box(0, .55, .53, 1.05, .85, .015, 'C', .004);
    part('tapa_c', 'Tapa del cárter', [0, 0, 1.3]); box(0, .55, .6, 1.12, .9, .12, 'A', .05);
    part('ciguenal', 'Cigüeñal', [-1.3, -.8, 0]); cyl(0, .45, 0, .085, 2.1, 'z', 'M', 16); cyl(0, .45, .12, .32, .1, 'z', 'M', 30); cyl(0, .45, -.12, .32, .1, 'z', 'M', 30);
    part('biela', 'Biela', [0, .7, .9]); box(0, .9, 0, .13, .72, .1, 'M', .03);
    part('piston', 'Pistón', [0, 1.4, 0]); cyl(0, 1.38, 0, .27, .4, 'y', 'A', 30);
    part('anillos', 'Anillos del pistón', [.9, 1.4, 0]); [1.5, 1.45, 1.4].forEach(y => tor(0, y, 0, .275, .013, 'y', 'D2'));
    part('pasador', 'Pasador y seguros', [0, 1.15, 1.0]); cyl(0, 1.28, 0, .06, .45, 'z', 'M', 14);
    part('empaque_cul', 'Empaque de culata', [0, 1.9, 0]); box(0, 1.66, 0, .85, .015, .72, 'C', .004);
    part('culata', 'Culata', [0, 2.3, 0]); box(0, 1.85, 0, .9, .34, .76, 'A', .06);
    part('valvulas', 'Válvulas (admisión y escape)', [0, 2.9, .7]); [-.18, .18].forEach(x => { cyl(x, 1.78, 0, .028, .5, 'y', 'M', 10); cyl(x, 1.55, 0, .09, .02, 'y', 'M', 18); });
    part('resortes', 'Resortes y retenedores de válvula', [.8, 3.2, .7]); [-.18, .18].forEach(x => { for (let i = 0; i < 4; i++) tor(x, 1.98 + i * .045, 0, .07, .012, 'y', 'M'); });
    part('balancines', 'Balancines y varillas', [-.8, 3.1, .4]); [-.18, .18].forEach(x => box(x, 2.18, .08, .06, .05, .32, 'M', .01)); [-.1, .1].forEach(x => cyl(x + .25, 1.4, .3, .02, .9, 'y', 'M', 8));
    part('tapa_v', 'Tapa de válvulas', [0, 3.6, 0]); box(0, 2.3, 0, .8, .12, .6, 'D2', .04);
    part('levas', 'Árbol de levas y engrane', [1.4, -.3, .7]); cyl(.32, .5, 0, .06, .9, 'z', 'D2', 14); cyl(.32, .5, .3, .25, .06, 'z', 'Br', 30);
    part('buzos', 'Buzos (levantaválvulas)', [1.3, .5, .4]); [-.1, .1].forEach(z => cyl(.32, .85, z, .05, .24, 'y', 'M', 12));
    part('regulador', 'Regulador (contrapesos)', [-1.3, -.2, .9]); cyl(-.35, .5, .35, .15, .06, 'z', 'Br', 22);
    part('volante', 'Volante y chaveta', [0, 0, -1.7]); cyl(0, .45, -.78, .55, .12, 'z', 'M', 44); radial(0, .45, -.86, .15, .55, 16, .1, 'z', 'A');
    part('bobina', 'Bobina de encendido', [0, .9, -1.7]); box(0, 1.15, -.66, .3, .2, .12, 'D', .02);
    part('aceite', 'Varilla / tapón de aceite y sensor', [1.3, -.6, 1.0]); cyl(.55, .2, .55, .07, .22, 'x', 'Y', 14);
  } else if (kind === 'arranq') {
    // ===== Arrancador retráctil (eje horizontal x) =====
    part('tapa', 'Tapa del arrancador', [0, 0, 0]); cyl(0, 0, 0, .9, .34, 'x', 'H', 44); box(0, -.5, .95, .25, .2, .25, 'H', .05);
    part('resorte', 'Resorte espiral', [.8, 0, 0]); { const P = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 12, r = .1 + i / 160 * .48; P.push([.12, Math.sin(a) * r, Math.cos(a) * r]); } tube(P, .012, 'M'); }
    part('caja_res', 'Caja / tapa del resorte', [1.1, 0, 0]); cyl(.19, 0, 0, .62, .03, 'x', 'D2', 36);
    part('polea', 'Polea', [1.5, 0, 0]); cyl(.26, 0, 0, .56, .16, 'x', 'O', 40); cyl(.26, 0, 0, .1, .2, 'x', 'O2', 20);
    part('cuerda', 'Cuerda', [1.5, -.3, .4]); tor(.26, 0, 0, .5, .03, 'x', 'W'); tube([[.26, -.1, .5], [.2, -.45, .9], [.2, -.7, 1.3]], .03, 'W');
    part('manilla', 'Manilla (agarradera)', [1.5, -.5, .7]); box(.2, -.8, 1.45, .12, .12, .36, 'D', .04);
    part('trinquetes', 'Trinquetes (uñas)', [1.9, 0, 0]); [-1, 1].forEach(sx => box(.38, sx * .06, sx * .2, .04, .06, .24, 'M', .01));
    part('resorte_t', 'Resortes de los trinquetes', [2.1, .5, 0]); [-1, 1].forEach(sx => tor(.4, sx * .12, sx * .3, .04, .01, 'x', 'M'));
    part('guia', 'Guía / retén de trinquetes', [2.3, 0, 0]); cyl(.43, 0, 0, .26, .03, 'x', 'D2', 28);
    part('tornillo', 'Tornillo central y arandela', [2.7, 0, 0]); cyl(.48, 0, 0, .05, .16, 'x', 'M', 8); cyl(.46, 0, 0, .1, .02, 'x', 'M', 18);
    part('copa', 'Copa de arranque (en el volante)', [3.2, 0, 0]); cyl(.6, 0, 0, .3, .1, 'x', 'M', 30); [0, 1, 2].forEach(i => { const a = i * 2.09; box(.6, Math.sin(a) * .3, Math.cos(a) * .3, .1, .06, .08, 'M', .01); });
    part('rejilla', 'Rejilla / malla', [3.7, 0, 0]); tor(.7, 0, 0, .7, .03, 'x', 'D2'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; box(.7, 0, 0, .02, 1.38, .025, 'D2').rotation.x = a; }
  } else if (kind === 'bombae') {
    // ===== Bomba eléctrica centrífuga (caracol) =====
    part('carcasa_m', 'Carcasa del motor', [0, 0, 0]); cyl(-.7, .7, 0, .55, 1.3, 'x', 'B', 40); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(-.7, .7 + Math.sin(a) * .56, Math.cos(a) * .56, 1.2, .05, .05, 'B', .01); }
    part('base', 'Base / patas', [0, -.6, 0]); box(-.4, .1, 0, 1.9, .07, .9, 'D2', .02); [-1.1, .3].forEach(x => box(x, .16, 0, .25, .16, .7, 'D2', .02));
    part('tapa_t', 'Tapa trasera (escudo)', [-.9, 0, 0]); cyl(-1.42, .7, 0, .56, .12, 'x', 'B', 36);
    part('ventilador', 'Ventilador', [-1.5, 0, 0]); radial(-1.58, .7, 0, .08, .45, 8, .07, 'x', 'D2');
    part('tapa_v', 'Tapa del ventilador', [-2.1, 0, 0]); cyl(-1.76, .7, 0, .58, .26, 'x', 'D', 32);
    part('estator', 'Estator (bobinado)', [0, 1.3, 0]); cyl(-.7, .7, 0, .46, 1.0, 'x', 'C', 32);
    part('rotor', 'Rotor y eje', [0, 2.3, 0]); cyl(-.65, .7, 0, .28, .9, 'x', 'M', 28); cyl(-.35, .7, 0, .055, 2.3, 'x', 'M', 14);
    part('rodamientos', 'Rodamientos', [0, 1.7, .9]); cyl(-1.3, .7, 0, .14, .1, 'x', 'M', 22); cyl(-.04, .7, 0, .14, .1, 'x', 'M', 22);
    part('capacitor', 'Capacitor', [0, 1.1, 1.1]); cyl(-.7, 1.38, .26, .12, .42, 'x', 'D', 22);
    part('caja_con', 'Caja de conexiones / interruptor', [0, 1.1, -1.0]); box(-.7, 1.32, -.18, .42, .2, .3, 'B', .04);
    part('cable', 'Cable de alimentación', [0, .6, -1.5]); tube([[-.85, 1.32, -.33], [-1.2, 1.1, -.6], [-1.8, .6, -.8]], .03, 'D');
    part('linterna', 'Soporte / adaptador (linterna)', [.6, 0, 0]); cyl(.15, .7, 0, .4, .3, 'x', 'A', 32);
    part('sello', 'Sello mecánico', [1.0, .6, 0]); tor(.4, .7, 0, .1, .03, 'x', 'Rb'); cyl(.42, .7, 0, .08, .08, 'x', 'W', 18);
    part('impulsor', 'Impulsor', [1.5, 0, 0]); cyl(.6, .7, 0, .38, .08, 'x', 'Br', 32); radial(.66, .7, 0, .08, .36, 6, .08, 'x', 'Br');
    part('empaque', 'Empaque / O-ring de la voluta', [1.9, 0, .5]); tor(.74, .7, 0, .45, .025, 'x', 'Rb');
    part('voluta', 'Cuerpo de la bomba (caracol)', [2.4, 0, 0]); cyl(.98, .7, 0, .55, .42, 'x', 'A', 40);
    part('descarga', 'Boca de descarga', [2.4, .8, 0]); cyl(.98, 1.42, 0, .15, .42, 'y', 'A', 22);
    part('succion', 'Boca de succión', [3.0, 0, 0]); cyl(1.36, .7, 0, .15, .36, 'x', 'A', 22);
    part('tapon', 'Tapón de cebado / drenaje', [2.6, .9, .6]); cyl(1.1, 1.22, .25, .06, .1, 'y', 'D', 8);
  } else if (kind === 'sierrae') {
    // ===== Motosierra de batería / eléctrica =====
    part('carcasa', 'Carcasa', [0, 0, 0]); box(0, .6, 0, 1.4, .6, .55, 'O', .12);
    part('motor', 'Motor eléctrico', [0, 1.3, 0]); cyl(.35, .6, 0, .22, .4, 'z', 'M', 28);
    part('bateria', 'Batería', [-.3, 1.7, 0]); box(-.35, 1.02, 0, .6, .3, .4, 'D', .05);
    part('conector', 'Conector de batería', [-.3, 1.1, .7]); box(-.35, .86, 0, .4, .04, .3, 'Br', .01);
    part('control', 'Módulo electrónico y cableado', [0, -.8, .7]); box(-.2, .42, 0, .4, .1, .3, 'G', .02);
    part('gatillo', 'Gatillo y seguro', [-.6, -.6, 0]); box(-.88, .4, 0, .2, .1, .08, 'D', .02);
    part('manija_t', 'Manija trasera', [-1.0, 0, 0]); tube([[-.7, .85, 0], [-1.25, .85, 0], [-1.3, .35, 0], [-.75, .3, 0]], .055, 'D');
    part('manija_d', 'Manija delantera', [0, 1.0, .8]); tube([[.3, .9, -.35], [-.1, 1.3, -.3], [-.4, 1.3, .3], [-.6, .3, .32]], .045, 'D');
    part('freno', 'Freno de cadena (protector)', [.4, 1.3, 0]); box(.75, 1.1, 0, .06, .45, .6, 'D', .02);
    part('tanque', 'Tanque de aceite y tapa', [0, -.6, 1.0]); box(.35, .4, .3, .3, .25, .12, 'T', .03); cyl(.35, .56, .3, .05, .05, 'y', 'D', 14);
    part('bomba', 'Bomba de aceite', [.4, -.9, -.7]); box(.6, .35, -.12, .15, .12, .12, 'D2', .02);
    part('pinon', 'Piñón de cadena', [.5, 0, 1.0]); cyl(.85, .55, .32, .12, .06, 'z', 'M', 9);
    part('cubierta', 'Cubierta del piñón', [.5, 0, 1.5]); box(.9, .55, .38, .4, .42, .06, 'D', .03);
    part('tensor', 'Tensor de cadena (perilla)', [.6, .3, 1.9]); cyl(.9, .55, .43, .1, .05, 'z', 'O', 20);
    part('espada', 'Espada', [1.0, 0, .4]); barShape(2.0, .55, .32, 2.2, .4, .04, 'A');
    part('cadena', 'Cadena', [1.0, 0, .8]); { const P = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; P.push([2.0 + Math.cos(a) * 1.12, .55 + Math.sin(a) * .22, .32]); } tube(P, .025, 'D2', true); }
  } else if (kind === 'desbe') {
    // ===== Desbrozadora / orilladora de batería o eléctrica =====
    part('bateria', 'Batería', [-1.0, 0, 0]); box(-2.45, .55, 0, .5, .35, .36, 'D', .05);
    part('carcasa_t', 'Carcasa trasera (portabatería)', [0, .7, 0]); box(-1.95, .55, 0, .6, .42, .42, 'O', .08);
    part('conector', 'Conector de batería', [-.6, .7, .6]); box(-2.2, .55, 0, .04, .26, .26, 'Br', .01);
    part('gatillo', 'Mango de control y gatillo', [0, .8, -.7]); box(-1.2, .78, 0, .42, .14, .16, 'O', .04); box(-1.2, .66, 0, .14, .08, .06, 'D', .02);
    part('tubo', 'Tubo / eje', [0, 0, 0]); cyl(.15, .6, 0, .07, 3.3, 'x', 'A', 22);
    part('cableado', 'Cable interno', [0, -.5, .6]); tube([[-1.7, .6, .1], [0, .6, .1], [1.7, .55, .1]], .015, 'R');
    part('manubrio', 'Manubrio (asa)', [0, 1.0, 0]); tube(arcPts(-.4, 1.0, 0, .55, .35, 2.79, 18, 'x'), .045, 'D');
    part('carcasa_m', 'Carcasa del motor', [.6, 1.2, 0]); box(2.0, .55, 0, .5, .45, .5, 'O', .1);
    part('motor', 'Motor eléctrico', [.6, .7, .7]); cyl(2.05, .45, 0, .2, .38, 'y', 'D2', 26);
    part('cabezal', 'Cabezal de nylon', [.6, -.8, 0]); cyl(2.05, .12, 0, .3, .16, 'y', 'D', 32);
    part('hilo', 'Hilo de nylon', [.9, -1.1, 0]); tube([[1.7, .1, 0], [2.4, .1, 0]], .012, 'Gl');
    part('protector', 'Protector', [-.2, .3, -1.0]); add(new THREE.CylinderGeometry(.6, .6, .22, 32, 1, true, 2.4, 2.2), 'O', [2.05, .25, 0]);
    part('cuchilla_h', 'Cuchilla cortahilo', [0, -.3, -1.3]); box(2.05, .2, -.6, .14, .04, .05, 'M', .01);
  } else if (kind === 'setosC') {
    // ===== Cortasetos: cuchilla y caja de engranes =====
    const teeth = (y, off, m) => { for (let i = 0; i < 20; i++) { const x = -1.35 + off + i * .21; box(x, y, .2, .07, .03, .14, m, .01); box(x, y, -.2, .07, .03, .14, m, .01); } };
    part('caja', 'Caja de engranes', [0, 0, 0]); box(-2.0, 0, 0, .9, .3, .8, 'A', .08);
    part('empaque', 'Empaque de la tapa', [0, -1.0, 0]); box(-2.0, -.17, 0, .85, .015, .75, 'C', .004);
    part('tapa', 'Tapa inferior de la caja', [0, -1.4, 0]); box(-2.0, -.22, 0, .9, .06, .8, 'D2', .04);
    part('rodamientos', 'Rodamientos', [-.5, 1.4, 0]); cyl(-2.3, .2, 0, .15, .1, 'y', 'M', 24); cyl(-1.72, .2, 0, .13, .08, 'y', 'M', 24);
    part('pinion', 'Piñón de entrada', [-.9, 1.0, -.4]); cyl(-2.3, .02, 0, .06, .36, 'y', 'Br', 12); cyl(-2.3, -.08, 0, .1, .1, 'y', 'Br', 12);
    part('engrane', 'Engrane principal', [.3, 1.1, .9]); cyl(-1.72, -.02, 0, .32, .06, 'y', 'Br', 36);
    part('excentricas', 'Excéntricas (levas)', [.5, .7, 1.3]); cyl(-1.72, .05, 0, .12, .05, 'y', 'M', 20); cyl(-1.72, -.1, 0, .12, .05, 'y', 'M', 20);
    part('bielas', 'Bielas de la cuchilla', [.9, .5, 1.4]); box(-1.45, .05, 0, .6, .035, .12, 'M', .015); box(-1.45, -.1, 0, .6, .035, .12, 'M', .015);
    part('arandelas', 'Arandelas y seguros', [.2, 1.6, .8]); cyl(-1.72, .1, 0, .08, .02, 'y', 'C', 18); cyl(-2.3, .27, 0, .08, .02, 'y', 'C', 18);
    part('guia', 'Barra guía / placa de refuerzo', [0, 1.1, 0]); box(.75, .1, 0, 4.3, .025, .07, 'D2', .01);
    part('cuchilla_s', 'Cuchilla superior', [0, .6, 0]); box(.75, .05, 0, 4.3, .03, .16, 'M', .01); teeth(.05, 0, 'M');
    part('cuchilla_i', 'Cuchilla inferior', [0, -.6, 0]); box(.75, .01, 0, 4.3, .03, .16, 'A', .01); teeth(.01, .1, 'A');
    part('tornillos', 'Tornillos, bujes y tuercas guía', [0, 1.5, .5]); [-1.0, .2, 1.4, 2.6].forEach(x => { cyl(x, .05, 0, .025, .22, 'y', 'M', 6); cyl(x, .17, 0, .05, .04, 'y', 'M', 6); });
    part('guarda', 'Guarda / deflector de la cuchilla', [0, .2, -.9]); box(.85, .02, -.4, 3.8, .14, .06, 'O', .02);
    part('protector', 'Protector de mano', [0, .8, -1.0]); cyl(-1.3, .35, 0, .42, .04, 'x', 'D', 32);
    part('funda', 'Funda de la cuchilla', [0, -1.7, 0]); box(.75, -.22, 0, 4.4, .06, .55, 'D', .03);
  } else if (kind === 'setose') {
    // ===== Cortasetos de batería / eléctrico =====
    part('carcasa_i', 'Carcasa izquierda', [0, 0, 1.0]); box(-1.3, .45, .12, 1.7, .5, .24, 'D2', .1);
    part('carcasa_d', 'Carcasa derecha', [0, 0, -1.0]); box(-1.3, .45, -.12, 1.7, .5, .24, 'D2', .1);
    part('tapa', 'Cubierta superior', [0, 1.0, 0]); box(-1.0, .74, 0, 1.0, .08, .36, 'G', .04);
    part('motor', 'Motor eléctrico', [0, 1.5, .4]); cyl(-.75, .45, 0, .17, .38, 'y', 'M', 24); cyl(-.75, .67, 0, .05, .08, 'y', 'Br', 12);
    part('bateria', 'Batería', [-1.2, .2, 0]); box(-2.05, .5, 0, .5, .36, .36, 'D', .06); box(-2.05, .69, 0, .4, .02, .3, 'G', .01);
    part('conector', 'Conector de batería (terminales)', [-.7, .7, 0]); box(-1.77, .5, 0, .06, .24, .24, 'Br', .01);
    part('cableado', 'Cableado y módulo de control', [0, -.9, .7]); box(-1.25, .32, 0, .4, .1, .18, 'G', .02); tube([[-1.7, .4, .05], [-1.45, .3, .08], [-1.0, .35, .05], [-.8, .4, 0]], .015, 'R');
    part('gatillo', 'Gatillo / interruptor', [-.5, -.8, 0]); box(-1.85, .17, 0, .25, .1, .08, 'O', .02);
    part('seguro', 'Botón de seguro y resorte', [-.3, 1.0, 0]); box(-1.6, .77, 0, .12, .06, .06, 'O', .02);
    part('mango_t', 'Mango trasero', [-1.3, .4, 0]); tube([[-1.75, .78, 0], [-2.45, .82, 0], [-2.55, .3, 0], [-1.8, .2, 0]], .055, 'D');
    part('mango_d', 'Mango delantero (asa)', [0, 1.3, 0]); tube([[-.45, .45, .32], [-.45, 1.0, .28], [-.45, 1.0, -.28], [-.45, .45, -.32]], .05, 'D');
    part('caja', 'Caja de engranes', [.3, -.7, 0]); box(-.12, .38, 0, .5, .2, .4, 'A', .05);
    part('engrane', 'Engrane y excéntrica', [.3, -1.2, .6]); cyl(-.12, .3, 0, .16, .05, 'y', 'Br', 28);
    part('protector', 'Protector de mano', [.4, .9, 0]); box(.18, .6, 0, .05, .42, .52, 'D', .02);
    part('cuchilla', 'Cuchilla doble', [1.0, 0, 0]); box(1.65, .4, 0, 2.8, .04, .14, 'M', .01); for (let i = 0; i < 14; i++) { box(.4 + i * .19, .4, .17, .06, .03, .14, 'M', .01); box(.4 + i * .19, .4, -.17, .06, .03, .14, 'M', .01); }
    part('funda', 'Funda de la cuchilla', [1.0, -.9, 0]); box(1.65, .2, 0, 2.9, .05, .5, 'D', .03);
  } else if (kind === 'cabezalP') {
    // ===== Cabezal de la podadora telescópica =====
    part('carcasa', 'Carcasa de engranes', [0, 0, 0]); box(0, 0, 0, .8, .7, .5, 'A', .08);
    part('acople', 'Acople del tubo', [1.4, -.5, 0]); cyl(1.6, 0, 0, .16, .9, 'x', 'D2', 28);
    part('palanca', 'Palanca / tornillo de apriete', [1.8, -1.0, .6]); box(1.75, -.2, .16, .32, .05, .06, 'M', .02); cyl(1.62, -.12, .16, .03, .2, 'y', 'M', 8);
    part('eje', 'Eje y piñón de entrada', [.7, -.6, 0]); cyl(.9, 0, 0, .05, .8, 'x', 'M', 12); cyl(.5, 0, 0, .1, .12, 'x', 'Br', 14);
    part('rodamientos', 'Rodamientos y anillos de retención', [.9, -1.0, .5]); cyl(1.1, 0, 0, .12, .08, 'x', 'M', 22); tor(1.2, 0, 0, .13, .015, 'x', 'M');
    part('tanque', 'Tanque de aceite de cadena', [.5, .8, -.5]); box(.2, .48, -.05, .36, .38, .3, 'T', .06);
    part('tapa_t', 'Tapa del tanque y filtro', [.6, 1.4, -.5]); cyl(.2, .72, -.05, .1, .08, 'y', 'D', 18);
    part('bomba', 'Bomba de aceite', [0, -.7, .9]); box(-.22, -.18, .3, .18, .14, .1, 'D2', .02);
    part('engrane', 'Engrane de salida (corona)', [0, .3, .7]); cyl(-.2, 0, .28, .24, .05, 'z', 'Br', 30);
    part('placa', 'Placa / tapa de engranes', [-.2, 0, 1.1]); box(-.2, 0, .33, .9, .74, .04, 'A', .02);
    part('pinon_c', 'Piñón de cadena', [-.3, 0, 1.6]); cyl(-.3, 0, .4, .12, .06, 'z', 'M', 10);
    part('tensor', 'Pernos y tornillo tensor', [-.2, .6, 1.3]); cyl(-.6, .12, .38, .03, .14, 'z', 'M', 8); cyl(-.6, -.12, .38, .03, .14, 'z', 'M', 8);
    part('espada', 'Espada', [-.4, 0, 2.0]); barShape(-1.45, 0, .45, 2.3, .4, .04, 'A').rotation.y = Math.PI;
    part('cadena', 'Cadena', [-.4, 0, 2.4]); { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); pts.push([-1.45 + c * 1.18, sn * .23, .45]); } tube(pts, .025, 'D2', true); }
    part('cubierta', 'Cubierta del piñón', [-.3, 0, 2.9]); box(-.35, 0, .56, .7, .6, .08, 'D', .05);
    part('tuerca', 'Tuerca de la cubierta', [-.3, 0, 3.4]); cyl(-.35, 0, .63, .06, .06, 'z', 'M', 6);
  } else if (kind === 'tuboT') {
    // ===== Tubo de transmisión, embrague, manubrio y cabezal (desbrozadora / cortadora telescópica) =====
    part('carcasa_e', 'Carcasa del embrague (brida)', [-.6, 0, 0]); box(-3.0, 0, 0, .22, .9, .9, 'A', .08); cyl(-2.7, 0, 0, .28, .5, 'x', 'A', 28);
    part('tambor', 'Tambor del embrague', [-1.8, 0, 0]); cyl(-3.42, 0, 0, .4, .22, 'x', 'M', 36);
    part('rodamiento', 'Rodamiento del embrague', [-1.2, .6, 0]); cyl(-3.15, 0, 0, .17, .1, 'x', 'M', 24);
    part('anillo', 'Anillo de retención (seguro)', [-1.5, .9, 0]); tor(-3.25, 0, 0, .15, .018, 'x', 'M');
    part('bujes', 'Amortiguadores de goma (antivibración)', [0, 1.0, 0]); cyl(-2.35, 0, 0, .2, .5, 'x', 'Rb', 8);
    part('empaque', 'Empaque / arandela', [-.2, 1.2, .5]); tor(-2.05, 0, 0, .21, .02, 'x', 'C');
    part('acople', 'Abrazadera / acople del tubo', [0, .7, .8]); box(-1.85, 0, 0, .38, .3, .3, 'D2', .05); cyl(-1.85, .2, 0, .03, .14, 'y', 'M', 8);
    part('tubo', 'Tubo de transmisión', [0, 0, 0]); cyl(.3, 0, 0, .12, 4.0, 'x', 'A', 28);
    part('guia', 'Guía / forro del eje (liner)', [0, -.7, 0]); cyl(.3, 0, 0, .09, 3.9, 'x', 'W', 20);
    part('eje', 'Eje de transmisión', [0, -1.2, 0]); cyl(.3, 0, 0, .03, 4.4, 'x', 'M', 10);
    part('tapones', 'Tapones / bujes del tubo', [0, .5, .8]); cyl(-1.62, 0, 0, .14, .1, 'x', 'D', 20); cyl(2.25, 0, 0, .14, .1, 'x', 'D', 20);
    part('manubrio', 'Manubrio (asa)', [0, 1.1, 0]); tube(arcPts(-.6, .45, 0, .85, .35, 2.79, 20, 'x'), .05, 'D'); cyl(-.6, .25, 0, .05, .4, 'y', 'D', 12);
    part('abrazaderas', 'Abrazaderas del manubrio', [0, .5, .9]); [.15, -.15].forEach(y => box(-.6, y, 0, .14, .07, .3, 'M', .02));
    part('mango', 'Mango de control', [0, .8, -.9]); box(-1.3, .2, 0, .6, .15, .18, 'O', .05);
    part('gatillo', 'Gatillo del acelerador y seguro', [0, .2, -1.2]); box(-1.3, .07, 0, .18, .1, .08, 'D', .02);
    part('cable', 'Cable del acelerador', [0, .5, -.7]); tube([[-1.35, .22, 0], [-2.1, .38, .2], [-2.8, .32, .32]], .012, 'D');
    part('cabezal', 'Caja de engranes (cabezal)', [.6, 0, 0]); box(2.75, 0, 0, .45, .4, .4, 'A', .08); cyl(3.0, -.28, 0, .25, .32, 'y', 'A', 28);
    part('tornillo_g', 'Tornillo de abrazadera / tapón de grasa', [.6, 1.0, .5]); cyl(2.72, .26, 0, .05, .12, 'y', 'D2', 8);
    part('pinion', 'Piñón de entrada', [-.2, .9, 0]); cyl(2.45, 0, 0, .06, .3, 'x', 'Br', 12); cyl(2.6, 0, 0, .1, .08, 'x', 'Br', 12);
    part('rodamientos_c', 'Rodamientos del cabezal', [-.6, 1.3, 0]); cyl(2.35, 0, 0, .12, .08, 'x', 'M', 22); cyl(3.0, -.08, 0, .13, .08, 'y', 'M', 22);
    part('seguro_c', 'Anillos de retención del cabezal', [-.9, 1.6, 0]); tor(2.26, 0, 0, .11, .015, 'x', 'M');
    part('corona', 'Corona y eje de salida', [.9, -.6, 0]); cyl(3.0, -.35, 0, .06, .6, 'y', 'M', 14); cyl(3.0, -.15, 0, .18, .06, 'y', 'Br', 24);
    part('arandela', 'Arandela de empuje / disco', [1.0, -1.1, 0]); cyl(3.0, -.7, 0, .3, .05, 'y', 'A', 32);
    part('copa', 'Copa protectora (plato)', [1.0, -1.5, 0]); cyl(3.0, -.86, 0, .32, .16, 'y', 'M', 32);
    part('tuerca', 'Tuerca de la cuchilla', [1.0, -1.9, 0]); cyl(3.0, -1.0, 0, .1, .1, 'y', 'M', 6);
  } else if (kind === 'bombaE') {
    // ===== Despiece de bomba de fumigadora de motor (pistón) =====
    part('cuerpo_b', 'Cuerpo de la bomba', [0, 0, 0]); box(0, 1, 0, .8, .62, .7, 'A', .08);
    part('reten', 'Retén del eje', [0, -.2, -1.0]); tor(0, 1, -.38, .12, .025, 'z', 'Rb');
    part('excentrica', 'Eje y excéntrica (cigüeñal)', [-1.0, -.3, -.6]); cyl(0, 1, -.12, .18, .1, 'z', 'M', 32); cyl(0, 1, -.55, .06, .55, 'z', 'M', 20);
    part('biela_b', 'Biela', [-.9, .7, 0]); box(0, 1.38, 0, .09, .5, .09, 'M', .02); tor(0, 1.12, 0, .1, .03, 'z', 'M');
    part('cilindro_b', 'Camisa / cilindro', [0, 1.7, 0]); cyl(0, 1.78, 0, .2, .46, 'y', 'D2', 32);
    part('piston_b', 'Pistón (émbolo cerámico)', [0, .95, 0]); cyl(0, 1.72, 0, .12, .34, 'y', 'W', 24);
    part('copas', 'Copas / sellos del pistón', [.9, 1.0, 0]); tor(0, 1.62, 0, .13, .03, 'y', 'Rb'); tor(0, 1.82, 0, .13, .03, 'y', 'Rb');
    part('empaques', 'Empaques y O-rings', [0, .45, 1.0]); tor(0, 1.34, 0, .27, .02, 'y', 'Rb'); tor(.5, 1.48, 0, .16, .018, 'y', 'Rb');
    part('valv_e', 'Válvula de entrada', [-1.1, .2, .3]); cyl(-.5, 1.12, 0, .07, .12, 'x', 'Br', 6);
    part('succion', 'Toma de succión y filtro', [-1.6, -.4, 0]); cyl(-.66, .86, 0, .06, .28, 'x', 'Br', 12); cyl(-.92, .86, 0, .1, .2, 'x', 'D', 20);
    part('valv_s', 'Válvula de salida', [1.1, -.3, .3]); cyl(.5, 1.12, 0, .07, .12, 'x', 'Br', 6);
    part('camara', 'Cámara de aire (presión)', [1.2, 1.2, 0]); cyl(.5, 1.82, 0, .2, .62, 'y', 'A', 32); cyl(.5, 2.16, 0, .14, .08, 'y', 'A', 32, .2);
    part('manometro', 'Manómetro', [1.5, 1.7, .5]); cyl(.5, 2.5, 0, .17, .07, 'z', 'W', 32); tor(.5, 2.5, 0, .17, .025, 'z', 'M'); cyl(.5, 2.3, 0, .03, .2, 'y', 'Br', 10);
    part('regulador', 'Regulador de presión / alivio', [-1.2, 1.0, .5]); cyl(-.45, 1.55, .15, .08, .36, 'y', 'Br', 20); cyl(-.45, 1.8, .15, .11, .14, 'y', 'R', 20);
    part('descarga', 'Salida a la manguera', [1.4, -.6, .8]); cyl(.62, .86, .25, .05, .3, 'x', 'Br', 12);
    part('tornillos', 'Tornillos de la tapa', [0, -.3, 1.3]); [[-.3, .25], [.3, .25], [-.3, -.25], [.3, -.25]].forEach(([x, z]) => cyl(x, 1.33, z, .03, .1, 'y', 'M', 8));
  } else if (kind === 'bombab') {
    // ===== Bomba de espalda eléctrica de batería (tipo Toyama / bivolt) =====
    part('tapa', '1 · Tapa del tanque', [0.0, 1.5, 0.0]); cyl(0, 2.78, .05, .34, .14, 'y', 'D', 40); box(0, 2.88, .05, .44, .06, .1, 'D', .03); radial(0, 2.78, .05, .28, .34, 16, .12, 'y', 'D');
    part('emp_tapa', '2 · Empaque de la tapa', [0.0, 1.15, 0.0]); tor(0, 2.7, .05, .31, .018, 'y', 'Rb');
    part('colador', '3 · Colador / filtro de llenado', [0.0, 0.85, 0.0]); cyl(0, 2.55, .05, .3, .32, 'y', 'Wp', 36, .24); cyl(0, 2.4, .05, .24, .02, 'y', 'D2', 36);
    part('valv_aire', '4 · Válvula de aire de la tapa', [-0.9, 1.1, 0.5]); cyl(-.45, 2.6, .25, .05, .14, 'y', 'D', 16);
    part('tanque', '5 · Tanque', [0.0, 0.0, 0.0]); box(0, 1.55, .05, 1.3, 1.95, .82, 'Wp', .24); cyl(0, 2.55, .05, .33, .14, 'y', 'Wp', 40); box(0, 2.05, .48, .5, .18, .08, 'Wp', .05);
    part('respaldo', '7 · Respaldo (espaldar)', [-1.2, 0.0, -1.2]); box(0, 1.5, -.42, 1.22, 1.75, .08, 'D', .04); [-.4, -.15, .1, .35].forEach(x => box(x, 1.5, -.48, .12, 1.55, .06, 'D2', .05));
    part('tornillos_r', '6 · 8 · Tornillos del respaldo', [-1.6, 0.4, -1.6]); [[-.5, 2.3], [.5, 2.3], [-.5, .7], [.5, .7]].forEach(([x, y]) => cyl(x, y, -.5, .035, .12, 'z', 'M', 10));
    part('salida_t', '9 · Salida del tanque / filtro de succión', [-0.3, -0.6, 0.3]); cyl(-.25, .55, .05, .07, .12, 'y', 'D', 18); cyl(-.25, .47, .05, .05, .08, 'y', 'Wp', 14);
    part('base', '23 · Base / bandeja inferior', [0.0, -0.96, 0.0]); box(0, .3, .05, 1.36, .46, .86, 'D', .1); [-.5, .5].forEach(x => [-.28, .38].forEach(z => cyl(x, .05, z, .07, .08, 'y', 'Rb', 14)));
    part('patas', '21 · Patas de hule', [0.0, -1.26, 0.0]); [-.5, .5].forEach(x => [-.28, .38].forEach(z => cyl(x, -.04, z, .065, .06, 'y', 'Rb', 14)));
    part('bomba', '24 · Bomba eléctrica de diafragma', [0.6, -0.72, 0.9]); cyl(.15, .32, .2, .17, .42, 'x', 'Bm', 32); box(-.2, .32, .2, .26, .3, .3, 'D', .05); cyl(-.36, .32, .2, .13, .06, 'x', 'D2', 28);
    part('racores', '25 · 26 · Racores de entrada y salida', [1.1, -1.0, 1.2]); cyl(-.2, .52, .2, .04, .12, 'y', 'Wp', 14); cyl(-.2, .32, .4, .04, .12, 'z', 'Wp', 14);
    part('resorte', '10 · Resorte', [-1.4, -1.0, 0.2]); { const P = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 16; P.push([-.55 + Math.cos(a) * .035, .2 + i / 80 * .3, .35 + Math.sin(a) * .035]); } tube(P, .007, 'M'); }
    part('soporte_l', '11 · Soporte de la lanza', [-1.6, -0.6, 0.5]); cyl(-.62, .7, .45, .045, .55, 'y', 'D', 16);
    part('placa', '12 · Tarjeta electrónica (control)', [-1.1, -0.78, -0.2]); box(.35, .32, -.2, .3, .22, .025, 'G', .01); [[.28, .36], [.42, .3], [.35, .25]].forEach(([x, y]) => box(x, y, -.18, .05, .04, .03, 'D2', .01));
    part('regulador', '13 · Regulador de presión / velocidad', [-1.6, -0.84, 0.8]); box(-.45, .32, .48, .2, .14, .06, 'D', .02);
    part('puerto', '14 · 15 · Toma de carga y su tapa', [-2.0, -0.96, 0.6]); box(-.68, .25, .3, .05, .12, .14, 'D', .02); box(-.71, .25, .3, .02, .1, .12, 'Rb', .01);
    part('interruptor', '16 · 17 · Interruptor de encendido', [-2.0, -1.14, 0.2]); box(-.68, .34, .05, .05, .16, .2, 'D', .02); box(-.705, .36, .05, .03, .08, .1, 'R', .01);
    part('perilla', '18 · 19 · 20 · Perilla, arandela y tuerca', [-2.1, -1.38, 0.8]); cyl(-.4, .32, .52, .06, .06, 'z', 'Yl', 20); cyl(-.4, .32, .56, .03, .03, 'z', 'M', 6);
    part('pasacable', '22 · Pasacable / arandela de la manguera', [1.2, -1.08, 0.9]); tor(.66, .32, .3, .05, .015, 'x', 'Rb');
    part('bateria', '30 · Batería 12 V', [0.0, -0.3, -2.0]); box(0, 1.15, -.62, .8, .55, .3, 'D2', .04); box(-.22, 1.45, -.62, .08, .05, .08, 'R', .01); box(.22, 1.45, -.62, .08, .05, .08, 'D', .01);
    part('tapa_bat', '28 · 29 · Tapa trasera de la batería', [0.0, 0.2, -2.7]); box(0, 1.2, -.82, 1.0, 1.1, .06, 'D', .05); box(0, 1.35, -.86, .5, .22, .03, 'D2', .05);
    part('manguera', '27 · Manguera', [1.4, -0.8, 1.6]); tube([[-.2, .32, .45], [.4, .15, .75], [.9, .2, .85], [1.1, .55, .9], [1.15, .95, .9]], .035, 'Wp');
    part('gatillo', '31 · Gatillo / maneral', [1.8, 0.0, 1.8]); box(1.16, 1.12, .9, .12, .38, .14, 'D', .04); box(1.1, 1.02, .9, .04, .2, .06, 'R', .01);
    part('empaques', '32 · Empaques (O-ring)', [2.2, 0.5, 2.0]); [1.32, 1.36].forEach(y => tor(1.18, y, .9, .05, .012, 'y', 'Rb'));
    part('conector', '33 · 34 · 35 · Conector y seguro de la lanza', [-1.4, 1.1, 0.9]); box(-.62, 1.02, .45, .12, .12, .14, 'D', .03); cyl(-.62, 1.02, .55, .02, .14, 'z', 'M', 10);
    part('lanza', '36 · Lanza', [2.3, 0.8, 1.8]); { const ms = add(new THREE.CylinderGeometry(.025, .025, 1.6, 14), 'M', [1.48, 2.05, 0.9]); ms.rotation.z = -.35; }
    part('boq_doble', '37 · Boquilla doble (Y)', [2.7, 1.3, 1.8]); { const y = 2.85, x = 1.77; cyl(x, y, .9, .035, .12, 'y', 'D2', 14); [-1, 1].forEach(sz => { const ms = add(new THREE.CylinderGeometry(.03, .045, .16, 14), 'Br', [x + .06, y + .08, .9 + sz * .09]); ms.rotation.x = sz * .7; }); }
    part('boq_reg', '38 · Boquilla regulable', [3.1, 0.6, 1.4]); { const ms = add(new THREE.CylinderGeometry(.035, .06, .16, 18), 'Br', [2.3, 1.3, 1.2]); ms.rotation.z = -Math.PI / 2; }
    part('boq_chorro', '39 · Boquilla de chorro', [3.4, 0.3, 1.0]); { const ms = add(new THREE.CylinderGeometry(.025, .04, .2, 14), 'Br', [2.3, 1.0, 1.2]); ms.rotation.z = -Math.PI / 2; }
    part('campana', '40 · Campana / boquilla de abanico', [3.6, 0.0, 0.6]); { const ms = add(new THREE.CylinderGeometry(.16, .05, .16, 28, 1, true), 'D', [2.3, 0.65, 1.2]); ms.rotation.z = -Math.PI / 2; }
    part('boq_larga', '41 · Boquilla larga / extensión', [3.8, -0.3, 0.2]); { const ms = add(new THREE.CylinderGeometry(.03, .06, .55, 16), 'D', [2.3, 0.3, 1.2]); ms.rotation.z = -Math.PI / 2; }
    part('cargador', '42 · Cargador', [3.0, -0.96, -0.6]); box(2.2, .1, -.4, .45, .2, .3, 'D', .04); tube([[1.97, .1, -.4], [1.7, .05, -.3], [1.55, .2, -.1]], .015, 'D'); tube([[2.43, .1, -.4], [2.7, .05, -.5]], .015, 'D');
    part('correas', '43 · Correas', [0.0, 0.0, -1.6]); [-.38, .38].forEach(x => { box(x, 1.55, -.55, .14, 1.7, .04, 'D', .02); box(x, 2.2, -.58, .2, .12, .06, 'D2', .02); });
  } else if (kind === 'bomba') {
    part('tanque_q', 'Tanque del líquido'); box(0, 1.6, 0, 1.6, 2.0, .9, 'T', .25);
    part('tapa', 'Tapa del tanque'); cyl(0, 2.66, 0, .28, .15, 'y', 'O', 32);
    part('carcasa', 'Carcasa del motor'); box(0, -.15, .95, 1.2, .6, .8, 'O', .12);
    part('cilindro', 'Cilindro'); fins(.15, .45, .95, .25, .45, 'y', 5, .35, 'A');
    part('bujia', 'Bujía'); cyl(.15, .85, .95, .05, .28, 'y', 'W', 20);
    part('carburador', 'Carburador'); box(-.5, .2, 1.35, .3, .28, .26, 'A', .04);
    part('filtro', 'Filtro de aire'); box(-.55, .45, .95, .35, .35, .5, 'D', .06);
    part('arrancador', 'Arrancador'); cyl(0, -.15, .44, .38, .14, 'z', 'H', 40);
    part('bomba', 'Bomba'); cyl(.9, .2, .95, .25, .45, 'y', 'B', 36);
    part('correas', 'Correas / arnés'); box(.55, 1.6, -.55, .15, 1.8, .12, 'D', .05); box(-.55, 1.6, -.55, .15, 1.8, .12, 'D', .05);
    part('manguera', 'Manguera'); tube([[.9, .45, .95], [1.4, .6, .8], [1.6, 1.4, .7], [1.9, 1.85, .6]], .05, 'D');
    part('lanza', 'Lanza / pistola'); cyl(2.5, 1.85, .6, .05, 1.3, 'x', 'M', 20); box(1.95, 1.72, .6, .12, .3, .1, 'D', .03);
    part('boquilla', 'Boquilla'); cyl(3.2, 1.85, .6, .09, .18, 'x', 'C', 20, .04);
  } else if (kind === 'corta') {
    // ===== Cortacésped de 4 ruedas con motor de eje vertical =====
    // --- Máquina / carcasa ---
    part('chasis', 'Carcasa / plato de corte', [0, 0, 0]); box(0, .45, 0, 2.1, .32, 1.85, 'R', .22); cyl(.05, .63, 0, .78, .1, 'y', 'R', 48, .9); box(1.0, .5, 0, .14, .22, 1.7, 'R', .06);
    part('cuchilla', 'Cuchilla', [0, -1.3, 0]); box(.05, .25, 0, 1.65, .035, .2, 'M', .01); [-1, 1].forEach(sx => box(.05 + sx * .74, .27, .07 * sx, .18, .06, .08, 'M', .01));
    part('adaptador', 'Adaptador / soporte de cuchilla', [0, -.95, 0]); cyl(.05, .31, 0, .15, .08, 'y', 'D2', 28);
    part('perno_c', 'Perno y arandela de cuchilla', [0, -1.7, 0]); cyl(.05, .2, 0, .05, .12, 'y', 'M', 6); cyl(.05, .225, 0, .1, .02, 'y', 'M', 24);
    part('ruedas', 'Ruedas delanteras', [.7, -.2, 0]); [-1, 1].forEach(sz => { cyl(.85, .3, sz * 1.04, .3, .15, 'z', 'D', 40); cyl(.85, .3, sz * 1.12, .14, .02, 'z', 'A', 24); radial(.85, .3, sz * 1.04, .05, .27, 8, .12, 'z', 'D2'); });
    part('ruedas_t', 'Ruedas traseras', [-.7, -.2, 0]); [-1, 1].forEach(sz => { cyl(-.85, .3, sz * 1.04, .3, .15, 'z', 'D', 40); cyl(-.85, .3, sz * 1.12, .14, .02, 'z', 'A', 24); radial(-.85, .3, sz * 1.04, .05, .27, 8, .12, 'z', 'D2'); });
    part('ejes', 'Ejes / pernos de rueda', [0, -.5, 0]); [[.85, 1], [.85, -1], [-.85, 1], [-.85, -1]].forEach(([x, sz]) => cyl(x, .3, sz * 1.0, .035, .3, 'z', 'M', 12));
    part('altura', 'Palancas de ajuste de altura', [0, .35, .3]); [[.85, 1], [.85, -1], [-.85, 1], [-.85, -1]].forEach(([x, sz]) => { box(x - .08, .55, sz * .96, .05, .34, .04, 'M', .01); cyl(x - .08, .74, sz * .96, .04, .07, 'y', 'D', 12); });
    part('deflector', 'Tapa trasera / deflector', [-.7, -.2, 0]); box(-1.08, .45, 0, .05, .34, .8, 'D', .02);
    part('descarga', 'Tapa de descarga lateral', [0, 0, .9]); box(.15, .48, .98, .55, .22, .06, 'D', .04);
    part('bolsa', 'Bolsa recolectora', [-1.0, .3, 0]); box(-1.55, .8, 0, .85, .62, .95, 'D2', .16); box(-1.15, .82, 0, .1, .55, .85, 'D', .03);
    part('manubrio_i', 'Manubrio inferior', [-.5, .4, 0]); [-1, 1].forEach(sz => tube([[-.95, .58, sz * .6], [-1.6, 1.3, sz * .6]], .045, 'D2'));
    part('manubrio', 'Manubrio superior', [-.7, .9, 0]); tube([[-1.6, 1.3, .6], [-2.05, 1.9, .6], [-2.05, 1.9, -.6], [-1.6, 1.3, -.6]], .045, 'D2');
    part('perillas', 'Perillas y tornillos del manubrio', [-.3, .4, .7]); [-1, 1].forEach(sz => cyl(-1.6, 1.3, sz * .68, .08, .07, 'z', 'D', 20));
    part('freno', 'Palanca de freno del motor', [-.9, 1.2, 0]); tube([[-1.95, 1.78, .55], [-1.82, 1.95, .55], [-1.82, 1.95, -.55], [-1.95, 1.78, -.55]], .025, 'M');
    part('cable', 'Cable de freno / acelerador', [-.2, 1.0, .9]); tube([[-1.92, 1.8, .58], [-1.6, 1.35, .66], [-1.0, .85, .66], [-.4, .95, .42]], .016, 'D');
    part('guia', 'Guía de la cuerda de arranque', [-.3, .7, .9]); box(-1.55, 1.24, .66, .06, .07, .1, 'O', .02);
    // --- Motor (eje vertical) ---
    part('carter', 'Cárter (base) y empaque', [0, .55, 0]); box(0, .74, 0, .78, .13, .78, 'A', .05); tor(0, .67, 0, .3, .015, 'y', 'Rb');
    part('cilindro', 'Bloque / cilindro', [0, 1.0, 0]); box(0, .98, 0, .7, .36, .7, 'A', .06); fins(.52, .98, 0, .2, .36, 'x', 6, .3, 'A');
    part('culata', 'Culata', [1.0, 1.0, 0]); box(.8, .98, 0, .12, .5, .5, 'A', .04); 
    part('empaque_c', 'Empaque de culata', [.7, 1.0, 0]); box(.735, .98, 0, .015, .44, .44, 'C', .004);
    part('piston', 'Pistón y anillos', [.7, 1.4, .9]); cyl(.42, .98, 0, .17, .22, 'x', 'A', 32); [.04, -.04].forEach(dx => tor(.42 + dx, .98, 0, .172, .01, 'x', 'D2'));
    part('biela', 'Biela', [.2, 1.3, .9]); box(.2, .98, 0, .36, .07, .06, 'C', .02);
    part('ciguenal', 'Cigüeñal vertical', [0, .3, -1.3]); cyl(0, .78, 0, .06, 1.0, 'y', 'M', 20); cyl(0, .98, 0, .2, .05, 'y', 'M', 32);
    part('levas', 'Árbol de levas', [-.6, 1.2, 1.0]); cyl(-.18, .95, .2, .04, .4, 'y', 'D2', 14); cyl(-.18, .88, .2, .13, .03, 'y', 'D2', 24);
    part('valvulas', 'Válvulas y resortes', [.5, 2.0, .5]); [-.1, .1].forEach(z => { cyl(.55, 1.2, z, .022, .32, 'y', 'M', 10); tor(.55, 1.28, z, .05, .012, 'y', 'M'); });
    part('volante', 'Volante (magneto) y chaveta', [0, 2.0, 0]); cyl(0, 1.22, 0, .4, .07, 'y', 'M', 48); radial(0, 1.27, 0, .12, .4, 16, .08, 'y', 'A');
    part('bobina', 'Bobina de encendido', [-.7, 2.0, .6]); box(-.36, 1.18, .28, .14, .14, .22, 'D', .03);
    part('bujia', 'Bujía', [1.2, 1.6, .2]); cyl(.92, 1.08, 0, .045, .26, 'x', 'W', 20); cyl(.82, 1.08, 0, .07, .06, 'x', 'M', 6);
    part('carcasa', 'Cubierta del motor', [0, 2.6, 0]); box(-.02, 1.36, 0, .98, .24, .98, 'D', .12);
    part('arrancador', 'Arrancador retráctil y cuerda', [0, 3.1, 0]); cyl(0, 1.52, 0, .33, .09, 'y', 'H', 40); box(-.3, 1.6, 0, .12, .06, .06, 'D', .02);
    part('regulador', 'Regulador / resorte del acelerador', [-.6, 1.8, .9]); box(-.32, 1.0, .4, .04, .22, .04, 'M', .01); tor(-.32, 1.12, .44, .03, .008, 'z', 'M');
    part('silenciador', 'Silenciador', [1.2, 1.2, 1.0]); cyl(.7, .8, .42, .13, .34, 'z', 'M', 28);
    part('aceite', 'Varilla y tapón de aceite', [-.8, 1.6, 1.1]); cyl(-.32, .9, .42, .05, .32, 'y', 'Y', 16);
    // --- Carburador y combustible ---
    part('carburador', 'Carburador', [-1.0, 1.3, -.8]); box(-.46, .88, -.25, .18, .16, .16, 'A', .03);
    part('filtro', 'Filtro de aire', [-1.4, 1.6, -.8]); box(-.62, .95, -.25, .16, .3, .34, 'D', .05); box(-.6, .95, -.25, .1, .24, .28, 'Y', .02);
    part('tanque', 'Tanque de combustible', [-.5, 2.0, -1.0]); box(-.12, 1.02, -.6, .62, .3, .3, 'D2', .1);
    part('tapa_t', 'Tapa del tanque', [-.5, 2.6, -1.1]); cyl(-.25, 1.2, -.62, .08, .06, 'y', 'O', 20);
  } else {
    // ======= Motor 4 tiempos tipo Honda GX (y máquinas que lo usan) =======
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const cylDir = (c, dir, r, h, m, seg = 36, r2) => { const ms = add(new THREE.CylinderGeometry(r2 ?? r, r, h, seg), m, c); ms.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize()); return ms; };
    const finsDir = (c, dir, r, h, n, rf, m) => { cylDir(c, dir, r, h, m); const d = dir.clone().normalize(); for (let i = 0; i < n; i++) { const t = -h / 2 + h * (i + .5) / n; cylDir(V3(...c).addScaledVector(d, t).toArray(), d, rf, h / n * .32, m, 40); } };
    const gx = (ox, oy, oz, s, o = {}) => {
      const P = (x, y, z) => [ox + x * s, oy + y * s, oz + z * s], Q = v => v * s;
      const banks = o.twin ? [V3(0, .72, .7).normalize(), V3(0, .72, -.7).normalize()] : [V3(0, .42, 1).normalize()];
      const B0 = V3(...P(0, .5, 0));
      const along = (d, t) => B0.clone().addScaledVector(d, Q(t)).toArray();
      part('carter', o.twin ? 'Cárter / bloque (V-twin)' : 'Cárter / bloque', [0, 0, 0]); box(...P(0, .42, 0), Q(1.0), Q(.62), Q(.82), 'A', Q(.08)); box(...P(0, .08, 0), Q(1.05), Q(.14), Q(.9), 'A', Q(.04));
      part('tapa_c', 'Tapa del cárter', [Q(.9), 0, 0]); box(...P(.56, .42, 0), Q(.12), Q(.6), Q(.76), 'A', Q(.04)); [[.25, .25], [-.25, .25], [.25, -.25], [-.25, -.25]].forEach(([y, z]) => cyl(...P(.63, .42 + y, z), Q(.035), Q(.04), 'x', 'M', 6));
      part('eje', 'Eje de salida (con chaveta)', [Q(1.7), 0, 0]); cyl(...P(.92, .4, 0), Q(.1), Q(.6), 'x', 'M', 28); box(...P(1.0, .5, 0), Q(.32), Q(.04), Q(.05), 'D2', Q(.01));
      part('cilindro', 'Cilindro', null); banks.forEach(d => finsDir(along(d, .62), d, Q(.3), Q(.52), 7, Q(.44), 'A'));
      part('culata', 'Culata y tapa de válvulas', null); banks.forEach(d => { const ms = add(new RoundedBoxGeometry(Q(.64), Q(.22), Q(.62), 3, Q(.05)), 'A', along(d, 1.0)); ms.quaternion.setFromUnitVectors(V3(0, 1, 0), d); const t = add(new RoundedBoxGeometry(Q(.52), Q(.08), Q(.5), 3, Q(.03)), 'D2', along(d, 1.15)); t.quaternion.setFromUnitVectors(V3(0, 1, 0), d); });
      part('bujia', 'Bujía', null); banks.forEach(d => { const c = V3(...along(d, 1.0)).add(V3(Q(.38), Q(.05), 0)); cylDir(c.toArray(), V3(1, .3, 0), Q(.05), Q(.3), 'W', 20); cylDir(c.clone().add(V3(Q(-.05), 0, 0)).toArray(), V3(1, .3, 0), Q(.085), Q(.08), 'M', 6); });
      part('valvulas', 'Válvulas y resortes', null); banks.forEach(d => [-.12, .12].forEach(x => { const c = V3(...along(d, .95)).add(V3(Q(x), 0, 0)); cylDir(c.toArray(), d, Q(.025), Q(.55), 'M', 12); const sp = add(new THREE.TorusGeometry(Q(.06), Q(.012), 8, 20), 'M', c.clone().addScaledVector(d, Q(.18)).toArray()); sp.quaternion.setFromUnitVectors(V3(0, 0, 1), d); }));
      part('piston', 'Pistón y anillos', null); banks.forEach(d => { cylDir(along(d, .55), d, Q(.27), Q(.3), 'A', 40); [.08, .02].forEach(t => { const r = add(new THREE.TorusGeometry(Q(.272), Q(.014), 8, 40), 'D2', along(d, .55 + t)); r.quaternion.setFromUnitVectors(V3(0, 0, 1), d); }); });
      part('biela', 'Biela', null); banks.forEach(d => { const a = V3(...P(0, .42, 0)), b = V3(...along(d, .5)); const m = add(new RoundedBoxGeometry(Q(.08), a.distanceTo(b), Q(.06), 2, Q(.02)), 'C', a.clone().lerp(b, .5).toArray()); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); });
      part('cigueñal', 'Cigüeñal', [0, Q(-1.1), 0]); cyl(...P(0, .42, 0), Q(.07), Q(1.4), 'x', 'M', 24); cyl(...P(.16, .42, 0), Q(.3), Q(.08), 'x', 'M', 40); cyl(...P(-.16, .42, 0), Q(.3), Q(.08), 'x', 'M', 40);
      part('levas', 'Árbol de levas', [0, Q(-1.5), Q(.5)]); cyl(...P(0, .28, .3), Q(.05), Q(.75), 'x', 'D2', 16); [-.1, .1].forEach(x => box(...P(x, .3, .3), Q(.06), Q(.16), Q(.12), 'M', Q(.03))); cyl(...P(.3, .28, .3), Q(.18), Q(.04), 'x', 'D2', 24);
      part('regulador', 'Regulador (gobernador)', [Q(.6), Q(-1.3), Q(-.5)]); cyl(...P(.28, .25, -.22), Q(.1), Q(.12), 'x', 'D2', 16); box(...P(.28, .62, -.38), Q(.04), Q(.4), Q(.04), 'M', Q(.01));
      part('empaques', 'Empaques', [0, Q(.5), Q(1.3)]); banks.forEach(d => { const g = add(new THREE.TorusGeometry(Q(.3), Q(.012), 6, 4), 'C', along(d, .88)); g.quaternion.setFromUnitVectors(V3(0, 0, 1), d); g.rotateZ(Math.PI / 4); });
      part('volante', 'Volante / ventilador', [Q(-1.0), 0, 0]); cyl(...P(-.6, .45, 0), Q(.46), Q(.08), 'x', 'M', 48); radial(...P(-.65, .45, 0), Q(.14), Q(.44), 18, Q(.1), 'x', 'A');
      part('bobina', 'Bobina de encendido', [Q(-.9), Q(.9), Q(.4)]); box(...P(-.48, .92, .32), Q(.22), Q(.18), Q(.3), 'D', Q(.04)); tube([P(-.48, 1.0, .45), P(-.2, 1.15, .75), P(.3, 1.08, .9)], Q(.018), 'D');
      part('arrancador', 'Arrancador retráctil', [Q(-2.0), 0, 0]); cyl(...P(-.8, .5, 0), Q(.56), Q(.16), 'x', 'R', 48); box(...P(-.92, .9, -.25), Q(.1), Q(.12), Q(.36), 'D', Q(.04)); tube([P(-.9, .5, 0), P(-.92, .75, -.15), P(-.92, .9, -.25)], Q(.012), 'W');
      if (!o.noTank && !o.twin) { part('tanque', 'Tanque de combustible', [0, Q(1.4), 0]); box(...P(-.1, 1.32, -.05), Q(1.15), Q(.38), Q(.86), 'R', Q(.14)); part('tapa_t', 'Tapa del tanque', [0, Q(2.1), 0]); cyl(...P(.28, 1.55, -.18), Q(.14), Q(.09), 'y', 'D', 28); }
      part('filtro', 'Filtro de aire', o.twin ? [0, Q(1.5), 0] : [Q(1.1), Q(.7), Q(1.0)]); if (o.twin) { box(...P(0, 1.45, 0), Q(.9), Q(.3), Q(.6), 'D', Q(.1)); box(...P(0, 1.36, 0), Q(.7), Q(.14), Q(.45), 'Y', Q(.03)); } else { box(...P(.52, 1.0, .8), Q(.46), Q(.46), Q(.34), 'D', Q(.1)); box(...P(.52, 1.0, .68), Q(.34), Q(.34), Q(.1), 'Y', Q(.02)); }
      part('carburador', 'Carburador', o.twin ? [0, Q(1.0), Q(.9)] : [Q(1.3), 0, Q(.9)]); box(...(o.twin ? P(0, 1.08, 0) : P(.42, .72, .55)), Q(.26), Q(.22), Q(.22), 'A', Q(.03)); cyl(...(o.twin ? P(0, .94, 0) : P(.42, .58, .55)), Q(.1), Q(.1), 'y', 'M', 24);
      part('acelerador', 'Palanca de acelerador / choke', [Q(1.5), Q(.6), Q(.4)]); box(...P(.62, .95, .42), Q(.05), Q(.24), Q(.05), 'D2', Q(.01)); box(...P(.62, 1.09, .42), Q(.12), Q(.06), Q(.08), 'D', Q(.02));
      part('silenciador', 'Silenciador y protector', o.twin ? [0, Q(-.2), Q(-1.6)] : [Q(-1.0), Q(.8), Q(1.5)]); if (o.twin) { box(...P(0, .3, -.75), Q(.9), Q(.32), Q(.3), 'M', Q(.08)); } else { cyl(...P(-.25, .98, 1.02), Q(.21), Q(.56), 'x', 'M', 32); box(...P(-.25, 1.1, 1.06), Q(.62), Q(.06), Q(.5), 'D', Q(.02)); }
      part('aceite', 'Varilla y tapón de aceite', [Q(.7), Q(-.6), Q(.8)]); cyl(...P(.42, .24, .44), Q(.07), Q(.14), 'y', 'Y', 20); cyl(...P(-.42, .1, .46), Q(.045), Q(.06), 'z', 'M', 6);
    };
    const gxS = () => { const m = String(opt.modelo || ''); const n = +((/gx\s*-?(\d{2,3})/i.exec(m) || [])[1] || (/\b(\d{3})\b/.exec(m) || [])[1] || 160); const twin = /v-?twin|2\s*cil|bicil/i.test(m) || n >= 600; const s = twin ? 1.45 : n <= 120 ? .78 : n <= 160 ? .9 : n <= 200 ? .96 : n <= 270 ? 1.08 : n <= 420 ? 1.22 : 1.3; return { s, twin }; };
    const t2 = (ox, oy, oz, s) => { // motor pequeño 2 tiempos
      const P = (x, y, z) => [ox + x * s, oy + y * s, oz + z * s], Q = v => v * s;
      part('carcasa', 'Carcasa y tanque'); box(...P(0, 0, 0), Q(1.1), Q(.34), Q(.8), 'H', Q(.1)); cyl(...P(-.3, .2, .25), Q(.08), Q(.1), 'y', 'D', 20);
      part('cilindro', 'Cilindro'); fins(...P(.1, .5, 0), Q(.24), Q(.46), 'y', 6, Q(.34), 'A');
      part('bujia', 'Bujía'); cyl(...P(.1, .9, 0), Q(.045), Q(.26), 'y', 'W', 20);
      part('filtro', 'Filtro de aire'); box(...P(-.42, .45, 0), Q(.3), Q(.36), Q(.5), 'O', Q(.08));
      part('carburador', 'Carburador'); box(...P(-.22, .38, .32), Q(.24), Q(.2), Q(.2), 'A', Q(.03));
      part('arrancador', 'Arrancador'); cyl(...P(.05, .3, -.48), Q(.36), Q(.12), 'z', 'H', 40); box(...P(.05, .62, -.52), Q(.24), Q(.08), Q(.08), 'D', Q(.03));
      part('volante', 'Volante / magneto'); cyl(...P(.05, .3, -.36), Q(.3), Q(.06), 'z', 'M', 40); radial(...P(.05, .3, -.4), Q(.1), Q(.3), 12, Q(.08), 'z', 'A');
      part('silenciador', 'Silenciador'); box(...P(.45, .45, .25), Q(.26), Q(.3), Q(.22), 'M', Q(.05));
    };
    const wheels = (pts, r, w, key, lbl) => { part(key || 'ruedas', lbl || 'Ruedas'); pts.forEach(([x, y, z]) => { cyl(x, y, z, r, w, 'z', 'D', 40); cyl(x, y, z + (z >= 0 ? w / 2 : -w / 2), r * .45, .03, 'z', 'A', 24); }); };
    const frameBox = (x0, x1, y0, y1, z0, z1, r, m, key, lbl) => { part(key || 'marco', lbl || 'Marco / chasis tubular'); const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]]; tube(c, r, m); tube(c.map(p => [p[0], p[1], z1]), r, m); [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y]) => tube([[x, y, z0], [x, y, z1]], r, m)); };

    if (kind === 'motobomba') {
      gx(0, .2, 0, .95, {});
      part('voluta', 'Cuerpo de la bomba (voluta)', [1.4, 0, 0]); cyl(1.15, .62, 0, .5, .4, 'x', 'A', 48); cyl(1.38, .62, 0, .42, .06, 'x', 'A', 48);
      part('impulsor', 'Impulsor', [2.2, 0, 0]); cyl(1.15, .62, 0, .34, .06, 'x', 'C', 40); radial(1.15, .62, 0, .08, .32, 6, .1, 'x', 'C');
      part('sello', 'Sello mecánico', [1.8, .7, 0]); tor(1.0, .62, 0, .1, .025, 'x', 'D');
      part('succion', 'Boca de succión', [2.4, 0, 0]); cyl(1.55, .62, 0, .16, .3, 'x', 'M', 32);
      part('descarga', 'Boca de descarga', [1.4, 1.0, 0]); cyl(1.15, 1.2, 0, .15, .32, 'y', 'M', 32);
      part('tapon', 'Tapón de cebado', [1.3, 1.4, .3]); cyl(1.0, 1.15, .25, .09, .12, 'y', 'D', 20);
      frameBox(-1.0, 1.75, -.02, 1.75, -.7, .7, .04, 'D');
    } else if (kind === 'generador') {
      gx(-.75, .25, 0, 1.0, { noTank: true });
      part('alternador', 'Alternador (carcasa)', [1.5, 0, 0]); cyl(.75, .67, 0, .5, .9, 'x', 'M', 48); radial(1.22, .67, 0, .1, .48, 12, .05, 'x', 'D2');
      part('rotor', 'Rotor', [1.2, -1.0, 0]); cyl(.75, .67, 0, .3, .8, 'x', 'C', 36);
      part('estator', 'Estator / bobinado', [1.2, 1.0, -.6]); tor(.75, .67, 0, .4, .07, 'x', 'C');
      part('avr', 'Regulador de voltaje (AVR)', [2.2, .6, .6]); box(1.35, .95, .35, .2, .2, .12, 'D', .03);
      part('panel', 'Panel de control y tomas', [2.4, 0, 0]); box(1.4, .75, 0, .1, .7, .9, 'D', .04); [[-.2, .2], [-.2, -.2], [.12, 0]].forEach(([y, z]) => cyl(1.46, .75 + y, z, .09, .04, 'x', 'O', 20));
      part('tanque', 'Tanque de combustible', [0, 1.6, 0]); box(0, 1.85, 0, 1.9, .42, 1.0, 'R', .16); cyl(.6, 2.1, .2, .14, .08, 'y', 'D', 28);
      frameBox(-1.75, 1.55, .02, 1.65, -.65, .65, .045, 'D');
    } else if (kind === 'hidro' || kind === 'hidroe') {
      const elec = kind === 'hidroe';
      part('base_p', 'Base / plato del motor', [0, -.3, 0]); box(.1, .42, 0, 2.0, .06, 1.0, 'D2', .02);
      if (elec) {
        part('motor_e', 'Motor eléctrico', [-1.0, .4, 0]); cyl(-.5, .9, 0, .42, 1.0, 'x', 'Bm', 40); for (let i = 0; i < 9; i++) cyl(-.92 + i * .1, .9, 0, .45, .025, 'x', 'Bm', 40); cyl(-1.04, .9, 0, .4, .08, 'x', 'D', 40); [-.3, .3].forEach(z => box(-.5, .52, z, .7, .1, .14, 'Bm', .02)); box(-.45, 1.38, 0, .36, .16, .3, 'Bm', .03);
        part('caja_e', 'Arrancador / caja eléctrica', [-.4, 1.0, -1.0]); box(-.55, 1.15, -.65, .4, .45, .25, 'H', .05); cyl(-.55, 1.15, -.79, .05, .04, 'z', 'R', 16);
        part('cable', 'Cable de corriente', [-1.3, -.3, -1.0]); tube([[-.55, .95, -.7], [-.9, .6, -.8], [-1.4, .4, -.75], [-1.7, .2, -.6]], .025, 'D');
      } else gx(-.45, .45, 0, .95, {});
      part('brida', 'Brida / acople', [.8, .3, 0]); cyl(.42, .9, 0, .3, .1, 'x', 'D', 36);
      part('bomba_alta', 'Bomba de alta presión', [1.5, .3, 0]); box(.72, .9, 0, .42, .48, .55, 'D2', .08); box(1.02, .86, 0, .28, .44, .58, 'Br', .05); [-.14, .14].forEach(z => cyl(1.02, 1.12, z, .05, .12, 'y', 'Br', 16));
      part('valvula', 'Válvula reguladora (unloader)', [1.2, 1.2, .6]); cyl(1.08, 1.25, .2, .07, .4, 'y', 'Br', 20); cyl(1.08, 1.5, .2, .09, .12, 'y', 'D', 20);
      part('inyector', 'Inyector de químico', [1.6, -.2, .9]); tube([[1.1, .75, .32], [1.25, .5, .45], [1.3, .3, .55]], .02, 'T'); cyl(1.3, .25, .55, .03, .1, 'y', 'Br', 10);
      part('chasis', 'Chasis / carro tubular', [0, -.8, 0]); tube([[-1.0, .4, .55], [1.3, .4, .55]], .05, 'D'); tube([[-1.0, .4, -.55], [1.3, .4, -.55]], .05, 'D'); tube([[1.3, .4, .55], [1.5, .2, .45], [1.5, .05, .45]], .05, 'D'); tube([[1.3, .4, -.55], [1.5, .2, -.45], [1.5, .05, -.45]], .05, 'D');
      part('tacon', 'Tacón de hule', [.8, -1.0, 0]); [-.45, .45].forEach(z => cyl(1.5, .03, z, .07, .06, 'y', 'Rb', 16));
      part('manubrio', 'Manubrio', [-1.3, .8, 0]); tube([[-1.0, .4, .55], [-1.35, 1.2, .55], [-1.45, 2.0, .55], [-1.45, 2.0, -.55], [-1.35, 1.2, -.55], [-1.0, .4, -.55]], .045, elec ? 'D' : 'M');
      part('portamang', 'Porta manguera', [-1.9, .8, 0]); [.42, -.42].forEach(z => tube([[-1.4, 1.55, z], [-1.62, 1.6, z], [-1.66, 1.4, z]], .02, 'D'));
      wheels([[-.8, .32, .74], [-.8, .32, -.74]], .32, .16, 'ruedas', 'Llantas y eje');
      part('manguera', 'Manguera de alta presión', [-2.2, 1.4, 0]); tor(-1.75, 1.3, 0, .32, .045, 'x', 'D'); tor(-1.75, 1.3, 0, .26, .045, 'x', 'D');
      part('pistola', 'Pistola', [.4, 1.2, 1.4]); box(.2, 1.9, .75, .32, .1, .1, 'D', .04); box(.08, 1.75, .75, .1, .3, .1, 'D', .04);
      part('lanza', 'Lanza', [.9, 1.2, 1.5]); cyl(.95, 1.9, .75, .03, 1.2, 'x', 'M', 14);
      part('boquillas', 'Juego de boquillas', [1.8, 1.4, 1.4]); ['R', 'Yl', 'G', 'Wp', 'D'].forEach((m, i) => cyl(1.62 + i * .1, 1.9, .75, .035, .1, 'x', m, 6));
      part('conector', 'Conector de entrada de agua y filtro', [2.0, -.4, -.5]); cyl(1.3, .75, -.32, .06, .2, 'x', 'Br', 12); cyl(1.42, .75, -.32, .045, .1, 'x', 'Wp', 12);
    } else if (kind === 'picadora') {
      // ===== Picadora de pasto / forraje =====
      part('bastidor', 'Bastidor (base y patas)', [0, -.9, 0]); [[-1.6, -.45], [-1.6, .45], [1.5, -.45], [1.5, .45]].forEach(([x, z]) => box(x, .45, z, .09, .9, .09, 'D', .02)); [-.45, .45].forEach(z => box(0, .9, z, 3.2, .09, .09, 'D', .02)); [-1.6, 1.5].forEach(x => box(x, .9, 0, .09, .09, .95, 'D', .02)); [-.45, .45].forEach(z => box(0, .2, z, 3.1, .07, .07, 'D', .02));
      gx(-1.15, .95, 0, .8, {});
      part('protector', 'Protector de faja', [0, 1.1, -1.0]); box(.15, 1.35, -.42, 2.1, .38, .2, 'Yl', .06);
      part('poleas', 'Poleas', [0, .9, -1.6]); cyl(-.4, 1.3, -.42, .14, .08, 'z', 'M', 32); cyl(.95, 1.35, -.42, .26, .08, 'z', 'M', 32);
      part('faja', 'Faja (correa)', [0, .9, -1.9]); tube([[-.4, 1.44, -.42], [.95, 1.61, -.42]], .02, 'Rb'); tube([[-.4, 1.16, -.42], [.95, 1.09, -.42]], .02, 'Rb');
      part('carcasa_p', 'Carcasa / caja de corte', [1.0, .4, 0]); box(1.0, 1.4, 0, .85, .9, .75, 'R', .12);
      part('eje_r', 'Eje del rotor y chumaceras', [1.2, .6, -1.2]); cyl(1.0, 1.35, 0, .05, 1.1, 'z', 'M', 16); [-.4, .4].forEach(z => box(1.0, 1.35, z, .2, .2, .1, 'D2', .03));
      part('rotor', 'Rotor / volante', [1.6, .4, 1.3]); cyl(1.0, 1.35, .05, .34, .08, 'z', 'M', 40);
      part('cuchillas', 'Cuchillas', [2.0, .9, 1.6]); [0, Math.PI].forEach(a => box(1.0 + Math.cos(a) * .2, 1.35 + Math.sin(a) * .2, .11, .32, .07, .03, 'A', .01));
      part('martillos', 'Martillos', [2.0, 0, 1.6]); [.6, 2.2, 3.8, 5.4].forEach(a => box(1.0 + Math.cos(a) * .28, 1.35 + Math.sin(a) * .28, -.1, .14, .05, .05, 'D2', .01));
      part('criba', 'Criba / zaranda (malla)', [1.4, -.6, 1.0]); add(new THREE.CylinderGeometry(.4, .4, .5, 28, 1, true, Math.PI * .6, Math.PI * .8), 'M', [1.0, 1.35, 0], [Math.PI / 2, 0, 0]);
      part('contracuchilla', 'Contracuchilla', [1.8, .4, .6]); box(1.4, 1.5, 0, .05, .1, .55, 'A', .01);
      part('tolva', 'Tolva de alimentación', [2.2, .5, 0]); { const g = new THREE.Group(); const mk = (sx, sy, sz, x, y, z) => { const m = add(new RoundedBoxGeometry(sx, sy, sz, 2, .02), 'Yl', [0, 0, 0]); m.position.set(x, y, z); return m; };
        const parts3 = [mk(1.3, .04, .55, 0, 0, 0), mk(1.3, .3, .04, 0, .15, .27), mk(1.3, .3, .04, 0, .15, -.27)]; parts3.forEach(m => { m.position.applyAxisAngle(new THREE.Vector3(0, 0, 1), -.35); m.rotation.z = -.35; m.position.add(new THREE.Vector3(2.0, 1.6, 0)); }); }
      part('salida', 'Salida / descarga', [1.4, -1.0, .8]); box(1.0, .75, .25, .45, .35, .3, 'R', .05); box(1.0, .55, .38, .5, .12, .45, 'R', .03);
      part('ajuste', 'Perilla y tornillos de ajuste', [1.6, 1.0, .9]); cyl(1.45, 1.75, .3, .07, .12, 'z', 'D', 10); cyl(.62, 1.85, .3, .05, .1, 'y', 'M', 6);
    } else if (kind === 'motocult') {
      gx(0, .85, 0, .9, {});
      part('transmision', 'Transmisión / caja de cambios', [0, -.3, -1.0]); box(.1, .45, -.1, .5, .8, .4, 'R', .08); box(.1, -.1, .4, .35, .55, .3, 'R', .06);
      part('correa', 'Correa', [.0, .9, -1.4]); tor(.45, .6, -.45, .25, .03, 'x', 'D');
      part('cuchillas', 'Cuchillas / fresas', [0, -.8, .8]); cyl(.1, -.35, .6, .06, 1.9, 'z', 'M', 20); [-.7, -.35, 0, .35, .7].forEach((z, i) => { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + i * .4; box(.1 + Math.cos(a) * .3, -.35 + Math.sin(a) * .3, .6 + z, .07, .38, .05, 'M', .01).rotation.z = a + Math.PI / 2; } });
      part('protector', 'Protector de fresas', [0, .2, 1.2]); add(new THREE.CylinderGeometry(.62, .62, 1.9, 36, 1, true, Math.PI * .1, Math.PI * .9), 'R', [.1, -.35, .6], [Math.PI / 2, 0, 0]);
      part('manubrio', 'Manubrio y mandos', [-1.0, .6, 0]); tube([[-.3, .8, -.5], [-1.6, 1.9, -.5]], .05, 'M'); tube([[-.3, .8, .5], [-1.6, 1.9, .5]], .05, 'M'); [-.5, .5].forEach(z => box(-1.65, 1.95, z, .3, .1, .12, 'D', .04));
      part('embrague', 'Palanca de embrague'); box(-1.45, 1.75, 0, .06, .06, 1.0, 'D2', .02);
      wheels([[.95, .05, 0]], .2, .1, 'rueda', 'Rueda de transporte');
    } else if (kind === 'tractor') {
      // ===== Tractor cortacésped: carrocería / motor vertical / carburador =====
      // --- Carrocería / chasis ---
      part('chasis', 'Chasis / bastidor', [0, 0, 0]); [-.38, .38].forEach(z => box(.2, .5, z, 3.0, .16, .07, 'D2', .02)); box(1.62, .5, 0, .08, .16, .82, 'D2', .02); box(-1.2, .5, 0, .08, .16, .82, 'D2', .02);
      part('placa', 'Placa de soporte del motor', [0, -.3, .9]); box(1.05, .61, 0, .8, .05, .82, 'D2', .01);
      part('capo', 'Capó', [1.9, 1.7, 0]); box(1.1, 1.1, 0, 1.15, .62, 1.06, 'G', .22); box(1.1, 1.42, 0, .9, .04, .8, 'G', .02);
      part('parrilla', 'Parrilla / careta delantera', [1.4, .1, 0]); box(1.72, .92, 0, .1, .5, .9, 'D', .04);
      part('luces', 'Luces delanteras', [1.7, .5, .6]); [-.28, .28].forEach(z => cyl(1.78, 1.02, z, .07, .04, 'x', 'W', 20));
      part('tablero', 'Tablero y torre de dirección', [0, .8, -1.0]); box(.3, 1.05, 0, .3, .62, .78, 'D', .06);
      part('volante_dir', 'Volante y columna de dirección', [0, 1.7, 0]); tor(.15, 1.62, 0, .25, .03, 'y', 'D'); cyl(.25, 1.4, 0, .03, .55, 'y', 'M', 12);
      part('palancas', 'Palancas (altura del plato / acelerador)', [-.3, 1.2, -1.0]); cyl(.1, 1.0, -.45, .02, .35, 'y', 'M', 8); cyl(.1, 1.2, -.45, .04, .06, 'y', 'R', 12); cyl(.25, 1.38, .3, .015, .15, 'y', 'M', 8);
      part('pedales', 'Pedales de freno y avance', [.6, -.4, 1.1]); box(.4, .72, .5, .2, .05, .12, 'D2', .01); box(.4, .72, -.5, .2, .05, .12, 'D2', .01);
      part('piso', 'Estribo / piso', [0, -.5, 0]); box(-.05, .66, 0, .75, .05, 1.25, 'D', .02);
      part('guardabarros', 'Guardabarros / cubierta trasera', [-.6, 1.3, 0]); box(-.95, .98, 0, 1.15, .08, 1.65, 'G', .05); [-.7, .7].forEach(z => box(-1.0, .78, z, 1.0, .4, .06, 'G', .03));
      part('asiento', 'Asiento', [-.4, 2.2, 0]); box(-.6, 1.12, 0, .55, .12, .68, 'D', .06); box(-.88, 1.38, 0, .12, .46, .66, 'D', .06);
      part('bateria', 'Batería', [-.3, 1.4, .9]); box(-.45, .82, .25, .26, .22, .18, 'D', .02); cyl(-.4, .95, .3, .02, .04, 'y', 'R', 8);
      part('enganche', 'Enganche trasero', [-.8, -.2, 0]); box(-1.3, .42, 0, .14, .04, .2, 'D2', .01);
      part('ejes_d', 'Eje delantero y dirección', [.4, -.6, 0]); box(1.3, .3, 0, .08, .08, 1.15, 'D2', .02);
      part('ruedas_d', 'Ruedas delanteras', [.6, -.3, 0]); [-1, 1].forEach(sz => { cyl(1.3, .28, sz * .68, .28, .15, 'z', 'D', 40); cyl(1.3, .28, sz * .76, .13, .02, 'z', 'A', 24); });
      part('ruedas_t', 'Ruedas traseras', [-.6, -.3, 0]); [-1, 1].forEach(sz => { cyl(-1.0, .45, sz * .72, .45, .26, 'z', 'D', 44); cyl(-1.0, .45, sz * .86, .22, .02, 'z', 'A', 28); });
      part('transeje', 'Transeje (caja de cambios / hidrostática)', [-.5, -.5, 0]); box(-1.0, .45, 0, .42, .32, .55, 'D2', .06); cyl(-1.0, .45, 0, .05, 1.3, 'z', 'M', 12);
      part('correa_t', 'Correa de tracción', [0, -.9, -.6]); tube([[1.05, .42, 0], [.2, .4, .18], [-1.0, .42, .12], [.2, .4, -.18]], .02, 'D', true);
      part('plato', 'Plato de corte', [0, -1.2, 0]); box(.15, .24, 0, 1.3, .16, 1.5, 'G', .1);
      part('poleas', 'Poleas y tensor del plato', [0, -1.0, 1.2]); [-.4, .4].forEach(z => cyl(.15, .36, z, .12, .06, 'y', 'D2', 24)); cyl(.45, .36, 0, .06, .06, 'y', 'M', 16);
      part('correa', 'Correa del plato', [0, -.8, 1.4]); tube([[.15, .36, -.52], [.4, .36, 0], [.15, .36, .52], [-.1, .36, 0]], .02, 'D', true);
      part('cuchillas', 'Cuchillas', [0, -1.7, 0]); [-.4, .4].forEach(z => box(.15, .14, z, .7, .03, .1, 'M', .01));
      // --- Motor ---
      part('carter', 'Cárter (base) y empaque', [0, .9, 1.4]); box(1.05, .7, 0, .62, .1, .62, 'A', .04);
      part('cilindro', 'Bloque / cilindro', [0, 1.3, 1.3]); box(1.05, .92, 0, .55, .32, .55, 'A', .05); fins(1.05, .92, .38, .15, .26, 'z', 5, .23, 'A');
      part('empaque_c', 'Empaque de culata', [0, 1.3, 1.7]); box(1.05, .92, .53, .36, .36, .012, 'C', .003);
      part('culata', 'Culata y tapa de válvulas', [0, 1.3, 2.0]); box(1.05, .92, .58, .4, .4, .09, 'A', .03);
      part('bujia', 'Bujía', [0, 1.5, 2.4]); cyl(1.05, .98, .72, .035, .2, 'z', 'W', 16);
      part('valvulas', 'Válvulas y resortes', [.4, 2.0, 1.6]); [-.08, .08].forEach(x => { cyl(1.05 + x, 1.12, .45, .018, .26, 'y', 'M', 10); tor(1.05 + x, 1.18, .45, .04, .01, 'y', 'M'); });
      part('piston', 'Pistón y anillos', [.5, 1.7, 1.9]); cyl(1.05, .92, .33, .13, .17, 'z', 'A', 28);
      part('biela', 'Biela', [.5, 1.6, 1.5]); box(1.05, .92, .14, .05, .05, .3, 'C', .015);
      part('levas', 'Árbol de levas', [-.6, 1.6, 1.3]); cyl(.88, .92, .12, .03, .3, 'y', 'D2', 12); cyl(.88, .82, .12, .1, .025, 'y', 'D2', 22);
      part('ciguenal', 'Cigüeñal vertical', [0, 1.1, 0]); cyl(1.05, .7, 0, .045, .7, 'y', 'M', 16);
      part('polea_m', 'Polea del motor y embrague (PTO)', [0, -.4, 1.6]); cyl(1.05, .42, 0, .12, .07, 'y', 'D2', 28); cyl(1.05, .52, 0, .14, .1, 'y', 'D', 28);
      part('volante', 'Volante (magneto)', [0, 2.3, .8]); cyl(1.05, 1.13, 0, .31, .05, 'y', 'M', 44); radial(1.05, 1.17, 0, .1, .3, 14, .06, 'y', 'A');
      part('bobina', 'Bobina de encendido', [-.6, 2.2, 1.0]); box(.8, 1.08, .2, .1, .1, .16, 'D', .02);
      part('carcasa', 'Cubierta del motor', [0, 2.8, .8]); box(1.05, 1.26, 0, .72, .16, .72, 'D', .08);
      part('arranque_e', 'Motor de arranque eléctrico', [.6, 1.2, -1.2]); cyl(1.3, .85, -.3, .07, .24, 'y', 'D2', 20);
      part('regulador', 'Regulador (gobernador)', [.7, 1.8, 1.2]); box(1.3, .95, .25, .025, .18, .025, 'M', .005);
      part('aceite', 'Varilla y filtro de aceite', [.9, 1.6, 1.6]); cyl(1.33, .95, .32, .035, .3, 'y', 'Y', 14); cyl(1.3, .74, .3, .06, .1, 'z', 'B', 18);
      part('silenciador', 'Silenciador y escape', [1.3, .8, 1.2]); cyl(1.55, .74, 0, .09, .66, 'z', 'M', 24);
      // --- Carburador y combustible ---
      part('carburador', 'Carburador', [-.4, 1.4, -1.8]); box(.82, .9, -.3, .15, .14, .14, 'A', .02); cyl(.82, .8, -.3, .06, .07, 'y', 'A', 20);
      part('filtro', 'Filtro de aire y prefiltro', [-.6, 2.1, -1.9]); box(.82, 1.1, -.32, .22, .12, .3, 'D', .04); box(.82, 1.1, -.32, .16, .08, .24, 'Y', .02);
      part('solenoide', 'Solenoide de corte de combustible', [-.3, .7, -2.1]); cyl(.82, .78, -.3, .025, .08, 'y', 'Br', 10);
      part('acel_c', 'Cables y varillaje de acelerador / choke', [-.6, 1.6, -1.4]); tube([[.35, 1.25, -.35], [.55, 1.15, -.35], [.78, .98, -.3]], .01, 'M');
      part('bomba_c', 'Bomba de combustible', [-.7, .9, -1.6]); box(.6, .8, -.35, .08, .08, .06, 'D', .015);
      part('linea', 'Manguera y filtro de combustible', [-.9, .7, -1.5]); tube([[-.2, .82, -.55], [.2, .78, -.5], [.6, .8, -.38], [.8, .88, -.32]], .015, 'D'); cyl(.25, .78, -.5, .03, .08, 'x', 'T', 12);
      part('tanque', 'Tanque de combustible', [-.8, 1.6, -1.2]); box(-.2, .86, -.55, .48, .24, .26, 'T', .08);
      part('tapa_t', 'Tapa del tanque', [-.8, 2.1, -1.3]); cyl(-.2, 1.0, -.55, .06, .05, 'y', 'O', 18);
    } else if (kind === 'sopla') {
      t2(0, 1.2, -.2, .9);
      part('carcasa_v', 'Carcasa del ventilador', [0, 0, 1.2]); cyl(0, .9, .45, .6, .35, 'z', 'O', 48);
      part('ventilador', 'Ventilador (aspas)', [0, 0, 2.1]); radial(0, .9, .45, .12, .5, 12, .25, 'z', 'D2');
      part('tubo', 'Tubos de soplado', [1.3, -.4, 1.0]); tube([[.5, .6, .5], [1.1, .4, .7], [1.8, .3, .9], [2.6, .3, 1.0]], .1, 'D'); cyl(2.9, .3, 1.0, .08, .4, 'x', 'O', 24);
      part('arnes', 'Arnés / respaldo', [0, 0, -1.2]); box(0, 1.2, -.75, 1.1, 1.6, .12, 'D', .1); box(0, .25, -.3, 1.1, .1, .8, 'D', .04);
      part('acelerador', 'Mango del acelerador', [1.0, .5, 1.6]); box(1.7, .55, .95, .14, .3, .14, 'D', .05);
    } else if (kind === 'setos') {
      t2(-1.2, .5, 0, .8);
      part('caja', 'Caja de engranes', [.3, .5, 0]); box(-.25, .55, 0, .45, .26, .4, 'A', .07);
      part('cuchillas', 'Cuchillas', [1.2, -.3, 0]); box(1.0, .55, 0, 2.3, .06, .14, 'M', .01); for (let i = 0; i < 22; i++) box(-.05 + i * .1, .55, 0, .04, .05, .32, 'A', .01);
      part('protector', 'Protector de mano', [.4, .9, 0]); box(-.05, .75, 0, .05, .4, .5, 'D', .02);
      part('manija_d', 'Manija delantera', [0, 1.2, .6]); tube([[-.45, .7, .3], [-.45, 1.05, .25], [-.45, 1.05, -.25], [-.45, .7, -.3]], .04, 'D');
      part('manija_t', 'Manija trasera / acelerador', [-1.0, .5, 0]); tube([[-1.75, .75, 0], [-2.2, .85, 0], [-2.35, .6, 0]], .06, 'D');
    } else if (kind === 'tronz') {
      // ===== Tronzadora / cortadora de disco =====
      t2(-1.7, .45, 0, 1.0);
      part('manija_s', 'Manija superior (asa)', [0, 1.2, 0]); tube([[-2.2, 1.0, -.2], [-1.8, 1.65, -.1], [-1.0, 1.55, 0], [-.7, 1.0, .1]], .05, 'D');
      part('manija_t', 'Manija trasera y acelerador', [-1.0, .3, 0]); tube([[-2.3, .9, 0], [-2.75, .95, 0], [-2.8, .45, 0], [-2.3, .35, 0]], .055, 'D'); box(-2.55, .78, 0, .2, .08, .08, 'O', .02);
      part('brazo', 'Brazo de corte', [0, -.4, .9]); box(.35, .75, .42, 2.1, .26, .12, 'O', .05);
      part('polea_m', 'Polea del embrague', [-.3, .5, 1.1]); cyl(-.55, .75, .52, .18, .08, 'z', 'D2', 28);
      part('correa', 'Correa en V', [0, .6, 1.3]); tube([[-.55, .93, .5], [.45, .9, .5], [1.4, .89, .5], [1.4, .61, .5], [.45, .6, .5], [-.55, .57, .5]], .025, 'D', true);
      part('polea_d', 'Polea y eje del disco', [.3, .5, 1.1]); cyl(1.4, .75, .52, .14, .08, 'z', 'D2', 28); cyl(1.4, .75, .6, .05, .3, 'z', 'M', 12);
      part('tensor', 'Tensor de la correa', [0, -.6, 1.0]); cyl(.4, .6, .5, .03, .32, 'x', 'M', 10);
      part('guarda', 'Guarda del disco', [.6, .9, 1.0]); add(new THREE.CylinderGeometry(1.02, 1.02, .22, 40, 1, true, -.4, 3.6), 'O', [1.4, .75, .7], [Math.PI / 2, 0, 0]);
      part('disco', 'Disco de corte', [.8, 0, 1.5]); cyl(1.4, .75, .72, .95, .025, 'z', 'D2', 64); cyl(1.4, .75, .735, .3, .01, 'z', 'Y', 32);
      part('brida', 'Brida y tornillo del disco', [.8, 0, 2.0]); cyl(1.4, .75, .78, .12, .04, 'z', 'M', 24); cyl(1.4, .75, .81, .05, .04, 'z', 'M', 6);
      part('kit_agua', 'Kit de agua (llave y manguera)', [0, 1.0, 1.4]); tube([[-.7, 1.0, .2], [.3, 1.2, .5], [1.0, 1.45, .7]], .02, 'B'); box(-.6, 1.02, .2, .1, .1, .1, 'B', .02);
    } else if (kind === 'poda') {
      t2(-2.6, .55, 0, .85);
      part('tubo', 'Tubo telescópico exterior / eje', [0, .6, 0]); cylDir([-1.344, .67, 0], V3(1, .35, 0), .06, 2.3, 'A', 20);
      part('tubo_i', 'Tubo telescópico interior', [.7, 1.1, 0]); cylDir([.544, 1.33, 0], V3(1, .35, 0), .043, 2.3, 'M', 18);
      part('abrazadera', 'Abrazadera de ajuste telescópico', [0, 1.0, .7]); cylDir([-.31, 1.033, 0], V3(1, .35, 0), .085, .22, 'O', 20); box(-.31, 1.14, .09, .12, .06, .1, 'D', .02);
      part('manija', 'Manija y acelerador', [-.6, -.6, .7]); box(-1.7, .9, 0, .3, .12, .14, 'D', .05);
      part('cabezal', 'Cabezal / engranes', [1.0, .8, 0]); box(1.6, 1.72, 0, .32, .28, .28, 'A', .06);
      part('espada', 'Espada', [1.6, 1.2, .5]); barShape(2.35, 1.92, 0, 1.3, .22, .04, 'A').rotation.z = .35;
      part('cadena', 'Cadena', [1.6, 1.2, 1.0]); tube([[1.75, 1.82, 0], [2.95, 2.25, 0]], .03, 'D2');
      part('aceite_c', 'Tanque de aceite de cadena', [1.2, 1.6, -.5]); box(1.55, 1.95, -.18, .18, .14, .12, 'O', .04);
    } else if (kind === 'ahoya') {
      t2(0, 1.7, 0, .85);
      part('caja', 'Caja de engranes', [0, -.2, 1.0]); box(0, 1.25, 0, .5, .45, .5, 'A', .08);
      part('manubrio', 'Manubrio', [0, .9, -1.0]); tube([[-1.3, 1.45, 0], [-.3, 1.4, 0]], .05, 'M'); tube([[.3, 1.4, 0], [1.3, 1.45, 0]], .05, 'M'); [-1.3, 1.3].forEach(x => box(x, 1.45, 0, .28, .1, .12, 'D', .04));
      part('broca', 'Broca (barrena)', [0, -1.0, 0]); cyl(0, .2, 0, .06, 1.8, 'y', 'M', 16); { const pts = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 9, y = -.65 + i / 80 * 1.6; pts.push([Math.cos(a) * .3, y, Math.sin(a) * .3]); } tube(pts, .04, 'M'); }
      part('punta', 'Punta de la broca', [0, -1.6, 0]); cyl(0, -.75, 0, .01, .25, 'y', 'D2', 16, .07);
    } else if (kind === 'siembra') {
      part('tolva', 'Tolva de semilla', [0, 1.2, 0]); add(new THREE.CylinderGeometry(.75, .4, .8, 4, 1), 'B', [0, 1.55, 0], [0, Math.PI / 4, 0]);
      part('dosificador', 'Dosificador', [0, .4, 1.0]); cyl(0, 1.05, 0, .25, .5, 'z', 'D2', 24);
      part('tubos', 'Tubos de bajada', [0, -.2, 1.4]); [-.45, .45].forEach(z => tube([[0, 1.0, z * .5], [.2, .6, z], [.3, .25, z]], .05, 'D'));
      part('chasis', 'Chasis', [0, -.3, -1.2]); frameBox(-1.0, 1.0, .5, .55, -.75, .75, .05, 'R', 'chasis', 'Chasis');
      part('discos', 'Discos abresurcos', [1.0, -.6, 0]); [-.45, .45].forEach(z => cyl(.3, .25, z, .25, .03, 'z', 'M', 40));
      part('ruedas_c', 'Ruedas compactadoras', [-1.0, -.6, 0]); [-.45, .45].forEach(z => cyl(-.6, .25, z, .22, .16, 'z', 'D', 36));
      part('enganche', 'Enganche / barra de tiro', [2.0, 0, 0]); tube([[1.0, .55, .4], [1.9, .5, 0], [1.0, .55, -.4]], .05, 'R');
      wheels([[-.1, .32, .95], [-.1, .32, -.95]], .32, .14, 'ruedas', 'Ruedas de mando');
    } else if (kind === 'tritura') {
      gx(-1.2, .55, 0, .9, {});
      part('carcasa_t', 'Carcasa del rotor', [1.0, 0, 0]); cyl(.6, .95, 0, .65, .45, 'x', 'O', 48);
      part('rotor', 'Rotor / volante de corte', [1.9, 0, 0]); cyl(.6, .95, 0, .5, .06, 'x', 'M', 48);
      part('cuchillas', 'Cuchillas', [2.4, .5, 0]); [0, Math.PI].forEach(a => box(.62, .95 + Math.cos(a) * .25, Math.sin(a) * .25, .05, .3, .08, 'A', .01));
      part('tolva', 'Tolva de alimentación', [1.6, .5, 1.3]); add(new THREE.CylinderGeometry(.55, .25, .9, 4, 1, true), 'O', [1.1, 1.0, .75], [Math.PI / 2 - .5, Math.PI / 4, 0]);
      part('descarga', 'Ducto de descarga', [.6, 1.6, -.6]); tube([[.6, 1.4, -.1], [.6, 2.0, -.25], [.9, 2.3, -.6]], .16, 'O');
      part('correa', 'Correa / embrague', [0, -.4, -1.2]); tor(-.2, .7, -.45, .25, .03, 'x', 'D');
      frameBox(-1.8, 1.0, .25, .3, -.6, .6, .05, 'D', 'chasis', 'Chasis');
      wheels([[-.4, .3, .78], [-.4, .3, -.78]], .32, .14);
    } else if (kind === 'aserra') {
      part('rieles', 'Rieles', [0, -.6, 0]); [-.7, .7].forEach(z => box(0, .1, z, 6.0, .12, .12, 'M', .02)); for (let i = -2.5; i <= 2.5; i += 1.25) box(i, .03, 0, .12, .06, 1.6, 'D2', .02);
      part('carro', 'Carro / columnas', [0, .5, -1.2]); [-1.0, 1.0].forEach(x => [-.7, .7].forEach(z => box(x, 1.0, z, .1, 1.8, .1, 'R', .02))); box(0, 1.9, 0, 2.2, .1, 1.5, 'R', .03);
      part('volantes', 'Volantes de la sierra', [0, .9, 1.2]); [-.9, .9].forEach(x => cyl(x, 1.2, .5, .42, .12, 'z', 'A', 48));
      part('sierra', 'Sierra de cinta', [0, 1.5, 1.6]); tube([[-.9, 1.62, .55], [.9, 1.62, .55], [.9, .78, .55], [-.9, .78, .55]], .012, 'M', true);
      part('guias', 'Guías de la cinta', [0, -.2, 2.0]); [-.45, .45].forEach(x => box(x, .8, .55, .12, .16, .12, 'D', .03));
      gx(.2, 2.0, -.2, .75, {});
      part('tronco', 'Tronco (referencia)', [0, -1.2, 0]); add(new THREE.CylinderGeometry(.35, .35, 4.0, 32), 'Wd', [0, .55, 0], [0, 0, Math.PI / 2]);
    } else if (kind === 'talador') {
      part('orugas', 'Orugas / tren de rodaje', [0, -.8, 0]); [-1.0, 1.0].forEach(z => { box(0, .4, z, 3.2, .6, .5, 'D', .25); [-1.2, -.4, .4, 1.2].forEach(x => cyl(x, .4, z, .2, .52, 'z', 'M', 24)); });
      part('cabina', 'Cabina', [-.5, 1.4, 0]); box(-.4, 1.65, .3, 1.1, 1.1, 1.0, 'Y', .1); box(-.4, 1.7, .81, .9, .8, .02, 'T', .02);
      part('motor', 'Compartimiento del motor', [-1.6, .6, 0]); box(-1.2, 1.2, -.4, 1.4, .9, 1.4, 'Y', .1);
      part('brazo', 'Pluma / brazo', [1.0, 1.2, 0]); tube([[.3, 1.4, -.2], [1.4, 2.4, -.2], [2.3, 1.6, -.2]], .15, 'Y');
      part('hidraulico', 'Cilindros hidráulicos', [1.0, 1.8, -1.0]); tube([[.4, 1.0, -.45], [1.2, 2.1, -.45]], .07, 'M'); tube([[1.5, 2.3, -.45], [2.2, 1.9, -.45]], .06, 'M');
      part('cabezal', 'Cabezal talador', [2.0, 0, 0]); box(2.5, 1.1, -.2, .5, 1.2, .9, 'Y', .08);
      part('disco', 'Disco de corte', [2.4, -.8, 0]); cyl(2.5, .45, -.2, .6, .08, 'y', 'M', 48); radial(2.5, .45, -.2, .5, .64, 24, .06, 'y', 'D2');
    } else {
      const g = gxS(); gx(0, 0, 0, g.s, { twin: g.twin });
      part('base', 'Base / soportes', [0, -.6 * g.s, 0]); box(0, -.05 * g.s, 0, 1.7 * g.s, .1 * g.s, 1.3 * g.s, 'D', .03);
    }
  }
  return parts;
}


export function listaPiezas(kind, modelo) { return build(kind, { modelo }).map(p => ({ k: p.k, l: p.l })).filter((p, i, a) => a.findIndex(x => x.k === p.k) === i); }

export function crearVisor({ host, kind, modelo, onPick, onHover }) {
  const W0 = () => host.clientWidth, H0 = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W0(), H0());
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  host.appendChild(renderer.domElement);
  const ov = document.createElement('canvas'); ov.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; host.appendChild(ov);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), .04).texture;
  const cam = new THREE.PerspectiveCamera(34, W0() / H0(), .1, 200);
  const key = new THREE.DirectionalLight(0xfff4e6, 1.9); key.position.set(4, 8, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 30 }); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdbeafe, .7); fill.position.set(-6, 3, -4); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7785, .4));

  const parts0 = build(kind, { modelo }); const parts = []; parts0.forEach(p => { const ex = parts.find(x => x.k === p.k); if (ex) { ex.meshes.push(...p.meshes); if (!ex.e && p.e) ex.e = p.e; } else parts.push(p); }); const root = new THREE.Group(); scene.add(root);
  parts.forEach(p => { p.g = new THREE.Group(); p.meshes.forEach(m => p.g.add(m)); root.add(p.g); });
  // centro y despiece automático
  const bb = new THREE.Box3(); parts.forEach(p => { p.box = new THREE.Box3().setFromObject(p.g); bb.union(p.box); });
  const C0 = bb.getCenter(new THREE.Vector3());
  parts.forEach(p => { const c = p.box.getCenter(new THREE.Vector3()); p.c = c; if (!p.e) { const d = c.clone().sub(C0); const l = d.length() || 1; p.e = d.multiplyScalar(.9 / l).toArray(); } p.ev = new THREE.Vector3(...p.e); });
  const bbE = bb.clone(); parts.forEach(p => { bbE.union(p.box.clone().translate(p.ev)); });
  const dims = bb.getSize(new THREE.Vector3()).toArray().sort((a, b) => b - a); const FF = .5 + .45 * (dims[1] / dims[0]);
  const fitA = bb.getBoundingSphere(new THREE.Sphere()), fitE = bbE.getBoundingSphere(new THREE.Sphere());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .16 })); ground.rotation.x = -Math.PI / 2; ground.position.y = Math.min(bb.min.y, bbE.min.y) - .02; ground.receiveShadow = true; scene.add(ground);

  const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.1; ctl.minPolarAngle = .15; ctl.maxPolarAngle = Math.PI / 2 + .05;
  let S = { mark: {}, auto: {}, names: false, exT: 0, sel: '', hover: '' }, ex = 0, zoomF = 1, dirty = true;
  const camFor = () => { const R = fitA.radius + (fitE.radius - fitA.radius) * ex; const c = fitA.center.clone().lerp(fitE.center, ex); return { R, c }; };
  const place = (keepDir) => { const { R, c } = camFor(); const d = R / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * (FF - .1 * ex) / zoomF * (W0() < H0() ? 1.45 : 1);
    const dir = keepDir ? cam.position.clone().sub(ctl.target).normalize() : new THREE.Vector3(-.55, .5, 1).normalize(); ctl.target.copy(c); cam.position.copy(c).addScaledVector(dir, d); cam.near = d / 50; cam.far = d * 6; cam.updateProjectionMatrix(); };
  place(false);
  ctl.addEventListener('change', () => dirty = true); ctl.addEventListener('start', () => { ctl.autoRotate = false; });

  const tint = () => { parts.forEach(p => { const st = ST[S.mark[p.k]]; p.meshes.forEach(m => { const mat = m.material; if (st) { mat.color.set(st); mat.emissive = new THREE.Color(st).multiplyScalar(.28); } else { mat.color.copy(m.userData.base); mat.emissive = new THREE.Color(p.k === S.hover ? 0x2a2a2a : 0x000000); } mat.needsUpdate = false; }); }); dirty = true; };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(root.children, true)[0]; return hit ? hit.object.userData.k : ''; };
  let down = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 7) { const k = pick(e.clientX, e.clientY); onPick && onPick(k); } down = null; });
  el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons) { const k = pick(e.clientX, e.clientY); if (k !== S.hover) { S.hover = k; el.style.cursor = k ? 'pointer' : 'grab'; tint(); onHover && onHover(k); } } });

  const centers = () => { const out = {}; const v = new THREE.Vector3(); parts.forEach(p => { v.copy(p.c).addScaledVector(p.ev, ex).project(cam); const top = p.box.max.y + p.ev.y * ex; const vt = new THREE.Vector3(p.c.x + p.ev.x * ex, top, p.c.z + p.ev.z * ex).project(cam);
      out[p.k] = { x: (v.x + 1) / 2 * W0(), y: (1 - v.y) / 2 * H0(), top: (1 - vt.y) / 2 * H0(), z: v.z, l: p.l }; }); return out; };
  const labels = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2), W = W0(), H = H0(); if (ov.width !== W * dpr || ov.height !== H * dpr) { ov.width = W * dpr; ov.height = H * dpr; }
    const ctx = ov.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); const C = centers(); const used = []; const done = {};
    const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
    ctx.textBaseline = 'middle';
    Object.entries(S.auto || {}).sort((a, b) => (C[a[0]]?.y || 0) - (C[b[0]]?.y || 0)).forEach(([k, names]) => { const c = C[k]; if (!c) return; done[k] = 1; ctx.font = '700 11px "Plus Jakarta Sans",system-ui,sans-serif';
      const txt = '📦 ' + names.join(' · '); const tw = Math.min(ctx.measureText(txt).width, W * .55) + 14; let lx = c.x > W / 2 ? Math.min(W - tw - 6, c.x + 26) : Math.max(6, c.x - 26 - tw), ly = Math.max(54, Math.min(H - 56, c.top - 18));
      for (let g = 0; g < 10 && used.some(u => Math.abs(u.y - ly) < 22 && lx < u.x + u.w && lx + tw > u.x); g++) ly += 22; used.push({ x: lx, y: ly, w: tw });
      const col = ST[S.mark[k]] || ST.cambiado; ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x > W / 2 ? lx : lx + tw, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, 6.3); ctx.fill(); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 6; rr(lx, ly - 10, tw, 20, 8); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; let t = txt; while (ctx.measureText(t).width > tw - 14 && t.length > 5) t = t.slice(0, -2); if (t !== txt) t = t.slice(0, -1) + '…'; ctx.fillText(t, lx + 7, ly); });
    if (ex > .6) { ctx.font = '600 10.5px "Plus Jakarta Sans",system-ui,sans-serif';
      Object.entries(C).filter(([k]) => !done[k] && (S.names || S.mark[k] || k === S.hover || k === S.sel)).sort((a, b) => a[1].y - b[1].y).forEach(([k, c]) => {
        const tw = Math.min(ctx.measureText(c.l).width, 120) + 10; let lx = c.x + (c.x > W / 2 ? 18 : -18 - tw), ly = c.y - 16; lx = Math.max(4, Math.min(W - tw - 4, lx)); ly = Math.max(46, Math.min(H - 50, ly));
        for (let g = 0; g < 8 && used.some(u => Math.abs(u.y - ly) < 15 && lx < u.x + u.w && lx + tw > u.x); g++) ly += 15; used.push({ x: lx, y: ly, w: tw });
        const col = ST[S.mark[k]]; ctx.strokeStyle = col || 'rgba(100,116,139,.75)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x > W / 2 ? lx : lx + tw, ly); ctx.stroke();
        ctx.fillStyle = col || 'rgba(255,255,255,.9)'; rr(lx, ly - 8, tw, 16, 6); ctx.fill(); ctx.fillStyle = col ? '#fff' : '#1f2937'; let t = c.l; while (ctx.measureText(t).width > tw - 10 && t.length > 4) t = t.slice(0, -2); if (t !== c.l) t = t.slice(0, -1) + '…'; ctx.fillText(t, lx + 5, ly); }); }
  };
  let raf = 0, alive = true;
  const loop = () => { if (!alive) return; raf = requestAnimationFrame(loop);
    if (Math.abs(ex - S.exT) > .003) { ex += (S.exT - ex) * .1; if (Math.abs(ex - S.exT) < .003) ex = S.exT; parts.forEach(p => p.g.position.copy(p.ev).multiplyScalar(ex)); place(true); dirty = true; }
    const ch = ctl.update(); if (ch || ctl.autoRotate) dirty = true;
    if (W0() && (renderer.domElement.width !== Math.round(W0() * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(H0() * renderer.getPixelRatio()))) { renderer.setSize(W0(), H0()); cam.aspect = W0() / H0(); cam.updateProjectionMatrix(); dirty = true; }
    if (dirty) { dirty = false; renderer.render(scene, cam); labels(); } };
  loop();
  return {
    parts: parts.map(p => ({ k: p.k, l: p.l })),
    set(st) { const exChanged = st.exT !== undefined && st.exT !== S.exT; S = { ...S, ...st }; if (st.exNow !== undefined) { ex = st.exNow; S.exT = st.exNow; parts.forEach(p => p.g.position.copy(p.ev).multiplyScalar(ex)); place(true); } tint(); if (exChanged) dirty = true; },
    zoom(f) { zoomF = Math.max(.5, Math.min(3, zoomF * f)); place(true); dirty = true; },
    reset() { zoomF = 1; place(false); ctl.autoRotate = false; dirty = true; },
    stopAuto() { ctl.autoRotate = false; },
    screenOf(k) { const c = centers()[k]; const r = renderer.domElement.getBoundingClientRect(); return c ? [r.left + c.x, r.top + c.y] : null; },
    dispose() { alive = false; cancelAnimationFrame(raf); ctl.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); pm.dispose(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); host.innerHTML = ''; }
  };
}
