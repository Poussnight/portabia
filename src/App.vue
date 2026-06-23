<script setup>
/* PortabIA — landing + wizard (traduit du design Claude Design V3).
 * Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 * Le wizard câble le moteur réel (engine.js) — génération 100% navigateur, sans API. */
import { ref, reactive, computed } from 'vue'
import { makeExportPrompt, makeImport, actionMetadata } from './engine.js'
import { downloadBridge } from './download/bundle.js'

const AIS = [
  { id: 'claude',  name: 'Claude',  mark: 'Cl', color: '#C8643F' },
  { id: 'chatgpt', name: 'ChatGPT', mark: 'Gp', color: '#0E9A78' },
  { id: 'gemini',  name: 'Gemini',  mark: 'Ge', color: '#3B74E8' },
  { id: 'mistral', name: 'Mistral', mark: 'Mi', color: '#E8580F' },
  { id: 'grok',    name: 'Grok',    mark: 'Gr', color: '#1b1b1f' },
]
const byId = (id) => AIS.find((a) => a.id === id) || {}
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
const faqOpen = ref(0)
const animOn = ref(true)

const themeIcon = computed(() => (theme.value === 'dark' ? '☀' : '☾'))
const animFlag = computed(() => (animOn.value ? 'on' : 'off'))

function goWizard() { view.value = 'wizard'; step.value = 0 }
function goHome() { view.value = 'landing' }
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }

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
].map((b) => ({ ...b, fromMark: byId(b.from).mark, fromStyle: `background:${byId(b.from).color}`, toMark: byId(b.to).mark, toStyle: `background:${byId(b.to).color}` })))
function startBridge(b) { source.value = b.from; target.value = b.to; view.value = 'wizard'; step.value = 0 }

const steps = [
  { num: '01', icon: '🌉', title: 'Choisissez le pont', body: 'Sélectionnez l’IA de départ et l’IA d’arrivée. PortabIA connaît les formats des cinq grandes plateformes.' },
  { num: '02', icon: '☑️', title: 'Sélectionnez ce qui compte', body: 'Conversations, instructions, projets, mémoire : vous cochez, vous gardez la main.' },
  { num: '03', icon: '📥', title: 'Récupérez votre contexte', body: 'PortabIA traduit le tout dans le format de destination. Vous importez, vous reprenez où vous étiez.' },
]
const guarantees = [
  { icon: '🔒', title: 'Zéro serveur', body: 'La conversion s’exécute entièrement en local.' },
  { icon: '🇫🇷', title: 'Hébergé en France', body: 'Le site est servi depuis l’UE, sans traceur tiers requis.' },
  { icon: '⚖️', title: 'RGPD & IA Act', body: 'Transparence sur ce qui est transmis à chaque IA.' },
  { icon: '</>', title: 'Open-source', body: 'Code auditable sous licence Apache-2.0.' },
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
const socials = ['in', 'X', 'wa', 'f', '@']

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
  return { ...it, check: on ? '✓' : '',
    rowStyle: on ? 'border-color:var(--coral-500);background:color-mix(in oklab,var(--coral-500) 7%,var(--surface-elevated));' : 'border-color:var(--border-default);background:var(--surface-elevated);',
    boxStyle: on ? 'background:var(--coral-500);' : 'background:transparent;border:2px solid var(--border-strong);' }
}))
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

function buildSelection() {
  const axes = {}
  for (const it of ITEMS) if (items[it.id]) axes[it.axis] = { on: true, mode: it.axis === 'conversation' ? 'summary' : undefined }
  return { scope: 'total', axes }
}

function next() {
  if (step.value < 3) {
    if (step.value < 2 && !canNext.value) return
    if (step.value === 2 && !anySel.value) return
    step.value += 1
  }
}
function prev() { step.value = Math.max(0, step.value - 1) }
function reset() { step.value = 0; target.value = null }

