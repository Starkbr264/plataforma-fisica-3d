/* Eletrostatica N-cargas: superposicao vetorial real. Tudo calculado via FIS. */
const { fmt, coulomb, campoQ, potencialQ, energiaU, store } = window.FIS;

katex.render("F = k\\dfrac{|q_i q_j|}{r^2}", document.getElementById('kCoulomb'));
katex.render("\\vec{E} = \\sum_i kQ_i\\dfrac{\\vec{r}}{|\\vec{r}|^3}", document.getElementById('kCampo'));
katex.render("V = \\sum_i k\\dfrac{Q_i}{r},\\quad U = \\sum_{i<j} k\\dfrac{q_i q_j}{r_{ij}}", document.getElementById('kPot'));

const Y = .45, RMIN = .05;
let seq = 0;
const S = {
  charges: [
    { id: ++seq, q: 2e-6, x: -.15, z: 0 },
    { id: ++seq, q: -3e-6, x: .15, z: 0 },
  ],
  sel: 1, U0: null,
  showRes: true, showField: true, showProbe: true, showEqui: false,
  probe: { x: 0, z: 1.1, q: 1e-9 },
};
const $ = (id) => document.getElementById(id);
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }

// ---------- cena ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
function size() { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); }
addEventListener('resize', size);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
cam.position.set(0, 4.2, 8.5);
size();
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
scene.add(new THREE.GridHelper(16, 16, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, .7));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

const meshes = new Map(); // id -> {grp, mesh, ring, arrow}
function makeChargeMesh() {
  const grp = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.14, 28, 28),
    new THREE.MeshStandardMaterial({ roughness: .3, metalness: .1 }));
  mesh.userData.drag = true; grp.add(mesh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .012, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ring.rotation.x = Math.PI / 2; grp.add(ring); mesh.userData.ring = ring;
  const lbl = document.createElement('canvas'); lbl.width = 128; lbl.height = 64;
  const tex = new THREE.CanvasTexture(lbl);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(.57, .285, 1); spr.position.y = .37; grp.add(spr);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffcf4d, .25, .15);
  scene.add(arrow);
  scene.add(grp);
  return { grp, mesh, ring, lbl, tex, arrow };
}
function setLabel(o, txt) {
  const x = o.lbl.getContext('2d');
  x.clearRect(0, 0, 128, 64); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif';
  x.textAlign = 'center'; x.fillText(txt, 64, 42); o.tex.needsUpdate = true;
}
const prova = new THREE.Mesh(new THREE.SphereGeometry(.14, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xb78cff }));
prova.userData.drag = true; prova.userData.probe = true; scene.add(prova);
const aE = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x5dffb0, .22, .13);
scene.add(aE);

function syncMeshes() {
  for (const [id, o] of meshes) {
    if (!S.charges.some(c => c.id === id)) {
      scene.remove(o.grp, o.arrow); meshes.delete(id);
    }
  }
  for (const c of S.charges) {
    if (!meshes.has(c.id)) meshes.set(c.id, makeChargeMesh());
    const o = meshes.get(c.id);
    o.mesh.userData.cid = c.id;
    o.grp.position.set(c.x, Y, c.z);
    const col = c.q >= 0 ? 0xff5b6e : 0x4da3ff;
    o.mesh.material.color.set(col);
    const sel = c.id === S.sel;
    o.ring.material.color.set(sel ? 0xffffff : col);
    o.grp.scale.setScalar(sel ? 1.18 : 1);
    setLabel(o, c.q >= 0 ? '+' : '−');
    o.arrow.visible = S.showRes;
  }
  prova.visible = S.showProbe;
  prova.position.set(S.probe.x, Y, S.probe.z);
}

