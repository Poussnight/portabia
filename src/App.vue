<script setup>
/* PortabIA — landing + wizard (traduit du design Claude Design V3).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 * Le wizard câble le moteur réel (engine.js) — génération 100% navigateur, sans API. */
import { ref, reactive, computed } from 'vue'
import { makeExportPrompt, makeImport, actionMetadata } from './engine.js'
import { downloadBridge, downloadBlob } from './download/bundle.js'
import { LEGAL } from './content/legal.js'
import { parseChatgptExport } from './transform/chatgptExport.js'
import { parseRulesFile, aiFromFilename } from './transform/mdRules.js'
import { onMounted } from 'vue'
import AuthModal from './components/AuthModal.vue'
import AccountView from './components/AccountView.vue'
import { api, getToken, setToken } from './api/client.js'

const AIS = [
  { id: 'claude',  name: 'Claude',  mark: 'Cl', color: '#D97757', grad: 'radial-gradient(circle at 32% 28%,#E59A6E,#D97757)' },
  { id: 'chatgpt', name: 'ChatGPT', mark: 'Gp', color: '#10A37F', grad: 'radial-gradient(circle at 32% 28%,#3FB89E,#10A37F)' },
  { id: 'gemini',  name: 'Gemini',  mark: 'Ge', color: '#4F86E0', grad: 'radial-gradient(circle at 32% 28%,#7BA6EC,#4F86E0)' },
  { id: 'mistral', name: 'Mistral', mark: 'Mi', color: '#F2A93B', grad: 'radial-gradient(circle at 32% 28%,#F7C46A,#F2A93B)' },
  { id: 'grok',    name: 'Grok',    mark: 'Gr', color: '#2A2E37', grad: 'radial-gradient(circle at 32% 28%,#565B66,#2A2E37)' },
]
const byId = (id) => AIS.find((a) => a.id === id) || {}
// base servie (/ en prod, /portabia/ en preview) — pour les assets de public/
const base = import.meta.env.BASE_URL
const asset = (p) => base + p
// mapping vers le moteur (chatgpt -> openai)
const engineId = (id) => (id === 'chatgpt' ? 'openai' : id)

// items du wizard -> axes moteur
const ITEMS = [
  { id: 'conv',    title: 'Historique de conversations', body: 'Vos fils de discussion, ordonnés et horodatés.', axis: 'conversation' },
  { id: 'instr',   title: 'Instructions & préférences',  body: 'Vos consignes personnalisées et votre ton.',       axis: 'code_config' },
  { id: 'proj',    title: 'Projets & fichiers',          body: 'Dossiers de travail et documents attachés.',       axis: 'project' },
  { id: 'mem',     title: 'Mémoire / contexte long terme', body: 'Ce que l’IA a retenu de vous au fil du temps.',  axis: 'project' },
  { id: 'persona', title: 'Personas & styles',           body: 'Vos assistants et configurations sur mesure.',     axis: 'code_config' },
]

const view = ref('landing')
const theme = ref('light')
const step = ref(0)
const source = ref('chatgpt')
const target = ref(null)
const items = reactive({ conv: true, instr: true, mem: true, proj: false, persona: false })
// granularité fine par item : 'total' (tout) ou 'partial' (l'essentiel)
const gran = reactive({ conv: 'partial', instr: 'total', mem: 'total', proj: 'total', persona: 'total' })
const granOptions = [{ id: 'total', label: 'Tout' }, { id: 'partial', label: "L'essentiel" }]
function setGran(id, g) { gran[id] = g }
const faqOpen = ref(0)
const animOn = ref(true)

const themeIcon = computed(() => (theme.value === 'dark' ? '☀' : '☾'))
const animFlag = computed(() => (animOn.value ? 'on' : 'off'))

const legalId = ref('cgu')
const legalDoc = computed(() => LEGAL[legalId.value] || LEGAL.cgu)
function goWizard() { view.value = 'wizard'; step.value = 0 }
function goHome() { view.value = 'landing'; window.scrollTo(0, 0) }
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
function openLegal(id) { legalId.value = id; view.value = 'legal'; window.scrollTo(0, 0) }

// ---- Auth / compte ----
const currentUser = ref(null)
const showAuth = ref(false)
function onAuthed(user) { currentUser.value = user; showAuth.value = false; view.value = 'account'; window.scrollTo(0, 0) }
function logout() { setToken(null); currentUser.value = null; view.value = 'landing' }
function goAccount() { if (currentUser.value) { view.value = 'account'; window.scrollTo(0, 0) } else { showAuth.value = true } }
onMounted(async () => {
  // vérification e-mail via #verify=...
  const m = window.location.hash.match(/verify=([a-f0-9]+)/)
  if (m) { try { await api.verifyEmail(m[1]) } catch { /* */ } }
  if (getToken()) { try { currentUser.value = (await api.me()).user } catch { setToken(null) } }
  loadReviews()
})

/* ---------- LANDING data ---------- */
const ais = computed(() => AIS.map((a) => ({ ...a, markStyle: `background:${a.color}` })))
const heroPts = [[230, 45], [387, 159], [327, 343], [133, 343], [73, 159]]
const nodes = computed(() => AIS.map((a, i) => {
  const [x, y] = heroPts[i]
  return { ...a, x, y, cdx: x, cdy: y - 18, tx: x, ty: y + 6,
    anim: `transform-origin:${x}px ${y}px;animation:pa-float ${4.5 + i * 0.4}s var(--ease-in-out) ${i * 0.3}s infinite;` }
}))
const bridges = computed(() => [
  { from: 'chatgpt', to: 'claude',  title: 'ChatGPT → Claude',  body: 'Vos longues conversations et instructions, reprises dans Claude sans copier-coller.' },
  { from: 'claude',  to: 'gemini',  title: 'Claude → Gemini',   body: 'Projets et contexte transférés vers l’écosystème Google.' },
  { from: 'mistral', to: 'chatgpt', title: 'Mistral → ChatGPT', body: 'Changez de fournisseur souverain sans perdre votre mémoire de travail.' },
].map((b) => ({ ...b, fromMark: byId(b.from).mark, fromStyle: `background:${byId(b.from).grad}`, toMark: byId(b.to).mark, toStyle: `background:${byId(b.to).grad}` })))
function startBridge(b) { source.value = b.from; target.value = b.to; view.value = 'wizard'; step.value = 0 }

const steps = [
  { num: '01', icon: '🌉', title: 'Choisissez le pont', body: 'Sélectionnez l’IA de départ et l’IA d’arrivée. PortabIA connaît les formats des cinq grandes plateformes.' },
  { num: '02', icon: '☑️', title: 'Sélectionnez ce qui compte', body: 'Conversations, instructions, projets, mémoire : vous cochez, vous gardez la main.' },
  { num: '03', icon: '📥', title: 'Récupérez votre contexte', body: 'PortabIA traduit le tout dans le format de destination. Vous importez, vous reprenez où vous étiez.' },
]
const guarantees = [
  { color: '#1F9E96', title: 'Zéro serveur', body: 'La conversion s’exécute entièrement en local.' },
  { color: '#D97757', title: 'Hébergé en France', body: 'Le site est servi depuis l’UE, sans traceur tiers requis.' },
  { color: '#4F86E0', title: 'RGPD & IA Act', body: 'Transparence sur ce qui est transmis à chaque IA.' },
  { color: '#F2A93B', title: 'Open-source', body: 'Code auditable sous licence Apache-2.0.' },
]
const faqsRaw = [
  { q: 'Mes données sont-elles vraiment privées ?', a: 'Oui. Toute la conversion se fait localement, dans votre navigateur. Aucun historique n’est téléversé sur un serveur — PortabIA n’a pas de base de données de vos contenus.' },
  { q: 'C’est vraiment gratuit ?', a: 'Entièrement. PortabIA est un service public gratuit opéré par E²SN, publié en open-source sous licence Apache-2.0.' },
  { q: 'Quelles IA sont prises en charge ?', a: 'Claude, ChatGPT, Gemini, Mistral et Grok, dans les deux sens. D’autres ponts arrivent.' },
  { q: 'Que puis-je migrer exactement ?', a: 'Vos conversations, vos instructions et préférences, vos projets et fichiers, ainsi que la mémoire / le contexte long terme quand la plateforme l’expose.' },
  { q: 'PortabIA est-il affilié à ces IA ?', a: 'Non. C’est un outil indépendant d’interopérabilité. Les marques citées appartiennent à leurs détenteurs.' },
]
const faqs = computed(() => faqsRaw.map((f, i) => ({ ...f, open: faqOpen.value === i, sign: faqOpen.value === i ? '–' : '+' })))
function toggleFaq(i) { faqOpen.value = faqOpen.value === i ? null : i }
// ---- Partage social (fonctionnel) ----
const shareUrl = 'https://preview.essn.fr/portabia/'
const shareText = 'PortabIA — migrez gratuitement votre historique d\'une IA à l\'autre, sans rien perdre. Par E²SN.'
function shareTo(net) {
  const u = encodeURIComponent(shareUrl); const t = encodeURIComponent(shareText)
  const links = {
    in: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    X: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    wa: `https://wa.me/?text=${t}%20${u}`,
    f: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    '@': `mailto:?subject=${encodeURIComponent('PortabIA')}&body=${t}%20${u}`,
  }
  if (net === 'native' && navigator.share) { navigator.share({ title: 'PortabIA', text: shareText, url: shareUrl }).catch(() => {}); return }
  window.open(links[net] || links['@'], '_blank', 'noopener,width=620,height=560')
}
const socials = ['in', 'X', 'wa', 'f', '@']
const socialLabels = { in: 'LinkedIn', X: 'X', wa: 'WhatsApp', f: 'Facebook', '@': 'E-mail' }

