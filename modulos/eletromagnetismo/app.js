const { C, Bfio, Fmag, Ffio, fluxo, fem, fmt, store } = window.FIS;

katex.render("B = \\dfrac{\\mu_0 I}{2\\pi r}", document.getElementById('kB'));
katex.render("F = |q|\\,v\\,B\\,\\sin\\theta", document.getElementById('kF'));
katex.render("\\Phi = B\\,A\\,\\cos\\theta", document.getElementById('kPhi'));
katex.render("\\varepsilon = -N\\,\\dfrac{\\Delta\\Phi}{\\Delta t}", document.getElementById('kEps'));

// ---------- estado ----------
// NOTE: sem slider de distância — r é MEDIDO da posição 3D da partícula ao
// fio (fonte única de verdade p/ B, F e rL).
const S = { I: 5, N: 100, v: 1e6, theta: 90, Bext: 1e-3, qsign: 1 };
const MP = C.mp, ME = C.me; // massas do motor (próton/elétron, kg)
const COIL_R = 0.6;                    // raio da bobina (m)
const COIL_A = Math.PI * COIL_R * COIL_R;
const DIP_M = 0.05;                    // momento dipolo didático (A·m²) — fixo
const $ = (id) => document.getElementById(id);
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }
function massaPart() { return S.qsign > 0 ? MP : ME; }
function nomePart() { return S.qsign > 0 ? '+e (próton)' : '−e (elétron)'; }

// B didático de dipolo no eixo: B ≈ (μ0/4π)(2m/d³), clamp p/ não divergir
function Bdipolo(d) {
  const dd = Math.max(Math.abs(d), 0.4);
  return (C.mu0 / (4 * Math.PI)) * (2 * DIP_M / (dd * dd * dd));
}

// ---------- cena ----------
const cv = $('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(devicePixelRatio);
function size() { renderer.setSize(innerWidth, innerHeight); }
size(); addEventListener('resize', size);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
cam.position.set(4.5, 4.5, 9);
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
scene.add(new THREE.GridHelper(16, 16, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

// fio vertical no centro
const fio = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 6, 24),
  new THREE.MeshStandardMaterial({ color: 0xffb84d, metalness: 0.7, roughness: 0.3 })
);
scene.add(fio);
// seta de corrente no fio
const arrowI = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.35, 0, 0), 1.4, 0xffcf4d, 0.3, 0.18);
scene.add(arrowI);

// anéis de campo B (concêntricos no plano XZ)
const ringGrp = new THREE.Group(); scene.add(ringGrp);
const RING_RADII = [0.5, 0.9, 1.3, 1.7, 2.1, 2.5];
const rings = RING_RADII.map((rr) => {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(rr, 0.022, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x38e0c0, transparent: true })
  );
  m.rotation.x = Math.PI / 2; ringGrp.add(m);
  // setinha de sentido numa ponta do anel
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 12), m.material);
  cone.position.set(0, 0, rr); ringGrp.add(cone);
  return { mesh: m, cone, r: rr };
});
const BREF = Bfio(10, 0.5); // normalização de cor: I=10A @ 0,5m

