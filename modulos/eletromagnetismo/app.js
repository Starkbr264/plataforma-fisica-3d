


const { C, Bfio, Fmag, Ffio, fluxo, fem, fmt, store } = window.FIS;

katex.render("B = \\dfrac{\\mu_0 I}{2\\pi r}", document.getElementById('kB'));
katex.render("F = |q|\\,v\\,B\\,\\sin\\theta", document.getElementById('kF'));
katex.render("\\Phi = B\\,A\\,\\cos\\theta", document.getElementById('kPhi'));
katex.render("\\varepsilon = -N\\,\\dfrac{\\Delta\\Phi}{\\Delta t}", document.getElementById('kEps'));

// ---------- estado ----------
const S = { I: 5, r: 0.5, N: 100, v: 1e6, theta: 90, Bext: 1e-3, qsign: 1 };
const MP = 1.67262192369e-27;          // massa próton (kg)
const COIL_R = 0.6;                    // raio da bobina (m)
const COIL_A = Math.PI * COIL_R * COIL_R;
const DIP_M = 0.05;                    // momento dipolo didático (A·m²) — fixo
const $ = (id) => document.getElementById(id);
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }

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

// ---------- cálculo + UI ----------
let lastPhi = null, lastEps = null, lastDPhi = null, lastDt = null, lastSentido = '—';

function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    const B = Bfio(S.I, S.r);
    const q = S.qsign * C.e;
    const F = Fmag(q, S.v, B + S.Bext, S.theta);
    const Btot = B + S.Bext;
    const rL = Math.abs(q) * S.v > 0 && Btot > 0 ? (MP * S.v) / (Math.abs(q) * Btot) : Infinity;
    const Ff = Ffio(S.Bext, S.I, 1, 90);
    // fluxo na bobina: B do ímã na posição da bobina + Bext, θ = slider
    const dIma = ima.position.distanceTo(coilGrp.position);
    const Bcoil = Bdipolo(dIma) + S.Bext;
    const Phi = fluxo(Bcoil, COIL_A, S.theta);

    $('rB').textContent = fmt(B) + ' T';
    $('rF').textContent = fmt(F) + ' N';
    $('rL').textContent = !isFinite(rL) ? '— (B=0 ou v=0)' : fmt(rL) + ' m';
    $('rFfio').textContent = fmt(Ff) + ' N (L=1 m)';
    $('rPhi').textContent = fmt(Phi) + ' Wb';
    if (lastEps == null) { $('rEps').textContent = '— (aperte Indução)'; $('rLenz').textContent = '—'; }
    else { $('rEps').textContent = fmt(lastEps) + ' V'; $('rLenz').textContent = lastSentido; }

    const mu = fmt(C.mu0);
    $('stepB').textContent = `B = μ₀|I|/2πr = (${mu})×${fmt(Math.abs(S.I))}/(2π×${S.r.toFixed(2)})\n  = ${fmt(B)} T`;
    $('stepF').textContent = `F = |q|vB·senθ = (${fmt(Math.abs(q))})(${fmt(S.v)})(${fmt(Btot)})·sen${S.theta}°\n  = ${fmt(F)} N`;
    try {
      const dp = Math.max(0.1, Math.hypot(par.position.x, par.position.z));
      const Btp = Bfio(S.I, dp) + S.Bext;
      const wPhys = Math.abs(q) * Btp / MP; // rad/s real
      const slow = wPhys / (2 * Math.PI / T_GYRO_VIS);
      $('stepF').textContent += `\nTrajetória em câmera lenta ×${fmt(slow)} (1 volta = ${T_GYRO_VIS} s na tela; rL real no painel)`;
    } catch { /* mantém */ }
    $('stepPhi').textContent = `Φ = B·A·cosθ, A=π×${COIL_R}²=${fmt(COIL_A)} m², Bbob=${fmt(Bcoil)} T\n  = ${fmt(Phi)} Wb (d ímã-bobina = ${dIma.toFixed(2)} m)`;
    $('stepEps').textContent = lastEps == null
      ? 'ε = −N·ΔΦ/Δt — execute a animação de indução p/ medir ΔΦ/Δt.'
      : `ε = −${S.N}×(${fmt(lastDPhi)})/${lastDt.toFixed(2)} = ${fmt(lastEps)} V → ${lastSentido}`;
    updateRings();
    drawGraph();
    return { B, F, Phi };
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; return null; }
}

