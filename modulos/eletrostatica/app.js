

const { fmt, coulomb, campoQ, potencialQ, energiaU, store } = window.FIS;

katex.render("F = k\\dfrac{|q_1 q_2|}{r^2}", document.getElementById('kCoulomb'));
katex.render("E = \\dfrac{F}{q},\\quad E_Q = k\\dfrac{|Q|}{r^2}", document.getElementById('kCampo'));
katex.render("V = k\\dfrac{Q}{r},\\quad U = k\\dfrac{q_1 q_2}{r},\\quad W = -\\Delta U", document.getElementById('kPot'));

// --- cena ---
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(devicePixelRatio);
function size() { renderer.setSize(innerWidth, innerHeight); }
size(); addEventListener('resize', size);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
cam.position.set(0, 4.2, 8.5);
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
scene.add(new THREE.GridHelper(16, 16, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, .7));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

function ball(color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(.45, 32, 32),
    new THREE.MeshStandardMaterial({ color, roughness: .3, metalness: .1 }));
  m.userData.drag = true; scene.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .03, 10, 40),
    new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = Math.PI / 2; m.add(ring);
  const lbl = document.createElement('canvas'); lbl.width = 128; lbl.height = 64;
  m.userData.lbl = lbl;
  const tex = new THREE.CanvasTexture(lbl);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(1.4, .7, 1); spr.position.y = .95; m.add(spr);
  m.userData.tex = tex;
  return m;
}
const q1m = ball(0xff5b6e), q2m = ball(0x4da3ff);
const prova = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xb78cff })); prova.visible = false; scene.add(prova);
const a1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffcf4d, .3, .18);
const a2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 1, 0xffcf4d, .3, .18);
scene.add(a1, a2);
// linhas de campo didáticas (radiais da q1)
const fieldGrp = new THREE.Group(); scene.add(fieldGrp);
for (let i = 0; i < 12; i++) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
  fieldGrp.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x5dffb0, transparent: true, opacity: .35 })));
}

const S = { q1: 5e-6, q2: -5e-6, r: 2.0, U0: null };
const $ = (id) => document.getElementById(id);
const sQ1 = $('sQ1'), sQ2 = $('sQ2'), sR = $('sR');

