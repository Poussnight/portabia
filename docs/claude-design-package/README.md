# Package Claude Design — PortabIA (by E²SN) — CHARTE V3

Base de travail pour l'univers graphique **B2C** de **PortabIA** (outil gratuit de portabilité d'historique
IA, conçu par E²SN — Guillaume BOUTON).

> ⚠️ Charte = **Claude Design V3** (éditoriale : encre profonde + accent **coral** + neutres **stone** +
> display **Instrument Serif** / sans **Geist**). **PAS** l'ancienne charte navy vif / Nunito.

## Contenu

- **`PROMPT-claude-design-portabia.md`** — prompt mission complet (brief V3 à coller à Claude Design).
- **`charte-v3/css/`** — tokens V3 : `tokens-e2sn.css` (source de vérité, oklch), `tokens-e2snauthor.css`,
  `variables.css`, `components-e2sn.css`, `style-v3.css`.
- **`charte-v3/fonts/`** — **Geist** (400/600) + **Instrument Serif** (normal + italic) + `fonts.css`.
- **`charte-v3/logos/E2snLogo.vue`** — wordmark V3 (E Instrument Serif + ² italic coral + SN Geist 600).
- **`captures-reference/landing-v3-*.png`** — landing E²SNauthor.fr en charte V3 (le ton à rappeler).

## Repères couleurs V3

| Rôle | Token (oklch) | ≈ hex |
|---|---|---|
| Encre / hero / texte | `--navy-900` oklch(17% 0.050 248) | ≈ #0d1b2a |
| Accent (CTA, emphase, « 2 ») | `--coral-500` oklch(64% 0.150 30) | ≈ #e07856 |
| Papier / surface | `--stone-50` | ≈ #f7f5f2 |
| Display | Instrument Serif (italique pour l'emphase) | |
| Sans / UI | Geist | |

## Méthode (tick-tock)

1. Coller le prompt + fournir cette base à Claude Design.
2. Claude Design rend une **preview** (landing + wizard + dark mode + tokens V3).
3. Valider / ajuster → intégration **incrémentale** (tokens → composants → pages) dans le dépôt Vue 3 + Vite.

Référence landing live : https://essnauthor.fr
