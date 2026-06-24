#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Détective 5 canaux — fonctionnalité « migration intra-IA » Claude→Claude.
Canaux : console, pageerror, network>=400, probes DOM, screenshots.
Parcourt le wizard via le pont Claude→Claude, vérifie le wording « même compte »,
colle un bundle avec mémoire verbatim et valide le kit (CLAUDE.md + bloc mémoire + honnêteté).
"""
import sys, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://portabia.essn.fr/"
console_err, page_err, net_err = [], [], []
R = {}

BUNDLE = {"axes": {
    "code_config": {"rules": "Toujours répondre en français. Contact: jean@example.com"},
    "project": {"goals": ["Lancer PortabIA"], "memory": [{"verbatim": "Tu t'appelles Guillaume, basé à Lyon. Préfère le français. Token sk-ABC123XYZ."}]},
}}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 1000}, service_workers="block")
    ctx.add_init_script("try{localStorage.cookie_consent='all'}catch(e){}")
    pg = ctx.new_page()
    pg.on("console", lambda m: console_err.append(m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: page_err.append(str(e)))
    pg.on("response", lambda r: net_err.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    pg.on("requestfailed", lambda r: net_err.append(f"FAIL {r.url}"))

    pg.goto(URL, wait_until="networkidle", timeout=30000)
    pg.wait_for_timeout(900)

    # 1. Landing : le pont Claude → Claude existe
    R["bridge_claude_claude"] = pg.get_by_text("Claude → Claude", exact=False).count() > 0

    # 2. Entrer dans le wizard via ce pont
    pg.get_by_text("Claude → Claude", exact=False).first.click()
    pg.wait_for_timeout(600)
    # étape 0 (source) → Continuer vers destination
    pg.get_by_role("button", name="Continuer →").first.click()
    pg.wait_for_timeout(500)

    # 3. Étape destination : note « même IA, compte différent » visible
    R["same_account_note"] = pg.get_by_text("compte différent", exact=False).count() > 0
    # Claude doit être sélectionnable comme cible (6 cartes cibles)
    # avancer vers sélection puis générer
    pg.get_by_role("button", name="Continuer →").first.click()
    pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Générer le pont →").first.click()
    pg.wait_for_timeout(700)

    # 4. Étape résultat : prompt d'export Claude-aware
    body = pg.inner_text("body")
    R["export_same_account"] = ("CHANGE de compte Claude" in body) or ("change de compte Claude" in body.lower())
    R["export_claude_block"] = "SPÉCIFIQUE CLAUDE" in body

    # 5. Coller un bundle (Mode A round-trip) → kit réel
    ta = pg.locator("textarea").first
    ta.fill(json.dumps(BUNDLE))
    pg.wait_for_timeout(700)
    body2 = pg.inner_text("body")
    R["result_filename_claude"] = "CLAUDE.md" in body2
    R["memory_import_block"] = ("Mémoire à importer" in body2) or ("Démarrer l'import" in body2)
    R["honesty_note"] = "synthèse réutilisable" in body2
    # anonymisation : l'e-mail/secret collés ne doivent pas réapparaître en clair dans le rendu visible
    R["anonymized"] = ("jean@example.com" not in body2) and ("sk-ABC123XYZ" not in body2)

    pg.screenshot(path="/home/dev/portabia/docs/detective/intra-ai-result.png", full_page=True)
    b.close()

print("=== DÉTECTIVE PortabIA · migration intra-IA (Claude→Claude) ===")
print(f"URL : {URL}")
for k, v in R.items():
    print(f"  {'✅' if v else '❌'} {k}")
print(f"Console err/warn : {len(console_err)}  {console_err[:3]}")
print(f"PageError        : {len(page_err)}  {page_err[:3]}")
print(f"Network >=400    : {len(net_err)}  {net_err[:5]}")
ok = all(R.values()) and not page_err and not net_err
print(f"\nVERDICT : {'✅ tout vert' if ok else '⚠️ à vérifier'}")
sys.exit(0 if ok else 1)