// ---- Avis in-app (wirés au backend) ----
const reviews = ref([])
const placeholderReviews = [
  { rating: 5, comment: 'Enfin un moyen simple de changer d\'IA sans tout réécrire. Et mes données ne quittent pas mon ordi.', author_name: 'Formatrice indépendante' },
  { rating: 5, comment: 'J\'ai migré mon CLAUDE.md vers AGENTS.md en deux clics. Bluffant et gratuit.', author_name: 'Développeur' },
  { rating: 4, comment: 'L\'idée du « RIO de l\'IA » est géniale. Le côté souverain et open-source rassure.', author_name: 'Responsable formation' },
]
const reviewForm = reactive({ rating: 5, comment: '', author_name: '', website: '' })
const reviewMsg = ref(null)
async function loadReviews() { try { reviews.value = (await api.reviewsList()).reviews || [] } catch { reviews.value = [] } }
async function submitReview() {
  reviewMsg.value = null
  try { await api.reviewAdd({ ...reviewForm }); reviewMsg.value = 'Merci ! Votre avis est soumis à modération.'; reviewForm.comment = ''; reviewForm.author_name = '' }
  catch (e) { reviewMsg.value = '⚠ ' + e.message }
}

/* ---------- WIZARD ---------- */
const selCard = (on) => on
  ? 'border-color:var(--coral-500);box-shadow:var(--shadow-glow-coral);background:var(--surface-elevated);'
  : 'border-color:var(--border-default);background:var(--surface-elevated);'
const sourceList = computed(() => AIS.map((a) => ({ ...a, markStyle: `background:${a.color}`, cardStyle: selCard(source.value === a.id) })))
const targetList = computed(() => AIS.filter((a) => a.id !== source.value).map((a) => ({ ...a, markStyle: `background:${a.color}`, cardStyle: selCard(target.value === a.id) })))
function pickSource(id) { source.value = id; if (target.value === id) target.value = null }
function pickTarget(id) { target.value = id }
const itemList = computed(() => ITEMS.map((it) => {
  const on = !!items[it.id]
  return { ...it, on, granVal: gran[it.id] || 'total', check: on ? '✓' : '',
    rowStyle: on ? 'border-color:var(--coral-500);background:color-mix(in oklab,var(--coral-500) 7%,var(--surface-elevated));' : 'border-color:var(--border-default);background:var(--surface-elevated);',
    boxStyle: on ? 'background:var(--coral-500);' : 'background:transparent;border:2px solid var(--border-strong);' }
}))
function segStyle(it, gid) {
  const active = it.granVal === gid
  return 'font-family:var(--font-sans);font-size:12.5px;font-weight:600;padding:5px 12px;border-radius:999px;cursor:pointer;' +
    (active ? 'background:var(--coral-500);color:#fff;border:1px solid var(--coral-500);'
            : 'background:transparent;color:var(--text-secondary);border:1px solid var(--border-default);')
}
function toggleItem(id) { items[id] = !items[id] }

const stepNames = ['Source', 'Destination', 'À migrer', 'Pont prêt']
const stepDots = computed(() => [0, 1, 2, 3].map((i) => ({ style: i <= step.value ? 'background:var(--coral-500);' : 'background:var(--border-default);' })))
const anySel = computed(() => Object.values(items).some(Boolean))
const canNext = computed(() => (step.value === 0 && !!source.value) || (step.value === 1 && !!target.value) || (step.value === 2 && anySel.value))
const nextStyle = computed(() => ((step.value === 3 ? true : canNext.value)
  ? 'background:var(--coral-500);opacity:1;cursor:pointer;'
  : 'background:var(--border-strong);opacity:.6;cursor:not-allowed;'))
const nextLabel = computed(() => (step.value === 2 ? 'Générer le pont →' : 'Continuer →'))
const selectedList = computed(() => ITEMS.filter((it) => items[it.id]))
const src = computed(() => byId(source.value))
const tgt = computed(() => byId(target.value))

// ---- Mode B : import d'un fichier d'export (optionnel) ----
const uploadedBundle = ref(null)
const uploadInfo = ref(null)
const uploadError = ref(null)
async function onFile(ev) {
  uploadError.value = null; uploadInfo.value = null; uploadedBundle.value = null
  const file = ev.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const isJson = file.name.toLowerCase().endsWith('.json')
    const res = isJson ? parseChatgptExport(text) : parseRulesFile(text, file.name)
    uploadedBundle.value = res.bundle
    uploadInfo.value = isJson
      ? `${res.stats.conversations_kept} conversation(s), ${res.stats.messages} messages importés`
      : `Fichier de règles importé (${aiFromFilename(file.name)})`
  } catch (e) {
    uploadError.value = e.message || 'Fichier non reconnu'
  }
  ev.target.value = ''
}

function buildSelection() {
  const axes = {}
  for (const it of ITEMS) {
    if (!items[it.id]) continue
    const g = gran[it.id] || 'total'
    // deux items peuvent viser le même axe (mem+proj, instr+persona) : 'total' (plus inclusif) l'emporte
    const cur = axes[it.axis]
    const scope = cur ? (cur.scope === 'total' || g === 'total' ? 'total' : 'partial') : g
    axes[it.axis] = { on: true, scope, mode: it.axis === 'conversation' ? (scope === 'partial' ? 'summary' : 'full') : undefined }
  }
  const scopes = Object.values(axes).map((a) => a.scope)
  const scope = scopes.length && scopes.every((s) => s === 'total') ? 'total'
    : scopes.length && scopes.every((s) => s === 'partial') ? 'partial' : 'mixed'
  return { scope, axes }
}

function next() {
  if (step.value < 3) {
    if (step.value < 2 && !canNext.value) return
    if (step.value === 2 && !anySel.value) return
    step.value += 1
  }
}
function prev() { step.value = Math.max(0, step.value - 1) }
function reset() { step.value = 0; target.value = null; pastedResponse.value = ''; uploadedBundle.value = null; uploadInfo.value = null }

/* ── Round-trip Mode A : coller la réponse de l'IA source -> vrai bundle ── */
const pastedResponse = ref('')
const copied = ref('')
function copy(text, key) {
  navigator.clipboard?.writeText(text).then(() => { copied.value = key; setTimeout(() => { copied.value = '' }, 1800) }).catch(() => {})
}
function parsePastedBundle(text) {
  if (!text || !text.trim()) return null
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    const obj = JSON.parse(t)
    if (obj && obj.axes) return { spec_version: '1.0', meta: { source_ai: engineId(source.value), scope: 'total' }, axes: obj.axes }
  } catch { /* pas du JSON : on traite comme résumé */ }
  return { spec_version: '1.0', meta: { source_ai: engineId(source.value), scope: 'total' }, axes: { conversation: { mode: 'summary', summary: text.trim().slice(0, 200000) } } }
}
// Le contenu réel : fichier déposé (Mode B) OU réponse collée de l'IA (Mode A).
const effectiveBundle = computed(() => uploadedBundle.value || parsePastedBundle(pastedResponse.value))
const exportPromptText = computed(() => makeExportPrompt(engineId(source.value), buildSelection()))
const resultFiles = computed(() => {
  const eb = effectiveBundle.value
  if (!eb) return null
  return makeImport({ bundle: eb, targetAi: engineId(target.value), timestamp: new Date().toISOString(),
                      anonymize: { secrets: true, emails: true, paths: true } })
})
const hasRealContent = computed(() => !!effectiveBundle.value)

