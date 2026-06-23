/**
 * PortabIA — pseudonymisation 100% navigateur (aucune donnée ne sort).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 *
 * Neutralise les données sensibles AVANT toute génération de sortie :
 * e-mails, clés/API/tokens/secrets, IBAN, téléphones, chemins absolus, URLs
 * internes, et noms fournis par l'utilisateur (dictionnaire éditable).
 *
 * Déterministe : un même motif → un même jeton (ex. EMAIL_1), pour préserver la
 * cohérence référentielle dans le texte porté.
 */

const PATTERNS = [
  // clés/secrets génériques (sk-..., ghp_..., AKIA..., longues chaînes base64)
  { key: 'SECRET', re: /\b(?:sk|pk|rk|ghp|gho|ghu|ghs|xoxb|xoxp|AKIA|ASIA)[-_][A-Za-z0-9_-]{8,}\b/g },
  { key: 'SECRET', re: /\b[A-Za-z0-9_-]{0,4}(?:secret|token|api[_-]?key|password|passwd|bearer)["'`:= ]{1,4}[A-Za-z0-9._\-/+=]{8,}\b/gi },
  { key: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { key: 'IBAN', re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}\b/g },
  { key: 'PHONE', re: /\b(?:\+\d{1,3}[ .-]?)?(?:\(?\d{1,4}\)?[ .-]?){2,5}\d{2,4}\b/g },
  // URLs internes / localhost / IP privées
  { key: 'INTERNAL_URL', re: /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])[^\s)'"]*/gi },
  // chemins absolus unix / home utilisateur
  { key: 'PATH', re: /(?:\/home\/[A-Za-z0-9._-]+|\/Users\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)[^\s)'":]*/g },
]

/**
 * @param {string} text
 * @param {object} opts
 * @param {boolean} [opts.secrets=true]
 * @param {boolean} [opts.emails=true]
 * @param {boolean} [opts.phones=true]
 * @param {boolean} [opts.paths=true]
 * @param {boolean} [opts.urls=true]
 * @param {string[]} [opts.names=[]] dictionnaire de noms à masquer
 * @returns {{ text: string, map: Record<string,string>, count: number }}
 */
export function pseudonymize(text, opts = {}) {
  const cfg = { secrets: true, emails: true, phones: true, paths: true, urls: true, names: [], ...opts }
  if (typeof text !== 'string' || !text) return { text: text || '', map: {}, count: 0 }
  const map = {}
  const counters = {}
  let out = text

  const enabled = (key) => {
    if (key === 'SECRET') return cfg.secrets
    if (key === 'EMAIL') return cfg.emails
    if (key === 'PHONE') return cfg.phones
    if (key === 'PATH') return cfg.paths
    if (key === 'INTERNAL_URL') return cfg.urls
    if (key === 'IBAN') return cfg.secrets
    return true
  }

  const token = (key, match) => {
    const existing = Object.keys(map).find((t) => map[t] === match)
    if (existing) return existing
    counters[key] = (counters[key] || 0) + 1
    const t = `[${key}_${counters[key]}]`
    map[t] = match
    return t
  }

  for (const { key, re } of PATTERNS) {
    if (!enabled(key)) continue
    out = out.replace(re, (m) => token(key, m))
  }

  // Noms fournis par l'utilisateur (échappés)
  for (const name of cfg.names.filter(Boolean)) {
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`\\b${safe}\\b`, 'g'), (m) => token('NAME', m))
  }

  return { text: out, map, count: Object.keys(map).length }
}

/** Compte ce qui SERAIT masqué, sans transformer (pour l'aperçu « avant/après »). */
export function previewSensitive(text, opts = {}) {
  const { count, map } = pseudonymize(text, opts)
  const byType = {}
  for (const t of Object.keys(map)) {
    const type = t.replace(/^\[|_\d+\]$/g, '')
    byType[type] = (byType[type] || 0) + 1
  }
  return { count, byType }
}
