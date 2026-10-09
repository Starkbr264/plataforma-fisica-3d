

const { C, fotonE, fotonF, fotoeletrico, deBroglie, bohrEn, decaimento, meiavida, fmt, store } = window.FIS;

katex.render("E = h f", document.getElementById('kFoto1'));
katex.render("K_{max} = h f - \\phi,\\quad f_0 = \\phi/h", document.getElementById('kFoto2'));
katex.render("E_n = -13{,}6/n^2\\ \\mathrm{eV}", document.getElementById('kBohr'));
katex.render("\\lambda = h/p", document.getElementById('kDeb'));
katex.render("N = N_0 e^{-\\lambda t},\\quad T_{1/2} = \\ln 2/\\lambda", document.getElementById('kDec'));

// --- estado ---
const N0 = 48;
const S = { f: 1e15, phi: 2.3, ni: 2, nf: 1, lam: 0.05, t: 20, gmode: 'foto' };
const $ = (id) => document.getElementById(id);
const sF = $('sF'), sPhi = $('sPhi'), sNi = $('sNi'), sNf = $('sNf'), sLam = $('sLam'), sT = $('sT');
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }

// --- cena ---
const cv = $('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(devicePixelRatio);
function size() { renderer.setSize(innerWidth, innerHeight); }
size(); addEventListener('resize', size);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
cam.position.set(0, 4.6, 10.5);
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
ctl.target.set(0, 1, 0);
scene.add(new THREE.GridHelper(18, 18, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, .75));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

// fonte de luz (esquerda)
const src = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.2, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x5a2fd6, emissiveIntensity: .8 }));
src.position.set(-4.6, 1.4, 0); scene.add(src);
// placa metálica
const plate = new THREE.Mesh(new THREE.BoxGeometry(.25, 2.2, 2.4),
  new THREE.MeshStandardMaterial({ color: 0x9aa7bd, metalness: .85, roughness: .3 }));
plate.position.set(-2.4, 1.4, 0); scene.add(plate);

// átomo de Bohr (centro-direita)
const atomG = new THREE.Group(); atomG.position.set(0.6, 1.5, 0); scene.add(atomG);
const nucleus = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0xff5b6e, emissive: 0x550000, emissiveIntensity: .4 }));
atomG.add(nucleus);
const ringR = [0.6, 1.0, 1.45];
const rings = ringR.map((r, i) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, .02, 8, 64),
    new THREE.MeshBasicMaterial({ color: [0x4da3ff, 0x5dffb0, 0xffcf4d][i] }));
  m.rotation.x = Math.PI / 2; atomG.add(m); return m;
});
const eBohr = new THREE.Mesh(new THREE.SphereGeometry(.11, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xaa8800, emissiveIntensity: .7 }));
atomG.add(eBohr);
// flash do fóton emitido/absorvido na transição
const flash = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xc77dff }));
flash.visible = false; atomG.add(flash);

// bloco radioativo (direita)
const radioG = new THREE.Group(); radioG.position.set(4.1, 0, 0); scene.add(radioG);
const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, .25, 2.2),
  new THREE.MeshStandardMaterial({ color: 0x2c3a55 }));
base.position.y = .35; radioG.add(base);
const pellets = [];
{
  const geo = new THREE.SphereGeometry(.13, 12, 12);
  let k = 0;
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 6; iz++) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x52ff7a, emissive: 0x0a5a1e, emissiveIntensity: .6 }));
    m.position.set(-.9 + ix * .26, .6 + (k % 2) * .02, -.65 + iz * .26);
    radioG.add(m); pellets.push(m); k++;
  }
}

// fótons (feixe fonte -> placa) e elétrons (placa -> +x)
function freqColor(f) {
  const u = (Math.log10(f) - 13) / (Math.log10(3e15) - 13); // 0..1
  const c = new THREE.Color().setHSL(0.02 + u * 0.72, 1, .6); // vermelho -> roxo
  return c;
}
const PH = 22, EL = 40;
const photons = [], electrons = [];
{
  const g = new THREE.SphereGeometry(.09, 12, 12);
  for (let i = 0; i < PH; i++) {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xb78cff }));
    m.userData.x = -4.3 + (i / PH) * 1.9; scene.add(m); photons.push(m);
  }
  const ge = new THREE.SphereGeometry(.08, 12, 12);
  for (let i = 0; i < EL; i++) {
    const m = new THREE.Mesh(ge, new THREE.MeshBasicMaterial({ color: 0x4da3ff }));
    m.userData = { x: -2.2, z: 0, live: false, v: 1 }; m.visible = false; scene.add(m); electrons.push(m);
  }
}
let elCursor = 0, spawnAcc = 0;
const EV = C.e, ME = 9.1093837015e-31;

