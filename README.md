# Plataforma 3D Interativa de Física

Laboratório virtual de Física para Ensino Médio + PAS/UnB. Foco em **construir, manipular variáveis e observar consequências** — não é banco de questões.

## Estrutura

```
plataforma-fisica-3d/
├── index.html                  # hub com os 6 módulos
├── css/style.css               # tema único (glass dark + 3 colunas)
├── js/core.js                  # motor de cálculos: constantes, fórmulas, unidades, store
├── modulos/
│   ├── eletrostatica/          # MVP completo (Lei de Coulomb, E, V, U)
│   ├── eletromagnetismo/       # fio, espira, ímã, Faraday/Lenz
│   ├── fisica-moderna/         # fóton, fotoelétrico, Bohr, decaimento
│   ├── eletrodinamica/         # circuitos série/paralelo, Ohm, capacitor
│   ├── termodinamica/          # gás ideal, pistão, P–V, 1ª lei
│   └── livre/                  # modo livre: salvar/carregar/comparar
└── docs/
    ├── REFERENCIAS.md          # quais livros/seções embasam cada fórmula
    ├── VALIDACAO.md            # hipóteses, limites e domínios de validade
    └── PAS-UNB.md              # mapa para o PAS
```

Cada módulo tem `index.html` + `app.js` + `README.md` próprios. Nada de arquivo único gigante.

## Como rodar

Sem build, sem login, sem banco. Só abrir no navegador (precisa de internet p/ CDN do Three.js):

- `index.html` → hub
- ou direto: `modulos/eletrostatica/index.html`, etc.

Funciona por `file://` + CDN:
- `three@0.147.0` via jsdelivr (script global, sem importmap)
- KaTeX via CDN para fórmulas
- Canvas 2D nativo para gráficos (sem dependência)

## Motor de física (`js/core.js`)

`window.FIS` expõe:

- `C` — constantes: `k, e, eps0, mu0, h, hbar, c, kB, R, Na, g`
- `coulomb(q1,q2,r)`, `campoQ(Q,r)`, `potencialQ(Q,r)`, `energiaU(q1,q2,r)`
- `Bfio(I,r)`, `Fmag(q,v,B,ang)`, `Ffio(B,I,L,ang)`, `fluxo(B,A,ang)`, `fem(N,dPhi,dt)`
- `fotonE(f)`, `fotoeletrico(f,phi)`, `deBroglie(m,v)`, `decaimento(N0,lambda,t)`, `meiavida(lambda)`
- `ohm(U,R)`, `serie(Rs)`, `paralelo(Rs)`, `pot(U,I)`, `potRI(R,I)`, `capQ(C,U)`, `capE(C,U)`
- `gas(P,V,n,T)` — resolve a variável faltante via `PV=nRT`
- `Umono(n,T)`, `Wisobarico(P,dV)`, `rendimento(W,Qq)`
- `fmt(x)` — notação científica legível, `store` — save/load em localStorage

Todas as simulações chamam essas funções. Nada é animação decorativa: o número na tela sai da fórmula.

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

## Ordem de desenvolvimento (do PROMPT)

1. [ok] Base (câmera, painéis, sliders) — em `css/style.css` + cada `app.js`
2. [ok] Eletrostática (MVP: 2 cargas, vetores, F em tempo real)
3. [ok] Eletromagnetismo
4. [ok] Física Moderna
5. [ok] Eletrodinâmica
6. [ok] Termodinâmica
7. [ok] Integração (fórmulas, gráficos, save/compare no modo livre)

## Qualidade

- Fórmulas com unidades SI, validação de domínio (ex.: `r>0`, `f>0`).
- Hipóteses explícitas em cada README de módulo + `docs/VALIDACAO.md`.
- Sem cálculo fictício: se o modelo não cobre, a UI avisa.

---
OBS: Projeto Inteiramente de teste
