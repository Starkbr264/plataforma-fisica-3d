# Eletrostática — MVP

## O que faz
- Arraste q₁ e q₂ no 3D (ou use o slider de distância). Sliders de q₁, q₂ (−20…+20 µC).
- **F=k|q₁q₂|/r²** em tempo real + vetores amarelos (atração/repulsão pelo sinal), E no ponto médio, V total, U, W=−ΔU ao mover.
- Gráfico F×r (∝1/r²) com ponto atual. Carga de prova +/− opcional mostra E e F=qE no local.
- Tudo calculado por `FIS.coulomb/campoQ/potencialQ/energiaU` (`../../js/core.js`).

## Hipóteses
Puntiformes no vácuo, r≥0,2 m clampado (evita divergência). Escala: 1 un = 1 m. Sinais tratados: F usa |…|, direção pelo produto q₁q₂; V e U com sinal.

## Teste rápido
1. q₁=+5µC, q₂=−5µC, r=1m → F≈0,2247 N (atração). 2. Dobre r→2m: F cai 4×. 3. q₂→+5µC: vira repulsão, U>0.