// animação da transição de Bohr
let trans = null; // {t0, dur, from, to}
$('bTrans').onclick = () => {
  if (S.ni === S.nf) { toast('Escolha nf diferente de nᵢ'); return; }
  trans = { t0: performance.now() / 1000, dur: 1.2, from: ringR[S.ni - 1], to: ringR[S.nf - 1], absorb: S.nf > S.ni };
  toast(S.nf > S.ni ? 'Absorção: elétron sobe de nível' : 'Emissão: elétron desce e irradia fóton');
};

// --- cálculo (tudo via FIS) ---
function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    const E = fotonE(S.f);                       // J
    const lam = C.c / S.f;                       // m
    const f0 = (S.phi * EV) / C.h;
    const r = fotoeletrico(S.f, S.phi);          // {E, phi, Kmax, emite}
    const Kmax = r.Kmax;
    // de Broglie do elétron ejetado: p = sqrt(2 m K)
    let debTxt = '— (sem emissão)', debStep = 'sem Kmax não há elétron ejetado.';
    if (r.emite) {
      const v = Math.sqrt(2 * Kmax / ME);
      const lb = deBroglie(ME, v);
      debTxt = fmt(lb) + ' m';
      debStep = `p=√(2mK)=${fmt(Math.sqrt(2 * ME * Kmax))} kg·m/s → λ=h/p=${fmt(lb)} m`;
    }
    // Bohr
    const Eni = bohrEn(S.ni), Enf = bohrEn(S.nf);
    const dE = Math.abs(Enf - Eni);              // J
    const lamBohr = dE > 0 ? C.h * C.c / dE : Infinity;
    // decaimento
    const N = decaimento(N0, S.lam, S.t);
    const T12 = meiavida(S.lam);

    // textos
    $('rLambda').textContent = fmt(lam) + ' m (' + fmt(lam * 1e9) + ' nm)';
    $('rE').textContent = fmt(E) + ' J (' + fmt(E / EV) + ' eV)';
    $('rF0').textContent = fmt(f0) + ' Hz';
    $('rK').textContent = fmt(Kmax / EV) + ' eV · ' + (r.emite ? 'EMITE +' : 'sem emissão (hf<φ)');
    $('rK').style.color = r.emite ? '#5dffb0' : '#ff8f9d';
    $('rDeb').textContent = debTxt;
    $('rBohr').textContent = S.ni === S.nf
      ? 'mesmo nível (ΔE=0)'
      : fmt(dE / EV) + ' eV · λ=' + fmt(lamBohr * 1e9) + ' nm ' + (S.nf < S.ni ? '(emissão)' : '(absorção)');
    $('rN').textContent = fmt(N, 4) + ' / ' + N0 + ' → ' + Math.round(N) + ' pastilhas';
    $('rT12').textContent = fmt(T12) + ' s';
    $('stepE').textContent = `E=hf=${fmt(C.h)}×${fmt(S.f)}=${fmt(E)} J (${fmt(E / EV)} eV); λ=c/f=${fmt(lam * 1e9)} nm`;
    $('stepK').textContent = `Kmax=hf−φ=${fmt(E / EV)}−${S.phi.toFixed(1)}=${fmt(Kmax / EV)} eV → ${r.emite ? 'emite' : 'NÃO emite'}; f₀=φ/h=${fmt(f0)} Hz`;
    $('stepBohr').textContent = S.ni === S.nf
      ? 'ΔE=0 — sem transição.'
      : `ΔE=|Enf−Eni|=13.6|1/${S.nf}²−1/${S.ni}²|=${fmt(dE / EV)} eV; λ=hc/ΔE=${fmt(lamBohr * 1e9)} nm`;
    $('stepDeb').textContent = debStep;
    $('stepDec').textContent = `N=${N0}·e^(−${S.lam}×${S.t})=${fmt(N, 4)}; T½=ln2/λ=${fmt(T12)} s`;
    $('lMetal').textContent = 'φ = ' + S.phi.toFixed(1) + ' eV';
    $('lBohr').textContent = 'n = ' + (trans ? `${S.ni}→${S.nf}` : S.ni);
    $('lRadio').textContent = Math.round(N) + ' / ' + N0 + ' núcleos';
    $('oF').textContent = fmt(S.f) + ' Hz';
    $('oPhi').textContent = S.phi.toFixed(1);
    $('oNi').textContent = S.ni; $('oNf').textContent = S.nf;
    $('oLam').textContent = S.lam.toFixed(3); $('oT').textContent = S.t.toFixed(0);

    // pastilhas visíveis ∝ N
    const vis = Math.round(N);
    pellets.forEach((p, i) => {
      p.visible = i < vis;
      p.material.emissiveIntensity = .4 + .3 * Math.sin(performance.now() / 400 + i);
    });
    drawGraph({ f0, N });
    return { E, lam, f0, Kmax, emite: r.emite, dE, lamBohr, N, T12 };
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; return null; }
}

