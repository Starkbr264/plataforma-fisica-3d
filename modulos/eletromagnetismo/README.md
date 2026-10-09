# Eletromagnetismo 3D — fio, partícula e indução

Simula campo de fio retilíneo, força magnética sobre carga, força sobre
corrente, fluxo e Lei de Faraday-Lenz. Todos os números vêm de `../../js/core.js`
(`window.FIS`: `Bfio`, `Fmag`, `Ffio`, `fluxo`, `fem`, `fmt`).

## Fórmulas

- Fio longo: `B = μ₀·I / (2π·r)`
- Lorentz: `F = |q|·v·B·senθ` (θ entre v e B)
- Força em corrente: `F = B·I·L·senθ` (mostrada com L = 1 m, B externo)
- Fluxo: `Φ = B·A·cosθ`, `A = π·R²` (R = 0,6 m, bobina fixa)
- Faraday: `ε = −N·ΔΦ/Δt` (sinal = sentido Lenz, seta 3D inverte)

## Cena

- Fio cilíndrico vertical no centro; anéis concêntricos = linhas de B
  (cor/intensidade ∝ B, sentido inverte com I pela regra da mão direita).
- Ímã N/S arrastável: gera B didático de dipolo no eixo
  `B ≈ (μ₀/4π)(2m/d³)` com `m = 0,05 A·m²` fixo, `d` clamp ≥ 0,4 m.
- Partícula ±e arrastável: deflexão circular 2D via `ω = |q|B/m`
  (sinal pela carga); sem B, retilínea. Fator de escala visual aplicado
  só ao passo na cena — força/raio exibidos são os de FIS.
- Bobina (hélice, nº de voltas visuais capado em 14) + seta de corrente
  induzida. Botão **Indução** aproxima/afasta o ímã em Δt = 1,2 s,
  mede ΔΦ e calcula ε com sinal.

## Hipóteses

- Fio infinito (válido p/ r ≪ comprimento; r clamp ≥ 0,1 m, sem divergência).
- B uniforme sobre a área da bobina para o fluxo.
- Quase-estático: ΔΦ/Δt médio no intervalo da animação.

## Teste rápido

I = 5 A, r = 0,1 m → `B = (4π×10⁻⁷ × 5)/(2π × 0,1) = 10 µT`.
Use o preset "fio 5 A" e confira `B do fio em r = 10,0×10^-6 T`.
