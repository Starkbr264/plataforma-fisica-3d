# Eletrodinâmica 3D — Circuitos (série / paralelo)

## Funções (window.FIS, motor `js/core.js`)
- `ohm(U, R)` → `{ U, R, I }` com `I = U/R`; lança erro se `R ≤ 0`.
- `serie([R1, R2])` → `R1 + R2`.
- `paralelo([R1, R2])` → `(1/R1 + 1/R2)⁻¹`.
- `pot(U, I)` → `U·I`; `potRI(R, I)` → `R·I²`.
- `capQ(C, U)` → `C·U`; `capE(C, U)` → `C·U²/2`.

## Fórmulas
- Lei de Ohm: `U = R·I`, `I = U/Req`.
- Série: `Req = R1 + R2` (mesma corrente, tensões somam).
- Paralelo: `1/Req = 1/R1 + 1/R2` (mesma tensão, correntes somam).
- Potência: `P = U·I = R·I²` (série por resistor) ou `P = U²/R` (paralelo).
- Capacitor: `Q = C·U`, `E = C·U²/2`, carga `Q(t) = C·U·(1 − e^(−t/RC))` com `τ = Req·C`.
- Brilho da lâmpada 3D: `emissiveIntensity ∝ P total` (normalizado em 50 W).

## Hipóteses
- Resistores ôhmicos (R constante, sem aquecimento).
- Fios e fonte ideais (resistência interna nula).
- Capacitor ideal, sem fuga; chave ideal (0/∞ Ω).
- Regime quase-estacionário; partículas mostram sentido convencional (+ → −).

## Teste
- Preset série: `U = 12 V`, `R1 = R2 = 4 Ω` em série → `Req = 8 Ω` → `I = 12/8 = 1,5 A`, `P = 18 W`, `P1 = P2 = 9 W`.
- Paralelo: `12 V`, `100 Ω ∥ 100 Ω` → `Req = 50 Ω` → `I = 0,24 A`.
- Curto (`R < 1 Ω`) e `R ≤ 0`: bloqueados com aviso na interface.
