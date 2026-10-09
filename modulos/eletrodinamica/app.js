

const { ohm, serie, paralelo, pot, potRI, capQ, capE, fmt, store } = window.FIS;

katex.render("U = R I,\\quad I = \\dfrac{U}{R_{eq}}", document.getElementById('kOhm'));
katex.render("R_{s\\acute{e}rie} = R_1+R_2,\\quad \\dfrac{1}{R_{par}} = \\dfrac{1}{R_1}+\\dfrac{1}{R_2}", document.getElementById('kReq'));
katex.render("P = U I = R I^2", document.getElementById('kPot'));
katex.render("V_C(t),\\quad Q = C V_C,\\quad E = \\dfrac{CV_C^2}{2},\\quad I_C = \\dfrac{U-V_C}{R_{eq}}", document.getElementById('kCap'));

// --- cena (igual antes: bancada, bateria, resistores, lâmpada, chave, capacitor) ---
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
cam.position.set(0, 5.2, 9.5);
function size() { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); }
size(); addEventListener('resize', size);
const ctl = new THREE.OrbitControls(cam, renderer.domElement);
ctl.enableDamping = true;
ctl.target.set(0, 0.6, 0);
scene.add(new THREE.GridHelper(16, 16, 0x2a3c66, 0x16223c));
scene.add(new THREE.AmbientLight(0xffffff, .65));
const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);

const bench = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 6),
  new THREE.MeshStandardMaterial({ color: 0x1b2740, roughness: .8 }));
bench.position.y = -.15; scene.add(bench);
const P = { x: 3.2, z: 2.0, y: .55 };

const bat = new THREE.Group();
const batBody = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.0, .9),
  new THREE.MeshStandardMaterial({ color: 0x2fbf71, roughness: .4 }));
batBody.position.y = .5; bat.add(batBody);
const termM = (c) => new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .3, 14),
  new THREE.MeshStandardMaterial({ color: c, metalness: .7, roughness: .3 }));
const tPlus = termM(0xff5b6e), tMinus = termM(0x9fb4d8);
tPlus.position.set(0, 1.15, -.2); tMinus.position.set(0, 1.15, .2); bat.add(tPlus, tMinus);
bat.position.set(-P.x, P.y - .05, 0); scene.add(bat);

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

const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffc93c, emissiveIntensity: 1, roughness: .3 });
const lamp = new THREE.Mesh(new THREE.SphereGeometry(.42, 28, 28), lampMat);
lamp.position.set(P.x, P.y + .1, 0); scene.add(lamp);
const lampLight = new THREE.PointLight(0xffc93c, 2, 9); lampLight.position.copy(lamp.position); scene.add(lampLight);
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .35, 16),
  new THREE.MeshStandardMaterial({ color: 0x555f77, metalness: .6, roughness: .4 }));
lampBase.position.set(P.x, P.y - .35, 0); scene.add(lampBase);

const swBase = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .3),
  new THREE.MeshStandardMaterial({ color: 0x39456a, roughness: .5 }));
swBase.position.set(0, P.y, P.z); scene.add(swBase);
const lever = new THREE.Mesh(new THREE.BoxGeometry(.85, .08, .12),
  new THREE.MeshStandardMaterial({ color: 0xffcf4d, roughness: .4 }));
lever.geometry.translate(.42, 0, 0);
lever.position.set(-.4, P.y + .1, P.z); scene.add(lever);

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
scene.updateMatrixWorld(true);