function drawGraph() {
  const g = $('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  const rMax = 3, rMin = 0.1;
  let fMax = 1e-12;
  try { fMax = Bfio(S.I || 0.001, rMin); } catch { /* mantém */ }
  x.beginPath();
  for (let px = 0; px <= g.width; px += 3) {
    const r = rMin + (rMax - rMin) * px / g.width;
    let f = 0; try { f = Bfio(Math.abs(S.I), r); } catch { f = 0; }
    const py = g.height - 12 - (f / fMax) * (g.height - 30);
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.strokeStyle = '#38e0c0'; x.lineWidth = 2; x.stroke();
  let Bn = 0; try { Bn = Bfio(S.I, S.r); } catch { Bn = 0; }
  const px = (S.r - rMin) / (rMax - rMin) * g.width;
  const py = g.height - 12 - ((Bn || 0) / fMax) * (g.height - 30);
  x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill();
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  x.fillText('0,1 m', 4, g.height - 1); x.fillText('3 m', g.width - 24, g.height - 1);
}

// ---------- controles ----------
function syncLabels() {
  $('oI').textContent = S.I.toFixed(1); $('oR').textContent = S.r.toFixed(2);
  $('oN').textContent = S.N; $('oV').textContent = (S.v / 1e6).toFixed(2);
  $('oT').textContent = S.theta; $('oB').textContent = (S.Bext * 1e3).toFixed(1);
  $('lFio').textContent = `I = ${S.I.toFixed(1)} A`;
  $('lBob').textContent = `N = ${S.N}`;
}
$('sI').oninput = (e) => { S.I = +e.target.value; syncLabels(); calc(); };
$('sR').oninput = (e) => { S.r = +e.target.value; syncLabels(); calc(); };
$('sN').oninput = (e) => { S.N = +e.target.value; lastEps = null; buildCoil(); syncLabels(); calc(); };
$('sV').oninput = (e) => { S.v = +e.target.value * 1e6; if (S.v <= 0 && parVel.lengthSq() < 1e-12) parVel.set(1, 0, 0); syncLabels(); calc(); };
$('sT').oninput = (e) => { S.theta = +e.target.value; syncLabels(); calc(); };
$('sB').oninput = (e) => { S.Bext = +e.target.value * 1e-3; syncLabels(); calc(); };
$('selQ').onchange = (e) => { S.qsign = +e.target.value; par.material.color.set(S.qsign > 0 ? 0xff5b6e : 0x4da3ff); calc(); };
$('bInv').onclick = () => { S.I *= -1; $('sI').value = S.I; syncLabels(); calc(); toast('Corrente invertida — anéis trocam de sentido'); };
$('bZero').onclick = () => { S.I = 0; $('sI').value = 0; syncLabels(); calc(); };
$('bPresetFio').onclick = () => {
  S.I = 5; S.r = 0.1; $('sI').value = 5; $('sR').value = 0.1;
  syncLabels(); calc(); toast('Preset: I=5 A, r=0,1 m → B=10 µT');
};
$('bPresetInd').onclick = () => {
  S.N = 200; S.Bext = 1e-3; S.theta = 0; $('sN').value = 200; $('sB').value = 1; $('sT').value = 0;
  ima.position.set(-1.2, 0.5, 0); buildCoil(); syncLabels(); calc(); toast('Preset indução: θ=0°, N=200');
};
$('bSave').onclick = () => { store.save('eletromagnetismo', { ...S, ima: ima.position.toArray() }); toast('Salvo (Modo Livre consegue carregar)'); };

// ---------- indução: anima ímã, mede ΔΦ/Δt ----------
let inducing = false;
$('bInd').onclick = async () => {
  if (inducing) return; inducing = true;
  const z0 = 2.5, z1 = 0.9, dt = 1.2; // m, m, s (ida)
  const BcoilOf = (z) => {
    ima.position.z = z;
    const d = ima.position.distanceTo(coilGrp.position);
    return Bdipolo(d) + S.Bext;
  };
  // ida: aproxima
  const Phi0 = fluxo(BcoilOf(z0), COIL_A, S.theta);
  const t0 = performance.now();
  await new Promise((res) => {
    (function step() {
      const k = Math.min(1, (performance.now() - t0) / (dt * 1000));
      BcoilOf(z0 + (z1 - z0) * k); calc();
      k < 1 ? requestAnimationFrame(step) : res();
    })();
  });
  const Phi1 = fluxo(BcoilOf(z1), COIL_A, S.theta);
  const dPhi = Phi1 - Phi0;
  const eps = fem(S.N, dPhi, dt);
  lastPhi = Phi1; lastDPhi = dPhi; lastDt = dt; lastEps = eps;
  lastSentido = eps > 0 ? 'anti-horário (visto do ímã)' : eps < 0 ? 'horário (visto do ímã)' : 'nula';
  indArrow.setDirection(new THREE.Vector3(eps >= 0 ? 1 : -1, 0, 0));
  indArrow.setColor(new THREE.Color(0xffcf4d));
  calc(); toast(`Indução: ΔΦ=${fmt(dPhi)} Wb, ε=${fmt(eps)} V`);
  // volta: afasta (sinal oposto → Lenz visível)
  const t1 = performance.now();
  await new Promise((res) => {
    (function step() {
      const k = Math.min(1, (performance.now() - t1) / (dt * 1000));
      BcoilOf(z1 + (z0 - z1) * k); calc();
      k < 1 ? requestAnimationFrame(step) : res();
    })();
  });
  const Phi2 = fluxo(BcoilOf(z0), COIL_A, S.theta);
  lastDPhi = Phi2 - Phi1; lastEps = fem(S.N, lastDPhi, dt); lastPhi = Phi2;
  lastSentido = lastEps > 0 ? 'anti-horário (visto do ímã)' : 'horário (visto do ímã)';
  indArrow.setDirection(new THREE.Vector3(lastEps >= 0 ? 1 : -1, 0, 0));
  calc(); inducing = false;
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
  if (drag === ima) { ima.position.x = p.x; ima.position.z = p.z; lastEps = null; }
  else if (drag === par) { par.position.x = p.x; par.position.z = p.z; trailPts.length = 0; }
  calc();
});

// ---------- loop: particula sob v×B em CAMERA LENTA didatica ----------
// Fisica real: w=|q|B/m (~1e5 rad/s p/ proton em 1 mT) com rL de metros.
// A 60 fps isso gera aliasing: a seta de velocidade gira varias voltas por
// quadro ("girando sem sentido"). Solucao padrao de sims didaticos:
// desacelerar o giro p/ 1 volta a cada T_GYRO_VIS s, preservando o SENTIDO
// fisico (sinal de q, de B e sen θ) e exibindo o fator de camera lenta.
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
let prev = performance.now();
(function loop() {
  requestAnimationFrame(loop); ctl.update();
  const now = performance.now();
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  if (running && S.v > 0) {
    // B na posição da partícula: fio (dist. radial no XZ) + externo
    const dist = Math.max(0.1, Math.hypot(par.position.x, par.position.z));
    let B = 0; try { B = Bfio(S.I, dist); } catch { B = 0; }
    const Bt = B + S.Bext;
    const th = S.theta * Math.PI / 180;
    const wVis = Math.sign(S.qsign) * (Bt >= 0 ? 1 : -1) * Math.sin(th) * 2 * Math.PI / T_GYRO_VIS;
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
  renderer.render(scene, cam);
})();

syncLabels(); calc();
