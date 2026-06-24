/**
 * PortabIA — Mode B : parseur d'export Claude (conversations.json) → pivot.
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * 100% navigateur, déterministe, aucune IA. L'export de données Claude est un
 * tableau de conversations ; chaque conversation a `chat_messages` (liste plate,
 * déjà ordonnée) avec `sender` ('human'|'assistant') et `text` (ou `content[].text`).
 * On produit l'axe `conversation` du pivot (résumé/handoff = tours ordonnés).
 */

/** Vrai si l'objet JSON ressemble à un export Claude (chat_messages/sender) plutôt qu'à ChatGPT (mapping). */
export function looksLikeClaudeExport(data) {
  const arr = Array.isArray(data) ? data : (data?.conversations || [])
  if (!Array.isArray(arr) || !arr.length) return false
  const c = arr[0] || {}
  if (Array.isArray(c.chat_messages)) return true
  // ChatGPT a un `mapping` (arbre) + `current_node` : on l'exclut explicitement.
  if (c.mapping || c.current_node) return false
  return false
}

/** Texte d'un message Claude : `text` direct, sinon concaténation de content[].text. */
function messageText(m) {
  if (typeof m?.text === 'string' && m.text.trim()) return m.text.trim()
  const parts = Array.isArray(m?.content) ? m.content : []
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).filter(Boolean).join('\n').trim()
}

/**
 * Parse le contenu d'un conversations.json Claude (string ou objet déjà parsé).
 * @param {string|object} raw
 * @param {object} [opts] { maxConversations, maxMessagesPerConv }
 * @returns {{ bundle: object, stats: object }}
 */
export function parseClaudeExport(raw, opts = {}) {
  const { maxConversations = 50, maxMessagesPerConv = 200 } = opts
  let data
  try { data = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) {
    throw new Error('Fichier JSON invalide : ' + e.message)
  }
  const conversations = Array.isArray(data) ? data : (data?.conversations || [])
  if (!Array.isArray(conversations) || !conversations.length) {
    throw new Error('Format non reconnu (attendu : export Claude conversations.json)')
  }

  const kept = conversations.slice(0, maxConversations)
  const blocks = []
  let totalMsgs = 0
  for (const conv of kept) {
    const msgs = Array.isArray(conv?.chat_messages) ? conv.chat_messages.slice(0, maxMessagesPerConv) : []
    const lines = []
    for (const m of msgs) {
      const txt = messageText(m)
      if (!txt) continue
      const who = m?.sender === 'human' ? 'Vous' : 'Assistant'
      lines.push(`${who} : ${txt}`)
    }
    if (!lines.length) continue
    totalMsgs += lines.length
    const title = (conv?.name || 'Conversation').trim() || 'Conversation'
    blocks.push(`### ${title}\n${lines.join('\n')}`)
  }

  if (!blocks.length) throw new Error('Aucun message exploitable dans cet export Claude.')

  const bundle = {
    spec_version: '1.0',
    meta: { source_ai: 'claude', scope: kept.length < conversations.length ? 'partial' : 'total' },
    axes: {
      conversation: {
        mode: 'summary',
        summary: blocks.join('\n\n').slice(0, 200000), // garde-fou taille
      },
    },
  }
  return {
    bundle,
    stats: {
      conversations_total: conversations.length,
      conversations_kept: blocks.length,
      messages: totalMsgs,
      truncated: kept.length < conversations.length,
    },
  }
}
