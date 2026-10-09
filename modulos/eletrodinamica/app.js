

const { ohm, serie, paralelo, pot, potRI, capQ, capE, fmt, store } = window.FIS;

katex.render("U = R I,\\quad I = \\dfrac{U}{R_{eq}}", document.getElementById('kOhm'));
katex.render("R_{s\\acute{e}rie} = R_1+R_2,\\quad \\dfrac{1}{R_{par}} = \\dfrac{1}{R_1}+\\dfrac{1}{R_2}", document.getElementById('kReq'));
katex.render("P = U I = R I^2", document.getElementById('kPot'));
katex.render("Q = C U,\\quad E = \\dfrac{CU^2}{2},\\quad Q(t) = CU\\left(1-e^{-t/RC}\\right)", document.getElementById('kCap'));

// --- cena ---
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(devicePixelRatio);
function size() { renderer.setSize(innerWidth, innerHeight); }
size(); addEventListener('resize', size);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
cam.position.set(0, 5.2, 9.5);
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
ctl.target.set(0, 0.6, 0);
scene.add(new THREE.GridHelper(16, 16, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, .65));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

// bancada
const bench = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 6),
  new THREE.MeshStandardMaterial({ color: 0x1b2740, roughness: .8 }));
bench.position.y = -.15; scene.add(bench);

// retângulo do circuito (fios): caminho fechado no plano y=.55
const P = { x: 3.2, z: 2.0, y: .55 };
function loopPoints(n) {
  const pts = [];
  const corners = [
    new THREE.Vector3(-P.x, P.y, -P.z), new THREE.Vector3(P.x, P.y, -P.z),
    new THREE.Vector3(P.x, P.y, P.z), new THREE.Vector3(-P.x, P.y, P.z),
  ];
  const per = 4, seg = Math.floor(n / per);
  for (let s = 0; s < per; s++) {
    const a = corners[s], b = corners[(s + 1) % per];
    for (let i = 0; i < seg; i++) pts.push(a.clone().lerp(b, i / seg));
  }
  return pts;
}
const wireMat = new THREE.LineBasicMaterial({ color: 0x8fa3c7 });
const wireGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-P.x, P.y, -P.z), new THREE.Vector3(P.x, P.y, -P.z),
  new THREE.Vector3(P.x, P.y, P.z), new THREE.Vector3(-P.x, P.y, P.z),
  new THREE.Vector3(-P.x, P.y, -P.z),
]);
scene.add(new THREE.Line(wireGeo, wireMat));

// bateria (lado esquerdo, box com terminais +/−)
const bat = new THREE.Group();
const batBody = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.0, .9),
  new THREE.MeshStandardMaterial({ color: 0x2fbf71, roughness: .4 }));
batBody.position.y = .5; bat.add(batBody);
const termM = (c) => new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .3, 14),
  new THREE.MeshStandardMaterial({ color: c, metalness: .7, roughness: .3 }));
const tPlus = termM(0xff5b6e), tMinus = termM(0x9fb4d8);
tPlus.position.set(0, 1.15, -.2); tMinus.position.set(0, 1.15, .2); bat.add(tPlus, tMinus);
bat.position.set(-P.x, P.y - .05, 0); scene.add(bat);

// resistores: cilindros no ramo superior com faixas de cor
function resistor(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 1.1, 20),
    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: .5 }));
  body.rotation.z = Math.PI / 2; g.add(body);
  for (let i = -1; i <= 1; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.225, .225, .09, 20),
      new THREE.MeshStandardMaterial({ color, roughness: .4 }));
    band.rotation.z = Math.PI / 2; band.position.x = i * .28; g.add(band);
  }
  scene.add(g);
  return g;
}
const r1m = resistor(0xff5b6e), r2m = resistor(0x4da3ff);
r1m.position.set(-1.1, P.y, -P.z); r2m.position.set(1.1, P.y, -P.z);

// lâmpada: esfera emissiva no ramo direito (brilho ∝ P total)
const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffc93c, emissiveIntensity: 1, roughness: .3 });
const lamp = new THREE.Mesh(new THREE.SphereGeometry(.42, 28, 28), lampMat);
lamp.position.set(P.x, P.y + .1, 0); scene.add(lamp);
const lampLight = new THREE.PointLight(0xffc93c, 2, 9); lampLight.position.copy(lamp.position); scene.add(lampLight);
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .35, 16),
  new THREE.MeshStandardMaterial({ color: 0x555f77, metalness: .6, roughness: .4 }));
lampBase.position.set(P.x, P.y - .35, 0); scene.add(lampBase);

