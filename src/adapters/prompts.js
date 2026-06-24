/**
 * PortabIA — générateur de prompts « Bring Your Own AI » (Mode A).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * On NE fait AUCUN appel d'IA. On génère deux prompts TEXTE que l'utilisateur
 * colle dans SA propre IA :
 *  1) buildExportPrompt : collé dans l'IA SOURCE → elle émet le bundle pivot JSON
 *     (selon le périmètre choisi).
 *  2) buildImportPrompt : collé dans l'IA CIBLE → elle adopte le contexte porté.
 */
import { AIS, aiLabel, rulesFileFor } from './registry.js'

const AXIS_LABELS = {
  code_config: 'Code & configuration d\'agent (règles, conventions, MCP, commandes, skills, réglages)',
  conversation: 'Historique conversationnel (résumé/handoff, décisions, artefacts)',
  project: 'Historique & état de projet (objectifs, décisions, état, tâches, glossaire, mémoire)',
}

/**
 * @param {string} sourceAi
 * @param {object} selection  { axes: { code_config?: {on, mode}, conversation?: {...}, project?: {...} }, scope: 'partial'|'total' }
 * @param {string} [targetAi]  cible (pour adapter le wording quand on reste sur la MÊME IA, autre compte)
 * @returns {string} prompt à coller dans l'IA source
 */
export function buildExportPrompt(sourceAi, selection, targetAi) {
  const ai = AIS[sourceAi] || { label: sourceAi }
  const sameAi = targetAi && sourceAi === targetAi
  const chosen = Object.entries(selection?.axes || {}).filter(([, v]) => v?.on)
  const scope = selection?.scope || 'total'

  const axisInstructions = chosen.map(([key, v]) => {
    // granularité fine : chaque axe peut être TOTAL / PARTIEL / DÉCISIONS (sinon repli sur le scope global)
    const axisScope = v.scope || scope
    const lvl = v.mode === 'summary' ? 'sous forme de RÉSUMÉ structuré (briefing/handoff)' :
      v.mode === 'decisions' ? 'en ne gardant QUE les décisions clés' :
      axisScope === 'partial' ? 'de façon PARTIELLE (uniquement l\'essentiel récent et réutilisable)' :
      'de façon COMPLÈTE'
    return `- **${AXIS_LABELS[key] || key}** : extrais ce contenu ${lvl}.`
  }).join('\n')

  const scopeLabel = scope === 'partial' ? 'PARTIEL' : scope === 'mixed' ? 'PERSONNALISÉ (par axe)' : 'TOTAL'

  const intro = sameAi
    ? `Tu es mon assistant ${ai.label}. Je CHANGE de compte ${ai.label} (par exemple à la suite d'un changement d'adresse e-mail) et je veux RETROUVER tout mon contexte de travail sur le nouveau compte.`
    : `Tu es mon assistant ${ai.label}. Je veux PORTER mon contexte de travail vers une autre IA.`

  // Bloc spécifique Claude : capture native de la mémoire + distinction règles globales/projet.
  const claudeBlock = sourceAi === 'claude' ? `

SPÉCIFIQUE CLAUDE — capture la plus complète et fidèle possible :
- **Mémoire** : restitue mes mémoires telles qu'elles apparaissent dans ta mémoire, intégralement et fidèlement (style/ton, détails personnels utiles, projets et objectifs récurrents, outils/langages/frameworks, préférences et corrections). Place ce texte dans "axes.project.memory" sous la forme d'UN élément objet { "verbatim": "<le texte intégral de la mémoire>" }. C'est ce bloc que je collerai dans Réglages → Capacités → « Démarrer l'import » de mon nouveau compte Claude.
- **Règles** : distingue mes instructions GLOBALES (qui valent partout, ~/.claude/CLAUDE.md) de mes règles de PROJET (CLAUDE.md du projet) si tu peux les inférer ; mets les globales dans "axes.code_config.rules" et les conventions de projet dans "axes.code_config.conventions".
- **Projets** : pour chaque projet/sujet récurrent, renseigne objectifs, décisions clés, état d'avancement et artefacts dans "axes.project".` : ''

  return `${intro}
Produis UNIQUEMENT un objet JSON valide conforme au schéma « E²SN Portable AI Context Spec v1 » ci-dessous,
sans aucun texte autour. N'invente rien : si une information est absente, omets le champ.

Périmètre demandé (${scopeLabel}) :
${axisInstructions || '- (aucun axe sélectionné)'}
${claudeBlock}

IMPORTANT (confidentialité) : remplace toute donnée sensible (e-mails, clés/API/tokens, mots de passe,
chemins personnels, URLs internes) par des marqueurs du type [EMAIL_1], [SECRET_1], [PATH_1].

Schéma à respecter (remplis seulement les axes demandés) :
{
  "spec_version": "1.0",
  "meta": { "source_ai": "${sourceAi}", "scope": "${scope}" },
  "axes": {
    "code_config": { "rules": "", "conventions": "", "mcp_servers": [], "slash_commands": [], "skills": [], "settings": {} },
    "conversation": { "mode": "summary", "summary": "", "decisions": [], "artifacts": [] },
    "project": { "goals": [], "decisions_log": [], "status": "", "open_tasks": [], "glossary": [], "memory": [], "file_map": [] }
  }
}

Réponds par le JSON seul.`
}

/**
 * @param {string} targetAi
 * @param {{filename:string, content:string}} nativeFile  rendu natif (AGENTS.md/CLAUDE.md/GEMINI.md)
 * @param {object} [opts]  { sameAccount?:boolean, hasMemory?:boolean }
 * @returns {string} prompt à coller dans l'IA cible
 */
export function buildImportPrompt(targetAi, nativeFile, opts = {}) {
  const ai = AIS[targetAi] || { label: targetAi }
  const file = nativeFile?.filename || rulesFileFor(targetAi)
  const memo = ai.rulesFile
    ? `Enregistre ce contenu dans un fichier \`${file}\` à la racine de mon projet, puis adopte-le comme contexte.`
    : `(${ai.label} n'a pas de fichier de règles natif : garde ce contexte en mémoire pour notre session et applique-le.)`

  const intro = opts.sameAccount
    ? `Tu es à nouveau mon assistant ${ai.label}, sur un nouveau compte. Je REPRENDS mon contexte de travail via PortabIA.`
    : `Tu es désormais mon assistant ${ai.label}. Je MIGRE mon contexte depuis une autre IA via PortabIA.`

  // Pour Claude, rappeler l'import natif de la mémoire (Réglages → Capacités → Démarrer l'import).
  const memoryNote = (targetAi === 'claude' && opts.hasMemory)
    ? `\nNote : le bloc « Mémoire à importer » présent dans le document doit être collé dans Réglages → Capacités → « Démarrer l'import » de ce compte Claude (import de mémoire natif), et non dans le fichier de règles.`
    : ''

  return `${intro}
Voici mon contexte de travail porté. ${memo}${memoryNote}
Confirme en une phrase que tu as bien intégré le contexte, puis attends mes instructions.

\`\`\`markdown
${nativeFile?.content || ''}
\`\`\``
}
