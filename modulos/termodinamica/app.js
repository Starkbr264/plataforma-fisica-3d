

const { C, gas, Umono, Wisobarico, rendimento, carnot, adiabT, adiabP, fmt, store } = window.FIS;
const GAMMA = 5 / 3; // gás ideal monoatômico (hipótese documentada no passo a passo)

if (typeof katex !== 'undefined') {
  katex.render("P V = n R T", document.getElementById('kPV'));
  katex.render("\\Delta U = Q - W,\\quad Q = \\Delta U + W", document.getElementById('kLei'));
  katex.render("W = \\int P\\,dV,\\quad W_{isob} = P\\Delta V", document.getElementById('kW'));
  katex.render("U = \\dfrac{3}{2}nRT", document.getElementById('kU'));
}

// ---------- cena ----------
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
function size() { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); }
addEventListener('resize', size);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
cam.position.set(0.5, 4.4, 9.2);
size();
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
scene.add(new THREE.GridHelper(16, 16, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, .7));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

// cilindro horizontal ao longo de X
const X0 = -2.2, LMAX = 4.4, R = 1.0;
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x8ec9ff, transparent: true, opacity: .16, roughness: .1, metalness: 0, side: THREE.DoubleSide });
const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, LMAX, 40, 1, true), glassMat);
tube.rotation.z = Math.PI / 2; tube.position.set(X0 + LMAX / 2, 1.4, 0); scene.add(tube);
const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .12, 40), new THREE.MeshStandardMaterial({ color: 0x33415e, roughness: .6 }));
base.rotation.z = Math.PI / 2; base.position.set(X0 - .06, 1.4, 0); scene.add(base);
// queimador / resfriador sob o cilindro
const burner = new THREE.Mesh(new THREE.BoxGeometry(3.2, .3, 1.6), new THREE.MeshStandardMaterial({ color: 0x555f7a, roughness: .5, emissive: 0xff6a00, emissiveIntensity: .25 }));
burner.position.set(X0 + LMAX / 2, .15, 0); scene.add(burner);
const flame = new THREE.Mesh(new THREE.ConeGeometry(.9, .8, 20), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .55 }));
flame.position.set(X0 + LMAX / 2, .6, 0); scene.add(flame);
const heatLight = new THREE.PointLight(0xff8a2a, 6, 8); heatLight.position.set(X0 + LMAX / 2, .9, 1.2); scene.add(heatLight);
// pistão arrastável
const piston = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, .28, 40),
  new THREE.MeshStandardMaterial({ color: 0xffcf4d, roughness: .35, metalness: .4 }));
piston.rotation.z = Math.PI / 2; piston.userData.drag = true; scene.add(piston);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0x9aa7c7 }));
rod.rotation.z = Math.PI / 2; scene.add(rod);

// partículas (N~120 pontos)
const N = 120;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(N * 3), pCol = new Float32Array(N * 3);
const pVel = new Float32Array(N * 3);
function rndDir(i) {
  const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
  pVel[i * 3] = Math.sin(ph) * Math.cos(th); pVel[i * 3 + 1] = Math.cos(ph) * .7; pVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th);
}
for (let i = 0; i < N; i++) { rndDir(i); }
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .09, vertexColors: true, transparent: true, opacity: .95 }));
scene.add(pts);
const cold = new THREE.Color(0x4da3ff), hot = new THREE.Color(0xff5b6e), tmpC = new THREE.Color();

// ---------- estado ----------
const L2V = (len) => 0.5 + (len / LMAX) * 3.5;          // L
const V2L = (vL) => (vL - 0.5) / 3.5 * LMAX;            // comprimento
const S = { mode: 'isobarico', n: 1, Tset: 300, V_L: 2.0, Plock: null, Vlock: null, W: 0, U0: null, prevV: null, prevP: null, hist: [], Tmax: null, Tmin: null, T0ad: null, V0ad: null, C0: null };
const $ = (id) => document.getElementById(id);
const sN = $('sN'), sT = $('sT'), sV = $('sV'), sel = $('selModo');
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }
function pistonX() { return X0 + V2L(S.V_L); }