// interruptor: base + alavanca que gira (aberta/fechada) no ramo inferior
const swBase = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .3),
  new THREE.MeshStandardMaterial({ color: 0x39456a, roughness: .5 }));
swBase.position.set(0, P.y, P.z); scene.add(swBase);
const lever = new THREE.Mesh(new THREE.BoxGeometry(.85, .08, .12),
  new THREE.MeshStandardMaterial({ color: 0xffcf4d, roughness: .4 }));
lever.geometry.translate(.42, 0, 0); // pivô na ponta esquerda
lever.position.set(-.4, P.y + .1, P.z); scene.add(lever);

// capacitor: dois cilindros paralelos no ramo inferior esquerdo
const capGrp = new THREE.Group();
const plateM = new THREE.MeshStandardMaterial({ color: 0x9fb4d8, metalness: .7, roughness: .3 });
const pl1 = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .08, 20), plateM);
const pl2 = pl1.clone();
pl1.position.x = -.18; pl2.position.x = .18;
pl1.rotation.z = pl2.rotation.z = Math.PI / 2;
capGrp.add(pl1, pl2);
const capCharge = new THREE.Mesh(new THREE.BoxGeometry(.36, .5, .5),
  new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0 }));
capGrp.add(capCharge);
capGrp.position.set(-1.9, P.y, P.z); scene.add(capGrp);

// partículas de corrente (sentido convencional + → −)
const N = 90;
const path = loopPoints(N);
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(N * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: 0xffd94d, size: .14, transparent: true, opacity: .95 });
const pts = new THREE.Points(pGeo, pMat); scene.add(pts);
let phase = 0;

// --- estado ---
const S = { U: 12, R1: 100, R2: 100, modo: 'serie', on: true, C: 1000e-6, t: 0 };
const $ = (id) => document.getElementById(id);
const sU = $('sU'), sR1 = $('sR1'), sR2 = $('sR2'), sC = $('sC'), cSw = $('cSw');

function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }

function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    if (!(S.R1 > 0) || !(S.R2 > 0)) throw new Error('R₁ e R₂ devem ser > 0 (sem curto).');
    if (Math.min(S.R1, S.R2) < 1) throw new Error('Curto-circuito: R ≈ 0 Ω. Aumente a resistência.');
    const Req = S.modo === 'serie' ? serie([S.R1, S.R2]) : paralelo([S.R1, S.R2]);
    const { I } = S.on ? ohm(S.U, Req) : { I: 0 };
    const Ptot = S.on ? pot(S.U, I) : 0;
    let P1, P2;
    if (!S.on) { P1 = P2 = 0; }
    else if (S.modo === 'serie') { P1 = potRI(S.R1, I); P2 = potRI(S.R2, I); }
    else { P1 = S.U * S.U / S.R1; P2 = S.U * S.U / S.R2; }
    const Q = S.on ? capQ(S.C, S.U) : 0;
    const E = S.on ? capE(S.C, S.U) : 0;
    const brilho = Ptot <= 0 ? 0 : Math.min(1, Ptot / 50); // 50 W = brilho máximo didático

    $('rReq').textContent = fmt(Req) + ' Ω';
    $('rI').textContent = fmt(I) + ' A';
    $('rP').textContent = fmt(Ptot) + ' W';
    $('rP12').textContent = `${fmt(P1)} / ${fmt(P2)} W`;
    $('rBr').textContent = (brilho * 100).toFixed(0) + ' %';
    $('rQ').textContent = fmt(Q) + ' C';
    $('rE').textContent = fmt(E) + ' J';
    $('stepOhm').textContent = S.on
      ? `I = U/Req = ${fmt(S.U)} / ${fmt(Req)} = ${fmt(I)} A`
      : 'Chave aberta → circuito interrompido → I = 0 A.';
    $('stepReq').textContent = S.modo === 'serie'
      ? `Req = R₁+R₂ = ${fmt(S.R1)}+${fmt(S.R2)} = ${fmt(Req)} Ω`
      : `1/Req = 1/${fmt(S.R1)}+1/${fmt(S.R2)} → Req = ${fmt(Req)} Ω`;
    $('stepPot').textContent = `P = U·I = ${fmt(S.U)}×${fmt(I)} = ${fmt(Ptot)} W · P₁=R₁I₁²=${fmt(P1)} W · P₂=${fmt(P2)} W`;
    $('stepCap').textContent = `Q = C·U = ${fmt(S.C)}×${fmt(S.U)} = ${fmt(Q)} C · E = CU²/2 = ${fmt(E)} J · τ = R·C = ${fmt(Req * S.C)} s`;

    // 3D: brilho da lâmpada ∝ P
    lampMat.emissiveIntensity = .05 + brilho * 3;
    lampLight.intensity = brilho * 8;
    capCharge.material.opacity = S.on ? .05 + .35 * Math.min(1, S.t / (5 * Req * S.C + 1e-9)) : 0;
    drawGraph(Req);
    return { Req, I, Ptot };
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; return null; }
}

