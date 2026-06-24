#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Detective 5 canaux PortabIA — valide l'ajout de Copilot (6e IA).
Canaux : console, pageerror, network>=400, JS probes (DOM), screenshots.
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://portabia.essn.fr/"
AIS = ["Claude", "ChatGPT", "Gemini", "Mistral", "Grok", "Copilot"]
console_err, page_err, net_err = [], [], []

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 900},
                        service_workers="block")
    ctx.add_init_script("try{localStorage.cookie_consent='all'}catch(e){}")
    pg = ctx.new_page()
    pg.on("console", lambda m: console_err.append(m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: page_err.append(str(e)))
    pg.on("response", lambda r: net_err.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    pg.on("requestfailed", lambda r: net_err.append(f"FAIL {r.url}"))

    pg.goto(URL, wait_until="networkidle", timeout=30000)
    pg.wait_for_timeout(1200)

    # Canal 4 : probe DOM — noms d'IA dans l'animation hero (SVG <text>)
    hero_names = pg.eval_on_selector_all(
        "svg text", "els => els.map(e => e.textContent.trim())")
    hero_found = [a for a in AIS if a in hero_names]
    node_circles = pg.eval_on_selector_all(".pa-node", "els => els.length")

    # COMPAT : les 6 cartes IA doivent tenir sur UNE seule ligne (même top)
    rows_top = pg.eval_on_selector_all(
        ".pa-aicard", "els => els.map(e => Math.round(e.getBoundingClientRect().top))")
    compat_lines = len(set(rows_top))
    compat_count = len(rows_top)

    # Wizard : ouvrir l'étape source et compter les options IA
    wizard_count = None
    try:
        pg.get_by_text("Migrer mon contexte", exact=False).first.click(timeout=4000)
        pg.wait_for_timeout(800)
        wizard_count = pg.eval_on_selector_all(
            "[class*=card],[class*=Card],button",
            "els => els.filter(e => /Claude|ChatGPT|Gemini|Mistral|Grok|Copilot/.test(e.textContent)).length")
    except Exception as e:
        wizard_count = f"n/a ({type(e).__name__})"

    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(800)
    pg.locator("svg").first.screenshot(path="/home/dev/portabia/docs/detective/copilot-hero.png")
    b.close()

print("=== DÉTECTIVE PortabIA · Copilot ===")
print(f"URL                : {URL}")
print(f"Noms IA hero (SVG) : {hero_found}  ({len(hero_found)}/6)")
print(f"Nœuds .pa-node     : {node_circles}")
print(f"COMPAT cartes      : {compat_count} sur {compat_lines} ligne(s)  {'✅ une ligne' if compat_lines==1 and compat_count==6 else '⚠️'}")
print(f"Wizard options IA  : {wizard_count}")
print(f"Console err/warn   : {len(console_err)}  {console_err[:3]}")
print(f"PageError          : {len(page_err)}  {page_err[:3]}")
print(f"Network >=400      : {len(net_err)}  {net_err[:5]}")
ok = (len(hero_found) == 6 and node_circles == 6 and not page_err and not net_err)
print(f"\nVERDICT : {'✅ 6 IA, 0 erreur' if ok else '⚠️ à vérifier'}")