// ---------- terminais e fios (construtor etapa 1) ----------
const TERMS = {
  BP: tPlus.getWorldPosition(new THREE.Vector3()),
  BN: tMinus.getWorldPosition(new THREE.Vector3()),
  R1a: new THREE.Vector3(-1.65, P.y, -P.z), R1b: new THREE.Vector3(-.55, P.y, -P.z),
  R2a: new THREE.Vector3(.55, P.y, -P.z), R2b: new THREE.Vector3(1.65, P.y, -P.z),
  SWa: new THREE.Vector3(-.4, P.y, P.z), SWb: new THREE.Vector3(.45, P.y, P.z),
};
Object.values(TERMS).forEach(v => v.y += .3);
const COMP_EDGES = [
  { a: 'R1a', b: 'R1b', kind: 'R', id: 'R1' },
  { a: 'R2a', b: 'R2b', kind: 'R', id: 'R2' },
  { a: 'SWa', b: 'SWb', kind: 'SW' },
];
const termMeshes = {};
{
  const g = new THREE.SphereGeometry(.11, 14, 14);
  for (const [k, v] of Object.entries(TERMS)) {
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color: k === 'BP' ? 0xff5b6e : k === 'BN' ? 0x9fb4d8 : 0xffcf4d,
      emissive: 0x000000, roughness: .4,
    }));
    m.position.copy(v); m.userData.term = k; scene.add(m); termMeshes[k] = m;
  }
}
const wireGrp = new THREE.Group(); scene.add(wireGrp);
const wireMat = new THREE.LineBasicMaterial({ color: 0xffd94d });
function redrawWires() {
  while (wireGrp.children.length) { const l = wireGrp.children.pop(); l.geometry.dispose(); }
  for (const [a, b] of S.wires) {
    const pa = TERMS[a], pb = TERMS[b];
    const mid = pa.clone().lerp(pb, .5); mid.y += .25 + pa.distanceTo(pb) * .06;
    wireGrp.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([pa, mid, pb]), wireMat));
  }
  const used = new Set(S.wires.flat());
  for (const [k, m] of Object.entries(termMeshes)) {
    m.material.emissive.set(k === pendingTerm ? 0xffffff : used.has(k) ? 0x226622 : 0x000000);
    m.material.emissiveIntensity = k === pendingTerm ? .9 : .7;
  }
}

// ---------- estado ----------
const S = {
  U: 12, R1: 100, R2: 100, C: 1000e-6, Vc: 0, on: true,
  wires: [['BP', 'SWa'], ['SWb', 'R1a'], ['R1b', 'R2a'], ['R2b', 'BN']],
  hist: [],
};
let pendingTerm = null, cached = null, dirty = true;
const $ = (id) => document.getElementById(id);
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }

