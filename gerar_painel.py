"""Monta o Painel_Cronograma_Combio.html (arquivo único, em branco) a partir de painel_template.html,
leitor_mpp.js e dos logos. Só é necessário rodar se o template ou o leitor forem alterados:  python gerar_painel.py"""
import os, base64

BASE = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(BASE, n), encoding="utf-8").read()
b64 = lambda n: "data:image/png;base64," + base64.b64encode(open(os.path.join(BASE, n), "rb").read()).decode()

html = rd("painel_template.html")
html = html.replace("/*__MPP__*/", rd("leitor_mpp.js")).replace("__LOGO2__", b64("Logo Combio - verde.png")).replace("__LOGO__", b64("logo_combio_branco_transparente(1).png"))
out = os.path.join(BASE, "Painel_Cronograma_Combio.html")
open(out, "w", encoding="utf-8").write(html)
open(os.path.join(BASE, "index.html"), "w", encoding="utf-8").write(html)   # página do GitHub Pages
print("OK", out, f"({len(html) // 1024} KB)")