function drawGraph(Req) {
  const g = $('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  const Qmax = capQ(S.C, S.U), tau = Math.max(Req * S.C, 1e-9), tMax = 5 * tau;
  x.strokeStyle = '#223'; x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  x.beginPath();
  for (let px = 0; px <= g.width; px += 3) {
    const t = tMax * px / g.width;
    const q = Qmax * (1 - Math.exp(-t / tau));
    const py = g.height - 14 - (Qmax > 0 ? q / Qmax : 0) * (g.height - 30);
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.strokeStyle = '#4da3ff'; x.lineWidth = 2; x.stroke();
  // ponto "agora" = S.t (reinicia a cada 5τ)
  const tt = tMax > 0 ? (S.t % (tMax + 1e-9)) : 0;
  const q = Qmax * (1 - Math.exp(-tt / tau));
  const px = tMax > 0 ? tt / tMax * g.width : 0;
  const py = g.height - 14 - (Qmax > 0 ? q / Qmax : 0) * (g.height - 30);
  x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill();
  x.fillStyle = '#93a4cc';
  x.fillText('t=0', 4, g.height - 1);
  x.fillText(`5τ=${fmt(tMax)}s`, g.width - 70, g.height - 1);
  x.fillText(`Qmáx=${fmt(Qmax)}C`, 4, 12);
}

function syncUI() {
  $('oU').textContent = S.U; $('oR1').textContent = S.R1; $('oR2').textContent = S.R2;
  $('oC').textContent = Math.round(S.C * 1e6); $('oModo').textContent = S.modo;
  $('lBat').textContent = fmt(S.U) + ' V';
  $('lR1').textContent = fmt(S.R1) + ' Ω'; $('lR2').textContent = fmt(S.R2) + ' Ω';
  $('lSw').textContent = S.on ? 'fechada' : 'aberta';
  $('lCap').textContent = Math.round(S.C * 1e6) + ' µF';
  lever.rotation.z = S.on ? 0 : .5;
  calc();
}
sU.oninput = () => { S.U = +sU.value; syncUI(); };
sR1.oninput = () => { S.R1 = +sR1.value; syncUI(); };
sR2.oninput = () => { S.R2 = +sR2.value; syncUI(); };
sC.oninput = () => { S.C = +sC.value * 1e-6; S.t = 0; syncUI(); };
cSw.onchange = (e) => { S.on = e.target.checked; S.t = 0; syncUI(); toast(S.on ? 'Chave fechada: corrente ligada' : 'Chave aberta: I = 0'); };
$('bModoS').onclick = () => { S.modo = 'serie'; syncUI(); };
$('bModoP').onclick = () => { S.modo = 'paralelo'; syncUI(); };
$('bSerie').onclick = () => { S.modo = 'serie'; S.U = 12; S.R1 = 4; S.R2 = 4; sU.value = 12; sR1.value = 4; sR2.value = 4; syncUI(); toast('Preset série: 12 V, 4 Ω + 4 Ω → I = 1,5 A'); };
$('bPar').onclick = () => { S.modo = 'paralelo'; S.U = 12; S.R1 = 100; S.R2 = 100; sU.value = 12; sR1.value = 100; sR2.value = 100; syncUI(); toast('Preset paralelo: 12 V, 100 Ω ∥ 100 Ω → Req = 50 Ω'); };
$('bResetC').onclick = () => { S.t = 0; syncUI(); toast('Capacitor descarregado (t = 0)'); };
$('bSave').onclick = () => { store.save('eletrodinamica', S); toast('Salvo (Modo Livre consegue carregar)'); };

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop); ctl.update();
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const res = calc();
  const I = res ? res.I : 0;
  if (S.on && I > 0) { S.t += dt; phase = (phase + dt * (0.3 + I * 1.2)) % 1; }
  // move partículas ao longo do caminho; paradas se chave aberta
  const pos = pGeo.attributes.position.array;
  for (let i = 0; i < N; i++) {
    const f = (i / N + (S.on ? phase : 0)) % 1;
    const idx = Math.floor(f * N) % N;
    const p = path[idx];
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y + .12; pos[i * 3 + 2] = p.z;
  }
  pGeo.attributes.position.needsUpdate = true;
  pMat.opacity = S.on && I > 0 ? .95 : .15;
  renderer.render(scene, cam);
})(last);
syncUI();
