# Termodinâmica / Gases 3D

Cilindro com pistão arrastável + ~120 partículas cuja velocidade média ∝ √T e cor vai de azul (200 K) a vermelho (800 K).

## Funções (window.FIS, de js/core.js)

- `gas({P,V,n,T})` — resolve a variável `null` em PV=nRT (exige exatamente 1 livre).
- `Umono(n,T)` — U = 3nRT/2.
- `Wisobarico(P,dV)` — passo P·ΔV (exibido; o acumulado usa trapézio ∫P dV).
- `rendimento(W,Qq)` — W/Qq (Carnot de referência no passo).
- `fmt` — formatação curta.

## Fórmulas

- PV = nRT · ΔU = Q − W (W pelo gás) · W = ∫P dV · U = 3nRT/2.

## Modos

| modo | fixa | Vem do… | resolve |
|---|---|---|---|
| isotérmico | T (slider) | pistão/slider | P |
| isobárico | P (travada ao entrar) | pistão/slider | T |
| isocórico | V (travada; pistão bloqueado) | sliders n,T | P |
| livre | — | sliders n,T,V | P |

W integra (P+Pant)/2·ΔV a cada mudança de V; ΔU = U−U₀; Q = ΔU+W.

## Hipóteses

Gás ideal monoatômico, transformação quase-estática, sem atrito/vazamento, R = 8,314462618 J/(mol·K).

## Teste

n=1 mol, T=300 K, V=0,024 m³ → P = nRT/V ≈ 103 931 Pa ≈ 104 kPa.
No app: modo livre, n=1, T=300, V=4 L dá P ≈ 623,6 kPa (mesma conta com V=0,004 m³).