function updateRings() {
  const s = Math.sign(S.I) || 1;
  for (const { mesh, cone, r } of rings) {
    let B = 0;
    try { B = Bfio(S.I, r); } catch { B = 0; }
    const k = THREE.MathUtils.clamp(B / BREF, 0, 1);
    mesh.material.color.setHSL(0.48 - 0.48 * k, 0.9, 0.35 + 0.25 * k);
    mesh.material.opacity = S.I === 0 ? 0.06 : 0.18 + 0.75 * k;
    mesh.visible = cone.visible = true;
    // sentido: I>0 → anti-horário visto de cima; orientação determinística (sem acumular)
    cone.rotation.order = 'YXZ';
    if (s > 0) { cone.position.set(0, 0, r); cone.rotation.set(Math.PI / 2, 0, -Math.PI / 2); }
    else { cone.position.set(0, 0, -r); cone.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
    if (cone.material !== mesh.material) cone.material = mesh.material;
  }
  arrowI.visible = S.I !== 0;
  if (S.I !== 0) arrowI.setDirection(new THREE.Vector3(0, Math.sign(S.I), 0));
}

// ímã arrastável (N vermelho / S azul)
const ima = new THREE.Group();
const nHalf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xff5b6e, roughness: 0.4 }));
nHalf.position.x = 0.25;
const sHalf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x4da3ff, roughness: 0.4 }));
sHalf.position.x = -0.25;
nHalf.userData.drag = sHalf.userData.drag = true;
nHalf.userData.root = sHalf.userData.root = ima;
ima.add(nHalf, sHalf); ima.position.set(-3, 0.5, 2.5); scene.add(ima);
function tagSprite(txt) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText(txt, 64, 44);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sp.scale.set(1, 0.5, 1); return sp;
}
const sN = tagSprite('N'); sN.position.set(0.25, 0.65, 0); ima.add(sN);
const sS = tagSprite('S'); sS.position.set(-0.25, 0.65, 0); ima.add(sS);

// partícula carregada (esfera pequena, arrastável)
const par = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0xff5b6e, roughness: 0.3 }));
par.userData.drag = true; par.position.set(1.6, 0.5, 1.2); scene.add(par);
const parVel = new THREE.Vector3(1, 0, 0); // direção (módulo vem de S.v)
const aVel = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), par.position, 1, 0xffcf4d, 0.25, 0.15);
scene.add(aVel);
const trailPts = [];
const trailGeo = new THREE.BufferGeometry();
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x5dffb0, transparent: true, opacity: 0.8 }));
scene.add(trail);

// bobina à direita (hélice) + seta de corrente induzida
const coilGrp = new THREE.Group(); coilGrp.position.set(3.2, 1.2, 0); scene.add(coilGrp);
let coilMesh = null;
function buildCoil() {
  if (coilMesh) { coilGrp.remove(coilMesh); coilMesh.geometry.dispose(); }
  const turns = Math.min(14, Math.max(2, Math.round(S.N / 36))); // visual capado
  const pts = [];
  for (let i = 0; i <= turns * 40; i++) {
    const t = i / 40; // voltas
    const a = t * Math.PI * 2;
    pts.push(new THREE.Vector3((t / turns - 0.5) * 1.2, Math.cos(a) * COIL_R, Math.sin(a) * COIL_R));
  }
  coilMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 40, 0.035, 8),
    new THREE.MeshStandardMaterial({ color: 0x38e0c0, metalness: 0.5, roughness: 0.35 })
  );
  coilGrp.add(coilMesh);
}
buildCoil();
// seta circular de corrente induzida em torno da bobina
const indArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(3.2, 2.3, 0), 0.9, 0xffcf4d, 0.25, 0.15);
scene.add(indArrow);

// ---------- campo: fonte única + convenção de sinal ----------
// r MEDIDO: distância radial da partícula ao fio (eixo Y), clamp ≥ 0,1 m.
// B, F e rL usam este r — não há slider de distância.
function rMed() { return Math.max(0.1, Math.hypot(par.position.x, par.position.z)); }
// Convenção didática: o campo do fio é tratado como escalar COM SINAL,
// perpendicular ao plano XZ, i.e. B_vec = (0, B_eff, 0), com:
//   B_eff = sign(I) · Bfio(|I|, r) + Bext
// (FIS.Bfio devolve o módulo μ₀|I|/2πr; o sinal da corrente entra aqui,
//  logo inverter I inverte B_eff e o sentido do giro da partícula.)
function campoEfetivo(r) {
  const Bw = S.I === 0 ? 0 : Math.sign(S.I) * Bfio(Math.abs(S.I), r);
  return { Bw, Beff: Bw + S.Bext };
}
// fluxo atual na bobina (B do ímã na posição da bobina + Bext)
function phiBobina() {
  const dIma = ima.position.distanceTo(coilGrp.position);
  const Bcoil = Bdipolo(dIma) + S.Bext;
  return { Phi: fluxo(Bcoil, COIL_A, S.theta), Bcoil, dIma };
}