// ---------- solver topológico ----------
function solve() {
  const R = { R1: S.R1, R2: S.R2 };
  if (!(R.R1 > 0) || !(R.R2 > 0)) throw new Error('R₁ e R₂ devem ser > 0.');
  if (Math.min(R.R1, R.R2) < 1) throw new Error('Curto-circuito: R ≈ 0 Ω. Aumente a resistência.');
  const adj = {};
  const link = (a, b, e) => { (adj[a] = adj[a] || []).push({ to: b, e }); (adj[b] = adj[b] || []).push({ to: a, e }); };
  for (const e of COMP_EDGES) {
    if (e.kind === 'SW' && !S.on) continue; // chave aberta: ramo interrompido
    link(e.a, e.b, e);
  }
  for (const [a, b] of S.wires) {
    if (!TERMS[a] || !TERMS[b] || a === b) continue;
    link(a, b, { kind: 'W', _n: [a, b] });
  }
  // todos os caminhos simples BP -> BN
  const paths = [];
  (function dfs(cur, seen, edges) {
    if (cur === 'BN') { paths.push([...edges]); return; }
    for (const { to, e } of adj[cur] || []) {
      if (seen.has(to)) continue;
      seen.add(to); edges.push(e); dfs(to, seen, edges); edges.pop(); seen.delete(to);
    }
  })('BP', new Set(['BP']), []);
  if (!paths.length) return { status: 'open' };
  const rOf = (p) => p.filter(e => e.kind === 'R').reduce((s, e) => s + R[e.id], 0);
  if (paths.some(p => !p.some(e => e.kind === 'R'))) return { status: 'short' };
  // sequência de nós BP..BN de cada caminho (p/ comparar topologias)
  const seqOf = (edges) => {
    const seq = ['BP']; let cur = 'BP';
    const rest = [...edges];
    for (let k = 0; k < 20 && cur !== 'BN' && rest.length; k++) {
      const ix = rest.findIndex(e => endsOf(e).includes(cur));
      if (ix < 0) break;
      const e = rest.splice(ix, 1)[0];
      cur = endsOf(e).find(n => n !== cur) || cur;
      seq.push(cur);
    }
    return cur === 'BN' ? seq : null;
  };
  const seen = new Set();
  const branches = [];
  for (const p of paths) {
    const s = seqOf(p);
    if (!s) return { status: 'unsupported' };
    const k = s.join('>');
    if (seen.has(k)) continue;
    seen.add(k);
    branches.push({ path: p, seq: s, Rb: rOf(p) });
  }
  const rAt = (nodes, i) => { // R do componente entre nodes[i] e nodes[i+1]
    for (const e of COMP_EDGES) {
      const ns = endsOf(e);
      if (ns.includes(nodes[i]) && ns.includes(nodes[i + 1]) && e.kind === 'R') return R[e.id];
    }
    return 0;
  };
  const idsAt = (nodes, i) => {
    for (const e of COMP_EDGES) {
      const ns = endsOf(e);
      if (ns.includes(nodes[i]) && ns.includes(nodes[i + 1]) && e.kind === 'R') return e.id;
    }
    return null;
  };
  if (branches.length === 1) {
    const Rb = branches[0].Rb;
    const I = ohm(S.U, Rb).I;
    return { status: 'ok', topo: 'série (1 ramo)', Req: Rb, Itot: I, IR1: I, IR2: I, branches };
  }
  // redução série-paralelo: tronco comum (prefixo+sufixo idênticos) + ramos disjuntos
  let pre = 0;
  while (branches.every(b => b.seq.length > pre + 1 && b.seq[pre + 1] === branches[0].seq[pre + 1])) pre++;
  let suf = 0;
  const sufOk = () => branches.every(b => (b.seq.length - 1 - suf) > pre && b.seq[b.seq.length - 1 - suf] === branches[0].seq[branches[0].seq.length - 1 - suf]);
  while (sufOk()) suf++;
  const trunkR = branches[0] ? (() => {
    let t = 0;
    for (let i = 0; i < pre; i++) t += rAt(branches[0].seq, i);
    const L = branches[0].seq.length;
    for (let i = 0; i < suf; i++) t += rAt(branches[0].seq, L - 2 - i);
    return t;
  })() : 0;
  const mids = branches.map(b => b.seq.slice(pre, b.seq.length - suf));
  let okPar = mids.every(m => m.length >= 2);
  for (let i = 0; i < mids.length && okPar; i++)
    for (let j = i + 1; j < mids.length && okPar; j++) {
      const innerJ = new Set(mids[j].slice(1, -1));
      for (const n of mids[i].slice(1, -1)) if (innerJ.has(n)) okPar = false;
    }
  if (!okPar) return { status: 'unsupported' };
  const Rbs = mids.map(m => { let s = 0; for (let i = 0; i + 1 < m.length; i++) s += rAt(m, i); return s; });
  if (Rbs.some(rb => rb <= 0)) return { status: 'short' };
  const Rpar = paralelo(Rbs);
  const Req = trunkR + Rpar;
  const Itot = S.U / Req;
  const Vb = S.U - Itot * trunkR;
  const bI = Rbs.map(rb => Vb / rb);
  const IR = { R1: 0, R2: 0 };
  if (trunkR > 0) {
    for (let i = 0; i < pre; i++) { const id = idsAt(branches[0].seq, i); if (id) IR[id] += Itot; }
    const L = branches[0].seq.length;
    for (let i = 0; i < suf; i++) { const id = idsAt(branches[0].seq, L - 2 - i); if (id) IR[id] += Itot; }
  }
  mids.forEach((m, i) => { for (let k = 0; k + 1 < m.length; k++) { const id = idsAt(m, k); if (id) IR[id] += bI[i]; } });
  const trunkTxt = trunkR > 0 ? `tronco ${fmt(trunkR)}Ω + ` : '';
  return { status: 'ok', topo: `${trunkTxt}paralelo (${mids.length} ramos)`, Req, Itot, IR1: IR.R1, IR2: IR.R2, branches, bI };
}
function endsOf(e) {
  if (e.kind === 'W') return e._n || [];
  const c = COMP_EDGES.find(c => c.kind === e.kind && (c.id || '') === (e.id || ''));
  return c ? [c.a, c.b] : [];
}

