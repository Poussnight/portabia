# Mission Claude Design — Univers graphique B2C de « PortabIA » (by E²SN)

> ⚠️ CHARTE = **Claude Design V3** (la charte actuelle E²SN/E²SNauthor, fournie dans `charte-v3/`).
> **NE PAS** utiliser l'ancienne charte navy vif (#1E3A5F) / Nunito. La V3 est **éditoriale, chaleureuse,
> premium** : encre profonde + accent **coral** + neutres **stone** (papier) + display **Instrument Serif**.

## Contexte produit

**PortabIA** est un nouvel outil web **B2C grand public, 100 % gratuit et open-source** : « le RIO de
l'IA ». Il permet de **migrer son historique / contexte de travail d'une IA vers une autre** (Claude,
ChatGPT, Gemini, Mistral, Grok) sans rien perdre — comme la **portabilité du numéro mobile**.

À incarner : **souveraineté & confidentialité** (« vos données ne quittent jamais votre appareil ») ·
**interopérabilité** (ponts entre les 5 IA) · **gratuité & ouverture** (service gratuit opéré par E²SN,
open-source) · **maîtrise stratégique** de son avenir numérique.

## Charte Claude Design V3 (à respecter — voir `charte-v3/`)

- **Couleurs** (tokens dans `charte-v3/css/tokens-e2sn.css`, en oklch — source de vérité) :
  - **Encre / navy profond** : `--navy-900: oklch(17% 0.050 248)` (≈ deep ink #0d1b2a) — fonds hero, texte primaire.
  - **Accent CORAL** : `--coral-500: oklch(64% 0.150 30)` (≈ #e07856) — emphase, CTA, le « 2 » du wordmark.
  - **Neutres STONE chauds** (papier) : `--stone-50` (≈ #f7f5f2) surfaces, `--stone-700` texte secondaire.
  - Sémantiques : success/warning/danger/info (oklch).
- **Typographie** :
  - **Display = Instrument Serif** (titres ; **italique** pour l'emphase d'un mot, ex. landing E²SNauthor : « …*piloter* votre formation. »).
  - **Sans = Geist** (UI, corps, labels). **Mono = JetBrains Mono**.
- **Wordmark E²SN** (`charte-v3/logos/E2snLogo.vue`) : **E** Instrument Serif + **²** Instrument Serif *italic* coral
  + **SN** Geist 600, dans un carré arrondi encre. À réutiliser/adapter.
- **Formes** : radius généreux (cards/boutons), ombres douces, boutons ≥ 44px, focus visible 3px.
- **Référence vivante** : captures `captures-reference/landing-v3-*.png` (landing E²SNauthor.fr en V3) +
  live https://essnauthor.fr — c'est CE ton (hero encre, titres serif, coral, papier) qu'on veut, recadré B2C.

## Mission — univers graphique complet (preview validable)

Décliné sur : **1) Landing** (hero serif percutant en 10 s, preuve sociale 5 IA, « comment ça marche » en
3 étapes, FAQ, CTA, footer) · **2) App / Wizard** (parcours QCM : source → cible → quoi migrer → résultat) ·
**3) Dark mode** + responsive (768/1024/1440) · **4) Assets** (OG/social image, favicon, motif « ponts entre IA »).

## Direction artistique

- **Rappelle E²SNauthor V3** (continuité : encre + coral + stone + Instrument Serif/Geist) **recadré B2C
  grand public** : plus aéré, plus immédiat, plus « consumer » que l'app pro, tout en gardant l'élégance éditoriale.
- **Qualité agence, beau, dynamique** : niveau des leaders B2C 2026 (clarté + punch). Hero qui convainc en 10 s.
- **Motion tasteful** : scroll reveal, micro-interactions, animation des « ponts » entre logos d'IA, hover lift ;
  **respecter `prefers-reduced-motion`**.
- **Marque E²SN** : wordmark V3 visible + mention **« Un service gratuit opéré par E²SN »** (hero/header + footer
  « Conçu par E²SN — Guillaume BOUTON »).
- **Lois cognitives** : Hick (1 CTA primaire dominant/section), Miller (≤ 5 items/groupe), Fitts (CTA gros, sticky).
- **RGAA/WCAG 2.2 AA** : contraste ≥ 4.5:1, focus visible, cibles 44px.

## À refléter (marque & légal)

- Logos des 5 IA (Claude/ChatGPT/Gemini/Mistral/Grok) **neutres** + disclaimer « non affilié — marques de
  leurs détenteurs ».
- Badge réassurance **« 100 % dans votre navigateur · vos données ne sortent jamais »**.
- Partage social (LinkedIn, X, WhatsApp, Facebook, e-mail).
- Footer : CGU, mentions légales, confidentialité, encart « Transmission d'infos aux IA », attribution E²SN, GitHub (Apache-2.0).

## Base de travail fournie (dans ce ZIP)

- `charte-v3/css/` — **tokens V3** (`tokens-e2sn.css`, `tokens-e2snauthor.css`, `variables.css`,
  `components-e2sn.css`, `style-v3.css`).
- `charte-v3/fonts/` — **Geist** (400/600) + **Instrument Serif** (normal + italic) + `fonts.css`.
- `charte-v3/logos/E2snLogo.vue` — wordmark V3.
- `captures-reference/landing-v3-*.png` — landing E²SNauthor.fr en charte V3.

## Livrable

Une **preview** (landing + écran wizard + dark mode) + un **set de tokens CSS V3** dérivé (palette B2C :
encre/coral/stone), les composants clés (hero serif, cards « IA → IA », stepper QCM, boutons, badges
réassurance, footer), et les assets (favicon, OG, motif « ponts »). On itère en **tick-tock** → j'intègre
incrémentalement (tokens → composants → pages) dans le dépôt Vue 3 + Vite de PortabIA.

> Nom de travail : **PortabIA**. Taglines pistes : « Changez d'IA, gardez votre mémoire. » / « Votre contexte vous appartient. »