// ---------- indução ao vivo: buffers rolantes ----------
const PHI_MAX = 600;   // pontos no buffer rolante
const EPS_WIN = 0.3;   // janela da diferença finita (s)
const phiBuf = [];     // {t, v} — Φ(t) medido a cada quadro
const epsBuf = [];     // {t, v} — ε(t) ao vivo
let lastPhi = null, lastEps = null, lastDPhi = null, lastDt = null, lastSentido = '—';

// registra Φ(t) e calcula ε = −N·ΔΦ/Δt por diferença finita da
// movimentação real do ímã (janela ~0,3 s). Chamado a cada quadro.
function liveEps(nowS) {
  const { Phi } = phiBobina();
  phiBuf.push({ t: nowS, v: Phi });
  if (phiBuf.length > PHI_MAX) phiBuf.splice(0, phiBuf.length - PHI_MAX);
  let eps = 0, dPhi = 0, dt = 0;
  let j = phiBuf.length - 1;
  while (j > 0 && nowS - phiBuf[j - 1].t <= EPS_WIN) j--;
  if (phiBuf.length >= 2 && nowS - phiBuf[j].t > 1e-3) {
    dPhi = Phi - phiBuf[j].v; dt = nowS - phiBuf[j].t;
    try { eps = fem(S.N, dPhi, dt); } catch { eps = 0; }
  }
  lastPhi = Phi; lastDPhi = dPhi; lastDt = dt; lastEps = eps;
  lastSentido = eps > 0 ? 'anti-horário (visto do ímã)' : eps < 0 ? 'horário (visto do ímã)' : '— (Φ constante)';
  if (eps !== 0) indArrow.setDirection(new THREE.Vector3(eps > 0 ? 1 : -1, 0, 0));
  epsBuf.push({ t: nowS, v: eps });
  if (epsBuf.length > PHI_MAX) epsBuf.splice(0, epsBuf.length - PHI_MAX);
}