function recordHistory() {
  if (!currentUser.value) return
  const meta = actionMetadata({ sourceAi: engineId(source.value), targetAi: engineId(target.value), selection: buildSelection(), timestamp: new Date().toISOString() })
  api.historyAdd({ source_ai: meta.source_ai, target_ai: meta.target_ai, axes: meta.axes, scope: meta.scope, label: meta.label }).catch(() => {})
}
/* Télécharge le VRAI fichier natif cible (ex. CLAUDE.md / AGENTS.md). */
function downloadNative() {
  const rf = resultFiles.value
  if (!rf) return
  downloadBlob(rf.nativeFile.filename, new Blob([rf.nativeFile.content], { type: 'text/markdown' }))
  recordHistory()
}
/* Télécharge le kit complet .json (prompts + fichier + métadonnées). */
function downloadKit() {
  const sAi = engineId(source.value), tAi = engineId(target.value)
  const selection = buildSelection()
  const ts = new Date().toISOString()
  const base = effectiveBundle.value || { spec_version: '1.0', meta: { source_ai: sAi, scope: 'total' }, axes: Object.fromEntries(Object.keys(selection.axes).map((k) => [k, {}])) }
  const { nativeFile, importPrompt } = makeImport({ bundle: base, targetAi: tAi, timestamp: ts, anonymize: { secrets: true, emails: true, paths: true } })
  const meta = actionMetadata({ sourceAi: sAi, targetAi: tAi, selection, timestamp: ts })
  downloadBridge({ meta, exportPrompt: exportPromptText.value, importPrompt, nativeFile, selection })
  recordHistory()
}
</script>

