#!/usr/bin/env python3
"""PortabIA — carrousel LinkedIn promotionnel à la charte V3 (Instrument Serif + Geist, tokens oklch).
Rend 7 slides 1080x1350 via Chromium (fidélité charte parfaite), assemble un PDF + PNGs.
E²SN — Guillaume BOUTON."""
import asyncio, os
from PIL import Image

FONTS = '/home/dev/portabia/docs/claude-design-package/charte-v3/fonts'
OUTDIR = '/home/dev/portabia/docs/marketing'
WORK = '/tmp/carousel'
os.makedirs(OUTDIR, exist_ok=True)
os.makedirs(WORK, exist_ok=True)

FACE = f"""
@font-face {{ font-family:'Geist'; font-weight:400; src:url('file://{FONTS}/geist-400-normal-latin.woff2') format('woff2'); }}
@font-face {{ font-family:'Geist'; font-weight:600; src:url('file://{FONTS}/geist-600-normal-latin.woff2') format('woff2'); }}
@font-face {{ font-family:'Instrument Serif'; font-style:normal; src:url('file://{FONTS}/instrument-serif-400-normal-latin.woff2') format('woff2'); }}
@font-face {{ font-family:'Instrument Serif'; font-style:italic; src:url('file://{FONTS}/instrument-serif-400-italic-latin.woff2') format('woff2'); }}
"""

# palette (oklch tokens charte)
NAVY="oklch(17% 0.050 248)"; CORAL="oklch(64% 0.150 30)"; CORAL4="oklch(72% 0.130 32)"
STONE50="oklch(98.5% 0.004 70)"; STONE200="oklch(91% 0.010 55)"; STONE300="oklch(83% 0.013 55)"; STONE500="oklch(52% 0.013 55)"

def wordmark(dark=False):
    c = "#fff" if dark else NAVY
    sub = STONE300 if dark else STONE500
    return f"""<div style="display:flex;align-items:center;gap:13px;">
      <div style="width:46px;height:46px;border-radius:13px;background:{NAVY if not dark else CORAL};position:relative;flex:none;">
        <span style="position:absolute;left:9px;top:2px;font-family:'Instrument Serif';font-size:30px;color:{STONE50};">E</span>
        <span style="position:absolute;left:25px;top:5px;font-family:'Instrument Serif';font-style:italic;font-size:15px;color:{CORAL if not dark else '#fff'};">2</span>
        <span style="position:absolute;left:25px;top:24px;font-family:'Geist';font-weight:600;font-size:10px;color:{STONE300};">SN</span>
      </div>
      <div style="line-height:1;">
        <div style="font-family:'Instrument Serif';font-size:30px;color:{c};">Portab<span style="font-style:italic;color:{CORAL4}">IA</span></div>
        <div style="font-family:'Geist';font-size:10px;letter-spacing:.16em;color:{sub};text-transform:uppercase;margin-top:4px;">par E²SN</div>
      </div></div>"""

def chip(name, color, dark=False):
    bg = "rgba(255,255,255,.06)" if dark else "#fff"
    bd = "rgba(255,255,255,.14)" if dark else STONE200
    tc = "#fff" if dark else NAVY
    return f"""<span style="display:inline-flex;align-items:center;gap:11px;padding:13px 22px 13px 14px;border:1px solid {bd};border-radius:999px;background:{bg};">
      <span style="width:30px;height:30px;border-radius:9px;background:{color};"></span>
      <span style="font-family:'Geist';font-weight:600;font-size:21px;color:{tc};">{name}</span></span>"""

def bridge_svg(stroke=CORAL):
    return f"""<svg width="220" height="120" viewBox="0 0 220 120" fill="none">
      <path d="M20 90 Q110 -10 200 90" stroke="{STONE300}" stroke-width="3"/>
      <path d="M20 90 Q110 -10 200 90" stroke="{stroke}" stroke-width="3" stroke-dasharray="7 12"/>
      <circle cx="20" cy="90" r="14" fill="{CORAL4}"/><circle cx="200" cy="90" r="14" fill="{NAVY}"/></svg>"""