function resolve() {
  const Vm3 = S.V_L * 1e-3;
  if (S.mode === 'isobarico') return gas({ P: S.Plock, V: Vm3, n: S.n, T: null });
  if (S.mode === 'isocorico') return gas({ P: null, V: S.Vlock * 1e-3, n: S.n, T: S.Tset });
  if (S.mode === 'adiabatico') {
    // Hipótese: gás ideal monoatômico, γ = 5/3, transformação quase-estática
    // reversível (sem troca de calor). C0 = T0·V0^(γ−1) travada na entrada do modo.
    const T = adiabT(S.T0ad, S.V0ad * 1e-3, Vm3, GAMMA);
    return gas({ P: null, V: Vm3, n: S.n, T });
  }
  return gas({ P: null, V: Vm3, n: S.n, T: S.Tset }); // isotermico e livre
}

function classify(dV, dT, W, Q) {
  const names = { isotermico: 'ISOTÉRMICA (T const)', isobarico: 'ISOBÁRICA (P const)', isocorico: 'ISOCÓRICA (V const)', adiabatico: 'ADIABÁTICA (Q=0, γ=5/3)', livre: 'LIVRE' };
  let tags = [names[S.mode]];
  if (S.mode !== 'isocorico') tags.push(dV > 1e-12 ? 'expansão (W>0)' : dV < -1e-12 ? 'compressão (W<0)' : 'V parado');
  if (S.mode !== 'isotermico') tags.push(dT > 1e-9 ? 'aquecido' : dT < -1e-9 ? 'resfriado' : '');
  if (Math.abs(Q) > 1e-9) tags.push(Q > 0 ? 'recebe calor' : 'cede calor');
  return tags.filter(Boolean).join(' · ');
}

function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    if (!(S.n > 0)) throw new Error('n deve ser > 0');
    if (!(S.Tset > 0)) throw new Error('T deve ser > 0 K');
    if (!(S.V_L > 0)) throw new Error('V deve ser > 0');
    const st = resolve();
    const { P, V, n, T } = st;
    const U = Umono(n, T);
    if (S.U0 == null) { S.U0 = U; S.prevV = V; S.prevP = P; }
    const dV = V - S.prevV;
    if (dV !== 0) {
      S.W += (P + S.prevP) / 2 * dV; // trapézio ≈ ∫P dV
      S.prevV = V; S.prevP = P;
      S.hist.push({ V, P });
      if (S.hist.length > 400) S.hist.shift();
    } else { S.prevP = P; }
    if (!S.hist.length) S.hist.push({ V, P });
    const dU = U - S.U0, Q = dU + S.W; // 1ª lei, W pelo gás
    // Faixa de T do ciclo (p/ η Carnot): inicia em T atual, reseta no botão de reset
    if (S.Tmax == null || S.Tmin == null) { S.Tmax = T; S.Tmin = T; }
    else { S.Tmax = Math.max(S.Tmax, T); S.Tmin = Math.min(S.Tmin, T); }
    // UI
    $('rP').textContent = fmt(P) + ' Pa';
    $('rV').textContent = fmt(V * 1e3) + ' L (' + fmt(V) + ' m³)';
    $('rN').textContent = fmt(n) + ' mol';
    $('rT').textContent = fmt(T) + ' K';
    $('rU').textContent = fmt(U) + ' J';
    $('rW').textContent = fmt(S.W) + ' J';
    $('rQ').textContent = fmt(Q) + ' J';
    // η do ciclo (atual: W/Qq) × η Carnot (limite: 1−Tc/Th da faixa observada)
    let etaTxt = '— (Qq ≤ 0)';
    try { etaTxt = fmt(rendimento(Math.max(S.W, 0), Math.max(Q, 1e-12))); }
    catch { etaTxt = '— (Qq ≤ 0)'; }
    $('rEta').textContent = etaTxt;
    $('rCarnot').textContent = (S.Tmax > S.Tmin)
      ? fmt(carnot(S.Tmax, S.Tmin)) + ` (Th=${fmt(S.Tmax)} K, Tc=${fmt(S.Tmin)} K)`
      : '— (sem ciclo)';
    $('rClasse').textContent = classify(dV, T - (S._lastT ?? T), S.W, Q);
    S._lastT = T;
    const wIso = Wisobarico(P, dV);
    $('stepPV').textContent = `P = nRT/V = (${fmt(n)}·${C.R}·${fmt(T)})/${fmt(V)}\n  = ${fmt(P)} Pa`;
    $('stepLei').textContent = `ΔU = U−U₀ = ${fmt(U)}−${fmt(S.U0)} = ${fmt(dU)} J\nQ = ΔU+W = ${fmt(dU)}+${fmt(S.W)} = ${fmt(Q)} J`;
    $('stepW').textContent = S.mode === 'isobarico'
      ? `W = PΔV, passo atual P·ΔV = ${fmt(P)}·${fmt(dV)} = ${fmt(wIso)} J · acumulado ${fmt(S.W)} J\nη do ciclo = W/Qq = ${etaTxt} · η Carnot (faixa Th=${fmt(S.Tmax)}K/Tc=${fmt(S.Tmin)}K) = ${$('rCarnot').textContent}`
      : S.mode === 'adiabatico'
      ? `Adiabática reversível, Q=0, gás monoatômico γ=5/3 · C0=T0·V0^(γ−1)=${fmt(S.C0)} K·m³^${fmt(GAMMA - 1)}\nT = C0/V^(γ−1) = ${fmt(T)} K · W acumulado ${fmt(S.W)} J (W = −ΔU, Q=0)\nη do ciclo = W/Qq = ${etaTxt} · η Carnot (faixa Th=${fmt(S.Tmax)}K/Tc=${fmt(S.Tmin)}K) = ${$('rCarnot').textContent}`
      : `W = ∫P dV (trapézio a cada passo) · acumulado ${fmt(S.W)} J\nη do ciclo = W/Qq = ${etaTxt} · η Carnot (faixa Th=${fmt(S.Tmax)}K/Tc=${fmt(S.Tmin)}K) = ${$('rCarnot').textContent}`;
    const modoTxt = { isotermico: 'isotérmico', isobarico: 'isobárico', isocorico: 'isocórico', adiabatico: 'adiabático', livre: 'livre' }[S.mode];
    $('lModo').textContent = modoTxt;
    $('lVol').textContent = (S.mode === 'isocorico' ? S.Vlock : S.V_L).toFixed(2) + ' L';
    $('hud').textContent = `Gás ideal monoatômico · quase-estático · modo ${modoTxt} · P=${fmt(P)} Pa V=${fmt(V * 1e3)} L T=${fmt(T)} K`;
    drawGraph(P, V, T);
    return st;
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; return null; }
}