// ---------- fisica ----------
function pairR(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function pairF(a, b) { return coulomb(a.q, b.q, Math.max(pairR(a, b), RMIN)); }
function resultOn(c) { // superposicao vetorial das forcas sobre c
  let fx = 0, fz = 0;
  for (const o of S.charges) {
    if (o.id === c.id) continue;
    const dx = c.x - o.x, dz = c.z - o.z;
    const r = Math.max(Math.hypot(dx, dz), RMIN);
    const F = coulomb(c.q, o.q, r);
    const rep = c.q * o.q > 0;
    const s = rep ? 1 : -1; // repulsao: ao longo de +(c-o); atracao: oposto
    fx += s * F * dx / r; fz += s * F * dz / r;
  }
  return { fx, fz, mod: Math.hypot(fx, fz) };
}
function fieldAt(x, z) { // E vetorial + V escalar por superposicao
  let ex = 0, ez = 0, V = 0;
  for (const c of S.charges) {
    const dx = x - c.x, dz = z - c.z;
    const r = Math.max(Math.hypot(dx, dz), RMIN);
    const E = campoQ(c.q, r);
    const s = c.q >= 0 ? 1 : -1; // campo aponta p/ longe de + e p/ dentro de −
    ex += s * E * dx / r; ez += s * E * dz / r;
    V += potencialQ(c.q, r);
  }
  return { ex, ez, mod: Math.hypot(ex, ez), V };
}
function totalU() {
  let U = 0;
  for (let i = 0; i < S.charges.length; i++)
    for (let j = i + 1; j < S.charges.length; j++)
      U += energiaU(S.charges[i].q, S.charges[j].q,
        Math.max(pairR(S.charges[i], S.charges[j]), RMIN));
  return U;
}
// ---------- linhas de campo (streamlines do E resultante) + equipotenciais ----------
const fieldGroup = new THREE.Group(); scene.add(fieldGroup);
const equiGroup = new THREE.Group(); scene.add(equiGroup);
function clearGroup(g) {
  for (let i = g.children.length - 1; i >= 0; i--) {
    const o = g.children[i]; g.remove(o);
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  }
}
function traceLine(sx, sz, dir, seedId, seedSign) {
  const pts = [new THREE.Vector3(sx, Y, sz)];
  let x = sx, z = sz;
  const step = .06;
  for (let i = 0; i < 220; i++) {
    const f = fieldAt(x, z);
    const m = Math.hypot(f.ex, f.ez);
    if (!isFinite(m) || m <= 0) break;
    x += dir * f.ex / m * step; z += dir * f.ez / m * step;
    if (Math.abs(x) > 6 || Math.abs(z) > 5) break;
    let hit = false;
    for (const c of S.charges) {
      if (c.id === seedId) continue;
      if (c.q * seedSign < 0 && Math.hypot(x - c.x, z - c.z) < .12) { hit = true; break; }
    }
    pts.push(new THREE.Vector3(x, Y, z));
    if (hit) break;
  }
  return pts;
}
function rebuildField() { // chamada por evento (syncAll), NUNCA por quadro
  clearGroup(fieldGroup);
  fieldGroup.visible = S.showField;
  if (!S.showField || !S.charges.length) return;
  let sources = S.charges.filter(c => c.q > 0), dir = 1;
  if (!sources.length) { sources = S.charges.filter(c => c.q < 0); dir = -1; }
  if (!sources.length) return;
  for (const c of sources) {
    const sgn = c.q > 0 ? 1 : -1;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const pts = traceLine(c.x + Math.cos(a) * .2, c.z + Math.sin(a) * .2, dir, c.id, sgn);
      if (pts.length < 2) continue;
      fieldGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x5dffb0, transparent: true, opacity: .5 })));
    }
  }
}
function logspace(a, b, n) {
  const out = [], la = Math.log10(a), lb = Math.log10(b);
  for (let k = 0; k < n; k++) out.push(Math.pow(10, la + (lb - la) * (n === 1 ? 0 : k / (n - 1))));
  return out;
}
function equiLevels(vmin, vmax, n) {
  if (vmin > 0) return logspace(vmin, vmax, n);
  if (vmax < 0) return logspace(Math.abs(vmax), Math.abs(vmin), n).map(v => -v).reverse();
  const amax = Math.max(Math.abs(vmin), Math.abs(vmax));
  if (!(amax > 0)) return [];
  const p = logspace(vmax / 1000, vmax * 0.999, Math.ceil(n / 2));
  const q = logspace(Math.abs(vmin) / 1000, Math.abs(vmin) * 0.999, Math.floor(n / 2));
  return [...q.map(v => -v).reverse(), ...p].filter(v => v > vmin && v < vmax);
}
function rebuildEqui() { // marching squares do V, chamada por evento (syncAll)
  clearGroup(equiGroup);
  equiGroup.visible = S.showEqui;
  if (!S.showEqui || !S.charges.length) return;
  const NX = 80, NZ = 60, X0 = -4, X1 = 4, Z0 = -3, Z1 = 3;
  const dx = (X1 - X0) / NX, dz = (Z1 - Z0) / NZ;
  const vals = new Float64Array((NX + 1) * (NZ + 1));
  let vmin = Infinity, vmax = -Infinity;
  for (let j = 0; j <= NZ; j++) {
    const z = Z0 + dz * j;
    for (let i = 0; i <= NX; i++) {
      const V = fieldAt(X0 + dx * i, z).V;
      let gv = V;
      if (!isFinite(gv)) gv = 0;
      if (Math.abs(gv) > 1e6) gv = Math.sign(gv) * 1e6;
      vals[j * (NX + 1) + i] = gv;
      if (isFinite(V) && Math.abs(V) <= 1e6) {
        if (V < vmin) vmin = V;
        if (V > vmax) vmax = V;
      }
    }
  }
  if (!(vmax > vmin)) return;
  const levels = equiLevels(vmin, vmax, 6);
  if (!levels.length) return;
  const pos = [];
  const P = (px, pz) => { pos.push(px, Y, pz); };
  for (const L of levels) {
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const a = vals[j * (NX + 1) + i], b = vals[j * (NX + 1) + i + 1];
        const d = vals[(j + 1) * (NX + 1) + i], c = vals[(j + 1) * (NX + 1) + i + 1];
        const x0 = X0 + dx * i, z0 = Z0 + dz * j;
        const cp = [];
        if ((a < L) !== (b < L)) { const t = (L - a) / (b - a); cp.push([x0 + dx * t, z0]); }
        if ((b < L) !== (c < L)) { const t = (L - b) / (c - b); cp.push([x0 + dx, z0 + dz * t]); }
        if ((d < L) !== (c < L)) { const t = (L - d) / (c - d); cp.push([x0 + dx * t, z0 + dz]); }
        if ((a < L) !== (d < L)) { const t = (L - a) / (d - a); cp.push([x0, z0 + dz * t]); }
        if (cp.length === 2) { P(cp[0][0], cp[0][1]); P(cp[1][0], cp[1][1]); }
        else if (cp.length === 4) { P(cp[0][0], cp[0][1]); P(cp[1][0], cp[1][1]); P(cp[2][0], cp[2][1]); P(cp[3][0], cp[3][1]); }
      }
    }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  equiGroup.add(new THREE.LineSegments(g,
    new THREE.LineBasicMaterial({ color: 0xb78cff, transparent: true, opacity: .6 })));
}
const arrowLen = (v) => THREE.MathUtils.clamp(.35 + Math.log10(1 + v) * .85, .35, 3);

