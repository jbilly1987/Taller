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
  T: { color: '#eef2f5', roughness: .2, metalness: 0, transparent: true, opacity: .55 } // tanque translúcido
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
    part('chasis', 'Chasis / plato de corte'); box(0, .35, 0, 2.0, .3, 1.7, 'M', .14);
    part('cuchilla', 'Cuchilla'); box(0, .17, 0, 1.5, .04, .18, 'A', .01);
    part('carcasa', 'Carcasa del motor'); box(0, .85, 0, 1.0, .5, .8, 'O', .1);
    part('cilindro', 'Cilindro'); fins(0, 1.3, 0, .28, .4, 'y', 5, .36, 'A');
    part('bujia', 'Bujía'); cyl(.3, 1.3, .3, .05, .25, 'y', 'W', 20);
    part('filtro', 'Filtro de aire'); box(-.35, 1.25, .3, .35, .25, .35, 'D', .05);
    part('carburador', 'Carburador'); box(-.4, .95, .5, .25, .22, .2, 'A', .03);
    part('arrancador', 'Arrancador'); cyl(0, 1.56, 0, .35, .12, 'y', 'H', 40);
    part('ruedas', 'Ruedas'); [[.8, .6], [.8, -.6], [-.8, .6], [-.8, -.6]].forEach(([x, z]) => { cyl(x, .22, z * 1.35, .28, .16, 'z', 'D', 36); cyl(x, .22, z * 1.35 + (z > 0 ? .085 : -.085), .13, .03, 'z', 'A', 24); });
    part('manubrio', 'Manubrio'); tube([[-.9, .5, .6], [-1.7, 1.6, .6], [-1.7, 1.6, -.6], [-.9, .5, -.6]], .05, 'D');
    part('bolsa', 'Bolsa recolectora'); box(-1.45, .6, 0, .7, .6, 1.0, 'B', .12);
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
    } else if (kind === 'hidro') {
      gx(-.4, .35, 0, .95, {});
      part('bomba_alta', 'Bomba de alta presión', [1.6, 0, 0]); box(.65, .72, 0, .42, .42, .5, 'C', .06); cyl(.95, .72, 0, .16, .3, 'x', 'C', 28); [-.12, .12].forEach(z => cyl(.65, .98, z, .05, .14, 'y', 'D', 16));
      part('valvula', 'Válvula de descarga (unloader)', [1.4, 1.0, .5]); box(.75, 1.08, .2, .18, .16, .16, 'C', .03);
      part('manguera', 'Manguera de alta presión', [1.0, -.4, 1.2]); tube([[.75, 1.08, .3], [1.2, .9, .8], [1.0, .3, 1.0], [.2, .25, .95], [-.6, .3, .9]], .04, 'D');
      part('pistola', 'Pistola', [1.2, .4, 1.8]); box(-.9, .5, .9, .22, .3, .1, 'D', .04);
      part('lanza', 'Lanza y boquilla', [1.2, .4, 2.2]); cyl(-1.5, .6, .9, .035, 1.1, 'x', 'M', 16); cyl(-2.08, .6, .9, .06, .1, 'x', 'Y', 16);
      frameBox(-1.4, 1.1, .2, .25, -.6, .6, .05, 'D', 'chasis', 'Chasis');
      part('manubrio', 'Manubrio'); tube([[-1.4, .25, .55], [-1.75, 1.7, .55], [-1.75, 1.7, -.55], [-1.4, .25, -.55]], .05, 'D');
      wheels([[-1.1, .22, .72], [-1.1, .22, -.72]], .32, .14);
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
      part('chasis', 'Chasis'); box(0, .55, 0, 3.0, .18, 1.0, 'D2', .05);
      part('capo', 'Capó', [1.0, .8, 0]); box(1.0, 1.0, 0, 1.2, .62, 1.05, 'G', .2);
      part('motor', 'Motor', [1.0, 1.6, 0]); box(1.0, .95, 0, .7, .5, .6, 'A', .06); fins(1.0, 1.1, 0, .2, .3, 'y', 4, .28, 'A');
      part('bujia', 'Bujía', [1.4, 1.8, .4]); cyl(1.0, 1.32, .2, .045, .2, 'y', 'W', 16);
      part('filtro', 'Filtro de aire', [1.2, 1.7, -.5]); box(1.25, 1.2, -.25, .3, .2, .3, 'D', .05);
      part('carburador', 'Carburador', [1.5, 1.3, -.9]); box(1.2, .9, -.35, .2, .18, .18, 'A', .03);
      part('bateria', 'Batería', [.5, 1.5, .9]); box(.45, .85, .3, .3, .25, .2, 'D', .03);
      part('asiento', 'Asiento', [-.6, 1.3, 0]); box(-.55, 1.15, 0, .6, .14, .7, 'D', .07); box(-.85, 1.42, 0, .14, .5, .7, 'D', .07);
      part('volante_dir', 'Volante y dirección', [.3, 1.3, 0]); tor(.3, 1.55, 0, .26, .03, 'y', 'D'); cyl(.35, 1.2, 0, .03, .7, 'y', 'M', 12);
      part('plato', 'Plato de corte', [0, -.6, 0]); box(0, .32, 0, 1.4, .2, 1.4, 'G', .1);
      part('cuchillas', 'Cuchillas', [0, -1.0, 0]); box(-.3, .2, 0, .9, .03, .12, 'A', .01); box(.35, .2, .1, .9, .03, .12, 'A', .01);
      part('correa', 'Correa de transmisión', [0, -.3, -1.1]); tor(0, .44, 0, .55, .025, 'y', 'D');
      part('transeje', 'Transeje', [-1.2, -.3, 0]); box(-1.15, .45, 0, .45, .35, .5, 'D2', .06);
      wheels([[1.15, .3, .6], [1.15, .3, -.6]], .28, .16, 'ruedas_d', 'Ruedas delanteras'); wheels([[-1.15, .45, .65], [-1.15, .45, -.65]], .45, .28, 'ruedas_t', 'Ruedas traseras');
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
    } else if (kind === 'poda') {
      t2(-2.6, .55, 0, .85);
      part('tubo', 'Tubo / eje de transmisión', [0, .6, 0]); cylDir([-.4, 1.0, 0], V3(1, .35, 0), .05, 4.2, 'A', 20);
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
