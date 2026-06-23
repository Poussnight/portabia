/**
 * PortabIA — Mode B : parseur d'export ChatGPT (conversations.json) → pivot.
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * 100% navigateur, déterministe, aucune IA. L'export ChatGPT est un tableau de
 * conversations, chacune avec un "mapping" (arbre de noeuds message). On linéarise
 * la branche courante (current_node → parents) et on produit l'axe conversation
 * du pivot (résumé léger = liste ordonnée des tours).
 */

/** Linéarise une conversation ChatGPT (mapping en arbre) en messages ordonnés. */
function linearizeConversation(conv) {
  const mapping = conv?.mapping || {}
  const out = []
  // Remonter depuis current_node vers la racine, puis inverser.
  let nodeId = conv?.current_node
  const chain = []
  const guard = new Set()
  while (nodeId && mapping[nodeId] && !guard.has(nodeId)) {
    guard.add(nodeId)
    chain.push(mapping[nodeId])
    nodeId = mapping[nodeId].parent
  }
  chain.reverse()
  for (const node of chain) {
    const msg = node?.message
    if (!msg) continue
    const role = msg.author?.role
    if (!role || role === 'system') continue
    const parts = msg.content?.parts || []
    const text = parts.filter((p) => typeof p === 'string').join('\n').trim()
    if (!text) continue
    out.push({ role, content: text, ts: msg.create_time ? new Date(msg.create_time * 1000).toISOString() : undefined })
  }
  return out
}

/**
 * Parse le contenu d'un conversations.json ChatGPT (string ou objet déjà parsé).
 * @param {string|object} raw
 * @param {object} [opts] { maxConversations, maxMessagesPerConv }
 * @returns {{ bundle: object, stats: object }}
 */
export function parseChatgptExport(raw, opts = {}) {
  const { maxConversations = 50, maxMessagesPerConv = 200 } = opts
  let data
  try { data = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) {
    throw new Error('Fichier JSON invalide : ' + e.message)
  }
  const conversations = Array.isArray(data) ? data : (data?.conversations || [])
  if (!Array.isArray(conversations)) throw new Error('Format non reconnu (attendu : export ChatGPT conversations.json)')

  const kept = conversations.slice(0, maxConversations)
  const blocks = []
  let totalMsgs = 0
  for (const conv of kept) {
    const msgs = linearizeConversation(conv).slice(0, maxMessagesPerConv)
    if (!msgs.length) continue
    totalMsgs += msgs.length
    const title = (conv?.title || 'Conversation').trim()
    const lines = msgs.map((m) => `${m.role === 'user' ? 'Vous' : 'Assistant'} : ${m.content}`)
    blocks.push(`### ${title}\n${lines.join('\n')}`)
  }

  const bundle = {
    spec_version: '1.0',
    meta: { source_ai: 'openai', scope: kept.length < conversations.length ? 'partial' : 'total' },
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
