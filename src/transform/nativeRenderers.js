/**
 * PortabIA — rendus natifs : bundle pivot → fichier de règles natif de l'IA cible.
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * CLAUDE.md / AGENTS.md / GEMINI.md sont tous du Markdown structuré ; on génère un
 * corps cohérent à partir des axes du pivot (code_config + project surtout).
 * 100% déterministe, exécuté dans le navigateur.
 */
import { rulesFileFor, aiLabel } from '../adapters/registry.js'

function section(title, body) {
  if (!body || (Array.isArray(body) && body.length === 0)) return ''
  const content = Array.isArray(body) ? body.map((x) => `- ${typeof x === 'string' ? x : JSON.stringify(x)}`).join('\n') : String(body)
  return `\n## ${title}\n\n${content}\n`
}

/** Rend le fichier de règles natif (markdown) pour l'IA cible à partir du pivot. */
export function renderNativeRules(bundle, targetAi) {
  const file = rulesFileFor(targetAi)
  const code = bundle?.axes?.code_config || {}
  const proj = bundle?.axes?.project || {}
  const conv = bundle?.axes?.conversation || {}

  let md = `# ${file} — contexte porté vers ${aiLabel(targetAi)}\n`
  md += `\n> Généré par PortabIA (E²SN) — portabilité depuis ${aiLabel(bundle?.meta?.source_ai || 'unknown')}.\n`

  md += section('Règles & instructions', code.rules)
  md += section('Conventions', code.conventions)
  md += section('Objectifs du projet', proj.goals)
  md += section('État courant', proj.status)
  md += section('Tâches ouvertes', proj.open_tasks)
  md += section('Décisions clés', (proj.decisions_log || []).map((d) => (typeof d === 'string' ? d : d.title || JSON.stringify(d))))
  md += section('Glossaire', (proj.glossary || []).map((g) => (typeof g === 'string' ? g : `${g.term} : ${g.def || ''}`)))
  md += section('Mémoire / préférences', (proj.memory || []).map((m) => (typeof m === 'string' ? m : JSON.stringify(m))))
  if (conv.summary) md += section('Résumé de la conversation précédente (briefing)', conv.summary)
  if (code.mcp_servers?.length) md += section('Serveurs MCP', code.mcp_servers.map((s) => JSON.stringify(s)))
  if (code.slash_commands?.length) md += section('Commandes', code.slash_commands.map((s) => JSON.stringify(s)))

  md += `\n---\n_Porté avec PortabIA · service gratuit opéré par E²SN — Guillaume BOUTON._\n`
  return { filename: file, content: md }
}