function drawGraph(info) {
  const g = $('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif'; x.strokeStyle = '#223';
  if (S.gmode === 'foto') {
    $('gTitle').textContent = 'Gráfico I × f — limiar f₀ (sem emissão abaixo de f₀)';
    const fMin = 1e13, fMax = 3e15;
    const kMax = Math.max(1e-22, C.h * fMax - S.phi * EV);
    x.beginPath();
    for (let px = 0; px <= g.width; px += 3) {
      const f = fMin + (fMax - fMin) * px / g.width;
      const rr = fotoeletrico(f, S.phi);
      const py = g.height - 14 - (rr.Kmax / kMax) * (g.height - 32);
      px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.strokeStyle = '#b78cff'; x.lineWidth = 2; x.stroke();
    const px0 = (info.f0 - fMin) / (fMax - fMin) * g.width;
    if (px0 >= 0 && px0 <= g.width) {
      x.strokeStyle = '#ff5b6e'; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(px0, 6); x.lineTo(px0, g.height - 10); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#ff8f9d'; x.fillText('f₀=' + fmt(info.f0) + ' Hz', Math.min(px0 + 5, g.width - 120), 14);
    }
    const px = (S.f - fMin) / (fMax - fMin) * g.width;
    x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, g.height - 14 - (info.Kmax / kMax) * (g.height - 32), 5, 0, 7); x.fill();
    x.fillStyle = '#93a4cc'; x.fillText('10¹³ Hz', 4, g.height - 1); x.fillText('3×10¹⁵ Hz', g.width - 70, g.height - 1);
  } else {
    $('gTitle').textContent = 'Gráfico N × t — decaimento exponencial (T½ marcada)';
    const tMax = 200;
    x.beginPath();
    for (let px = 0; px <= g.width; px += 3) {
      const t = tMax * px / g.width;
      const n = decaimento(N0, S.lam, t);
      const py = g.height - 14 - (n / N0) * (g.height - 32);
      px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.strokeStyle = '#52ff7a'; x.lineWidth = 2; x.stroke();
    const T12 = meiavida(S.lam);
    if (T12 <= tMax) {
      const pxh = T12 / tMax * g.width;
      x.strokeStyle = '#ffcf4d'; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(pxh, 6); x.lineTo(pxh, g.height - 10); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#ffcf4d'; x.fillText('T½=' + fmt(T12) + ' s', Math.min(pxh + 5, g.width - 90), 14);
    }
    const px = S.t / tMax * g.width;
    x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, g.height - 14 - (info.N / N0) * (g.height - 32), 5, 0, 7); x.fill();
    x.fillStyle = '#93a4cc'; x.fillText('0 s', 4, g.height - 1); x.fillText('200 s', g.width - 40, g.height - 1);
  }
}

// --- UI ---
sF.oninput = () => { S.f = Math.pow(10, +sF.value); calc(); };
sPhi.oninput = () => { S.phi = +sPhi.value; calc(); };
sNi.oninput = () => { S.ni = +sNi.value; calc(); };
sNf.oninput = () => { S.nf = +sNf.value; calc(); };
sLam.oninput = () => { S.lam = +sLam.value; calc(); };
sT.oninput = () => { S.t = +sT.value; calc(); };
$('bFoto').onclick = () => { S.gmode = 'foto'; calc(); };
$('bDec').onclick = () => { S.gmode = 'decaimento'; calc(); };
$('bNa').onclick = () => { S.phi = 2.3; S.f = 1e15; sPhi.value = 2.3; sF.value = 15; calc(); toast('Na: emite, K≈1.8 eV'); };
$('bZn').onclick = () => { S.phi = 4.3; sPhi.value = 4.3; calc(); toast('Zn φ=4.3 eV: emissão cortada'); };
$('bLyman').onclick = () => { S.ni = 2; S.nf = 1; sNi.value = 2; sNf.value = 1; calc(); $('bTrans').click(); };
$('bBalmer').onclick = () => { S.ni = 2; S.nf = 3; sNi.value = 2; sNf.value = 3; calc(); $('bTrans').click(); };
$('bResetT').onclick = () => { S.t = 0; sT.value = 0; calc(); toast('Tempo zerado: N=N₀'); };
$('bSave').onclick = () => { store.save('fisica-moderna', S); toast('Salvo (Modo Livre consegue carregar)'); };

// --- loop ---
let last = performance.now() / 1000, bohrAng = 0;
(function loop() {
  requestAnimationFrame(loop); ctl.update();
  const now = performance.now() / 1000, dt = Math.min(.05, now - last); last = now;
  const st = calc._last || (calc._last = calc());
  const cur = calc(); // recalcula barato; mantém cena sincronizada
  const info = cur || st; calc._last = info;
  const col = freqColor(S.f);

  // fótons: fonte -> placa
  for (const p of photons) {
    p.material.color.copy(col);
    p.position.set(p.userData.x, 1.4 + Math.sin(now * 6 + p.userData.x * 4) * .35, Math.cos(now * 5 + p.userData.x * 6) * .8);
    p.userData.x += dt * 1.6;
    if (p.userData.x > -2.5) p.userData.x = -4.3;
    const s = .7 + (Math.log10(S.f) - 13) / 2.5; p.scale.setScalar(s);
  }
  // elétrons: taxa ∝ Kmax, velocidade ∝ √Kmax
  spawnAcc += info && info.emite ? dt * (2 + info.Kmax / EV * 8) : 0;
  while (spawnAcc >= 1) {
    spawnAcc -= 1;
    const e = electrons[elCursor++ % electrons.length];
    e.visible = true; e.userData.live = true;
    e.userData.x = -2.2; e.userData.z = (Math.random() - .5) * 1.6;
    e.userData.v = 1 + Math.sqrt(info.Kmax / EV) * 1.5;
    e.position.set(-2.2, 1.4, e.userData.z);
  }
  for (const e of electrons) {
    if (!e.userData.live) continue;
    e.userData.x += dt * e.userData.v;
    e.position.set(e.userData.x, 1.4 + Math.sin(now * 8 + e.userData.z * 5) * .12, e.userData.z);
    if (e.userData.x > 3 || !(info && info.emite)) { e.userData.live = false; e.visible = false; }
  }
  if (!(info && info.emite)) for (const e of electrons) { e.userData.live = false; e.visible = false; }

  // Bohr: elétron orbita no nível atual (ou interpola durante transição)
  bohrAng += dt * 2.2;
  let rNow = ringR[S.ni - 1];
  if (trans) {
    const u = Math.min(1, (now - trans.t0) / trans.dur);
    rNow = trans.from + (trans.to - trans.from) * u;
    flash.visible = true;
    flash.position.set(Math.cos(-bohrAng) * (rNow + .35), 0, Math.sin(-bohrAng) * (rNow + .35));
    flash.material.color.copy(freqColor(C.h * C.c / Math.max(1e-9, info ? info.lamBohr : 5e-7)));
    if (u >= 1) { S.ni = S.nf; sNi.value = S.ni; trans = null; flash.visible = false; calc(); }
  }
  eBohr.position.set(Math.cos(bohrAng) * rNow, 0, Math.sin(bohrAng) * rNow);
  rings.forEach((rg, i) => { rg.material.opacity = 1; });
  atomG.rotation.y = Math.sin(now * .2) * .3;

  // brilho da fonte ∝ f
  src.material.emissiveIntensity = .5 + (Math.log10(S.f) - 13) / 2.5;

  renderer.render(scene, cam);
})();
calc();