function drawGraph(Pnow, Vnow, Tnow) {
  const g = $('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  const H = S.hist.length ? S.hist : [{ V: Vnow, P: Pnow }];
  let vMin = Math.min(...H.map(p => p.V), Vnow) * 1e3, vMax = Math.max(...H.map(p => p.V), Vnow) * 1e3;
  let pMax = Math.max(...H.map(p => p.P), Pnow);
  if (vMax - vMin < 1e-9) { vMin -= .1; vMax += .1; }
  if (pMax < 1e-9) pMax = 1;
  const pad = { l: 52, r: 10, t: 10, b: 20 };
  const X = (vL) => pad.l + (vL - vMin) / (vMax - vMin) * (g.width - pad.l - pad.r);
  const Y = (p) => g.height - pad.b - (p / (pMax * 1.08)) * (g.height - pad.t - pad.b);
  // --- curvas de referência: adiabática atual (P·V^γ = const) + isotérmica (T = T atual) ---
  const Tref = Tnow ?? null;
  try {
    const Vref = Vnow, Pref = Pnow;
    // adiabática por P = Pref·(Vref/V)^γ
    x.beginPath();
    for (let px = pad.l; px <= g.width - pad.r; px += 3) {
      const vL = vMin + (px - pad.l) / (g.width - pad.l - pad.r) * (vMax - vMin);
      const p = adiabP(Pref, Vref, vL * 1e-3, GAMMA);
      const py = Y(Math.min(p, pMax * 1.08));
      px === pad.l ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.strokeStyle = '#5dffb0'; x.lineWidth = 1.5; x.stroke();
    // isotérmica de referência P = nRT/V (tracejada)
    if (Tref) {
      x.beginPath(); x.setLineDash([5, 4]);
      for (let px = pad.l; px <= g.width - pad.r; px += 3) {
        const vL = vMin + (px - pad.l) / (g.width - pad.l - pad.r) * (vMax - vMin);
        const p = S.n * C.R * Tref / (vL * 1e-3);
        const py = Y(Math.min(p, pMax * 1.08));
        px === pad.l ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.strokeStyle = '#93a4cc'; x.lineWidth = 1.2; x.stroke(); x.setLineDash([]);
    }
    x.fillStyle = '#5dffb0'; x.font = '11px sans-serif';
    x.fillText('— adiabática', pad.l + 4, 14);
    x.fillStyle = '#93a4cc'; x.fillText('- - isotérmica (T atual)', pad.l + 92, 14);
  } catch { /* referência é auxiliar; nunca quebra o gráfico */ }
  // área hachurada = W
  x.beginPath();
  H.forEach((p, i) => { const px = X(p.V * 1e3), py = Y(p.P); i === 0 ? x.moveTo(px, py) : x.lineTo(px, py); });
  x.lineTo(X(H[H.length - 1].V * 1e3), Y(0)); x.closePath();
  x.fillStyle = 'rgba(77,163,255,.15)'; x.fill();
  x.save(); x.clip();
  x.strokeStyle = 'rgba(255,207,77,.5)'; x.lineWidth = 1;
  for (let d = -g.height; d < g.width + g.height; d += 9) { x.beginPath(); x.moveTo(d, 0); x.lineTo(d + g.height, g.height); x.stroke(); }
  x.restore();
  // curva
  x.beginPath();
  H.forEach((p, i) => { const px = X(p.V * 1e3), py = Y(p.P); i === 0 ? x.moveTo(px, py) : x.lineTo(px, py); });
  x.strokeStyle = '#4da3ff'; x.lineWidth = 2; x.stroke();
  // ponto atual
  x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(X(Vnow * 1e3), Y(Pnow), 5, 0, 7); x.fill();
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  x.fillText(fmt(pMax * 1.08) + ' Pa', 4, 12);
  x.fillText(vMin.toFixed(2) + ' L', pad.l, g.height - 5);
  x.fillText(vMax.toFixed(2) + ' L', g.width - 56, g.height - 5);
  x.fillText('V →', g.width / 2 - 8, g.height - 5);
}

function syncUI() {
  $('oN').textContent = S.n.toFixed(2);
  $('oT').textContent = S.Tset.toFixed(0);
  $('oV').textContent = (S.mode === 'isocorico' ? S.Vlock : S.V_L).toFixed(2);
  sN.value = S.n; sT.value = S.Tset; sV.value = S.V_L;
  sT.disabled = (S.mode === 'isobarico' || S.mode === 'adiabatico');       // T resolvida
  sV.disabled = (S.mode === 'isocorico');       // V travada
  calc();
}

// eventos
function resetAccumulators(reason) {
  S.W = 0; S.U0 = null; S.hist = []; S.Tmax = null; S.Tmin = null;
  if (reason) toast(reason);
}
sN.oninput = () => { S.n = +sN.value; resetAccumulators('n alterado: nova configuração inicial — W/Q zerados'); syncUI(); };
sT.oninput = () => { S.Tset = +sT.value; syncUI(); };
sV.oninput = () => { S.V_L = +sV.value; syncUI(); };
function setMode(m, silent) {
  const cur = calc() || resolve();
  S.mode = m; sel.value = m;
  if (m === 'isobarico') S.Plock = cur ? cur.P : S.n * C.R * S.Tset / (S.V_L * 1e-3);
  if (m === 'isocorico') S.Vlock = S.V_L;
  if (m === 'adiabatico' && cur) {
    S.T0ad = cur.T; S.V0ad = cur.V * 1e3;
    S.C0 = S.T0ad * Math.pow(S.V0ad * 1e-3, GAMMA - 1);
  }
  if (!silent) toast('Modo: ' + m);
  syncUI();
}
sel.onchange = () => setMode(sel.value, true);
$('bIsoT').onclick = () => setMode('isotermico');
$('bIsoP').onclick = () => setMode('isobarico');
$('bIsoV').onclick = () => setMode('isocorico');
$('bIsoA').onclick = () => setMode('adiabatico');
$('bAquecer').onclick = () => {
  if (S.mode === 'isobarico' || S.mode === 'adiabatico') { toast(S.mode === 'adiabatico' ? 'No modo adiabático T é resolvida (Q=0) — troque de modo p/ aquecer' : 'No modo isobárico T é resolvida — troque de modo p/ aquecer'); return; }
  S.Tset = Math.min(800, S.Tset + 20); syncUI();
};
$('bResfriar').onclick = () => {
  if (S.mode === 'isobarico' || S.mode === 'adiabatico') { toast(S.mode === 'adiabatico' ? 'No modo adiabático T é resolvida (Q=0) — troque de modo p/ resfriar' : 'No modo isobárico T é resolvida — troque de modo p/ resfriar'); return; }
  S.Tset = Math.max(200, S.Tset - 20); syncUI();
};
$('bReset').onclick = () => { const st = resolve(); S.W = 0; S.U0 = Umono(st.n, st.T); S.hist = [{ V: st.V, P: st.P }]; S.prevV = st.V; S.prevP = st.P; S.Tmax = st.T; S.Tmin = st.T; calc(); toast('W/Q resetados'); };
$('bSave').onclick = () => { store.save('termodinamica', { mode: S.mode, n: S.n, Tset: S.Tset, V_L: S.V_L }); toast('Salvo (Modo Livre consegue carregar)'); };

// arrastar pistão ao longo de X
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null;
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function pick(e) {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  return ray.intersectObject(piston).length ? piston : null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { drag = pick(e); if (drag) ctl.enabled = false; });
addEventListener('pointerup', () => { drag = null; ctl.enabled = true; });
addEventListener('pointermove', (e) => {
  if (!drag || S.mode === 'isocorico') return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const p = new THREE.Vector3();
  ray.ray.intersectPlane(plane, p);
  const len = THREE.MathUtils.clamp(p.x - X0, V2L(0.5), V2L(4));
  S.V_L = Math.round(L2V(len) * 100) / 100;
  syncUI();
});

// laço: física das partículas + visual
const clock = new THREE.Clock();
function seedParticles() {
  const px = pistonX();
  for (let i = 0; i < N; i++) {
    pPos[i * 3] = X0 + .15 + Math.random() * Math.max(.2, px - X0 - .4);
    const a = Math.random() * Math.PI * 2, rr = Math.random() * .8;
    pPos[i * 3 + 1] = 1.4 + Math.cos(a) * rr; pPos[i * 3 + 2] = Math.sin(a) * rr;
  }
}
seedParticles();
(function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05);
  const st = resolveSafe();
  const T = st ? st.T : S.Tset;
  const speed = 1.4 * Math.sqrt(T / 300);
  const px = pistonX();
  piston.position.set(px + .14, 1.4, 0);
  rod.position.set(px + 1.3, 1.4, 0);
  const tNorm = THREE.MathUtils.clamp((T - 200) / 600, 0, 1);
  tmpC.copy(cold).lerp(hot, tNorm);
  for (let i = 0; i < N; i++) {
    let ix = i * 3;
    pPos[ix] += pVel[ix] * speed * dt; pPos[ix + 1] += pVel[ix + 1] * speed * dt; pPos[ix + 2] += pVel[ix + 2] * speed * dt;
    const xMin = X0 + .12, xMax = px - .18;
    if (pPos[ix] < xMin) { pPos[ix] = xMin; pVel[ix] *= -1; }
    if (pPos[ix] > xMax) { pPos[ix] = xMax; pVel[ix] *= -1; if (xMax < xMin) pPos[ix] = xMin; }
    const dy = pPos[ix + 1] - 1.4, dz = pPos[ix + 2], rr = Math.hypot(dy, dz);
    if (rr > .85) { const s = .85 / rr; pPos[ix + 1] = 1.4 + dy * s; pPos[ix + 2] = dz * s; pVel[ix + 1] *= -1; pVel[ix + 2] *= -1; }
    pCol[ix] = tmpC.r; pCol[ix + 1] = tmpC.g; pCol[ix + 2] = tmpC.b;
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  burner.material.emissive.copy(tmpC).multiplyScalar(.35);
  flame.material.opacity = .25 + tNorm * .5; flame.scale.setScalar(.7 + tNorm * .7);
  heatLight.color.copy(tmpC); heatLight.intensity = 2 + tNorm * 8;
  ctl.update();
  renderer.render(scene, cam);
})();
function resolveSafe() { try { return resolve(); } catch { return null; } }

// estado inicial: trava P do default p/ isobárico e valida
S.Plock = S.n * C.R * S.Tset / (S.V_L * 1e-3);
syncUI();
