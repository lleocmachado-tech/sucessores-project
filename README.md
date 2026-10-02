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
- Página: `index.html` (cópia do painel em branco, gerada por `python gerar_painel.py`). Os dados ficam em `dados/`: um `<nome>.json` por cronograma mais `dados/indice.json` (lista). Tudo **cifrado** (AES-GCM, chave derivada da senha única); sem a senha os arquivos são ilegíveis.
- Visitante: abre o link, digita a senha e escolhe o cronograma no seletor do cabeçalho. Link direto: `<link>/#c=<nome>`. A página confere se há versão nova ao voltar para a aba e a cada 5 min.
- Admin: abra `<link>/#admin`, carregue o `.mpp` e clique em **Publicar online** (escolha atualizar um já publicado, que mantém o link, ou criar novo). **Renomear** muda só o nome na lista (o link não muda). **Remover do online** apaga o cronograma selecionado. Pede token do GitHub fine-grained, só este repo, *Contents: Read and write*; fica no navegador.
- O Pages atualiza em ~1 min após cada publicação, sem deploy manual.
- Ativar uma vez: GitHub → Settings → Pages → Branch `main` / pasta `/ (root)`.
- Formato antigo (`dados.json` único na raiz) ainda abre se não houver `dados/indice.json`.
