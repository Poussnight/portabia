# PortabIA — le RIO de l'IA

**Emportez votre contexte d'une IA à l'autre.** PortabIA génère, **100 % dans votre navigateur**,
un « pont » qui porte vos instructions, préférences et historique de travail d'une IA
(ChatGPT, Claude, Gemini, Mistral, Grok, GitHub Copilot) vers une autre — sans API, sans coût, sans que
votre contenu ne quitte votre machine.

🔗 **En ligne : https://portabia.essn.fr** — service gratuit opéré par [E²SN](https://essn.fr).

## Pourquoi

Changer d'IA, c'est aujourd'hui tout réexpliquer. PortabIA fait pour l'IA ce que la
portabilité du numéro (RIO) a fait pour le mobile : un export structuré et réutilisable
de votre contexte, que vous contrôlez de bout en bout.

## Comment ça marche (sans API — « Bring Your Own AI »)

PortabIA n'appelle **aucune** IA. Il génère du texte que **vous** exécutez dans votre IA :

1. **Choisissez** source → destination, et ce que vous emportez (granularité par axe :
   *Tout* ou *l'essentiel*).
2. **Mode A (sans fichier)** : copiez le *prompt d'export* dans votre IA source → elle
   renvoie un bundle structuré → vous le collez dans PortabIA → il produit le **vrai
   fichier natif** de la cible (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`…) + le prompt d'import.
3. **Mode B (avec fichier)** : déposez un export (`conversations.json` de ChatGPT, un
   `CLAUDE.md`, etc.) → conversion directe vers le format cible.

Toute donnée sensible (e-mails, clés, chemins) est **pseudonymisée** automatiquement
(`[EMAIL_1]`, `[SECRET_1]`, `[PATH_1]`).

## Confidentialité & conformité

- **Aucun contenu stocké** : les transformations sont 100 % navigateur.
- Le palier inscrit (optionnel) ne conserve que des **métadonnées d'action** (source, cible,
  axes, date) — jamais le contenu porté.
- Conçu RGPD / CNIL / IA Act *by design*.

## Stack

- **Frontend** : Vue 3 + Vite (moteur de portabilité en `src/engine.js`, 100 % navigateur).
- **Backend** (optionnel, palier inscrit) : Flask isolé — comptes, historique de
  métadonnées, parrainage. Voir `backend/`.

## Développement

```bash
npm install
npm run dev                 # preview locale (base /portabia/)
npm run build               # build preview
bash scripts/build-public.sh  # build production (base /, indexable) -> dist-public/
```

## Licence

[Apache-2.0](LICENSE) — © 2026 E²SN — Guillaume BOUTON. Voir [NOTICE](NOTICE).
