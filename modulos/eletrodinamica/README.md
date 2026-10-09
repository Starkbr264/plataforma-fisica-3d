# Eletrodinâmica — construtor de circuitos (etapa 1)

## O que faz
- **Terminais clicáveis** (BP, BN, R1a/b, R2a/b, SWa/b): clique em 2 p/ fiar, clique em terminal ligado p/ desligar, botão Limpar fios.
- **Solver topológico real**: enumera caminhos BP→BN, reduz tronco comum + ramos paralelos, detecta aberto/curto/misto-não-suportado. A topologia dos fios é a origem do cálculo (Req, I por ramo, P).
- **Presets**: série (12V 4+4 → 1,5A), paralelo (12V 100‖100 → 50Ω), **12V+6Ω → 2A/24W** (valida §10.4).
- **Capacitor RC temporal coerente**: estado Vc(t) integrado por `Vc+=(U−Vc)(1−e^(−dt/τ))`, τ=Req·C; números (Vc, Q=C·Vc, E, Ic=(U−Vc)/Req), opacidade das placas e trilha do gráfico Q×t vêm do MESMO estado. Chave aberta/circuito aberto = Vc mantido (isolado).
- **Partículas** de corrente seguem o caminho resolvido (velocidade ∝ I).
- Cálculo pesado só em mudança de parâmetro (dirty flag); loop só integra RC + visual.

## Hipóteses
Fios/fonte ideais; resistores ôhmicos; lâmpada = indicador de P total (fora do grafo); capacitor fixo nos terminais da bateria (ramo próprio, documentado no painel); chave = aresta que abre/fecha.