<template>
  <div :data-theme="theme" class="pa-app pa-grain" style="position:relative;font-family:var(--font-sans);background:var(--surface-canvas);color:var(--text-primary);min-height:100vh;-webkit-font-smoothing:antialiased;transition:background .4s ease,color .4s ease;">

    <!-- BANDEAU DÉCOUVERTE E²SN (visible dès le départ) -->
    <div style="position:relative;z-index:2;background:var(--navy-900);color:var(--cream-200);font-size:13px;line-height:1.4;">
      <div class="pa-promobar" style="max-width:var(--container);margin:0 auto;padding:9px 32px;display:flex;align-items:center;justify-content:center;gap:8px 20px;flex-wrap:wrap;text-align:center;">
        <span style="opacity:.92;">Un service <strong style="color:#fff;font-weight:600;">E²SN</strong> — souveraineté &amp; interopérabilité. Découvrez aussi&nbsp;:</span>
        <a href="https://essnauthor.fr" target="_blank" rel="noopener" style="color:var(--coral-400);text-decoration:none;font-weight:600;white-space:nowrap;">E²SNauthor (créer des formations) ↗</a>
        <span style="opacity:.35;">·</span>
        <a href="https://essn.fr/" target="_blank" rel="noopener" style="color:var(--coral-400);text-decoration:none;font-weight:600;white-space:nowrap;">ESSN — école · conseil · édition ↗</a>
      </div>
    </div>

    <!-- HEADER -->
    <header style="position:sticky;top:0;z-index:50;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:color-mix(in srgb,var(--surface-canvas) 80%,transparent);border-bottom:1px solid var(--border-subtle);">
      <div style="max-width:var(--container);margin:0 auto;padding:14px 32px;display:flex;align-items:center;gap:28px;">
        <button @click="goHome" aria-label="PortabIA — accueil" style="display:flex;align-items:center;gap:11px;background:none;border:none;cursor:pointer;padding:0;">
          <svg width="40" height="40" viewBox="0 0 80 80" fill="none" aria-hidden="true" style="flex:none;">
            <rect x="2" y="2" width="76" height="76" rx="18" fill="var(--navy-900)"/>
            <text x="20" y="55" font-family="Instrument Serif" font-size="44" fill="var(--cream-50)" letter-spacing="-0.04em">E</text>
            <text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="var(--coral-500)">2</text>
            <text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text>
          </svg>
          <span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1;">
            <span style="font-family:var(--font-serif);font-size:26px;color:var(--text-primary);">Portab<span style="font-style:italic;color:var(--coral-600);">IA</span></span>
            <span style="display:inline-flex;align-items:baseline;gap:3px;font-family:var(--font-sans);font-weight:600;font-size:9px;letter-spacing:.16em;color:var(--text-muted);text-transform:uppercase;margin-top:4px;">PAR <span class="brand-mark" style="font-size:11px;letter-spacing:0;">E<span class="sup">2</span>SN</span></span>
          </span>
        </button>
        <nav class="pa-nav-links" style="display:flex;align-items:center;gap:20px;margin-left:14px;">
          <a href="#how" style="font-size:14px;font-weight:500;color:var(--text-secondary);text-decoration:none;">Comment ça marche</a>
          <a href="#compat" style="font-size:14px;font-weight:500;color:var(--text-secondary);text-decoration:none;">Compatibilité</a>
          <a href="#faq" style="font-size:14px;font-weight:500;color:var(--text-secondary);text-decoration:none;">FAQ</a>
          <span style="width:1px;height:20px;background:var(--border-default);"></span>
          <a href="https://essnauthor.fr" target="_blank" rel="noopener" class="pa-ecochip" aria-label="E²SNauthor — site (nouvel onglet)">
            <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true" style="flex:none;"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--navy-900)"/><text x="16" y="21" text-anchor="middle" font-family="Geist, sans-serif" font-weight="700" font-size="14" fill="var(--cream-50)" letter-spacing="-0.04em">E²</text><circle cx="25" cy="7" r="3" fill="var(--coral-500)"/></svg>
            <span class="brand-mark" style="font-size:14px;">E<span class="sup">2</span>SN<span class="author-suffix">author</span></span><span class="arr">↗</span>
          </a>
          <a href="https://essn.fr/" target="_blank" rel="noopener" class="pa-ecochip" aria-label="E²SN — école · conseil · édition (nouvel onglet)">
            <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden="true" style="flex:none;"><rect x="2" y="2" width="76" height="76" rx="18" fill="var(--navy-900)"/><text x="20" y="55" font-family="Instrument Serif" font-size="44" fill="var(--cream-50)" letter-spacing="-0.04em">E</text><text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="var(--coral-500)">2</text><text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text></svg>
            <span class="brand-mark" style="font-size:14px;">E<span class="sup">2</span>SN</span><span class="arr">↗</span>
          </a>
        </nav>
        <div style="margin-left:auto;display:flex;align-items:center;gap:12px;">
          <span style="font-family:var(--font-sans);font-weight:600;font-size:12px;letter-spacing:.1em;color:var(--text-muted);">FR</span>
          <button @click="toggleTheme" aria-label="Basculer le thème" style="width:38px;height:38px;border-radius:999px;border:1px solid var(--border-default);background:var(--surface-elevated);color:var(--text-primary);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">{{ themeIcon }}</button>
          <button @click="goAccount" style="font-family:var(--font-sans);font-weight:600;font-size:14px;color:var(--text-primary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:999px;padding:10px 16px;cursor:pointer;min-height:44px;">{{ currentUser ? 'Mon compte' : 'Connexion' }}</button>
          <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:14.5px;color:#fff;background:linear-gradient(145deg,#E08763,#C9603F);border:none;border-radius:999px;padding:11px 20px;cursor:pointer;box-shadow:var(--shadow-glow-coral);min-height:44px;">Migrer maintenant →</button>
        </div>
      </div>
    </header>

    <!-- ===== LANDING ===== -->
    <main v-if="view==='landing'" style="position:relative;z-index:1;">
      <!-- HERO -->
      <section style="position:relative;overflow:hidden;">
        <span class="pa-blob" style="top:-140px;right:-120px;width:560px;height:560px;background:radial-gradient(circle,rgba(217,119,87,.22),transparent 62%);"></span>
        <span class="pa-blob" style="top:120px;left:-180px;width:520px;height:520px;background:radial-gradient(circle,rgba(79,134,224,.14),transparent 64%);"></span>
        <span class="pa-blob" style="bottom:-160px;right:18%;width:420px;height:420px;background:radial-gradient(circle,rgba(31,158,150,.12),transparent 64%);"></span>
        <div class="pa-hero-grid" style="position:relative;z-index:1;max-width:var(--container);margin:0 auto;padding:76px 32px 60px;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;">
          <div>
            <div style="display:inline-flex;align-items:center;gap:9px;padding:8px 16px;border:1px solid var(--glass-border);border-radius:999px;background:var(--glass-bg-strong);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:var(--font-sans);font-weight:600;font-size:12px;letter-spacing:.14em;color:var(--coral-700);animation:pa-rise .6s var(--ease-out) both;">
              <span style="width:7px;height:7px;border-radius:999px;background:var(--success);"></span>GRATUIT · OPEN SOURCE · PAR E²SN
            </div>
            <h1 style="font-family:var(--font-display);font-weight:700;font-size:clamp(44px,5.4vw,80px);line-height:1.02;letter-spacing:-.02em;margin:22px 0 0;color:var(--text-primary);text-wrap:balance;animation:pa-rise .7s .05s var(--ease-out) both;">Changez d'IA,<br>gardez votre <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:var(--coral-600);">mémoire</span>.</h1>
            <p style="font-size:20px;line-height:1.55;color:var(--text-secondary);max-width:36ch;margin:24px 0 0;animation:pa-rise .7s .12s var(--ease-out) both;">Le <strong style="color:var(--text-primary);font-weight:600;">RIO de l'IA</strong> : migrez votre historique et votre contexte de travail d'un assistant à l'autre, sans rien perdre.</p>
            <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:32px;animation:pa-rise .7s .18s var(--ease-out) both;">
              <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:#fff;background:linear-gradient(145deg,#E59A6E,#D97757);border:none;border-radius:16px;padding:17px 28px;cursor:pointer;box-shadow:var(--shadow-glow-coral);min-height:54px;">Migrer mon historique →</button>
              <a href="#how" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:var(--text-primary);background:var(--glass-bg-strong);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--border-default);border-radius:16px;padding:17px 26px;cursor:pointer;text-decoration:none;min-height:54px;display:inline-flex;align-items:center;">Voir comment ça marche</a>
            </div>
            <div style="display:inline-flex;align-items:center;gap:10px;margin-top:30px;padding:12px 18px;border-radius:14px;background:color-mix(in srgb,var(--teal) 12%,var(--surface-elevated));border:1px solid color-mix(in srgb,var(--teal) 30%,transparent);animation:pa-rise .7s .24s var(--ease-out) both;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex:none;"><path d="M12 2l8 4v5c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V6l8-4z" stroke="var(--teal)" stroke-width="1.8" fill="color-mix(in srgb,var(--teal) 18%,transparent)"/><path d="M8.5 12l2.4 2.4 4.6-5" stroke="var(--teal)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span style="font-size:13.5px;font-weight:500;color:var(--text-primary);">100 % dans votre navigateur · vos données ne sortent jamais de votre appareil</span>
            </div>
          </div>
          <!-- PONTS MOTIF (spectre multi-IA) -->
          <div :data-anim="animFlag" style="position:relative;display:flex;justify-content:center;animation:pa-rise .8s .2s var(--ease-out) both;">
            <svg viewBox="0 0 460 440" width="100%" style="max-width:540px;overflow:visible;">
              <defs><linearGradient id="paGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4F86E0"/><stop offset=".3" stop-color="#1F9E96"/><stop offset=".6" stop-color="#D97757"/><stop offset="1" stop-color="#F2A93B"/></linearGradient></defs>
              <g stroke="var(--border-strong)" stroke-width="2" fill="none" opacity="0.4">
                <path d="M230 205 Q250 110 230 45"/><path d="M230 205 Q330 150 387 159"/><path d="M230 205 Q300 290 327 343"/><path d="M230 205 Q160 290 133 343"/><path d="M230 205 Q120 150 73 159"/>
              </g>
              <g class="pa-bridge" stroke="url(#paGrad)" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-dasharray="7 13" style="animation:pa-flow 2.6s linear infinite;">
                <path d="M230 205 Q250 110 230 45"/><path d="M230 205 Q330 150 387 159"/><path d="M230 205 Q300 290 327 343"/><path d="M230 205 Q160 290 133 343"/><path d="M230 205 Q120 150 73 159"/>
              </g>
              <g v-for="n in nodes" :key="n.id" class="pa-node" :style="n.anim">
                <circle :cx="n.x" :cy="n.y" r="38" fill="var(--surface-elevated)" stroke="var(--border-default)" stroke-width="1.5"/>
                <circle :cx="n.x" :cy="n.y" r="38" :fill="n.color" opacity="0.10"/>
                <circle :cx="n.x" :cy="n.y - 8" r="13" :fill="n.color"/>
                <circle :cx="n.x" :cy="n.y - 8" r="13" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.4"/>
                <text :x="n.x" :y="n.y + 38 + 18" text-anchor="middle" font-family="Sora,sans-serif" font-size="15" font-weight="600" fill="var(--text-primary)">{{ n.name }}</text>
              </g>
              <g class="pa-hub" style="transform-origin:230px 205px;animation:pa-pulse 3.4s var(--ease-in-out) infinite;">
                <rect x="194" y="169" width="72" height="72" rx="20" fill="var(--navy-900)"/>
                <text x="212" y="218" font-family="Instrument Serif" font-size="40" fill="var(--cream-50)" letter-spacing="-0.04em">E</text>
                <text x="235" y="201" font-family="Instrument Serif" font-style="italic" font-size="20" fill="var(--coral-500)">2</text>
                <text x="235" y="218" font-family="Geist,sans-serif" font-size="13" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- COMPAT -->
      <section id="compat" style="max-width:var(--container);margin:0 auto;padding:48px 32px 8px;">
        <div style="text-align:center;margin-bottom:30px;">
          <p style="font-family:var(--font-sans);font-weight:600;font-size:13px;letter-spacing:.2em;color:var(--coral-700);text-transform:uppercase;margin:0 0 12px;">Compatible</p>
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(28px,3.4vw,42px);line-height:1.06;letter-spacing:-.02em;margin:0;color:var(--text-primary);">5 IA majeures. <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:var(--coral-600);">Dans les deux sens.</span></h2>
        </div>
        <div class="pa-aigrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px;">
          <div v-for="a in ais" :key="a.id" class="pa-aicard pa-glass" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:30px 12px;border-radius:24px;">
            <span :style="'width:60px;height:60px;border-radius:50%;background:'+a.grad+';box-shadow:0 8px 20px '+a.color+'66;'"></span>
            <span style="font-family:var(--font-sans);font-weight:600;font-size:19px;color:var(--text-primary);">{{ a.name }}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:30px;">
          <svg width="34" height="22" viewBox="0 0 34 22" fill="none"><path d="M10 3 L3 8 l7 5" stroke="var(--coral-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8 H31" stroke="var(--coral-600)" stroke-width="2" stroke-linecap="round"/><path d="M24 19 l7 -5 -7 -5" stroke="var(--coral-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 14 H3" stroke="var(--coral-600)" stroke-width="2" stroke-linecap="round"/></svg>
          <span style="font-family:var(--font-sans);font-weight:600;font-size:17px;color:var(--text-secondary);">Import <span style="color:var(--coral-600);">&amp;</span> export — sans perte</span>
        </div>
        <p style="font-size:12.5px;color:var(--text-muted);text-align:center;max-width:60ch;margin:24px auto 0;line-height:1.5;">PortabIA n'est affilié à aucun de ces services. Les noms et marques cités appartiennent à leurs détenteurs respectifs.</p>
      </section>

      <!-- DÉMO VIDÉO -->
      <section id="demo" style="max-width:1000px;margin:0 auto;padding:56px 32px 8px;">
        <div style="text-align:center;margin-bottom:26px;">
          <p style="font-family:var(--font-sans);font-weight:600;font-size:13px;letter-spacing:.2em;color:var(--coral-700);text-transform:uppercase;margin:0 0 10px;">Démo · 1 min</p>
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,46px);letter-spacing:-.02em;margin:0;color:var(--text-primary);">PortabIA en action.</h2>
          <p style="font-size:16.5px;color:var(--text-secondary);max-width:48ch;margin:14px auto 0;line-height:1.6;">À quoi ça sert, pourquoi c'est libre et gratuit, et comment porter votre contexte d'une IA à l'autre — en une minute.</p>
        </div>
        <div style="position:relative;border-radius:20px;overflow:hidden;border:1px solid var(--border-subtle);box-shadow:var(--shadow-lg);background:#0d1b2a;aspect-ratio:16/9;">
          <video controls preload="none" playsinline :poster="asset('demo-poster.jpg')" style="width:100%;height:100%;display:block;object-fit:cover;">
            <source :src="asset('demo.mp4')" type="video/mp4" />
            Votre navigateur ne peut pas lire cette vidéo. <a :href="asset('demo.mp4')">Télécharger la démo</a>.
          </video>
        </div>
      </section>

      <!-- COMMENT CA MARCHE -->
      <section id="how" style="max-width:var(--container);margin:0 auto;padding:84px 32px;">
        <div style="max-width:640px;">
          <p style="font-family:var(--font-sans);font-weight:600;font-size:13px;letter-spacing:.2em;color:var(--coral-700);text-transform:uppercase;margin:0;">Comment ça marche</p>
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(34px,4vw,50px);line-height:1.06;letter-spacing:-.02em;margin:14px 0 0;">Trois gestes, <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:var(--coral-600);">votre contexte vous suit</span>.</h2>
        </div>
        <div class="pa-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:46px;">
          <div v-for="st in steps" :key="st.num" class="pa-glass" style="padding:32px 30px;border-radius:24px;">
            <div style="font-family:var(--font-serif);font-style:italic;font-size:62px;line-height:.8;color:var(--coral-500);">{{ st.num }}</div>
            <h3 style="font-family:var(--font-display);font-weight:700;font-size:24px;line-height:1.12;margin:20px 0 10px;color:var(--text-primary);">{{ st.title }}</h3>
            <p style="font-size:15px;line-height:1.6;color:var(--text-secondary);margin:0;">{{ st.body }}</p>
          </div>
        </div>
      </section>

      <!-- IA -> IA CARDS -->
      <section style="max-width:var(--container);margin:0 auto;padding:0 32px 84px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:28px;">
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,3.4vw,42px);margin:0;letter-spacing:-.02em;">Des ponts dans les deux sens</h2>
          <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:14.5px;color:var(--coral-700);background:none;border:none;cursor:pointer;">Construire mon pont →</button>
        </div>
        <div class="pa-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
          <button v-for="b in bridges" :key="b.title" @click="startBridge(b)" class="pa-bridgecard pa-glass" style="text-align:left;padding:26px;border-radius:22px;cursor:pointer;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span :style="'width:40px;height:40px;border-radius:50%;flex:none;box-shadow:var(--shadow-sm);'+b.fromStyle"></span>
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none"><path d="M1 7h22M18 2l5 5-5 5" stroke="var(--coral-500)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span :style="'width:40px;height:40px;border-radius:50%;flex:none;box-shadow:var(--shadow-sm);'+b.toStyle"></span>
            </div>
            <h3 style="font-family:var(--font-sans);font-weight:600;font-size:16px;margin:18px 0 6px;color:var(--text-primary);">{{ b.title }}</h3>
            <p style="font-size:13.5px;line-height:1.55;color:var(--text-secondary);margin:0;">{{ b.body }}</p>
          </button>
        </div>
      </section>

      <!-- PRIVACY -->
      <section id="privacy" style="position:relative;overflow:hidden;background:radial-gradient(130% 110% at 18% 8%,#0A2036 0%,#001024 60%,#000B18 100%);color:var(--text-inverse);">
        <span class="pa-blob" style="bottom:-150px;left:-120px;width:520px;height:520px;background:radial-gradient(circle,rgba(31,158,150,.16),transparent 64%);"></span>
        <span class="pa-blob" style="top:-120px;right:-100px;width:480px;height:480px;background:radial-gradient(circle,rgba(217,119,87,.18),transparent 64%);"></span>
        <div class="pa-grid-2" style="position:relative;z-index:1;max-width:var(--container);margin:0 auto;padding:80px 32px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;">
          <div>
            <p style="font-family:var(--font-sans);font-weight:600;font-size:13px;letter-spacing:.2em;color:var(--coral-400);text-transform:uppercase;margin:0;">Privé par conception</p>
            <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(32px,3.6vw,46px);line-height:1.05;letter-spacing:-.02em;margin:14px 0 16px;color:#fff;">Vos données ne quittent <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:var(--coral-400);">jamais</span> votre appareil.</h2>
            <p style="font-size:16px;line-height:1.65;color:#AEB6C2;margin:0;max-width:46ch;">Toute la conversion se fait localement, dans votre navigateur. Aucun historique n'est téléversé. Open-source, auditable, sous licence Apache-2.0.</p>
          </div>
          <div style="display:grid;gap:14px;">
            <div v-for="g in guarantees" :key="g.title" style="display:flex;gap:16px;align-items:center;padding:20px 22px;border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.05);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);">
              <span :style="'width:13px;height:13px;border-radius:50%;flex:none;background:'+g.color+';box-shadow:0 0 0 5px '+g.color+'29;'"></span>
              <div><div style="font-weight:600;font-size:16px;color:#fff;">{{ g.title }}</div><div style="font-size:13.5px;color:#9BA3B0;margin-top:3px;line-height:1.5;">{{ g.body }}</div></div>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section id="faq" style="max-width:760px;margin:0 auto;padding:84px 32px;">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(32px,3.6vw,46px);text-align:center;letter-spacing:-.02em;margin:0 0 36px;">Questions fréquentes</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div v-for="(f,i) in faqs" :key="i" style="border:1px solid var(--border-subtle);border-radius:16px;background:var(--surface-elevated);overflow:hidden;">
            <button @click="toggleFaq(i)" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;background:none;border:none;cursor:pointer;text-align:left;font-family:var(--font-sans);font-weight:600;font-size:16px;color:var(--text-primary);">
              {{ f.q }}<span style="font-family:var(--font-mono);font-size:20px;color:var(--coral-600);flex:none;">{{ f.sign }}</span>
            </button>
            <p v-if="f.open" style="padding:0 22px 22px;margin:0;font-size:15px;line-height:1.65;color:var(--text-secondary);">{{ f.a }}</p>
          </div>
        </div>
      </section>

      <!-- AVIS + ANNUAIRES -->
      <section id="avis" style="max-width:var(--container);margin:0 auto;padding:0 32px 84px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:8px;">
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,3.4vw,42px);margin:0;letter-spacing:-.02em;">Ils ont repris la main</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span v-for="d in ['Trustpilot','G2','Capterra']" :key="d" style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--text-secondary);border:1px solid var(--border-default);border-radius:999px;padding:6px 13px;background:var(--surface-elevated);">★ {{ d }}</span>
          </div>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin:0 0 24px;">Avis vérifiés et modérés (CNIL/DGCCRF) — pas de faux avis.</p>
        <div class="pa-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:26px;">
          <div v-for="(r,i) in (reviews.length ? reviews.slice(0,3) : placeholderReviews)" :key="i" style="padding:22px;border:1px solid var(--border-subtle);border-radius:18px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);">
            <div style="color:var(--coral-500);font-size:15px;letter-spacing:2px;">{{ '★'.repeat(r.rating) }}<span style="color:var(--border-strong);">{{ '★'.repeat(5-r.rating) }}</span></div>
            <p style="font-size:14.5px;line-height:1.6;color:var(--text-primary);margin:12px 0 10px;">« {{ r.comment }} »</p>
            <div style="font-size:13px;color:var(--text-muted);">— {{ r.author_name || 'Utilisateur' }}</div>
          </div>
        </div>
        <!-- laisser un avis -->
        <details style="border:1px solid var(--border-subtle);border-radius:16px;background:var(--surface-elevated);padding:0 20px;">
          <summary style="cursor:pointer;padding:18px 0;font-weight:600;font-size:15px;color:var(--text-primary);list-style:none;">✍ Laisser un avis</summary>
          <form @submit.prevent="submitReview" style="display:flex;flex-direction:column;gap:12px;padding:0 0 20px;">
            <div style="display:flex;gap:10px;align-items:center;">
              <span style="font-size:13px;color:var(--text-secondary);">Note :</span>
              <button v-for="n in 5" :key="n" type="button" @click="reviewForm.rating=n" :style="'font-size:22px;background:none;border:none;cursor:pointer;color:'+(n<=reviewForm.rating?'var(--coral-500)':'var(--border-strong)')">★</button>
            </div>
            <input v-model="reviewForm.author_name" placeholder="Votre nom (optionnel)" style="font-size:14px;padding:10px 12px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);" />
            <textarea v-model="reviewForm.comment" required rows="3" placeholder="Votre retour…" style="font-size:14px;padding:10px 12px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);resize:vertical;"></textarea>
            <input v-model="reviewForm.website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;" aria-hidden="true" />
            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;"><button type="submit" style="font-weight:600;font-size:14px;color:#fff;background:var(--coral-500);border:none;border-radius:10px;padding:11px 20px;cursor:pointer;">Envoyer</button><span v-if="reviewMsg" style="font-size:13.5px;color:var(--text-secondary);">{{ reviewMsg }}</span></div>
          </form>
        </details>
      </section>

      <!-- ÉCOSYSTÈME E²SN (2 blocs jumeaux : E²SNauthor + ESSN) -->
      <section id="ecosysteme" style="max-width:var(--container);margin:0 auto;padding:0 32px 84px;">
        <div style="text-align:center;max-width:600px;margin:0 auto 36px;">
          <p style="font-family:var(--font-sans);font-weight:600;font-size:13px;letter-spacing:.2em;color:var(--coral-700);text-transform:uppercase;margin:0 0 12px;">L'écosystème E²SN</p>
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,3.4vw,44px);line-height:1.06;letter-spacing:-.02em;margin:0;">PortabIA est un service <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:var(--coral-600);">E²SN</span>.</h2>
          <p style="font-size:16px;color:var(--text-secondary);line-height:1.6;margin:14px auto 0;max-width:50ch;">La même mission partout : votre souveraineté et votre maîtrise face aux outils numériques. Découvrez le reste de l'écosystème.</p>
        </div>
        <div class="pa-grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:22px;">

          <!-- Carte E²SNauthor -->
          <a href="https://essnauthor.fr" target="_blank" rel="noopener" class="pa-ecocard" style="display:flex;flex-direction:column;text-decoration:none;border:1px solid var(--border-subtle);border-left:3px solid var(--coral-500);border-radius:20px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);padding:30px 32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
              <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden="true" style="flex:none;"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--navy-900)"/><text x="16" y="21" text-anchor="middle" font-family="Geist, sans-serif" font-weight="700" font-size="14" fill="var(--cream-50)" letter-spacing="-0.04em">E²</text><circle cx="25" cy="7" r="3" fill="var(--coral-500)"/></svg>
              <span class="brand-mark" style="font-size:24px;">E<span class="sup">2</span>SN<span class="author-suffix">author</span></span>
            </div>
            <div style="font-family:var(--font-sans);font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--coral-700);margin-bottom:8px;">La plateforme de formation</div>
            <h3 style="font-family:var(--font-display);font-weight:700;font-size:23px;line-height:1.15;letter-spacing:-.01em;margin:0 0 10px;color:var(--text-primary);">Vous créez des formations ?</h3>
            <p style="font-size:14.5px;line-height:1.6;color:var(--text-secondary);margin:0 0 20px;">Concevez, diffusez et pilotez vos formations sur la plateforme souveraine d'authoring et de LMS, propulsée par l'IA.</p>
            <span style="margin-top:auto;font-family:var(--font-sans);font-weight:600;font-size:14.5px;color:var(--coral-700);display:inline-flex;align-items:center;gap:7px;">Découvrir E²SNauthor <span aria-hidden="true">↗</span></span>
          </a>

          <!-- Carte ESSN -->
          <a href="https://essn.fr/" target="_blank" rel="noopener" class="pa-ecocard" style="display:flex;flex-direction:column;text-decoration:none;border:1px solid var(--border-subtle);border-left:3px solid var(--navy-700);border-radius:20px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);padding:30px 32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
              <svg width="40" height="40" viewBox="0 0 80 80" fill="none" aria-hidden="true" style="flex:none;"><rect x="2" y="2" width="76" height="76" rx="18" fill="var(--navy-900)"/><text x="20" y="55" font-family="Instrument Serif" font-size="44" fill="var(--cream-50)" letter-spacing="-0.04em">E</text><text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="var(--coral-500)">2</text><text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text></svg>
              <span class="brand-mark" style="font-size:24px;">E<span class="sup">2</span>SN</span>
            </div>
            <div style="font-family:var(--font-sans);font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--coral-700);margin-bottom:8px;">École · Conseil · Édition</div>
            <h3 style="font-family:var(--font-display);font-weight:700;font-size:23px;line-height:1.15;letter-spacing:-.01em;margin:0 0 10px;color:var(--text-primary);">À l'origine de PortabIA.</h3>
            <p style="font-size:14.5px;line-height:1.6;color:var(--text-secondary);margin:0 0 20px;">L'organisme qui forme, conseille et édite autour de la souveraineté numérique et de l'interopérabilité. PortabIA en est l'un des services gratuits.</p>
            <span style="margin-top:auto;font-family:var(--font-sans);font-weight:600;font-size:14.5px;color:var(--coral-700);display:inline-flex;align-items:center;gap:7px;">Visiter essn.fr <span aria-hidden="true">↗</span></span>
          </a>

        </div>
      </section>

      <!-- FINAL CTA -->
      <section style="max-width:var(--container);margin:0 auto;padding:0 32px 90px;">
        <div style="position:relative;overflow:hidden;border-radius:34px;background:radial-gradient(130% 110% at 80% 0%,#0A2036 0%,#001024 60%,#000B18 100%);padding:72px 48px;text-align:center;box-shadow:var(--shadow-lg);">
          <span class="pa-blob" style="top:-120px;right:-100px;width:560px;height:560px;background:radial-gradient(circle,rgba(217,119,87,.34),transparent 62%);"></span>
          <span class="pa-blob" style="bottom:-160px;left:-120px;width:520px;height:520px;background:radial-gradient(circle,rgba(79,134,224,.22),transparent 64%);"></span>
          <div style="position:relative;z-index:1;">
            <div style="display:flex;justify-content:center;gap:11px;margin-bottom:24px;">
              <span v-for="a in ais" :key="a.id" :style="'width:15px;height:15px;border-radius:50%;background:'+a.grad"></span>
            </div>
            <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(38px,4.6vw,64px);line-height:1.0;letter-spacing:-.02em;margin:0;color:#F4EFE9;">Essayez. <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:#F7A791;">Gratuitement.</span></h2>
            <p style="font-size:18px;line-height:1.45;color:#AEB6C2;margin:18px auto 32px;max-width:44ch;">Sans inscription, sans limite. Votre contexte vous suit, d'une IA à l'autre — en moins d'une minute.</p>
            <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:17px;color:#001024;background:linear-gradient(145deg,#E59A6E,#D97757);border:none;border-radius:16px;padding:18px 34px;cursor:pointer;min-height:56px;box-shadow:var(--shadow-glow-coral);">Migrer mon historique →</button>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer style="border-top:1px solid var(--border-subtle);background:var(--surface-sunken);">
        <div class="pa-footer-grid" style="max-width:var(--container);margin:0 auto;padding:56px 32px 40px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:40px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <svg width="34" height="34" viewBox="0 0 80 80" fill="none" aria-label="E2SN" style="flex:none;"><rect x="2" y="2" width="76" height="76" rx="18" fill="var(--navy-900)"/><text x="20" y="55" font-family="Instrument Serif" font-size="44" fill="var(--stone-50)" letter-spacing="-0.04em">E</text><text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="var(--coral-500)">2</text><text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text></svg>
              <span style="font-family:var(--font-serif);font-size:24px;">Portab<span style="font-style:italic;color:var(--coral-500);">IA</span></span>
            </div>
            <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.6;margin:16px 0 0;max-width:34ch;">Le RIO de l'IA. Un service gratuit et open-source opéré par E²SN — Guillaume BOUTON.</p>
            <div style="display:flex;gap:10px;margin-top:18px;">
              <button v-for="s in socials" :key="s" @click="shareTo(s)" :aria-label="'Partager sur '+socialLabels[s]" :title="'Partager sur '+socialLabels[s]" style="width:34px;height:34px;border-radius:10px;border:1px solid var(--border-default);background:var(--surface-elevated);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text-secondary);cursor:pointer;">{{ s }}</button>
            </div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Produit</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;"><a href="#how" style="color:var(--text-secondary);text-decoration:none;">Comment ça marche</a><a href="#compat" style="color:var(--text-secondary);text-decoration:none;">Compatibilité</a><a href="#faq" style="color:var(--text-secondary);text-decoration:none;">FAQ</a></div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Ressources</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;"><a href="#" style="color:var(--text-secondary);text-decoration:none;">GitHub · Apache-2.0 ↗</a><a href="#" @click.prevent="openLegal('transmission')" style="color:var(--text-secondary);text-decoration:none;cursor:pointer;">Transmission aux IA</a><a href="#" style="color:var(--text-secondary);text-decoration:none;">État du service</a></div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Légal</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;"><a href="#" @click.prevent="openLegal('cgu')" style="color:var(--text-secondary);text-decoration:none;cursor:pointer;">CGU</a><a href="#" @click.prevent="openLegal('mentions')" style="color:var(--text-secondary);text-decoration:none;cursor:pointer;">Mentions légales</a><a href="#" @click.prevent="openLegal('confidentialite')" style="color:var(--text-secondary);text-decoration:none;cursor:pointer;">Confidentialité</a></div>
          </div>
        </div>
        <div style="max-width:var(--container);margin:0 auto;padding:20px 32px 40px;border-top:1px solid var(--border-subtle);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;">
          <span style="font-size:12.5px;color:var(--text-muted);">© 2026 E²SN · PortabIA n'est affilié à aucune IA citée.</span>
          <span style="font-size:12.5px;color:var(--text-muted);">Conçu par E²SN — Guillaume BOUTON · Hébergé en France 🇫🇷</span>
        </div>
      </footer>
    </main>

    <!-- ===== LÉGAL ===== -->
    <main v-else-if="view==='legal'" style="max-width:780px;margin:0 auto;padding:48px 32px 90px;">
      <button @click="goHome" style="font-family:var(--font-sans);font-size:14px;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:0;margin-bottom:24px;">← Retour à l'accueil</button>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;">
        <button v-for="(d,k) in { cgu:'CGU', mentions:'Mentions légales', confidentialite:'Confidentialité', transmission:'Transmission aux IA' }" :key="k" @click="openLegal(k)" :style="'font-family:var(--font-sans);font-size:13px;font-weight:600;padding:8px 14px;border-radius:999px;cursor:pointer;border:1px solid var(--border-default);'+(legalId===k?'background:var(--coral-500);color:#fff;border-color:var(--coral-500);':'background:var(--surface-elevated);color:var(--text-secondary);')">{{ d }}</button>
      </div>
      <h1 style="font-family:var(--font-display);font-weight:700;font-size:clamp(32px,4vw,46px);letter-spacing:-.02em;margin:0 0 28px;">{{ legalDoc.title }}</h1>
      <div style="display:flex;flex-direction:column;gap:22px;">
        <div v-for="(b,i) in legalDoc.blocks" :key="i">
          <h2 style="font-family:var(--font-sans);font-weight:600;font-size:17px;margin:0 0 6px;color:var(--text-primary);">{{ b[0] }}</h2>
          <p style="font-size:15px;line-height:1.65;color:var(--text-secondary);margin:0;">{{ b[1] }}</p>
        </div>
      </div>
      <p style="font-size:12.5px;color:var(--text-muted);margin-top:36px;border-top:1px solid var(--border-subtle);padding-top:18px;">Service gratuit opéré par E²SN — Guillaume BOUTON · Open-source (Apache-2.0) · contact@essn.fr</p>
    </main>

    <!-- ===== COMPTE ===== -->
    <AccountView v-else-if="view==='account' && currentUser" :user="currentUser" @home="goHome" @logout="logout" />

    <!-- ===== WIZARD ===== -->
    <main v-else-if="view==='wizard'" style="max-width:760px;margin:0 auto;padding:48px 32px 90px;">
      <button @click="goHome" style="font-family:var(--font-sans);font-size:14px;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:0;margin-bottom:24px;">← Retour à l'accueil</button>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <div v-for="(d,i) in stepDots" :key="i" :style="'flex:1;height:5px;border-radius:999px;'+d.style"></div>
      </div>
      <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;color:var(--text-muted);text-transform:uppercase;margin:0 0 28px;">Étape {{ step+1 }} / 4 · {{ stepNames[step] }}</p>

      <!-- step 0 -->
      <template v-if="step===0">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">D'où partez-vous ?</h2>
        <p style="font-size:16px;color:var(--text-secondary);margin:0 0 28px;">Choisissez l'IA qui détient votre historique actuel.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;">
          <button v-for="a in sourceList" :key="a.id" @click="pickSource(a.id)" :style="'display:flex;align-items:center;gap:12px;padding:18px;border-radius:16px;cursor:pointer;border:2px solid;'+a.cardStyle">
            <span :style="'width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:#fff;flex:none;'+a.markStyle">{{ a.mark }}</span>
            <span style="font-size:16px;font-weight:600;color:var(--text-primary);">{{ a.name }}</span>
          </button>
        </div>
      </template>

      <!-- step 1 -->
      <template v-else-if="step===1">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">Vers quelle IA ?</h2>
        <p style="font-size:16px;color:var(--text-secondary);margin:0 0 28px;">Destination du pont depuis <strong style="color:var(--text-primary);">{{ src.name }}</strong>.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;">
          <button v-for="a in targetList" :key="a.id" @click="pickTarget(a.id)" :style="'display:flex;align-items:center;gap:12px;padding:18px;border-radius:16px;cursor:pointer;border:2px solid;'+a.cardStyle">
            <span :style="'width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:#fff;flex:none;'+a.markStyle">{{ a.mark }}</span>
            <span style="font-size:16px;font-weight:600;color:var(--text-primary);">{{ a.name }}</span>
          </button>
        </div>
      </template>

      <!-- step 2 -->
      <template v-else-if="step===2">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">Que voulez-vous emporter ?</h2>
        <p style="font-size:16px;color:var(--text-secondary);margin:0 0 28px;">Cochez ce qui doit traverser le pont. Rien n'est envoyé sans vous.</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div v-for="it in itemList" :key="it.id" :style="'border-radius:14px;border:2px solid;'+it.rowStyle">
            <button @click="toggleItem(it.id)" style="width:100%;display:flex;align-items:center;gap:16px;padding:18px 20px;background:none;border:none;cursor:pointer;text-align:left;">
              <span :style="'width:26px;height:26px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;'+it.boxStyle">{{ it.check }}</span>
              <span><span style="display:block;font-size:16px;font-weight:600;color:var(--text-primary);">{{ it.title }}</span><span style="display:block;font-size:13.5px;color:var(--text-secondary);margin-top:2px;">{{ it.body }}</span></span>
            </button>
            <div v-if="it.on" style="display:flex;align-items:center;gap:8px;padding:0 20px 16px 62px;">
              <span style="font-size:12px;color:var(--text-muted);">Quantité :</span>
              <button v-for="g in granOptions" :key="g.id" @click="setGran(it.id, g.id)" :style="segStyle(it, g.id)">{{ g.label }}</button>
            </div>
          </div>
        </div>
        <!-- Mode B : import direct d'un fichier d'export (optionnel) -->
        <div style="margin-top:18px;padding:18px 20px;border:1px dashed var(--border-strong);border-radius:14px;background:var(--surface-sunken);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
            <div>
              <div style="font-size:14.5px;font-weight:600;color:var(--text-primary);">Vous avez un fichier d'export ? <span style="font-weight:400;color:var(--text-muted);">(optionnel)</span></div>
              <div style="font-size:13px;color:var(--text-secondary);margin-top:3px;">Déposez votre <code style="font-family:var(--font-mono);font-size:12px;">conversations.json</code> (ChatGPT) ou un fichier de règles (CLAUDE.md, AGENTS.md…) pour une migration directe, traitée dans votre navigateur.</div>
            </div>
            <label style="font-family:var(--font-sans);font-weight:600;font-size:14px;color:var(--text-primary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:10px;padding:10px 16px;cursor:pointer;white-space:nowrap;">
              Choisir un fichier
              <input type="file" accept=".json,.md,.txt,.cursorrules" @change="onFile" style="display:none;" />
            </label>
          </div>
          <div v-if="uploadInfo" style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13.5px;color:var(--success);font-weight:500;"><span>✓</span>{{ uploadInfo }} · traité localement</div>
          <div v-if="uploadError" style="margin-top:12px;font-size:13.5px;color:var(--danger,#c0392b);">⚠ {{ uploadError }}</div>
        </div>
      </template>

      <!-- step 3 result -->
      <template v-else>
        <div style="text-align:center;padding:8px 0 4px;">
          <div style="width:64px;height:64px;border-radius:999px;margin:0 auto 18px;background:color-mix(in oklab,var(--success) 16%,var(--surface-elevated));border:1px solid color-mix(in oklab,var(--success) 36%,transparent);display:flex;align-items:center;justify-content:center;">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="var(--success)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">Votre pont est prêt.</h2>
          <p style="font-size:16px;color:var(--text-secondary);margin:0 auto 28px;max-width:44ch;">Le fichier de migration est généré localement, dans votre navigateur. Importez-le dans votre nouvelle IA.</p>
        </div>
        <!-- en-tête source -> cible -->
        <div style="display:flex;align-items:center;justify-content:center;gap:18px;padding:20px;margin-bottom:8px;">
          <span style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span :style="'width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff;background:'+src.color">{{ src.mark }}</span><span style="font-size:13px;font-weight:500;">{{ src.name }}</span></span>
          <svg width="44" height="16" viewBox="0 0 44 16" fill="none"><path d="M1 8h38M33 2l7 6-7 6" stroke="var(--coral-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span :style="'width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff;background:'+(tgt.color||'#999')">{{ tgt.mark }}</span><span style="font-size:13px;font-weight:500;">{{ tgt.name || '—' }}</span></span>
        </div>

        <!-- ÉTAPE 1 : prompt d'export (si pas de fichier déposé) -->
        <div v-if="!uploadedBundle" style="border:1px solid var(--border-subtle);border-radius:18px;background:var(--surface-elevated);padding:22px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span style="width:24px;height:24px;border-radius:999px;background:var(--coral-500);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;">1</span><h3 style="font-family:var(--font-sans);font-weight:600;font-size:16px;margin:0;">Copiez ce prompt dans {{ src.name }}</h3></div>
          <p style="font-size:13.5px;color:var(--text-secondary);margin:0 0 12px;">{{ src.name }} vous renverra un bloc structuré : copiez sa réponse et collez-la à l'étape 2.</p>
          <div style="position:relative;">
            <pre style="font-family:var(--font-mono);font-size:12px;line-height:1.5;color:var(--text-primary);background:var(--surface-sunken);border:1px solid var(--border-subtle);border-radius:12px;padding:14px;max-height:160px;overflow:auto;white-space:pre-wrap;margin:0;">{{ exportPromptText }}</pre>
            <button @click="copy(exportPromptText,'exp')" style="position:absolute;top:10px;right:10px;font-size:12px;font-weight:600;background:var(--coral-500);color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;">{{ copied==='exp' ? 'Copié ✓' : 'Copier' }}</button>
          </div>
        </div>

        <!-- ÉTAPE 2 : coller la réponse (round-trip) -->
        <div v-if="!uploadedBundle" style="border:1px solid var(--border-subtle);border-radius:18px;background:var(--surface-elevated);padding:22px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span style="width:24px;height:24px;border-radius:999px;background:var(--coral-500);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;">2</span><h3 style="font-family:var(--font-sans);font-weight:600;font-size:16px;margin:0;">Collez la réponse de {{ src.name }}</h3></div>
          <textarea v-model="pastedResponse" rows="5" placeholder="Collez ici ce que votre IA vous a répondu (JSON ou texte)…" style="width:100%;font-family:var(--font-mono);font-size:13px;padding:12px;border:1px solid var(--border-default);border-radius:12px;background:var(--surface-canvas);color:var(--text-primary);resize:vertical;"></textarea>
          <p style="font-size:12.5px;color:var(--text-muted);margin:8px 0 0;">Tout est traité localement, dans votre navigateur.</p>
        </div>

        <!-- ÉTAPE 3 : résultat réel -->
        <div :style="'border:1px solid '+(hasRealContent?'color-mix(in oklab,var(--success) 36%,transparent)':'var(--border-subtle)')+';border-radius:18px;background:var(--surface-elevated);padding:22px;'">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span :style="'width:24px;height:24px;border-radius:999px;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;background:'+(hasRealContent?'var(--success)':'var(--border-strong)')">3</span><h3 style="font-family:var(--font-sans);font-weight:600;font-size:16px;margin:0;">Récupérez votre fichier pour {{ tgt.name }}</h3></div>
          <p v-if="!hasRealContent" style="font-size:13.5px;color:var(--text-muted);margin:0;">En attente du contenu (étape 2, ou déposez un fichier d'export à l'étape précédente).</p>
          <template v-else>
            <p style="font-size:13.5px;color:var(--text-secondary);margin:0 0 14px;">Votre contexte est converti au format <b>{{ tgt.name }}</b> : téléchargez le fichier <code style="font-family:var(--font-mono);font-size:12.5px;">{{ resultFiles.nativeFile.filename }}</code>, puis collez le prompt d'import dans {{ tgt.name }}.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
              <button @click="downloadNative" style="font-family:var(--font-sans);font-weight:600;font-size:15px;color:#fff;background:var(--coral-500);border:none;border-radius:12px;padding:12px 18px;cursor:pointer;box-shadow:var(--shadow-glow-coral);">⬇ Télécharger {{ resultFiles.nativeFile.filename }}</button>
              <button @click="copy(resultFiles.importPrompt,'imp')" style="font-family:var(--font-sans);font-weight:600;font-size:15px;color:var(--text-primary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:12px;padding:12px 18px;cursor:pointer;">{{ copied==='imp' ? 'Prompt copié ✓' : 'Copier le prompt d\'import' }}</button>
            </div>
          </template>
        </div>

        <div style="display:flex;gap:12px;margin-top:18px;flex-wrap:wrap;">
          <button @click="downloadKit" style="flex:1;min-width:200px;font-family:var(--font-sans);font-weight:600;font-size:15px;color:var(--text-primary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:14px;padding:14px;cursor:pointer;">⬇ Tout le kit (.json)</button>
          <button @click="reset" style="font-family:var(--font-sans);font-weight:600;font-size:15px;color:var(--text-secondary);background:none;border:1px solid var(--border-default);border-radius:14px;padding:14px 20px;cursor:pointer;">Recommencer</button>
        </div>
      </template>

      <!-- nav -->
      <div v-if="step!==3" style="display:flex;justify-content:space-between;gap:12px;margin-top:36px;">
        <button @click="prev" :style="'font-family:var(--font-sans);font-weight:600;font-size:15px;color:var(--text-secondary);background:none;border:1px solid var(--border-default);border-radius:12px;padding:13px 22px;cursor:pointer;min-height:48px;visibility:'+(step===0?'hidden':'visible')">← Précédent</button>
        <button @click="next" :style="'font-family:var(--font-sans);font-weight:600;font-size:15px;color:#fff;border:none;border-radius:12px;padding:13px 26px;min-height:48px;'+nextStyle">{{ nextLabel }}</button>
      </div>
    </main>

    <AuthModal v-if="showAuth" @close="showAuth=false" @authed="onAuthed" />

  </div>
</template>
