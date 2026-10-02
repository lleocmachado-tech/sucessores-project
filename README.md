# Painel de Sucessoras — Combio

Painel em HTML único (sem servidor, sem instalação) que lê um cronograma do MS Project (`.mpp` 2010+ ou `.xml`) direto no navegador e mostra cada tarefa com todas as suas sucessoras em cascata: linha de base, datas atuais, desvios, % concluído, ordenação estilo Excel, versão para celular e relatório em PDF (impressão do navegador).

## Uso
Abra `Painel_Cronograma_Combio.html`, clique em **Carregar cronograma** e escolha o arquivo. Nada é enviado para fora do computador.
O botão **Salvar HTML** gera uma cópia autônoma com os dados carregados (útil para abrir no celular).

## Desenvolvimento
- `painel_template.html` — interface (HTML/CSS/JS)
- `leitor_mpp.js` — leitor do formato `.mpp` (MPP14) em JavaScript puro
- `gerar_painel.py` — monta `Painel_Cronograma_Combio.html` (template + leitor + logos): `python gerar_painel.py`

O leitor foi validado campo a campo contra o mpxj em vários `.mpp` (datas, linha de base, % e vínculos). Arquivos `.mpp` não são versionados (dados do cliente).
