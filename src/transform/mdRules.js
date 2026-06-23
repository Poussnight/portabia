/**
 * PortabIA — Mode B : parseur d'un fichier de règles natif → pivot (axe code_config).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * CLAUDE.md / AGENTS.md / GEMINI.md / .cursorrules sont du Markdown/texte : on les
 * importe tels quels comme "rules", en détectant l'IA source d'après le nom de fichier.
 */

const FILE_TO_AI = {
  'claude.md': 'claude',
  'agents.md': 'openai',
  'gemini.md': 'gemini',
  '.cursorrules': 'unknown',
  'copilot-instructions.md': 'unknown',
  'memory.md': 'grok',
}

/** Devine l'IA source d'après le nom de fichier. */
export function aiFromFilename(filename = '') {
  const base = filename.toLowerCase().split('/').pop()
  return FILE_TO_AI[base] || 'unknown'
}

/**
 * @param {string} content  contenu du fichier de règles
 * @param {string} [filename]
 * @returns {{ bundle: object, stats: object }}
 */
export function parseRulesFile(content, filename = '') {
  const text = String(content || '').trim()
  if (!text) throw new Error('Fichier vide')
  const source = aiFromFilename(filename)
  const bundle = {
    spec_version: '1.0',
    meta: { source_ai: source, scope: 'total' },
    axes: { code_config: { rules: text.slice(0, 200000) } },
  }
  return { bundle, stats: { source_detected: source, chars: text.length } }
}