function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    const sel = S.charges.find(c => c.id === S.sel) || S.charges[0];
    // pares da selecionada
    let html = '', near = null, nearR = 1e9;
    for (const o of S.charges) {
      if (!sel || o.id === sel.id) continue;
      const r = pairR(sel, o), F = pairF(sel, o);
      if (r < nearR) { nearR = r; near = o; }
      html += `<div class="kv"><span>q${sel.id}↔q${o.id} · ${r.toFixed(2)} m · ${sel.q * o.q < 0 ? 'atração' : 'repulsão'}</span><b>${fmt(F)} N</b></div>`;
    }
    $('pairTable').innerHTML = html || '<span style="color:var(--dim)">Adicione mais cargas.</span>';
    // resultantes -> setas
    for (const c of S.charges) {
      const o = meshes.get(c.id); if (!o) continue;
      const R = resultOn(c);
      o.arrow.position.set(c.x, Y, c.z);
      if (R.mod > 0) o.arrow.setDirection(new THREE.Vector3(R.fx / R.mod, 0, R.fz / R.mod));
      o.arrow.setLength(c.q === 0 ? .001 : arrowLen(R.mod));
      o.arrow.visible = S.showRes && c.q !== 0 && R.mod > 0;
    }
    if (sel) {
      const R = resultOn(sel);
      $('rF').textContent = fmt(R.mod) + ' N';
      $('stepF').textContent = S.charges.length < 2 ? 'Adicione outra carga.'
        : `Resultante em q${sel.id} = soma vetorial de ${S.charges.length - 1} par(es) F=k|qiqj|/r²  =  ${fmt(R.mod)} N`;
    } else $('rF').textContent = '—';
    // prova
    const F_ = fieldAt(S.probe.x, S.probe.z);
    const Fp = Math.abs(S.probe.q) * F_.mod;
    $('rE').textContent = fmt(F_.mod) + ' N/C';
    $('rV').textContent = fmt(F_.V) + ' V';
    aE.visible = S.showProbe && F_.mod > 0;
    if (F_.mod > 0) {
      aE.position.set(S.probe.x, Y, S.probe.z);
      aE.setDirection(new THREE.Vector3(F_.ex / F_.mod, 0, F_.ez / F_.mod));
      aE.setLength(arrowLen(F_.mod));
    }
    $('stepE').textContent = `E = Σ kQ·r̂/r² em (${S.probe.x.toFixed(2)}, ${S.probe.z.toFixed(2)}) = ${fmt(F_.mod)} N/C · F=qE=${fmt(Fp)} N`;
    const U = totalU();
    if (S.U0 == null) S.U0 = U;
    $('rU').textContent = fmt(U) + ' J';
    $('stepV').textContent = `V = Σ kQ/r = ${fmt(F_.V)} V · U = Σ kqiqj/rij = ${fmt(U)} J`;
    // aviso de pares muito proximos
    let close = false;
    for (let i = 0; i < S.charges.length && !close; i++)
      for (let j = i + 1; j < S.charges.length; j++)
        if (pairR(S.charges[i], S.charges[j]) < .2) close = true;
    if (close) alert.innerHTML = `<div class="warn">Par com r &lt; 0,2 m: modelo puntiforme no limite (F ∝ 1/r² diverge).</div>`;
    drawGraph(sel, near);
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; }
}
function drawGraph(sel, near) {
  const g = $('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  const T = $('gTitle');
  if (!sel || !near) {
    if (T) T.textContent = 'Gráfico F × r — par (selecionada × vizinha mais próxima)';
    x.fillText('Selecione uma carga com ao menos 1 vizinha.', 8, 20); return;
  }
  if (T) T.textContent = `Gráfico F × r — q${sel.id} × q${near.id} (F = k|q₁q₂|/r²)`;
  const qq = Math.abs(sel.q * near.q), r0 = pairR(sel, near);
  const rMax = 8, fMax = coulomb(qq || 1e-12, 1, RMIN);
  const f2y = (f) => g.height - 14 - (Math.log10(1 + f) / Math.log10(1 + fMax)) * (g.height - 46);
  x.fillStyle = '#e8eefc'; x.font = 'bold 12px sans-serif';
  x.fillText(`F × r — q${sel.id} × q${near.id}`, 8, 14);
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  x.fillText('F (N, escala log)', 8, 28);
  x.beginPath();
  for (let px = 0; px <= g.width; px += 3) {
    const r = RMIN + (rMax - RMIN) * px / g.width;
    const f = coulomb(qq, 1, r);
    const py = f2y(f);
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.strokeStyle = '#4da3ff'; x.lineWidth = 2; x.stroke();
  const rc = Math.max(r0, RMIN);
  const f0 = coulomb(qq, 1, rc);
  const px = (rc - RMIN) / (rMax - RMIN) * g.width;
  const py = f2y(f0);
  x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill();
  x.fillStyle = '#93a4cc';
  x.fillText('0,05 m', 4, g.height - 1);
  x.fillText('r (m)', g.width / 2 - 15, g.height - 1);
  x.fillText(`r atual ${r0.toFixed(2)} m`, Math.min(Math.max(px - 30, 4), g.width - 110), py - 10);
  x.fillText('8 m', g.width - 24, g.height - 1);
}

// ---------- UI ----------
function refreshList() {
  const d = $('chargeList'); d.innerHTML = '';
  $('nQ').textContent = S.charges.length;
  for (const c of S.charges) {
    const b = document.createElement('button');
    b.className = 'tb' + (c.id === S.sel ? ' act' : '');
    b.style.textAlign = 'left';
    b.textContent = `q${c.id}  ${(c.q * 1e6).toFixed(1)} µC  (${c.x.toFixed(2)}, ${c.z.toFixed(2)})`;
    b.onclick = () => { S.sel = c.id; syncAll(); };
    d.appendChild(b);
  }
  const sel = S.charges.find(c => c.id === S.sel);
  $('selName').textContent = sel ? `q${sel.id}` : '—';
  if (sel) {
    $('sQ').value = sel.q * 1e6; $('oQ').textContent = (sel.q * 1e6).toFixed(1);
    $('nX').value = sel.x.toFixed(2); $('nZ').value = sel.z.toFixed(2);
  } else { $('oQ').textContent = '—'; }
}
function syncAll() { syncMeshes(); refreshList(); rebuildField(); rebuildEqui(); calc(); }
function addCharge(q) {
  const a = Math.random() * Math.PI * 2;
  const c = { id: ++seq, q, x: + (Math.cos(a) * 1.8).toFixed(2), z: + (Math.sin(a) * 1.8).toFixed(2) };
  S.charges.push(c); S.sel = c.id; S.U0 = null; syncAll(); toast(`q${c.id} adicionada`);
}
$('bAddPos').onclick = () => addCharge(5e-6);
$('bAddNeg').onclick = () => addCharge(-5e-6);
$('bPreset').onclick = () => {
  S.charges = [{ id: ++seq, q: 2e-6, x: -.15, z: 0 }, { id: ++seq, q: -3e-6, x: .15, z: 0 }];
  S.sel = S.charges[0].id; S.U0 = null; S.probe = { x: 0, z: 1.1, q: 1e-9 };
  syncAll(); toast('Preset: F deve dar ≈ 0,599 N (atração)');
};
$('bClear').onclick = () => { if (confirm('Remover todas as cargas?')) { S.charges = []; S.sel = null; S.U0 = null; syncAll(); } };
$('bDel').onclick = () => {
  S.charges = S.charges.filter(c => c.id !== S.sel);
  S.sel = S.charges.length ? S.charges[0].id : null; S.U0 = null; syncAll();
};
$('bDup').onclick = () => {
  const s = S.charges.find(c => c.id === S.sel); if (!s) return;
  const c = { id: ++seq, q: s.q, x: +(s.x + .6).toFixed(2), z: s.z };
  S.charges.push(c); S.sel = c.id; S.U0 = null; syncAll();
};
$('sQ').oninput = (e) => {
  const s = S.charges.find(c => c.id === S.sel); if (!s) return;
  s.q = +e.target.value * 1e-6; $('oQ').textContent = (+e.target.value).toFixed(1); syncAll();
};
$('nX').onchange = (e) => {
  const s = S.charges.find(c => c.id === S.sel); if (!s) return;
  s.x = THREE.MathUtils.clamp(+e.target.value || 0, -4, 4); syncAll();
};
$('nZ').onchange = (e) => {
  const s = S.charges.find(c => c.id === S.sel); if (!s) return;
  s.z = THREE.MathUtils.clamp(+e.target.value || 0, -3, 3); syncAll();
};
$('cRes').onchange = (e) => { S.showRes = e.target.checked; syncAll(); };
$('cField').onchange = (e) => { S.showField = e.target.checked; syncAll(); };
$('cEqui').onchange = (e) => { S.showEqui = e.target.checked; syncAll(); };
$('cProva').onchange = (e) => { S.showProbe = e.target.checked; syncAll(); };
$('bSave').onclick = () => { store.save('eletrostatica', S); toast('Salvo (Modo Livre consegue carregar)'); };

// ---------- arrastar (cargas + prova) ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null;
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y);
function pick(e) {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const objs = [prova, ...[...meshes.values()].map(o => o.mesh)];
  const hit = ray.intersectObjects(objs);
  return hit.length ? hit[0].object : null;
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  const o = pick(e);
  if (o) {
    ctl.enabled = false;
    if (o.userData.probe) drag = { probe: true };
    else { drag = { cid: o.userData.cid }; S.sel = o.userData.cid; }
    syncAll();
  }
});
addEventListener('pointerup', () => { drag = null; ctl.enabled = true; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const p = new THREE.Vector3();
  ray.ray.intersectPlane(plane, p);
  p.x = THREE.MathUtils.clamp(p.x, -4, 4); p.z = THREE.MathUtils.clamp(p.z, -3, 3);
  if (drag.probe) { S.probe.x = +p.x.toFixed(2); S.probe.z = +p.z.toFixed(2); }
  else {
    const c = S.charges.find(c => c.id === drag.cid);
    if (c) { c.x = +p.x.toFixed(2); c.z = +p.z.toFixed(2); }
  }
  syncAll();
});

// ---------- loop ----------
(function loop() {
  requestAnimationFrame(loop); ctl.update();
  renderer.render(scene, cam);
})();

// carrega save anterior, se houver
try {
  const sv = store.load('eletrostatica');
  if (sv && Array.isArray(sv.charges) && sv.charges.length) {
    S.charges = sv.charges; S.probe = sv.probe || S.probe;
    seq = Math.max(...S.charges.map(c => c.id), 0);
    S.sel = S.charges[0].id;
  }
} catch { /* ignora */ }
syncAll();
