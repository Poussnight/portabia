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

/** Extrait le texte de mémoire « verbatim » des entrées project.memory (objet {verbatim} ou string). */
export function extractVerbatimMemory(proj) {
  const mem = proj?.memory || []
  const parts = []
  for (const m of mem) {
    if (m && typeof m === 'object' && m.verbatim) parts.push(String(m.verbatim))
  }
  return parts.join('\n\n').trim()
}

/** Rend le fichier de règles natif (markdown) pour l'IA cible à partir du pivot. */
export function renderNativeRules(bundle, targetAi) {
  const file = rulesFileFor(targetAi)
  const code = bundle?.axes?.code_config || {}
  const proj = bundle?.axes?.project || {}
  const conv = bundle?.axes?.conversation || {}
  const sourceAi = bundle?.meta?.source_ai || 'unknown'
  const sameAccount = sourceAi === targetAi
  const verbatimMemory = extractVerbatimMemory(proj)

  const headTitle = sameAccount
    ? `${file} — contexte repris sur un nouveau compte ${aiLabel(targetAi)}`
    : `${file} — contexte porté vers ${aiLabel(targetAi)}`
  let md = `# ${headTitle}\n`
  md += sameAccount
    ? `\n> Généré par PortabIA (E²SN) — reprise de contexte sur un nouveau compte ${aiLabel(targetAi)} (ex. changement d'e-mail).\n`
    : `\n> Généré par PortabIA (E²SN) — portabilité depuis ${aiLabel(sourceAi)}.\n`

  md += section('Règles & instructions', code.rules)
  md += section('Conventions', code.conventions)
  md += section('Objectifs du projet', proj.goals)
  md += section('État courant', proj.status)
  md += section('Tâches ouvertes', proj.open_tasks)
  md += section('Décisions clés', (proj.decisions_log || []).map((d) => (typeof d === 'string' ? d : d.title || JSON.stringify(d))))
  md += section('Glossaire', (proj.glossary || []).map((g) => (typeof g === 'string' ? g : `${g.term} : ${g.def || ''}`)))
  // Mémoire : si verbatim (cible Claude), on la sort dans un bloc dédié plus bas ; sinon, en préférences.
  if (!verbatimMemory) {
    md += section('Mémoire / préférences', (proj.memory || []).map((m) => (typeof m === 'string' ? m : (m && m.verbatim) || JSON.stringify(m))))
  }
  if (conv.summary) md += section('Résumé de la conversation précédente (briefing)', conv.summary)
  if (conv.decisions?.length) md += section('Décisions (conversation)', conv.decisions.map((d) => (typeof d === 'string' ? d : d.title || JSON.stringify(d))))
  if (conv.artifacts?.length) md += section('Artefacts produits', conv.artifacts.map((a) => (typeof a === 'string' ? a : a.name || JSON.stringify(a))))
  if (code.mcp_servers?.length) md += section('Serveurs MCP', code.mcp_servers.map((s) => JSON.stringify(s)))
  if (code.slash_commands?.length) md += section('Commandes', code.slash_commands.map((s) => JSON.stringify(s)))

  // ── Bloc « Mémoire à importer » : cible Claude, import natif (Réglages → Capacités → Démarrer l'import) ──
  if (targetAi === 'claude' && verbatimMemory) {
    md += `\n---\n\n## 🧠 Mémoire à importer (à NE PAS mettre dans ${file})\n`
    md += `\nÀ coller dans **Réglages → Capacités → Mémoire → « Démarrer l'import »** de votre compte ${aiLabel(targetAi)}`
    md += ` (import de mémoire natif Claude — expérimental côté Anthropic) :\n`
    md += `\n\`\`\`text\n${verbatimMemory}\n\`\`\`\n`
  }

  md += `\n---\n_Porté avec PortabIA · service gratuit opéré par E²SN — Guillaume BOUTON._\n`
  return { filename: file, content: md, hasMemory: !!verbatimMemory }
}
