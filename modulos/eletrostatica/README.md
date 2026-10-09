# Eletrostática — construtor N-cargas

## O que faz
- Adicionar/remover/duplicar cargas +/−, arrastar no plano XZ, selecionar (lista ou 3D), editar q/x/z.
- **Pares**: F=k|qᵢqⱼ|/r² por par + natureza (atração/repulsão).
- **Resultante** por superposição vetorial em cada carga (setas amarelas, escala log).
- **Prova** arrastável: E=ΣkQ·r̂/r² (seta verde), V=ΣkQ/r, F=qE.
- **U total** = Σᵢ<ⱼ kqᵢqⱼ/rᵢⱼ. Gráfico F×r do par (selecionada × vizinha).
- Preset de aceitação: +2µC/−3µC a 0,30 m → **F≈0,599 N** (virou teste em `tests/run.js`).

## Hipóteses
Puntiformes no vácuo, r≥0,05 m no cálculo (aviso se par <0,2 m). Escala: 1 un = 1 m.
