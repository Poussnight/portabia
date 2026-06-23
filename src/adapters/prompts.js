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
 * @returns {string} prompt à coller dans l'IA source
 */
export function buildExportPrompt(sourceAi, selection) {
  const ai = AIS[sourceAi] || { label: sourceAi }
  const chosen = Object.entries(selection?.axes || {}).filter(([, v]) => v?.on)
  const scope = selection?.scope || 'total'

  const axisInstructions = chosen.map(([key, v]) => {
    // granularité fine : chaque axe peut être TOTAL ou PARTIEL (sinon repli sur le scope global)
    const axisScope = v.scope || scope
    const lvl = v.mode === 'summary' ? 'sous forme de RÉSUMÉ structuré (briefing/handoff)' :
      v.mode === 'decisions' ? 'en ne gardant QUE les décisions clés' :
      axisScope === 'partial' ? 'de façon PARTIELLE (uniquement l\'essentiel récent et réutilisable)' :
      'de façon COMPLÈTE'
    return `- **${AXIS_LABELS[key] || key}** : extrais ce contenu ${lvl}.`
  }).join('\n')

  const scopeLabel = scope === 'partial' ? 'PARTIEL' : scope === 'mixed' ? 'PERSONNALISÉ (par axe)' : 'TOTAL'

  return `Tu es mon assistant ${ai.label}. Je veux PORTER mon contexte de travail vers une autre IA.
Produis UNIQUEMENT un objet JSON valide conforme au schéma « E²SN Portable AI Context Spec v1 » ci-dessous,
sans aucun texte autour. N'invente rien : si une information est absente, omets le champ.

Périmètre demandé (${scopeLabel}) :
${axisInstructions || '- (aucun axe sélectionné)'}

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
 * @returns {string} prompt à coller dans l'IA cible
 */
export function buildImportPrompt(targetAi, nativeFile) {
  const ai = AIS[targetAi] || { label: targetAi }
  const file = nativeFile?.filename || rulesFileFor(targetAi)
  const memo = ai.rulesFile
    ? `Enregistre ce contenu dans un fichier \`${file}\` à la racine de mon projet, puis adopte-le comme contexte.`
    : `(${ai.label} n'a pas de fichier de règles natif : garde ce contexte en mémoire pour notre session et applique-le.)`

  return `Tu es désormais mon assistant ${ai.label}. Je MIGRE mon contexte depuis une autre IA via PortabIA.
Voici mon contexte de travail porté. ${memo}
Confirme en une phrase que tu as bien intégré le contexte, puis attends mes instructions.

\`\`\`markdown
${nativeFile?.content || ''}
\`\`\``
}
