# Convenções do projeto

## Git — títulos de commit/push/PR
Conventional Commits: `<tipo>(<escopo>): <descrição no imperativo, minúscula, sem ponto final>` (máx. 72 caracteres).
Tipos: feat, fix, refactor, perf, style, test, docs, build, ci, chore, db, revert. Escopo obrigatório quando identificável.

## Build
`python gerar_painel.py` regenera `Painel_Cronograma_Combio.html` a partir de `painel_template.html`, `leitor_mpp.js` e dos logos. Nunca editar o HTML gerado à mão.