function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }
function setLabel(m, txt) {
  const c = m.userData.lbl, x = c.getContext('2d');
  x.clearRect(0, 0, 128, 64); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif';
  x.textAlign = 'center'; x.fillText(txt, 64, 42); m.userData.tex.needsUpdate = true;
}
function place() {
  q1m.position.set(-S.r / 2, .45, 0); q2m.position.set(S.r / 2, .45, 0);
  prova.position.set(0, .45, 1.1);
}
function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    const F = coulomb(S.q1, S.q2, S.r);
    const r2 = S.r / 2;
    const E1 = campoQ(S.q1, r2), E2 = campoQ(S.q2, r2);
    const dir1 = S.q1 > 0 ? 1 : -1;   // q1 à esquerda: campo no centro aponta +x se q1>0? não: longe de q1 = +x
    const dir2 = S.q2 > 0 ? -1 : 1;   // q2 à direita: longe de q2 = −x se q2>0
    const Exr = dir1 * E1 + dir2 * E2;
    const V = potencialQ(S.q1, r2) + potencialQ(S.q2, r2);
    const U = energiaU(S.q1, S.q2, S.r);
    if (S.U0 == null) S.U0 = U;
    const W = -(U - S.U0);
    const atr = S.q1 * S.q2 < 0;
    $('rF').textContent = fmt(F) + ' N';
    $('rNat').textContent = S.q1 === 0 || S.q2 === 0 ? 'nula (carga zero)' : atr ? 'ATRAÇÃO' : 'REPULSÃO';
    $('rE').textContent = fmt(Math.abs(Exr)) + ' N/C (' + (Exr >= 0 ? '+x' : '−x') + ')';
    $('rV').textContent = fmt(V) + ' V';
    $('rU').textContent = fmt(U) + ' J';
    $('rW').textContent = fmt(W) + ' J';
    $('stepF').textContent = `F = 8,988×10^9 × |(${fmt(S.q1)})(${fmt(S.q2)})| / ${S.r.toFixed(2)}²\n  = ${fmt(F)} N`;
    $('stepE').textContent = `E₁=k|q₁|/(r/2)²=${fmt(E1)}  E₂=${fmt(E2)} N/C → soma vetorial Ex=${fmt(Exr)} N/C`;
    $('stepV').textContent = `V = k·q₁/(r/2)+k·q₂/(r/2) = ${fmt(V)} V · U = k·q₁q₂/r = ${fmt(U)} J`;
    // setas: tamanho ∝ log para caber na cena, direção física
    const rep = S.q1 * S.q2 > 0;
    const d1 = rep ? -1 : 1, d2 = rep ? 1 : -1; // repulsão: q1←, q2→ ; atração: q1→, q2←
    const L = THREE.MathUtils.clamp(.4 + Math.log10(1 + F) * .9, .4, 3.2);
    a1.position.copy(q1m.position); a1.setDirection(new THREE.Vector3(d1, 0, 0)); a1.setLength(S.q1 === 0 ? .001 : L);
    a2.position.copy(q2m.position); a2.setDirection(new THREE.Vector3(d2, 0, 0)); a2.setLength(S.q2 === 0 ? .001 : L);
    a1.visible = a2.visible = !(S.q1 === 0 || S.q2 === 0);
    drawGraph(F);
    return { F };
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; return null; }
}
function drawGraph(Fnow) {
  const g = document.getElementById('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  x.strokeStyle = '#223'; x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  const rMax = 8, fMax = coulomb(Math.abs(S.q1) || 1e-6, Math.abs(S.q2) || 1e-6, .2);
  x.beginPath();
  for (let px = 0; px <= g.width; px += 3) {
    const r = .2 + (rMax - .2) * px / g.width;
    const f = coulomb(Math.abs(S.q1), Math.abs(S.q2), r);
    const py = g.height - 12 - (Math.log10(1 + f) / Math.log10(1 + fMax)) * (g.height - 30);
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.strokeStyle = '#4da3ff'; x.lineWidth = 2; x.stroke();
  const px = (S.r - .2) / (rMax - .2) * g.width;
  const py = g.height - 12 - (Math.log10(1 + (Fnow || 0)) / Math.log10(1 + fMax)) * (g.height - 30);
  x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill();
  x.fillStyle = '#93a4cc'; x.fillText('0,2 m', 4, g.height - 1); x.fillText('8 m', g.width - 24, g.height - 1);
}
function syncUI() {
  $('oQ1').textContent = (S.q1 * 1e6).toFixed(1); $('oQ2').textContent = (S.q2 * 1e6).toFixed(1);
  $('oR').textContent = S.r.toFixed(2);
  $('lQ1').textContent = `${(S.q1 * 1e6).toFixed(1)} µC`; $('lQ2').textContent = `${(S.q2 * 1e6).toFixed(1)} µC`;
  q1m.material.color.set(S.q1 >= 0 ? 0xff5b6e : 0x4da3ff);
  q2m.material.color.set(S.q2 >= 0 ? 0xff5b6e : 0x4da3ff);
  setLabel(q1m, S.q1 >= 0 ? '+' : '−'); setLabel(q2m, S.q2 >= 0 ? '+' : '−');
  place(); calc();
}
sQ1.oninput = () => { S.q1 = +sQ1.value * 1e-6; syncUI(); };
sQ2.oninput = () => { S.q2 = +sQ2.value * 1e-6; syncUI(); };
sR.oninput = () => { S.r = +sR.value; syncUI(); };
$('cProva').onchange = (e) => prova.visible = e.target.checked;
$('bSwap').onclick = () => { S.q1 *= -1; S.q2 *= -1; sQ1.value = S.q1 * 1e6; sQ2.value = S.q2 * 1e6; syncUI(); toast('Sinais invertidos'); };
$('bEq').onclick = () => { S.q1 = S.q2 = 5e-6; sQ1.value = sQ2.value = 5; syncUI(); };
$('bReset').onclick = () => { S.U0 = null; calc(); toast('Referência de energia resetada'); };
$('bSave').onclick = () => { store.save('eletrostatica', S); toast('Salvo (Modo Livre consegue carregar)'); };

// arrastar esferas no plano y=.45
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null;
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.45);
function pick(e) {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const hit = ray.intersectObjects([q1m, q2m]);
  return hit.length ? hit[0].object : null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { drag = pick(e); if (drag) ctl.enabled = false; });
addEventListener('pointerup', () => { drag = null; ctl.enabled = true; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const p = new THREE.Vector3();
  ray.ray.intersectPlane(plane, p);
  p.x = THREE.MathUtils.clamp(p.x, -4, 4);
  if (drag === q1m) { q1m.position.x = p.x; S.r = Math.abs(q2m.position.x - q1m.position.x) || .2; }
  else { q2m.position.x = p.x; S.r = Math.abs(q2m.position.x - q1m.position.x) || .2; }
  S.r = THREE.MathUtils.clamp(S.r, .2, 8); sR.value = S.r; syncUI();
});
(function loop() {
  requestAnimationFrame(loop); ctl.update();
  const t = performance.now() / 1000;
  fieldGrp.position.copy(q1m.position);
  fieldGrp.children.forEach((l, i) => {
    const a = i / 12 * Math.PI * 2 + t * .15;
    l.geometry.setFromPoints([new THREE.Vector3(Math.cos(a) * .6, 0, Math.sin(a) * .6),
      new THREE.Vector3(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5)]);
  });
  renderer.render(scene, cam);
})();
syncUI();
