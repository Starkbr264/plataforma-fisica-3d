# Física Moderna 3D — Fotoelétrico · Bohr · Decaimento

## Funções (todas via `window.FIS`)
- `fotonE(f)` → E=hf (J); `fotonF(λ)` → f=c/λ.
- `fotoeletrico(f, φ_eV)` → `{E, phi, Kmax, emite}` com `Kmax=max(0,hf−φ)`.
- `deBroglie(m,v)` → λ=h/p do elétron ejetado (p=√(2mKmax)).
- `bohrEn(n)` → −13.6/n² eV (em J); ΔE=|Enf−Eni|, λ=hc/ΔE.
- `decaimento(N0,λ,t)` → N=N₀e^(−λt); `meiavida(λ)` → ln2/λ.

## Fórmulas
- `E=hf` · `Kmax=hf−φ`, `f₀=φ/h` · `En=−13.6/n² eV` · `λ=h/p` · `N=N₀e^−λt`, `T½=ln2/λ`.

## Limites
- Bohr só hidrogenoides (H); n=1..3; aviso em tela: "modelo Bohr didático, não é orbital real".
- Fotoelétrico ignora estrutura de bandas / refletividade; taxa e velocidade dos elétrons ∝ Kmax (didático).
- Decaimento é valor esperado contínuo; pastilhas 3D arredondam para inteiro.

## Teste
- Preset Na: φ=2.3 eV, f=10¹⁵ Hz → `E≈4.14 eV`, `Kmax≈1.84 eV`, emite, f₀≈5.56×10¹⁴ Hz.
- Zn φ=4.3 eV na mesma f → sem emissão. Lyman 2→1 → ΔE=10.2 eV, λ≈122 nm.
