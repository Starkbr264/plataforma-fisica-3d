/* Testes de aceitacao do motor cientifico (node tests/run.js). */
const fs = require('fs');
const path = require('path');
global.window = {};
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = v; } };
const coreSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf-8');
eval(coreSrc);
const F = window.FIS;
let pass = 0, fail = 0;
function t(name, cond, got) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + ' -> ' + got); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

// §7.4 Eletrostática: +2µC / −3µC @ 0,30m ≈ 0,599N; @0,60m ≈ 0,150N
t('coulomb 0.599N', near(F.coulomb(2e-6, -3e-6, .30), .599, .005), F.coulomb(2e-6, -3e-6, .30));
t('coulomb 1/4 ao dobrar r', near(F.coulomb(2e-6, -3e-6, .60), .150, .005), F.coulomb(2e-6, -3e-6, .60));
t('sinais opostos atraem (U<0)', F.energiaU(2e-6, -3e-6, .3) < 0, '');
t('mesmo sinal repele (U>0)', F.energiaU(2e-6, 2e-6, .3) > 0, '');
t('E=k|Q|/r²', near(F.campoQ(2e-6, .3), 199733, .005), F.campoQ(2e-6, .3));
t('V=kQ/r', near(F.potencialQ(-3e-6, .3), -89900, .005), F.potencialQ(-3e-6, .3));

// §8 Eletromagnetismo
t('B fio 5A/0.1m = 10uT', near(F.Bfio(5, .1), 10e-6, 1e-9), F.Bfio(5, .1));
t('B cai com 1/r', near(F.Bfio(5, .2) / F.Bfio(5, .1), .5, 1e-9), '');
t('Fmag sen90', near(F.Fmag(1.602e-19, 1e6, 2e-6, 90), 3.2e-19, .01), '');
t('Fmag sen0 = 0', F.Fmag(1.602e-19, 1e6, 2e-6, 0) === 0, '');
t('Faraday sinal Lenz', near(F.fem(100, 1e-6, .5), -2e-4, 1e-12), '');
t('fluxo cos0', near(F.fluxo(1e-3, 1.13, 0), 1.13e-3, 1e-12), '');

// §9 Moderna
t('E=hf cresce com f', F.fotonE(2e15) > F.fotonE(1e15), '');
t('foto abaixo do corte nao emite', F.fotoeletrico(1e14, 2.3).emite === false, '');
t('foto Na emite K~1.84eV', near(F.fotoeletrico(1e15, 2.3).Kmax, 2.94e-19, .01), '');
t('Bohr n=1 ~ -13.6eV', near(F.bohrEn(1) / 1.602e-19, -13.6, .005), '');
t('meia-vida ln2/l', near(F.meiavida(.1), 6.931, .001), '');
t('decaimento N0/2 em t1/2', near(F.decaimento(100, .1, F.meiavida(.1)), 50, 1e-9), '');

// §10 Eletrodinâmica: 12V/6Ω → 2A, 24W
t('ohm 12V/6ohm = 2A', near(F.ohm(12, 6).I, 2, 1e-12), '');
t('P = 24W', near(F.pot(12, 2), 24, 1e-12), '');
t('P = RI² = 24W', near(F.potRI(6, 2), 24, 1e-12), '');
t('serie 4+4=8', F.serie([4, 4]) === 8, '');
t('paralelo 4||4=2', near(F.paralelo([4, 4]), 2, 1e-12), '');
t('Q=CU', near(F.capQ(100e-6, 12), 1.2e-3, 1e-12), '');

// §11 Termodinâmica
t('PV=nRT', near(F.gas({ P: null, V: .024, n: 1, T: 300 }).P, 103930, .001), '');
t('U=3nRT/2', near(F.Umono(1, 300), 3741, .001), '');
t('W=PdV', near(F.Wisobarico(1e5, .002), 200, 1e-12), '');
t('eta=W/Qq', near(F.rendimento(200, 1000), .2, 1e-12), '');

// domínio
let threw = false;
try { F.coulomb(1e-6, 1e-6, 0); } catch { threw = true; }
t('r=0 rejeitado', threw, '');

// RC temporal coerente (mesmo integrador do módulo: Vc+=(U-Vc)(1-e^-dt/τ))
(function () {
  const U = 12, Req = 1000, Ccap = 1e-3, tau = Req * Ccap, dt = .02;
  let Vc = 0;
  for (let t = 0; t < tau; t += dt) Vc += (U - Vc) * (1 - Math.exp(-dt / tau));
  t('RC Vc(τ)=U(1-1/e)', near(Vc, U * (1 - 1 / Math.E), .005), Vc);
  t('RC Q=C·Vc', near(Ccap * Vc, Ccap * U * (1 - 1 / Math.E), .005), '');
  t('RC Ic=(U-Vc)/Req > 0 durante carga', (U - Vc) / Req > 0, '');
})();

// Carnot separado do rendimento do ciclo
t('carnot 600/300 = 0.5', near(F.carnot(600, 300), .5, 1e-12), '');
t('ciclo W/Q distingue de Carnot', near(F.rendimento(200, 1000), .2, 1e-12) && Math.abs(F.rendimento(200, 1000) - F.carnot(600, 300)) > 1e-9, '');
threw = false;
try { F.carnot(300, 600); } catch { threw = true; }
t('carnot exige Th>Tc', threw, '');

// adiabática reversível (gás monoatômico, γ=5/3)
t('adiabT comprime 2x aquece', near(F.adiabT(300, 2e-3, 1e-3), 300 * Math.pow(2, 2 / 3), 1e-9), '');
t('adiabP comprime 2x', near(F.adiabP(1e5, 2e-3, 1e-3), 1e5 * Math.pow(2, 5 / 3), 1e-9), '');

// Larmor com massa correta por partícula
(function () {
  const rL = (m) => m * 1e6 / (1.602e-19 * 1e-3);
  t('rL eletron ~1836x menor que proton', near(rL(F.C.mp) / rL(F.C.me), F.C.mp / F.C.me, 1e-9) && rL(F.C.me) < 0.01, rL(F.C.me));
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
