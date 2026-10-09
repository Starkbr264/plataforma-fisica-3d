/* Motor de cálculos — independente do 3D. Todas as simulações usam isto. */
window.FIS = (() => {
  const C = {
    k: 8.9875517923e9,        // 1/(4πϵ0)  N·m²/C²
    eps0: 8.8541878128e-12,   // F/m
    e: 1.602176634e-19,       // C
    mu0: 4 * Math.PI * 1e-7,  // N/A²
    h: 6.62607015e-34,        // J·s
    hbar: 1.054571817e-34,    // J·s
    c: 299792458,             // m/s
    kB: 1.380649e-23,         // J/K
    R: 8.314462618,           // J/(mol·K)
    Na: 6.02214076e23,        // 1/mol
    mp: 1.67262192369e-27,    // massa do próton (kg)
    me: 9.1093837015e-31,     // massa do elétron (kg)
    g: 9.80665                // m/s²
  };

  const ok = (v) => Number.isFinite(v);
  function need(cond, msg) { if (!cond) throw new Error(msg); }

  // --- Eletrostática ---
  function coulomb(q1, q2, r) { need(r > 0, "r deve ser > 0"); return C.k * Math.abs(q1 * q2) / (r * r); }
  function campoQ(Q, r) { need(r > 0, "r deve ser > 0"); return C.k * Math.abs(Q) / (r * r); }
  function potencialQ(Q, r) { need(r > 0, "r deve ser > 0"); return C.k * Q / r; }
  function energiaU(q1, q2, r) { need(r > 0, "r deve ser > 0"); return C.k * q1 * q2 / r; }

  // --- Magnetismo / indução ---
  function Bfio(I, r) { need(r > 0, "r deve ser > 0"); return C.mu0 * Math.abs(I) / (2 * Math.PI * r); }
  function Fmag(q, v, B, angGraus) { const t = angGraus * Math.PI / 180; return Math.abs(q) * v * B * Math.abs(Math.sin(t)); }
  function Ffio(B, I, L, angGraus) { const t = angGraus * Math.PI / 180; return B * Math.abs(I) * L * Math.abs(Math.sin(t)); }
  function fluxo(B, A, angGraus) { const t = angGraus * Math.PI / 180; return B * A * Math.cos(t); }
  function fem(N, dPhi, dt) { need(dt > 0, "dt deve ser > 0"); return -N * dPhi / dt; }

  // --- Moderna ---
  function fotonE(f) { need(f > 0, "f deve ser > 0"); return C.h * f; }
  function fotonF(lambda) { need(lambda > 0, "λ deve ser > 0"); return C.c / lambda; }
  function fotoeletrico(f, phi_eV) {
    need(f > 0, "f deve ser > 0");
    const E = C.h * f, phi = phi_eV * C.e;
    return { E, phi, Kmax: Math.max(0, E - phi), emite: E > phi };
  }
  function deBroglie(m, v) { need(m > 0 && v > 0, "m,v > 0"); return C.h / (m * v); }
  function bohrEn(n) { need(n >= 1, "n ≥ 1"); return -13.605693122994 * C.e / (n * n); } // J
  function decaimento(N0, lambda, t) { need(N0 >= 0 && lambda > 0 && t >= 0, "domínio inválido"); return N0 * Math.exp(-lambda * t); }
  function meiavida(lambda) { need(lambda > 0, "λ > 0"); return Math.LN2 / lambda; }

  // --- Eletrodinâmica ---
  function ohm(U, R) { if (U == null) return { U, I: null, R }; if (R == null || R <= 0) throw new Error("R deve ser > 0"); if (U != null && R != null) return { U, R, I: U / R }; throw new Error("informe 2 grandezas"); }
  function serie(rs) { need(rs.length && rs.every(r => r > 0), "resistores > 0"); return rs.reduce((a, b) => a + b, 0); }
  function paralelo(rs) { need(rs.length && rs.every(r => r > 0), "resistores > 0"); return 1 / rs.reduce((a, b) => a + 1 / b, 0); }
  function pot(U, I) { return U * I; }
  function potRI(R, I) { need(R > 0, "R > 0"); return R * I * I; }
  function capQ(cap, U) { return cap * U; }
  function capE(cap, U) { return cap * U * U / 2; }

  // --- Termodinâmica ---
  // resolve a variável null em PV=nRT. P(Pa) V(m³) n(mol) T(K)
  function gas({ P = null, V = null, n = null, T = null }) {
    const miss = [P, V, n, T].filter(v => v == null).length;
    need(miss === 1, "deixe exatamente 1 campo vazio para resolver (P,V,n,T)");
    if (P == null) { need(V > 0 && n > 0 && T > 0, "V,n,T > 0"); P = n * C.R * T / V; }
    else if (V == null) { need(P > 0 && n > 0 && T > 0, "P,n,T > 0"); V = n * C.R * T / P; }
    else if (n == null) { need(P > 0 && V > 0 && T > 0, "P,V,T > 0"); n = P * V / (C.R * T); }
    else { need(P > 0 && V > 0 && n > 0, "P,V,n > 0"); T = P * V / (n * C.R); }
    return { P, V, n, T };
  }
  function Umono(n, T) { need(n > 0 && T > 0, "n,T > 0"); return 1.5 * n * C.R * T; }
  function Wisobarico(P, dV) { return P * dV; } // W pelo gás
  function rendimento(W, Qq) { need(Qq > 0, "Qq > 0"); return W / Qq; }
  function carnot(Th, Tc) { need(Th > 0 && Tc > 0, "Th,Tc > 0 K"); need(Th > Tc, "Th deve ser > Tc"); return 1 - Tc / Th; }
  function adiabT(T0, V0, V1, gamma = 5 / 3) { need(T0 > 0 && V0 > 0 && V1 > 0 && gamma > 1, "domínio inválido"); return T0 * Math.pow(V0 / V1, gamma - 1); }
  function adiabP(P0, V0, V1, gamma = 5 / 3) { need(P0 > 0 && V0 > 0 && V1 > 0 && gamma > 1, "domínio inválido"); return P0 * Math.pow(V0 / V1, gamma); }

  // --- utils ---
  function fmt(x, d = 3) {
    if (x == null || !ok(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if ((a >= 1e-3 && a < 1e6) || a === 0) return Number(x.toPrecision(d + 1)).toString();
    return x.toExponential(d).replace("e", "×10^");
  }
  const store = {
    save(key, obj) { try { localStorage.setItem("fis3d:" + key, JSON.stringify(obj)); } catch { /* file:// pode bloquear */ } },
    load(key) { try { return JSON.parse(localStorage.getItem("fis3d:" + key)); } catch { return null; } },
    list() { try { return Object.keys(localStorage).filter(k => k.startsWith("fis3d:")).map(k => k.slice(6)); } catch { return []; } }
  };

  return {
    C, coulomb, campoQ, potencialQ, energiaU,
    Bfio, Fmag, Ffio, fluxo, fem,
    fotonE, fotonF, fotoeletrico, deBroglie, bohrEn, decaimento, meiavida,
    ohm, serie, paralelo, pot, potRI, capQ, capE,
    gas, Umono, Wisobarico, rendimento, carnot, adiabT, adiabP,
    fmt, store
  };
})();
