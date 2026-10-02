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

## Painel online (GitHub Pages)
- Página: `index.html` (cópia do painel em branco, gerada por `python gerar_painel.py`). Os dados ficam em `dados.json`, **cifrado** (AES-GCM, chave derivada da senha); sem a senha o arquivo é ilegível.
- Visitante: abre o link, digita a senha e vê o último cronograma publicado. A página confere se há versão nova ao voltar para a aba e a cada 5 min.
- Admin: abra `<link>/#admin`, carregue o `.mpp` e clique em **Publicar online** (pede token do GitHub fine-grained, só este repo, *Contents: Read and write*; fica no navegador). O botão grava `dados.json` no repositório; o Pages atualiza em ~1 min, sem deploy manual.
- Ativar uma vez: GitHub → Settings → Pages → Branch `main` / pasta `/ (root)`.