def slide(inner, bg, n):
    foot_c = STONE300 if bg==NAVY else STONE500
    return f"""<div class="slide" style="width:1080px;height:1350px;background:{bg};position:relative;overflow:hidden;
      font-family:'Geist',sans-serif;padding:96px 90px;box-sizing:border-box;display:flex;flex-direction:column;">
      {inner}
      <div style="position:absolute;left:90px;bottom:54px;font-family:'Geist';font-size:19px;color:{foot_c};">portabia.essn.fr</div>
      <div style="position:absolute;right:90px;bottom:54px;font-family:'Geist';font-size:18px;color:{foot_c};">{n} / 7</div>
    </div>"""

def kicker(t, dark=False):
    return f"""<div style="font-family:'Geist';font-weight:600;font-size:18px;letter-spacing:.18em;text-transform:uppercase;color:{CORAL if not dark else CORAL4};margin-bottom:26px;">{t}</div>"""

def h(t, size, dark=False, mt=0):
    return f"""<div style="font-family:'Instrument Serif';font-size:{size}px;line-height:1.04;letter-spacing:-.01em;color:{'#fff' if dark else NAVY};margin-top:{mt}px;">{t}</div>"""

def p(t, dark=False, size=29, mt=28):
    return f"""<div style="font-family:'Geist';font-size:{size}px;line-height:1.5;color:{STONE300 if dark else STONE500};margin-top:{mt}px;max-width:30ch;">{t}</div>"""

# ---------------- SLIDES ----------------
S = []

# 1 — COVER (navy)
S.append(slide(f"""
  {wordmark(dark=True)}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-family:'Geist';font-weight:600;font-size:18px;letter-spacing:.18em;text-transform:uppercase;color:{CORAL4};margin-bottom:30px;">Gratuit · Open source</div>
    {h("Changez d'IA.<br>Gardez votre <span style='font-style:italic;color:"+CORAL4+"'>mémoire</span>.", 116, dark=True)}
    <div style="font-family:'Geist';font-size:30px;color:{STONE300};margin-top:34px;max-width:24ch;">Le RIO de l'intelligence artificielle.</div>
  </div>
  <div style="position:absolute;right:-40px;top:120px;opacity:.5;">{bridge_svg(CORAL4)}</div>
""", NAVY, 1))

# 2 — PROBLÈME (light)
S.append(slide(f"""
  {wordmark()}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    {kicker("Le problème")}
    {h("Vous changez d'IA…<br>et vous repartez de <span style='font-style:italic;color:"+CORAL+"'>zéro</span>.", 84)}
    {p("Instructions, préférences, projets, historique de travail : tout est à réexpliquer, à chaque fois. Des heures de contexte, perdues.", size=30)}
  </div>
""", STONE50, 2))

# 3 — SOLUTION (light)
S.append(slide(f"""
  {wordmark()}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    {kicker("La solution")}
    {h("PortabIA fait voyager votre contexte d'une IA à l'autre.", 80)}
    {p("Comme la portabilité du numéro pour le mobile : votre mémoire de travail vous suit, intacte, quand vous changez d'assistant.", size=30)}
    <div style="margin-top:46px;">{bridge_svg()}</div>
  </div>
""", STONE50, 3))

# 4 — 5 IA (navy)
S.append(slide(f"""
  {wordmark(dark=True)}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    {kicker("Compatible", dark=True)}
    {h("5 IA majeures.<br>Dans les <span style='font-style:italic;color:"+CORAL4+"'>deux sens</span>.", 82, dark=True)}
    <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:50px;max-width:760px;">
      {chip("Claude", "#C8643F", True)}{chip("ChatGPT", "#0E9A78", True)}{chip("Gemini", "#3B74E8", True)}{chip("Mistral", "#E8580F", True)}{chip("Grok", "#1b1b1f", True)}
    </div>
  </div>
""", NAVY, 4))