// ---------- cálculo (só em mudança de parâmetro) ----------
function calc() {
  const alert = $('alert'); alert.innerHTML = '';
  try {
    const sol = solve();
    if (sol.status === 'open') {
      paint({ Req: 0, Itot: 0, IR1: 0, IR2: 0, topo: 'aberto (sem caminho BP→BN)' });
      $('stepOhm').textContent = 'Sem caminho entre + e − (ou chave aberta no único ramo) → I = 0. O capacitor mantém Vc (isolado).';
      $('stepReq').textContent = 'Ligue os terminais para fechar o circuito.';
      drawGraph(0); return { sol, Req: 0, I: 0 };
    }
    if (sol.status === 'short') throw new Error('Curto-circuito: caminho sem resistor entre + e −. Desfaça o fio direto.');
    if (sol.status === 'unsupported') throw new Error('Topologia mista não suportada — use ramos que só se tocam em + e −.');
    const { Req, Itot, IR1, IR2, topo } = sol;
    const Ptot = pot(S.U, Itot);
    const P1 = potRI(S.R1, IR1), P2 = potRI(S.R2, IR2);
    const brilho = Ptot <= 0 ? 0 : Math.min(1, Ptot / 50);
    paint({ Req, Itot, IR1, IR2, topo, Ptot, P1, P2, brilho });
    $('rReq').textContent = fmt(Req) + ' Ω';
    $('rTopo').textContent = topo;
    $('rI').textContent = fmt(Itot) + ' A';
    $('rP').textContent = fmt(Ptot) + ' W';
    $('rP12').textContent = `${fmt(P1)} / ${fmt(P2)} W`;
    $('rBr').textContent = (brilho * 100).toFixed(0) + ' %';
    $('stepOhm').textContent = `I = U/Req = ${fmt(S.U)} / ${fmt(Req)} = ${fmt(Itot)} A`;
    $('stepReq').textContent = sol.branches.length === 1
      ? `1 ramo em série: Req = ${sol.branches.map(b => b.path.filter(e => e.kind === 'R').map(e => e.id).join('+') || 'fio').join('')} = ${fmt(Req)} Ω`
      : `Ramos: ${sol.branches.map((b, i) => `R${i + 1}=${fmt(b.Rb)}Ω (I=${fmt(sol.bI[i])}A)`).join(' ∥ ')} → Req = ${fmt(Req)} Ω`;
    $('stepPot').textContent = `P = U·I = ${fmt(S.U)}×${fmt(Itot)} = ${fmt(Ptot)} W · P₁=R₁I₁²=${fmt(P1)} W · P₂=${fmt(P2)} W`;
    buildPath(sol);
    drawGraph(Req);
    return { sol, Req, I: Itot };
  } catch (e) { alert.innerHTML = `<div class="err">${e.message}</div>`; paint(null); return null; }
}
function paint(v) {
  const brilho = v ? v.brilho : 0;
  lampMat.emissiveIntensity = .05 + brilho * 3;
  lampLight.intensity = brilho * 8;
}

// caminho 3D das partículas = topologia resolvida (1º ramo válido)
let pathPts = [];
function buildPath(sol) {
  pathPts = [];
  const b = sol && sol.branches && sol.branches[0];
  if (!b) return;
  // ordena arestas BP..BN
  const seq = ['BP']; let cur = 'BP';
  const rest = [...b.path];
  for (let k = 0; k < 20 && cur !== 'BN' && rest.length; k++) {
    const ix = rest.findIndex(e => endsOf(e).includes(cur));
    if (ix < 0) break;
    const e = rest.splice(ix, 1)[0];
    cur = endsOf(e).find(n => n !== cur) || cur;
    seq.push(cur);
  }
  if (cur !== 'BN') { pathPts = []; return; }
  pathPts = seq.map(n => TERMS[n]).filter(Boolean);
}

// ---------- dinâmica RC temporal (mesmo estado do gráfico) ----------
function dynamics(dt) {
  const tau = cached && cached.Req > 0 ? cached.Req * S.C : 0;
  let Ic = 0;
  if (tau > 0 && S.Vc < S.U) {
    S.Vc += (S.U - S.Vc) * (1 - Math.exp(-dt / tau)); // exato p/ entradas const, estável p/ qq dt
    Ic = (S.U - S.Vc) / cached.Req;
  }
  const Q = S.C * S.Vc, E = S.C * S.Vc * S.Vc / 2;
  S.hist.push({ t: (S.hist.length ? S.hist[S.hist.length - 1].t : 0) + dt, Q });
  if (S.hist.length > 600) S.hist.shift();
  $('rVc').textContent = fmt(S.Vc) + ' V';
  $('rQ').textContent = fmt(Q) + ' C';
  $('rE').textContent = fmt(E) + ' J';
  $('rIc').textContent = fmt(Ic) + ' A';
  $('stepCap').textContent = tau > 0
    ? `Vc(t)=${fmt(S.Vc)} V · Q=C·Vc=${fmt(Q)} C · E=CVc²/2=${fmt(E)} J\nIc=(U−Vc)/Req=${fmt(Ic)} A · τ=Req·C=${fmt(tau)} s`
    : 'Sem Req válida — capacitor isolado, Vc mantido.';
  capCharge.material.opacity = .05 + .35 * Math.min(1, S.Vc / (S.U || 1));
}