/* Génère le « pont » : prompt d'export + import + fichier natif (Mode A, sans API). */
function downloadKit() {
  const selection = buildSelection()
  const sAi = engineId(source.value)
  const tAi = engineId(target.value)
  const ts = new Date().toISOString()
  const exportPrompt = makeExportPrompt(sAi, selection)
  // Bundle squelette (l'IA source le remplira) → on génère déjà le fichier natif + prompt d'import
  const skeleton = { spec_version: '1.0', meta: { source_ai: sAi, scope: 'total' }, axes: Object.fromEntries(Object.keys(selection.axes).map((k) => [k, {}])) }
  const { nativeFile, importPrompt } = makeImport({ bundle: skeleton, targetAi: tAi, timestamp: ts, anonymize: { secrets: true, emails: true, paths: true } })
  const meta = actionMetadata({ sourceAi: sAi, targetAi: tAi, selection, timestamp: ts })
  downloadBridge({ meta, exportPrompt, importPrompt, nativeFile, selection })
}
</script>

<template>
  <div :data-theme="theme" style="font-family:var(--font-sans);background:var(--surface-canvas);color:var(--text-primary);min-height:100vh;-webkit-font-smoothing:antialiased;transition:background .4s ease,color .4s ease;">

    <!-- HEADER -->
    <header style="position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);background:color-mix(in oklab,var(--surface-canvas) 86%,transparent);border-bottom:1px solid var(--border-subtle);">
      <div style="max-width:var(--container);margin:0 auto;padding:14px 32px;display:flex;align-items:center;gap:28px;">
        <button @click="goHome" style="display:flex;align-items:center;gap:11px;background:none;border:none;cursor:pointer;padding:0;">
          <svg width="38" height="38" viewBox="0 0 80 80" fill="none" aria-label="E2SN" style="flex:none;">
            <rect x="2" y="2" width="76" height="76" rx="18" fill="var(--navy-900)"/>
            <text x="20" y="55" font-family="Instrument Serif" font-size="44" fill="var(--stone-50)" letter-spacing="-0.04em">E</text>
            <text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="var(--coral-500)">2</text>
            <text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text>
          </svg>
          <span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1;">
            <span style="font-family:var(--font-display);font-size:25px;color:var(--text-primary);letter-spacing:-.01em;">Portab<span style="font-style:italic;color:var(--coral-500);">IA</span></span>
            <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--text-muted);text-transform:uppercase;margin-top:3px;">par E²SN</span>
          </span>
        </button>
        <nav class="pa-nav-links" style="display:flex;gap:24px;margin-left:14px;">
          <a href="#how" style="font-size:14px;color:var(--text-secondary);text-decoration:none;">Comment ça marche</a>
          <a href="#compat" style="font-size:14px;color:var(--text-secondary);text-decoration:none;">Compatibilité</a>
          <a href="#privacy" style="font-size:14px;color:var(--text-secondary);text-decoration:none;">Confidentialité</a>
          <a href="#faq" style="font-size:14px;color:var(--text-secondary);text-decoration:none;">FAQ</a>
        </nav>
        <div style="margin-left:auto;display:flex;align-items:center;gap:12px;">
          <span style="font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;color:var(--text-muted);">FR</span>
          <button @click="toggleTheme" aria-label="Basculer le thème" style="width:38px;height:38px;border-radius:999px;border:1px solid var(--border-default);background:var(--surface-elevated);color:var(--text-primary);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">{{ themeIcon }}</button>
          <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:14.5px;color:#fff;background:var(--coral-500);border:none;border-radius:999px;padding:11px 20px;cursor:pointer;box-shadow:var(--shadow-sm);min-height:44px;">Migrer maintenant →</button>
        </div>
      </div>
    </header>

    <!-- ===== LANDING ===== -->
    <main v-if="view==='landing'">
      <!-- HERO -->
      <section style="position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 82% 8%,oklch(72% 0.130 32 / .16),transparent 55%),radial-gradient(90% 70% at 10% 100%,oklch(58% 0.110 230 / .10),transparent 60%);pointer-events:none;"></div>
        <div class="pa-hero-grid" style="position:relative;max-width:var(--container);margin:0 auto;padding:76px 32px 60px;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;">
          <div>
            <div style="display:inline-flex;align-items:center;gap:9px;padding:7px 14px;border:1px solid var(--border-default);border-radius:999px;background:var(--surface-elevated);font-family:var(--font-mono);font-size:12px;letter-spacing:.08em;color:var(--text-secondary);animation:pa-rise .6s var(--ease-out) both;">
              <span style="width:7px;height:7px;border-radius:999px;background:var(--success);"></span>GRATUIT · OPEN-SOURCE · OPÉRÉ PAR E²SN
            </div>
            <h1 style="font-family:var(--font-display);font-weight:400;font-size:clamp(46px,5.6vw,82px);line-height:1.02;letter-spacing:-.02em;margin:22px 0 0;color:var(--text-primary);text-wrap:balance;animation:pa-rise .7s .05s var(--ease-out) both;">Changez d'IA,<br>gardez votre <span style="font-style:italic;color:var(--coral-600);">mémoire</span>.</h1>
            <p style="font-size:19px;line-height:1.6;color:var(--text-secondary);max-width:34ch;margin:24px 0 0;animation:pa-rise .7s .12s var(--ease-out) both;">PortabIA, c'est le <strong style="color:var(--text-primary);font-weight:600;">RIO de l'IA</strong> : migrez votre historique et votre contexte de travail d'une intelligence artificielle vers une autre, sans rien perdre.</p>
            <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:32px;animation:pa-rise .7s .18s var(--ease-out) both;">
              <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:#fff;background:var(--coral-500);border:none;border-radius:14px;padding:16px 26px;cursor:pointer;box-shadow:var(--shadow-glow-coral);min-height:52px;">Migrer mon historique →</button>
              <a href="#how" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:var(--text-primary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:14px;padding:16px 24px;cursor:pointer;text-decoration:none;min-height:52px;display:inline-flex;align-items:center;">Voir comment ça marche</a>
            </div>
            <div style="display:inline-flex;align-items:center;gap:10px;margin-top:30px;padding:11px 16px;border-radius:12px;background:color-mix(in oklab,var(--success) 12%,var(--surface-elevated));border:1px solid color-mix(in oklab,var(--success) 30%,transparent);animation:pa-rise .7s .24s var(--ease-out) both;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex:none;"><path d="M12 2l8 4v5c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V6l8-4z" stroke="var(--success)" stroke-width="1.8" fill="color-mix(in oklab,var(--success) 18%,transparent)"/><path d="M8.5 12l2.4 2.4 4.6-5" stroke="var(--success)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span style="font-size:13.5px;font-weight:500;color:var(--text-primary);">100 % dans votre navigateur · vos données ne sortent jamais de votre appareil</span>
            </div>
          </div>
          <!-- PONTS MOTIF -->
          <div :data-anim="animFlag" style="position:relative;display:flex;justify-content:center;animation:pa-rise .8s .2s var(--ease-out) both;">
            <svg viewBox="0 0 460 420" width="100%" style="max-width:480px;overflow:visible;">
              <defs><linearGradient id="paGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--coral-400)"/><stop offset="1" stop-color="var(--coral-600)"/></linearGradient></defs>
              <g stroke="var(--border-strong)" stroke-width="2" fill="none" opacity="0.55">
                <path d="M230 205 Q250 110 230 45"/><path d="M230 205 Q330 150 387 159"/><path d="M230 205 Q300 290 327 343"/><path d="M230 205 Q160 290 133 343"/><path d="M230 205 Q120 150 73 159"/>
              </g>
              <g class="pa-bridge" stroke="url(#paGrad)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="7 13" style="animation:pa-flow 2.6s linear infinite;">
                <path d="M230 205 Q250 110 230 45"/><path d="M230 205 Q330 150 387 159"/><path d="M230 205 Q300 290 327 343"/><path d="M230 205 Q160 290 133 343"/><path d="M230 205 Q120 150 73 159"/>
              </g>
              <g v-for="n in nodes" :key="n.id" class="pa-node" :style="n.anim">
                <circle :cx="n.x" :cy="n.y" r="31" fill="var(--surface-elevated)" stroke="var(--border-default)" stroke-width="1.5"/>
                <circle :cx="n.cdx" :cy="n.cdy" r="9" :fill="n.color"/>
                <text :x="n.tx" :y="n.ty" text-anchor="middle" font-family="Geist,sans-serif" font-size="14" font-weight="600" fill="var(--text-primary)">{{ n.mark }}</text>
              </g>
              <g class="pa-hub" style="transform-origin:230px 205px;animation:pa-pulse 3.4s var(--ease-in-out) infinite;">
                <rect x="194" y="169" width="72" height="72" rx="20" fill="var(--navy-900)"/>
                <text x="212" y="222" font-family="Instrument Serif" font-size="38" fill="var(--stone-50)">E</text>
                <text x="234" y="200" font-family="Instrument Serif" font-style="italic" font-size="19" fill="var(--coral-500)">2</text>
                <text x="234" y="220" font-family="Geist,sans-serif" font-size="12" font-weight="600" fill="var(--stone-300)">SN</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- COMPAT -->
      <section id="compat" style="max-width:var(--container);margin:0 auto;padding:36px 32px 8px;">
        <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;color:var(--text-muted);text-align:center;text-transform:uppercase;margin:0 0 22px;">Compatible avec vos IA · dans les deux sens</p>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;">
          <div v-for="a in ais" :key="a.id" style="display:flex;align-items:center;gap:11px;padding:12px 20px 12px 12px;border:1px solid var(--border-default);border-radius:999px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);">
            <span :style="'width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:#fff;'+a.markStyle">{{ a.mark }}</span>
            <span style="font-size:15px;font-weight:500;color:var(--text-primary);">{{ a.name }}</span>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--text-muted);text-align:center;max-width:60ch;margin:20px auto 0;line-height:1.5;">PortabIA n'est affilié à aucun de ces services. Les noms et marques cités appartiennent à leurs détenteurs respectifs.</p>
      </section>

      <!-- COMMENT CA MARCHE -->
      <section id="how" style="max-width:var(--container);margin:0 auto;padding:84px 32px;">
        <div style="max-width:640px;">
          <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;color:var(--coral-600);text-transform:uppercase;margin:0;">01 · La portabilité</p>
          <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4vw,50px);line-height:1.06;letter-spacing:-.02em;margin:14px 0 0;">Trois gestes, <span style="font-style:italic;color:var(--coral-600);">votre contexte vous suit</span>.</h2>
        </div>
        <div class="pa-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:46px;">
          <div v-for="st in steps" :key="st.num" style="padding:30px;border:1px solid var(--border-subtle);border-radius:20px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);">
            <div style="font-family:var(--font-mono);font-size:13px;color:var(--coral-600);">{{ st.num }}</div>
            <div style="font-size:30px;margin:14px 0 12px;">{{ st.icon }}</div>
            <h3 style="font-family:var(--font-display);font-weight:400;font-size:25px;line-height:1.1;margin:0 0 10px;color:var(--text-primary);">{{ st.title }}</h3>
            <p style="font-size:15px;line-height:1.6;color:var(--text-secondary);margin:0;">{{ st.body }}</p>
          </div>
        </div>
      </section>

      <!-- IA -> IA CARDS -->
      <section style="max-width:var(--container);margin:0 auto;padding:0 32px 84px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:28px;">
          <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(30px,3.4vw,42px);margin:0;letter-spacing:-.02em;">Des ponts dans les deux sens</h2>
          <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:14.5px;color:var(--coral-700);background:none;border:none;cursor:pointer;">Construire mon pont →</button>
        </div>
        <div class="pa-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
          <button v-for="b in bridges" :key="b.title" @click="startBridge(b)" class="pa-bridgecard" style="text-align:left;padding:24px;border:1px solid var(--border-subtle);border-radius:18px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);cursor:pointer;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span :style="'width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:#fff;'+b.fromStyle">{{ b.fromMark }}</span>
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none"><path d="M1 7h22M18 2l5 5-5 5" stroke="var(--coral-500)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span :style="'width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:#fff;'+b.toStyle">{{ b.toMark }}</span>
            </div>
            <h3 style="font-family:var(--font-sans);font-weight:600;font-size:16px;margin:18px 0 6px;color:var(--text-primary);">{{ b.title }}</h3>
            <p style="font-size:13.5px;line-height:1.55;color:var(--text-secondary);margin:0;">{{ b.body }}</p>
          </button>
        </div>
      </section>

      <!-- PRIVACY -->
      <section id="privacy" style="background:var(--navy-900);color:var(--text-inverse);">
        <div class="pa-grid-2" style="max-width:var(--container);margin:0 auto;padding:74px 32px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;">
          <div>
            <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;color:var(--coral-400);text-transform:uppercase;margin:0;">Souveraineté</p>
            <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(32px,3.6vw,46px);line-height:1.05;letter-spacing:-.02em;margin:14px 0 16px;color:#fff;">Vos données ne quittent <span style="font-style:italic;color:var(--coral-400);">jamais</span> votre appareil.</h2>
            <p style="font-size:16px;line-height:1.65;color:oklch(82% 0.02 60);margin:0;max-width:46ch;">Toute la conversion se fait localement, dans votre navigateur. Aucun historique n'est téléversé. Open-source, auditable, sous licence Apache-2.0.</p>
          </div>
          <div style="display:grid;gap:14px;">
            <div v-for="g in guarantees" :key="g.title" style="display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border:1px solid oklch(34% 0.075 248);border-radius:14px;background:oklch(22% 0.070 248);">
              <span style="color:var(--coral-400);font-size:18px;line-height:1.4;">{{ g.icon }}</span>
              <div><div style="font-weight:600;font-size:15px;color:#fff;">{{ g.title }}</div><div style="font-size:13.5px;color:oklch(78% 0.02 60);margin-top:3px;line-height:1.5;">{{ g.body }}</div></div>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section id="faq" style="max-width:760px;margin:0 auto;padding:84px 32px;">
        <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(32px,3.6vw,46px);text-align:center;letter-spacing:-.02em;margin:0 0 36px;">Questions fréquentes</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div v-for="(f,i) in faqs" :key="i" style="border:1px solid var(--border-subtle);border-radius:16px;background:var(--surface-elevated);overflow:hidden;">
            <button @click="toggleFaq(i)" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;background:none;border:none;cursor:pointer;text-align:left;font-family:var(--font-sans);font-weight:600;font-size:16px;color:var(--text-primary);">
              {{ f.q }}<span style="font-family:var(--font-mono);font-size:20px;color:var(--coral-600);flex:none;">{{ f.sign }}</span>
            </button>
            <p v-if="f.open" style="padding:0 22px 22px;margin:0;font-size:15px;line-height:1.65;color:var(--text-secondary);">{{ f.a }}</p>
          </div>
        </div>
      </section>

      <!-- FINAL CTA -->
      <section style="max-width:var(--container);margin:0 auto;padding:0 32px 90px;">
        <div style="position:relative;overflow:hidden;border-radius:28px;background:var(--coral-500);padding:64px 48px;text-align:center;box-shadow:var(--shadow-lg);">
          <div style="position:absolute;inset:0;background:radial-gradient(80% 120% at 50% -20%,oklch(80% 0.1 36 / .5),transparent 60%);"></div>
          <div style="position:relative;">
            <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(36px,4.4vw,58px);line-height:1.03;letter-spacing:-.02em;margin:0;color:var(--navy-950);">Votre contexte vous appartient.</h2>
            <p style="font-size:18px;color:oklch(25% 0.06 26);margin:16px auto 30px;max-width:42ch;">Gratuit, sans compte, sans limite. Construisez votre premier pont en moins d'une minute.</p>
            <button @click="goWizard" style="font-family:var(--font-sans);font-weight:600;font-size:17px;color:#fff;background:var(--navy-900);border:none;border-radius:14px;padding:17px 32px;cursor:pointer;min-height:54px;box-shadow:var(--shadow-md);">Migrer mon historique →</button>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer style="border-top:1px solid var(--border-subtle);background:var(--surface-sunken);">
        <div class="pa-footer-grid" style="max-width:var(--container);margin:0 auto;padding:56px 32px 40px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:40px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <svg width="34" height="34" viewBox="0 0 80 80" fill="none" aria-label="E2SN" style="flex:none;"><rect x="2" y="2" width="76" height="76" rx="18" fill="var(--navy-900)"/><text x="20" y="55" font-family="Instrument Serif" font-size="44" fill="var(--stone-50)" letter-spacing="-0.04em">E</text><text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="var(--coral-500)">2</text><text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" fill="var(--stone-300)" letter-spacing="0.05em">SN</text></svg>
              <span style="font-family:var(--font-display);font-size:22px;">Portab<span style="font-style:italic;color:var(--coral-500);">IA</span></span>
            </div>
            <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.6;margin:16px 0 0;max-width:34ch;">Le RIO de l'IA. Un service gratuit et open-source opéré par E²SN — Guillaume BOUTON.</p>
            <div style="display:flex;gap:10px;margin-top:18px;">
              <span v-for="s in socials" :key="s" style="width:34px;height:34px;border-radius:10px;border:1px solid var(--border-default);background:var(--surface-elevated);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text-secondary);">{{ s }}</span>
            </div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Produit</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;"><a href="#how" style="color:var(--text-secondary);text-decoration:none;">Comment ça marche</a><a href="#compat" style="color:var(--text-secondary);text-decoration:none;">Compatibilité</a><a href="#faq" style="color:var(--text-secondary);text-decoration:none;">FAQ</a></div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Ressources</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;"><a href="#" style="color:var(--text-secondary);text-decoration:none;">GitHub · Apache-2.0 ↗</a><a href="#privacy" style="color:var(--text-secondary);text-decoration:none;">Transmission aux IA</a><a href="#" style="color:var(--text-secondary);text-decoration:none;">État du service</a></div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Légal</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;"><a href="#" style="color:var(--text-secondary);text-decoration:none;">CGU</a><a href="#" style="color:var(--text-secondary);text-decoration:none;">Mentions légales</a><a href="#" style="color:var(--text-secondary);text-decoration:none;">Confidentialité</a></div>
          </div>
        </div>
        <div style="max-width:var(--container);margin:0 auto;padding:20px 32px 40px;border-top:1px solid var(--border-subtle);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;">
          <span style="font-size:12.5px;color:var(--text-muted);">© 2026 E²SN · PortabIA n'est affilié à aucune IA citée.</span>
          <span style="font-size:12.5px;color:var(--text-muted);">Conçu par E²SN — Guillaume BOUTON · Hébergé en France 🇫🇷</span>
        </div>
      </footer>
    </main>

    <!-- ===== WIZARD ===== -->
    <main v-else style="max-width:760px;margin:0 auto;padding:48px 32px 90px;">
      <button @click="goHome" style="font-family:var(--font-sans);font-size:14px;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:0;margin-bottom:24px;">← Retour à l'accueil</button>

      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <div v-for="(d,i) in stepDots" :key="i" :style="'flex:1;height:5px;border-radius:999px;'+d.style"></div>
      </div>
      <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;color:var(--text-muted);text-transform:uppercase;margin:0 0 28px;">Étape {{ step+1 }} / 4 · {{ stepNames[step] }}</p>

      <!-- step 0 -->
      <template v-if="step===0">
        <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">D'où partez-vous ?</h2>
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
        <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">Vers quelle IA ?</h2>
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
        <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">Que voulez-vous emporter ?</h2>
        <p style="font-size:16px;color:var(--text-secondary);margin:0 0 28px;">Cochez ce qui doit traverser le pont. Rien n'est envoyé sans vous.</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button v-for="it in itemList" :key="it.id" @click="toggleItem(it.id)" :style="'display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:14px;cursor:pointer;text-align:left;border:2px solid;'+it.rowStyle">
            <span :style="'width:26px;height:26px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;'+it.boxStyle">{{ it.check }}</span>
            <span><span style="display:block;font-size:16px;font-weight:600;color:var(--text-primary);">{{ it.title }}</span><span style="display:block;font-size:13.5px;color:var(--text-secondary);margin-top:2px;">{{ it.body }}</span></span>
          </button>
        </div>
      </template>

      <!-- step 3 result -->
      <template v-else>
        <div style="text-align:center;padding:8px 0 4px;">
          <div style="width:64px;height:64px;border-radius:999px;margin:0 auto 18px;background:color-mix(in oklab,var(--success) 16%,var(--surface-elevated));border:1px solid color-mix(in oklab,var(--success) 36%,transparent);display:flex;align-items:center;justify-content:center;">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="var(--success)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h2 style="font-family:var(--font-display);font-weight:400;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 8px;">Votre pont est prêt.</h2>
          <p style="font-size:16px;color:var(--text-secondary);margin:0 auto 28px;max-width:44ch;">Le fichier de migration est généré localement, dans votre navigateur. Importez-le dans votre nouvelle IA.</p>
        </div>
        <div style="border:1px solid var(--border-subtle);border-radius:20px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:center;gap:18px;padding:26px;background:var(--surface-sunken);border-bottom:1px solid var(--border-subtle);">
            <span style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span :style="'width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff;background:'+src.color">{{ src.mark }}</span><span style="font-size:13px;font-weight:500;">{{ src.name }}</span></span>
            <svg width="44" height="16" viewBox="0 0 44 16" fill="none"><path d="M1 8h38M33 2l7 6-7 6" stroke="var(--coral-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span :style="'width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff;background:'+(tgt.color||'#999')">{{ tgt.mark }}</span><span style="font-size:13px;font-weight:500;">{{ tgt.name || '—' }}</span></span>
          </div>
          <div style="padding:22px 24px;">
            <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">Inclus dans le pont</div>
            <div style="display:flex;flex-direction:column;gap:9px;">
              <div v-for="x in selectedList" :key="x.id" style="display:flex;align-items:center;gap:10px;font-size:15px;color:var(--text-primary);"><span style="color:var(--success);">✓</span>{{ x.title }}</div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap;">
          <button @click="downloadKit" style="flex:1;min-width:200px;font-family:var(--font-sans);font-weight:600;font-size:16px;color:#fff;background:var(--coral-500);border:none;border-radius:14px;padding:16px;cursor:pointer;min-height:52px;box-shadow:var(--shadow-glow-coral);">⬇ Télécharger le pont (.json)</button>
          <button @click="reset" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:var(--text-primary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:14px;padding:16px 22px;cursor:pointer;min-height:52px;">Recommencer</button>
        </div>
      </template>

      <!-- nav -->
      <div v-if="step!==3" style="display:flex;justify-content:space-between;gap:12px;margin-top:36px;">
        <button @click="prev" :style="'font-family:var(--font-sans);font-weight:600;font-size:15px;color:var(--text-secondary);background:none;border:1px solid var(--border-default);border-radius:12px;padding:13px 22px;cursor:pointer;min-height:48px;visibility:'+(step===0?'hidden':'visible')">← Précédent</button>
        <button @click="next" :style="'font-family:var(--font-sans);font-weight:600;font-size:15px;color:#fff;border:none;border-radius:12px;padding:13px 26px;min-height:48px;'+nextStyle">{{ nextLabel }}</button>
      </div>
    </main>

  </div>
</template>