// ---------- cálculo + UI ----------
function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    const r = rMed();
    const { Bw, Beff } = campoEfetivo(r);
    const Bmag = Math.abs(Beff);
    const q = S.qsign * C.e;
    const F = Fmag(q, S.v, Bmag, S.theta);
    const m = massaPart();
    const rL = Math.abs(q) * S.v > 0 && Bmag > 0 ? (m * S.v) / (Math.abs(q) * Bmag) : Infinity;
    const Ff = Ffio(S.Bext, S.I, 1, 90);
    const { Phi, Bcoil, dIma } = phiBobina();
    // F_vec = q·(v × B), com v_vec = S.v·parVel e B_vec = (0, Beff, 0):
    // v×B = (−vz·Beff, 0, vx·Beff)
    const vv = parVel.clone().normalize().multiplyScalar(S.v);
    const Fx = q * (-vv.z * Beff), Fz = q * (vv.x * Beff);

    $('rMed').textContent = r.toFixed(2) + ' m (medido)';
    $('rB').textContent = fmt(Beff) + ' T';
    $('rF').textContent = fmt(F) + ' N';
    $('rL').textContent = !isFinite(rL) ? '— (B=0 ou v=0)' : fmt(rL) + ' m';
    $('rFfio').textContent = fmt(Ff) + ' N (L=1 m)';
    $('rPhi').textContent = fmt(Phi) + ' Wb';
    if (lastEps == null) { $('rEps').textContent = '— (mova o ímã)'; $('rLenz').textContent = '—'; }
    else { $('rEps').textContent = fmt(lastEps) + ' V (ao vivo)'; $('rLenz').textContent = lastSentido; }

    const sI = S.I === 0 ? 0 : Math.sign(S.I);
    const Bmod = S.I === 0 ? 0 : Bfio(Math.abs(S.I), r);
    $('stepB').textContent = `B didático ⊥ ao plano: B_eff = sign(I)·μ₀|I|/2πr + Bext; B_vec=(0, B_eff, 0)\n  = (${sI})×${fmt(Bmod)} + ${fmt(S.Bext)}\n  = ${fmt(Beff)} T (B fio=${fmt(Bw)} T, r medido=${r.toFixed(2)} m)`;
    $('stepF').textContent = `F_vec = q(v×B): q=${fmt(q)} C, v=(${fmt(vv.x)}, 0, ${fmt(vv.z)}) m/s, B_vec=(0, ${fmt(Beff)}, 0) T\n  → F_vec = (${fmt(Fx)}, 0, ${fmt(Fz)}) N; |F| = |q|vB·senθ = ${fmt(F)} N`;
    try {
      const wPhys = Bmag > 0 ? Math.abs(q) * Bmag / m : 0; // rad/s real
      const slow = wPhys / (2 * Math.PI / T_GYRO_VIS);
      $('stepF').textContent += `\npartícula ${nomePart()}, m = ${fmt(m)} kg; rL = mv/|q|B = ${!isFinite(rL) ? '— (B=0 ou v=0)' : fmt(rL) + ' m'}`;
      $('stepF').textContent += Bmag > 0
        ? `\nTrajetória em câmera lenta ×${fmt(slow)} (1 volta = ${T_GYRO_VIS} s na tela; rL real no painel)`
        : '\nGiro parado (B_eff = 0)';
    } catch { /* mantém */ }
    $('stepPhi').textContent = `Φ = B·A·cosθ, A=π×${COIL_R}²=${fmt(COIL_A)} m², Bbob=${fmt(Bcoil)} T\n  = ${fmt(Phi)} Wb (d ímã-bobina = ${dIma.toFixed(2)} m)`;
    $('stepEps').textContent = lastEps == null
      ? 'ε = −N·ΔΦ/Δt ao vivo (diferença finita, janela ~0,3 s) — arraste o ímã ou use o botão de indução.'
      : `ε = −N·ΔΦ/Δt ao vivo (janela ~0,3 s): −${S.N}×(${fmt(lastDPhi)})/${(lastDt || 0).toFixed(2)} = ${fmt(lastEps)} V → ${lastSentido}`;
    updateRings();
    drawGraph();
    return { B: Beff, F, Phi };
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; return null; }
}

