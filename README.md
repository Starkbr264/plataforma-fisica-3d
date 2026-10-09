# Plataforma 3D Interativa de Física

Laboratório virtual de Física para Ensino Médio + PAS/UnB. Foco em **construir, manipular variáveis e observar consequências** — não é banco de questões.

**Site:** https://starkbr264.github.io/plataforma-fisica-3d/ · **Teoria:** `/teoria/` (princípios, fórmulas e limites de cada módulo)

## Estrutura

```
plataforma-fisica-3d/
├── index.html                  # hub com menu completo + cards dos módulos
├── teoria/index.html           # princípios, teorias, fórmulas (KaTeX) e limites
├── css/style.css               # tema único (dark científico, 3 colunas, Lucide)
├── js/core.js                  # motor de cálculos: constantes, fórmulas, unidades, store
├── tests/run.js                # 38 testes de aceitação (node tests/run.js)
├── modulos/
│   ├── eletrostatica/          # N cargas, superposição, linhas de campo, equipotenciais
│   ├── eletromagnetismo/       # fio/ímã/bobina, Lorentz vetorial, indução livre Φ(t)/ε(t)
│   ├── fisica-moderna/         # fóton, fotoelétrico, Bohr, decaimento
│   ├── eletrodinamica/         # construtor: terminais + fios + solver, RC temporal
│   ├── termodinamica/          # gás ideal, pistão, P–V, adiabática, Carnot
│   └── livre/                  # modo livre: salvar/carregar/comparar/medir
└── docs/
    ├── REFERENCIAS.md          # quais livros/seções embasam cada fórmula
    ├── VALIDACAO.md            # hipóteses, limites e domínios de validade
    └── PAS-UNB.md              # mapa para o PAS
```

Cada módulo tem `index.html` + `app.js` + `README.md` próprios. Nada de arquivo único gigante.

## Como rodar

Sem build, sem login, sem banco. Só abrir no navegador (precisa de internet p/ CDNs):

- `index.html` → hub · `teoria/index.html` → base teórica
- ou direto: `modulos/eletrostatica/index.html`, etc.

Funciona por `file://` + CDN:
- `three@0.147.0` via jsdelivr (script global, sem módulos ES)
- KaTeX para fórmulas · Lucide para ícones (zero emoji na UI)
- Canvas 2D nativo para gráficos (sem dependência)

## Motor de física (`js/core.js`)

`window.FIS` expõe:

- `C` — constantes: `k, e, eps0, mu0, h, hbar, c, kB, R, Na, mp, me, g`
- `coulomb(q1,q2,r)`, `campoQ(Q,r)`, `potencialQ(Q,r)`, `energiaU(q1,q2,r)`
- `Bfio(I,r)`, `Fmag(q,v,B,ang)`, `Ffio(B,I,L,ang)`, `fluxo(B,A,ang)`, `fem(N,dPhi,dt)`
- `fotonE(f)`, `fotoeletrico(f,phi)`, `deBroglie(m,v)`, `bohrEn(n)`, `decaimento(N0,lambda,t)`, `meiavida(lambda)`
- `ohm(U,R)`, `serie(Rs)`, `paralelo(Rs)`, `pot(U,I)`, `potRI(R,I)`, `capQ(C,U)`, `capE(C,U)`
- `gas(P,V,n,T)` — resolve a variável faltante via `PV=nRT`
- `Umono(n,T)`, `Wisobarico(P,dV)`, `rendimento(W,Qq)` (ciclo), `carnot(Th,Tc)`, `adiabT/adiabP`
- `fmt(x)` — notação científica legível, `store` — save/load em localStorage

Todas as simulações chamam essas funções. Nada é animação decorativa: o número na tela sai da fórmula.

## Destaques por módulo

- **Eletrostática:** N cargas arrastáveis, pares + resultante por superposição, streamlines reais, equipotenciais, preset +2µC/−3µC a 0,30 m = 0,599 N.
- **Eletromagnetismo:** B com sinal da corrente, F=q(v×B) vetorial, r medido da posição 3D, massa por partícula, indução livre com Φ(t)/ε(t) ao vivo, câmera lenta didática declarada.
- **Eletrodinâmica:** terminais clicáveis + fios, solver topológico (série/paralelo/aberto/curto), capacitor RC temporal coerente (números = gráfico), preset 12V+6Ω → 2A/24W.
- **Termodinâmica:** isotérmica/isobárica/isocórica/**adiabática** (+isotérmica de referência), η do ciclo e η de Carnot separados.
- **Testes:** `node tests/run.js` — 38 testes (fórmulas, casos-limite, critérios de aceitação).

## Convenções visuais (iguais em todos os módulos)

| Cor | Significado |
|---|---|
| vermelho `#ff5b6e` | carga + / polo N / quente |
| azul `#4da3ff` | carga − / polo S / frio |
| amarelo `#ffcf4d` | vetores força / corrente convencional |
| verde `#5dffb0` | campo E/B, valores OK |
| roxo `#b78cff` | potencial / fótons |

Esquerda = biblioteca de peças. Centro = 3D (orbitar, zoom, arrastar). Direita = propriedades + fórmulas + números. Embaixo = gráfico/medições.

## Livros-base

1. **University Physics Vol. 2** (Young/Freedman, OpenStax) — eletrostática, eletrodinâmica, magnetismo, indução, termodinâmica.
2. **University Physics Vol. 3** (OpenStax) — fótons, átomos, radioatividade, relatividade.
3. **Moderna Plus — Física, Ciência e Tecnologia 1** — linguagem de Ensino Médio, mapas PAS.

Detalhe por fórmula em `docs/REFERENCIAS.md`.

## Qualidade

- Fórmulas com unidades SI, validação de domínio (ex.: `r>0`, `f>0`).
- Hipóteses explícitas em cada README de módulo + `docs/VALIDACAO.md` + página Teoria.
- Sem cálculo fictício: se o modelo não cobre, a UI avisa (ex.: topologia mista, câmera lenta).

---
OBS: Projeto Inteiramente de teste