function drawGraph(Req) {
  const g = $('g'), x = g.getContext('2d');
  x.clearRect(0, 0, g.width, g.height);
  const Qmax = capQ(S.C, S.U), tau = Math.max(Req * S.C, 1e-9), tMax = 5 * tau;
  x.beginPath(); // curva analítica de referência (fundo)
  for (let px = 0; px <= g.width; px += 3) {
    const t = tMax * px / g.width;
    const q = Qmax * (1 - Math.exp(-t / tau));
    const py = g.height - 14 - (Qmax > 0 ? q / Qmax : 0) * (g.height - 30);
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.strokeStyle = 'rgba(77,163,255,.35)'; x.lineWidth = 1; x.stroke();
  if (S.hist.length > 1) { // trilha medida (mesmo estado dos números)
    const t1 = S.hist[S.hist.length - 1].t, t0 = Math.max(0, t1 - tMax);
    x.beginPath();
    S.hist.forEach((h, i) => {
      const px = (h.t - t0) / (tMax || 1) * g.width;
      const py = g.height - 14 - (Qmax > 0 ? h.Q / Qmax : 0) * (g.height - 30);
      i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    });
    x.strokeStyle = '#4da3ff'; x.lineWidth = 2; x.stroke();
    const hl = S.hist[S.hist.length - 1];
    const px = (hl.t - t0) / (tMax || 1) * g.width;
    const py = g.height - 14 - (Qmax > 0 ? hl.Q / Qmax : 0) * (g.height - 30);
    x.fillStyle = '#ffcf4d'; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill();
  }
  x.fillStyle = '#93a4cc'; x.font = '11px sans-serif';
  x.fillText('t (janela 5τ)', 4, g.height - 1);
  x.fillText(`5τ=${fmt(tMax)}s`, g.width - 70, g.height - 1);
  x.fillText(`Qmáx=${fmt(Qmax)}C`, 4, 12);
}

// ---------- UI ----------
const sU = $('sU'), sR1 = $('sR1'), sR2 = $('sR2'), sC = $('sC'), cSw = $('cSw');
function syncUI() {
  $('oU').textContent = S.U; $('oR1').textContent = S.R1; $('oR2').textContent = S.R2;
  $('oC').textContent = Math.round(S.C * 1e6);
  $('lBat').textContent = fmt(S.U) + ' V';
  $('lR1').textContent = fmt(S.R1) + ' Ω'; $('lR2').textContent = fmt(S.R2) + ' Ω';
  $('lSw').textContent = S.on ? 'fechada' : 'aberta';
  $('lCap').textContent = Math.round(S.C * 1e6) + ' µF';
  lever.rotation.z = S.on ? 0 : .5;
  dirty = true; tick(true);
}
function tick(force) {
  if (dirty || force) { cached = calc(); dirty = false; redrawWires(); }
}
sU.oninput = () => { S.U = +sU.value; syncUI(); };
sR1.oninput = () => { S.R1 = +sR1.value; syncUI(); };
sR2.oninput = () => { S.R2 = +sR2.value; syncUI(); };
sC.oninput = () => { S.C = +sC.value * 1e-6; S.Vc = 0; S.hist = []; syncUI(); };
cSw.onchange = (e) => { S.on = e.target.checked; syncUI(); toast(S.on ? 'Chave fechada' : 'Chave aberta'); };
const setWires = (w) => { S.wires = w.map(p => [...p]); pendingTerm = null; syncUI(); };
$('bModoS').onclick = () => setWires([['BP', 'SWa'], ['SWb', 'R1a'], ['R1b', 'R2a'], ['R2b', 'BN']]);
$('bModoP').onclick = () => setWires([['BP', 'SWa'], ['SWb', 'R1a'], ['R1b', 'BN'], ['SWb', 'R2a'], ['R2b', 'BN']]);
$('bSerie').onclick = () => { S.U = 12; S.R1 = 4; S.R2 = 4; sU.value = 12; sR1.value = 4; sR2.value = 4; setWires([['BP', 'SWa'], ['SWb', 'R1a'], ['R1b', 'R2a'], ['R2b', 'BN']]); toast('Preset série: 12 V, 4 Ω + 4 Ω → I = 1,5 A'); };
$('bPar').onclick = () => { S.U = 12; S.R1 = 100; S.R2 = 100; sU.value = 12; sR1.value = 100; sR2.value = 100; setWires([['BP', 'SWa'], ['SWb', 'R1a'], ['R1b', 'BN'], ['SWb', 'R2a'], ['R2b', 'BN']]); toast('Preset paralelo: 12 V, 100 Ω ∥ 100 Ω → Req = 50 Ω'); };
$('bOhm').onclick = () => { S.U = 12; S.R1 = 6; sU.value = 12; sR1.value = 6; setWires([['BP', 'SWa'], ['SWb', 'R1a'], ['R1b', 'BN']]); toast('12 V + 6 Ω → I = 2 A, P = 24 W'); };
$('bWires').onclick = () => { S.wires = []; pendingTerm = null; syncUI(); toast('Fios removidos — circuito aberto'); };
$('bResetC').onclick = () => { S.Vc = 0; S.hist = []; tick(true); toast('Capacitor descarregado (Vc = 0)'); };
$('bSave').onclick = () => { store.save('eletrodinamica', S); toast('Salvo (Modo Livre consegue carregar)'); };

// ---------- clique em terminais ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const hit = ray.intersectObjects(Object.values(termMeshes));
  if (!hit.length) return;
  const k = hit[0].object.userData.term;
  const used = S.wires.some(w => w[0] === k || w[1] === k);
  if (!pendingTerm) {
    if (used) { // clique em terminal ligado: desliga seus fios
      S.wires = S.wires.filter(w => w[0] !== k && w[1] !== k);
      syncUI(); toast(`Fios de ${k} removidos`);
    } else { pendingTerm = k; redrawWires(); toast(`${k}: clique noutro terminal`); }
  } else if (pendingTerm === k) { pendingTerm = null; redrawWires(); }
  else {
    if (!S.wires.some(w => (w[0] === pendingTerm && w[1] === k) || (w[0] === k && w[1] === pendingTerm)))
      S.wires.push([pendingTerm, k]);
    pendingTerm = null; syncUI();
  }
});