// ---------- gráficos rolantes Φ(t) e ε(t) ----------
function drawRoll(g, buf, color, nome, unidade) {
  const x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  x.strokeStyle = '#22314f'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(0, g.height / 2); x.lineTo(g.width, g.height / 2); x.stroke();
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  x.fillText(nome, 6, 12);
  if (buf.length < 2) { x.fillText('mova o ímã…', 6, g.height / 2 - 6); return; }
  let m = 0;
  for (const p of buf) { const a = Math.abs(p.v); if (a > m) m = a; }
  if (!(m > 0)) m = 1;
  x.beginPath();
  for (let i = 0; i < buf.length; i++) {
    const px = i / (buf.length - 1) * g.width;
    const py = g.height / 2 - (buf[i].v / m) * (g.height / 2 - 14);
    i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.strokeStyle = color; x.lineWidth = 2; x.stroke();
  x.fillStyle = '#93a4cc';
  x.fillText(fmt(buf[buf.length - 1].v) + ' ' + unidade, g.width - 120, 12);
}
function drawGraph() {
  drawRoll($('g'), phiBuf, '#38e0c0', 'Φ(t) rolante', 'Wb');
  const g2 = $('g2');
  if (g2) drawRoll(g2, epsBuf, '#ffcf4d', 'ε(t) rolante (janela ~0,3 s)', 'V');
}

// ---------- controles ----------
function syncLabels() {
  $('oI').textContent = S.I.toFixed(1);
  $('oN').textContent = S.N; $('oV').textContent = (S.v / 1e6).toFixed(2);
  $('oT').textContent = S.theta; $('oB').textContent = (S.Bext * 1e3).toFixed(1);
  $('lFio').textContent = `I = ${S.I.toFixed(1)} A`;
  $('lBob').textContent = `N = ${S.N}`;
}
$('sI').oninput = (e) => { S.I = +e.target.value; syncLabels(); calc(); };
$('sN').oninput = (e) => { S.N = +e.target.value; buildCoil(); syncLabels(); calc(); };
$('sV').oninput = (e) => { S.v = +e.target.value * 1e6; if (S.v <= 0 && parVel.lengthSq() < 1e-12) parVel.set(1, 0, 0); syncLabels(); calc(); };
$('sT').oninput = (e) => { S.theta = +e.target.value; syncLabels(); calc(); };
$('sB').oninput = (e) => { S.Bext = +e.target.value * 1e-3; syncLabels(); calc(); };
$('selQ').onchange = (e) => {
  S.qsign = +e.target.value;
  par.material.color.set(S.qsign > 0 ? 0xff5b6e : 0x4da3ff);
  $('lPar').textContent = S.qsign > 0 ? 'próton' : 'elétron';
  calc();
};
$('bInv').onclick = () => { S.I *= -1; $('sI').value = S.I; syncLabels(); calc(); toast('Corrente invertida — anéis e giro trocam de sentido'); };
$('bZero').onclick = () => { S.I = 0; $('sI').value = 0; syncLabels(); calc(); };
$('bPresetFio').onclick = () => {
  S.I = 5; $('sI').value = 5;
  par.position.set(0.5, 0.5, 0); parVel.set(1, 0, 0); trailPts.length = 0;
  syncLabels(); calc(); toast('Preset: I=5 A, partícula a r=0,5 m → B=2 µT');
};
$('bPresetInd').onclick = () => {
  S.N = 200; S.Bext = 1e-3; S.theta = 0; $('sN').value = 200; $('sB').value = 1; $('sT').value = 0;
  ima.position.set(-1.2, 0.5, 0); phiBuf.length = 0; epsBuf.length = 0;
  buildCoil(); syncLabels(); calc(); toast('Preset indução: θ=0°, N=200');
};
$('bSave').onclick = () => { store.save('eletromagnetismo', { ...S, ima: ima.position.toArray() }); toast('Salvo (Modo Livre consegue carregar)'); };

// ---------- indução guiada (preset de movimento; ε medido ao vivo) ----------
let inducing = false;
$('bInd').onclick = async () => {
  if (inducing) return; inducing = true;
  const z0 = 2.5, z1 = 0.9, dt = 1.2; // m, m, s (ida)
  const moveTo = (z) => { ima.position.z = z; calc(); };
  // ida: aproxima (o buffer ao vivo mede ΔΦ/Δt durante o movimento)
  const t0 = performance.now();
  await new Promise((res) => {
    (function step() {
      const k = Math.min(1, (performance.now() - t0) / (dt * 1000));
      moveTo(z0 + (z1 - z0) * k);
      k < 1 ? requestAnimationFrame(step) : res();
    })();
  });
  calc(); toast(`Indução (ida): ΔΦ=${fmt(lastDPhi)} Wb, ε=${fmt(lastEps)} V`);
  // volta: afasta (sinal oposto → Lenz visível)
  const t1 = performance.now();
  await new Promise((res) => {
    (function step() {
      const k = Math.min(1, (performance.now() - t1) / (dt * 1000));
      moveTo(z1 + (z0 - z1) * k);
      k < 1 ? requestAnimationFrame(step) : res();
    })();
  });
  calc(); toast(`Indução (volta): ΔΦ=${fmt(lastDPhi)} Wb, ε=${fmt(lastEps)} V`);
  inducing = false;
};

// ---------- arrastar ímã / partícula ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null;
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
function rootOf(o) { return o.userData.root || (o.userData.drag ? o : null); }
renderer.domElement.addEventListener('pointerdown', (e) => {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const hit = ray.intersectObjects([nHalf, sHalf, par]);
  if (hit.length) { drag = rootOf(hit[0].object); ctl.enabled = false; }
});
addEventListener('pointerup', () => { drag = null; ctl.enabled = true; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const p = new THREE.Vector3();
  ray.ray.intersectPlane(plane, p);
  p.x = THREE.MathUtils.clamp(p.x, -6, 6); p.z = THREE.MathUtils.clamp(p.z, -5, 5);
  if (drag === ima) { ima.position.x = p.x; ima.position.z = p.z; }
  else if (drag === par) { par.position.x = p.x; par.position.z = p.z; trailPts.length = 0; }
  calc();
});

// ---------- loop: particula sob v×B em CAMERA LENTA didatica ----------
// Fisica real: w=|q|B/m com rL de metros (w ~1e5 rad/s p/ próton em 1 mT).
// A 60 fps isso gera aliasing: a seta de velocidade gira varias voltas por
// quadro ("girando sem sentido"). Solucao padrao de sims didaticos:
// desacelerar o giro p/ 1 volta a cada T_GYRO_VIS s, preservando o SENTIDO
// fisico — sign(q)·sign(B_eff)·senθ, logo inverter I inverte o giro —
// e exibindo o fator de camera lenta.
const T_GYRO_VIS = 5; // s por volta na tela
let running = true;
$('bPlay').onclick = () => {
  running = !running;
  $('bPlay').innerHTML = running
    ? '<i data-lucide="pause" class="ic"></i> Pausar'
    : '<i data-lucide="play" class="ic"></i> Executar';
  if (window.lucide) lucide.createIcons();
};
function resetPar() {
  par.position.set(1.6, 0.5, 1.2); parVel.set(1, 0, 0); trailPts.length = 0;
  trailGeo.setFromPoints(trailPts); calc();
}
$('bResetPar').onclick = resetPar;
let prev = performance.now(), lastPanel = 0;
(function loop() {
  requestAnimationFrame(loop); ctl.update();
  const now = performance.now();
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  const nowS = now / 1000;
  if (running && S.v > 0) {
    // B na posição da partícula: fio (r medido no XZ) com sinal de I + externo
    const { Beff } = campoEfetivo(rMed());
    const th = S.theta * Math.PI / 180;
    const wVis = Math.sign(S.qsign) * (Beff >= 0 ? 1 : -1) * Math.sin(th) * 2 * Math.PI / T_GYRO_VIS;
    const turn = wVis * dt; // ≤ ~0.02 rad/quadro: suave e estavel
    const c = Math.cos(turn), s = Math.sin(turn);
    const vx = parVel.x * c - parVel.z * s, vz = parVel.x * s + parVel.z * c;
    if (vx * vx + vz * vz > 1e-12) parVel.set(vx, 0, vz).normalize();
    const step = (0.5 + Math.min(2, S.v / 1e6)) * dt;
    par.position.addScaledVector(parVel, step);
    if (Math.abs(par.position.x) > 7 || Math.abs(par.position.z) > 6) {
      par.position.set(1.6, 0.5, 1.2); trailPts.length = 0;
    }
    trailPts.push(par.position.clone());
    if (trailPts.length > 120) trailPts.shift();
    trailGeo.setFromPoints(trailPts);
    aVel.position.copy(par.position);
    if (parVel.lengthSq() > 1e-12) aVel.setDirection(parVel.clone().normalize());
    aVel.setLength(0.5 + Math.min(1.5, S.v / 1e6));
  }
  liveEps(nowS); // Φ(t) em buffer + ε ao vivo por diferença finita
  drawGraph();   // Φ(t) e ε(t) rolantes
  if (nowS - lastPanel > 0.15) { lastPanel = nowS; calc(); } // painel a ~7 Hz
  renderer.render(scene, cam);
})();

syncLabels(); calc();
