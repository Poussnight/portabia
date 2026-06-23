/**
 * PortabIA — registre des 5 IA majeures et de leurs spécificités.
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * Source de vérité des conventions par IA (fichiers de règles natifs, mémoire,
 * export de conversation, particularités). Alimente exporters/importers/prompts.
 * Marques citées à titre nominatif (interopérabilité) — non affilié.
 */

export const AIS = {
  claude: {
    id: 'claude',
    label: 'Claude (Anthropic)',
    tools: ['Claude.ai', 'Claude Code'],
    rulesFile: 'CLAUDE.md',
    rulesScopes: ['~/.claude/CLAUDE.md (global)', './CLAUDE.md (projet)', './CLAUDE.local.md'],
    memory: 'auto-memory (Claude écrit ses propres notes)',
    convExport: null, // pas d'export natif structuré
    mcp: true,
    slashCommands: true,
    notes: 'Écosystème MCP riche, 90+ slash commands, settings.json.',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (ChatGPT / Codex)',
    tools: ['ChatGPT', 'Codex CLI'],
    rulesFile: 'AGENTS.md',
    rulesScopes: ['./AGENTS.md (projet)'],
    memory: 'Memory + Custom Instructions (opaques, non exportables en fichier)',
    convExport: 'conversations.json', // export de données ChatGPT (structure en arbre)
    mcp: true,
    slashCommands: true,
    notes: 'AGENTS.md = standard de facto. conversations.json = arbre (branches).',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    tools: ['Gemini app', 'Gemini CLI'],
    rulesFile: 'GEMINI.md',
    rulesScopes: ['~/.gemini/GEMINI.md', './GEMINI.md', './sub/GEMINI.md'],
    memory: 'save_memory / Auto Memory → écrit dans GEMINI.md',
    convExport: null, // import seulement
    mcp: true,
    slashCommands: true,
    notes: 'Hiérarchie 3 niveaux. /memory show.',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral (Le Chat)',
    tools: ['Le Chat', 'Codestral'],
    rulesFile: null, // pas de fichier .md natif (API-centric) → on génère AGENTS.md
    rulesScopes: [],
    memory: 'mémoire « graph-based » (côté service, opaque)',
    convExport: null,
    mcp: false,
    slashCommands: false,
    notes: 'Pas de fichier de règles natif → on fournit AGENTS.md + prompt à coller dans Le Chat.',
    fallbackRulesFile: 'AGENTS.md',
  },
  grok: {
    id: 'grok',
    label: 'Grok (xAI)',
    tools: ['Grok', 'Grok Build CLI'],
    rulesFile: 'CLAUDE.md', // Grok Build lit CLAUDE.md nativement
    rulesScopes: ['./CLAUDE.md', 'MEMORY.md (cross-session)'],
    memory: 'MEMORY.md cross-session + FTS5',
    convExport: null,
    mcp: true,
    slashCommands: true,
    notes: 'Compatible CLAUDE.md nativement + Grok Skills.',
  },
}

export const AI_IDS = Object.keys(AIS)

/** Nom du fichier de règles natif effectif pour une IA (fallback si besoin). */
export function rulesFileFor(aiId) {
  const ai = AIS[aiId]
  return ai?.rulesFile || ai?.fallbackRulesFile || 'AGENTS.md'
}

export function aiLabel(aiId) {
  return AIS[aiId]?.label || aiId
}
