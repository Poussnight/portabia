/**
 * PortabIA — téléchargement du « pont » (100% navigateur, aucun upload).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 */

/** Déclenche le téléchargement d'un Blob côté client. */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Construit et télécharge le kit de migration « pont » en .json.
 * Contient tout ce qu'il faut pour une portabilité « Bring Your Own AI » :
 * le prompt d'export (à coller dans l'IA source), le prompt d'import + le
 * fichier natif (à déposer dans l'IA cible), et les métadonnées d'action.
 */
export function downloadBridge({ meta, exportPrompt, importPrompt, nativeFile, selection }) {
  const kit = {
    _produced_by: 'PortabIA — service gratuit opéré par E²SN — Guillaume BOUTON (Apache-2.0)',
    _notice: 'Données générées localement dans votre navigateur. Rien n\'a été envoyé à un serveur.',
    spec_version: '1.0',
    meta,
    selection,
    how_to: [
      '1. Copiez "export_prompt" et collez-le dans votre IA SOURCE pour qu\'elle produise votre contexte.',
      '2. Dans votre IA CIBLE, créez le fichier "native_file.filename" avec "native_file.content".',
      '3. Collez "import_prompt" dans l\'IA CIBLE pour qu\'elle adopte le contexte.',
    ],
    export_prompt: exportPrompt,
    import_prompt: importPrompt,
    native_file: nativeFile,
  }
  const name = `pont-${meta?.source_ai || 'src'}-vers-${meta?.target_ai || 'cible'}.json`
  downloadBlob(name, new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json' }))
}
