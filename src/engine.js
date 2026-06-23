/**
 * PortabIA — orchestrateur du moteur de portabilité (100% navigateur, sans API).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 */
import { buildExportPrompt, buildImportPrompt } from './adapters/prompts.js'
import { renderNativeRules } from './transform/nativeRenderers.js'
import { pseudonymize } from './anonymize/pseudonymize.js'
import { aiLabel } from './adapters/registry.js'

/**
 * Mode A — génère le prompt d'export à coller dans l'IA SOURCE.
 * @returns {string}
 */
export function makeExportPrompt(sourceAi, selection) {
  return buildExportPrompt(sourceAi, selection)
}

/**
 * Une fois le bundle pivot obtenu (de l'IA source, ou via Mode B), produit le
 * fichier natif cible + le prompt d'import. Applique l'anonymisation si demandée.
 *
 * @param {object} params
 * @param {object} params.bundle  bundle pivot (E²SN Portable AI Context Spec v1)
 * @param {string} params.targetAi
 * @param {string} [params.timestamp] ISO (fourni par l'appelant — pas de Date.now ici)
 * @param {object} [params.anonymize] options de pseudonymisation (false pour désactiver)
 * @returns {{ nativeFile:{filename,content}, importPrompt:string, bundle:object, anonymizedCount:number }}
 */
export function makeImport({ bundle, targetAi, timestamp, anonymize = {} }) {
  let b = JSON.parse(JSON.stringify(bundle || {}))
  b.spec_version = '1.0'
  b.meta = { generator: 'PortabIA by E²SN', ...(b.meta || {}), target_ai: targetAi }
  if (timestamp) b.meta.generated_at = timestamp

  let anonymizedCount = 0
  if (anonymize) {
    b.meta.anonymized = true
    const walk = (obj) => {
      if (typeof obj === 'string') {
        const r = pseudonymize(obj, anonymize)
        anonymizedCount += r.count
        return r.text
      }
      if (Array.isArray(obj)) return obj.map(walk)
      if (obj && typeof obj === 'object') {
        const o = {}
        for (const k of Object.keys(obj)) o[k] = walk(obj[k])
        return o
      }
      return obj
    }
    b.axes = walk(b.axes || {})
  }

  const nativeFile = renderNativeRules(b, targetAi)
  const importPrompt = buildImportPrompt(targetAi, nativeFile)
  return { nativeFile, importPrompt, bundle: b, anonymizedCount }
}

/** Métadonnées d'action (pour l'historique côté backend — SANS contenu). */
export function actionMetadata({ sourceAi, targetAi, selection, timestamp }) {
  const axes = Object.entries(selection?.axes || {}).filter(([, v]) => v?.on).map(([k]) => k)
  return {
    source_ai: sourceAi,
    target_ai: targetAi,
    axes,
    scope: selection?.scope || 'total',
    at: timestamp || null,
    label: `${aiLabel(sourceAi)} → ${aiLabel(targetAi)}`,
  }
}