// ---------- partículas seguem a topologia resolvida ----------
const ND = 90;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(ND * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: 0xffd94d, size: .14, transparent: true, opacity: .95 });
scene.add(new THREE.Points(pGeo, pMat));
let phase = 0;
const segLens = [];
function pathLen() {
  segLens.length = 0;
  let L = 0;
  for (let i = 0; i + 1 < pathPts.length; i++) { const l = pathPts[i].distanceTo(pathPts[i + 1]); segLens.push(l); L += l; }
  return L;
}
function pathAt(f, out) {
  const L = pathLen();
  if (!(L > 0)) return null;
  let d = ((f % 1) + 1) % 1 * L;
  for (let i = 0; i < segLens.length; i++) {
    if (d <= segLens[i]) return out.copy(pathPts[i]).lerp(pathPts[i + 1], segLens[i] ? d / segLens[i] : 0);
    d -= segLens[i];
  }
  return out.copy(pathPts[pathPts.length - 1]);
}
const tmpV = new THREE.Vector3();

// ---------- loop: só dinâmica leve (cálculo pesado só em dirty) ----------
let last = performance.now(), frame = 0;
(function loop(now) {
  requestAnimationFrame(loop); ctl.update();
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  tick(false);
  const I = cached && cached.I > 0 ? cached.I : 0;
  if (I > 0) {
    dynamics(dt); // Vc, Q, E, Ic + histórico (mesmo estado dos números)
    phase = (phase + dt * (0.3 + Math.min(I, 3) * 1.2)) % 1;
  }
  const pos = pGeo.attributes.position.array;
  const v = new THREE.Vector3();
  for (let i = 0; i < ND; i++) {
    if (pathAt((i / ND + phase) % 1, v)) { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y + .12; pos[i * 3 + 2] = v.z; }
    else { pos[i * 3 + 1] = -10; }
  }
  pGeo.attributes.position.needsUpdate = true;
  pMat.opacity = I > 0 ? .95 : .15;
  if ((frame++ % 3 === 0) && cached) drawGraph(cached.Req || 0);
  renderer.render(scene, cam);
})(last);

// restaura save
try {
  const sv = store.load('eletrodinamica');
  if (sv && typeof sv === 'object') {
    Object.assign(S, { U: sv.U ?? S.U, R1: sv.R1 ?? S.R1, R2: sv.R2 ?? S.R2, C: sv.C ?? S.C, Vc: sv.Vc ?? 0, on: sv.on ?? true });
    if (Array.isArray(sv.wires)) S.wires = sv.wires.filter(w => TERMS[w[0]] && TERMS[w[1]]);
    sU.value = S.U; sR1.value = S.R1; sR2.value = S.R2; sC.value = S.C * 1e6; cSw.checked = S.on;
  }
} catch { /* ignora */ }
syncUI();