# 5 — COMMENT (light) 3 étapes
def step(num, title, body):
    return f"""<div style="display:flex;gap:22px;align-items:flex-start;margin-top:30px;">
      <div style="width:54px;height:54px;border-radius:14px;background:{CORAL};color:#fff;font-family:'Geist';font-weight:600;font-size:24px;display:flex;align-items:center;justify-content:center;flex:none;">{num}</div>
      <div><div style="font-family:'Geist';font-weight:600;font-size:28px;color:{NAVY};">{title}</div>
      <div style="font-family:'Geist';font-size:23px;color:{STONE500};margin-top:6px;line-height:1.45;max-width:30ch;">{body}</div></div></div>"""
S.append(slide(f"""
  {wordmark()}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    {kicker("Comment ça marche")}
    {h("Trois gestes.", 76)}
    {step("1","Choisissez le pont","Votre IA de départ, votre IA d'arrivée.")}
    {step("2","Sélectionnez ce qui compte","Tout, ou seulement l'essentiel — axe par axe.")}
    {step("3","Récupérez le vrai fichier","Un CLAUDE.md, un AGENTS.md… prêt à l'emploi.")}
  </div>
""", STONE50, 5))

# 6 — PRIVÉ & GRATUIT (light, carte navy)
def feat(t):
    return f"""<div style="display:flex;align-items:center;gap:14px;margin-top:20px;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-11" stroke="{CORAL4}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-family:'Geist';font-size:27px;color:#fff;">{t}</span></div>"""
S.append(slide(f"""
  {wordmark(dark=True)}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    {kicker("Privé par conception", dark=True)}
    {h("100 % dans votre navigateur.", 76, dark=True)}
    <div style="margin-top:36px;">
      {feat("Aucune donnée envoyée. Rien n'est stocké.")}
      {feat("Sans abonnement, sans API payante.")}
      {feat("Gratuit, et open source (Apache-2.0).")}
      {feat("Conçu RGPD &amp; IA Act.")}
    </div>
  </div>
""", NAVY, 6))

# 7 — CTA (coral)
S.append(slide(f"""
  {wordmark(dark=True)}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    {h("Essayez,<br>gratuitement.", 110, dark=True)}
    <div style="font-family:'Geist';font-size:30px;color:#fff;opacity:.92;margin-top:30px;max-width:24ch;">Sans inscription. Votre contexte vous suit, d'une IA à l'autre.</div>
    <div style="display:inline-flex;align-self:flex-start;margin-top:48px;background:#fff;color:{NAVY};font-family:'Geist';font-weight:600;font-size:30px;padding:22px 38px;border-radius:16px;">portabia.essn.fr →</div>
  </div>
""", CORAL, 7))

HTML = f"<!doctype html><html><head><meta charset='utf-8'><style>{FACE} *{{margin:0;padding:0;box-sizing:border-box}} body{{background:#333}} .slide{{margin:0}}</style></head><body>{''.join(S)}</body></html>"
open(f'{WORK}/carousel.html','w').write(HTML)

async def render():
    from playwright.async_api import async_playwright
    pngs=[]
    async with async_playwright() as pw:
        b=await pw.chromium.launch(); ctx=await b.new_context(viewport={'width':1080,'height':1350}, device_scale_factor=2)
        pg=await ctx.new_page()
        await pg.goto(f'file://{WORK}/carousel.html'); await pg.wait_for_timeout(900)
        slides = pg.locator('.slide')
        for i in range(await slides.count()):
            f=f'{OUTDIR}/portabia-carousel-{i+1}.png'
            await slides.nth(i).screenshot(path=f); pngs.append(f)
        await b.close()
    return pngs

pngs = asyncio.run(render())
# PDF multi-pages (LinkedIn document carousel)
imgs=[Image.open(p).convert('RGB') for p in pngs]
pdf=f'{OUTDIR}/portabia-carousel-linkedin.pdf'
imgs[0].save(pdf, save_all=True, append_images=imgs[1:])
print(f'✅ {len(pngs)} slides + PDF: {pdf}')
print('\n'.join(pngs))
