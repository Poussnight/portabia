<script setup>
/* PortabIA — vue Compte : profil + historique (métadonnées) + parrainage. E²SN. Apache-2.0. */
import { ref, onMounted } from 'vue'
import { api } from '../api/client.js'

const props = defineProps({ user: Object })
const emit = defineEmits(['home', 'logout'])
const history = ref([])
const loading = ref(true)
const refEmail = ref('')
const refMsg = ref(null)
const refErr = ref(null)
const pw = ref({ cur: '', neo: '' })
const pwMsg = ref(null)
const pwErr = ref(null)
async function changePw() {
  pwMsg.value = null; pwErr.value = null
  try { await api.changePassword(pw.value.cur, pw.value.neo); pwMsg.value = 'Mot de passe modifié ✓'; pw.value = { cur: '', neo: '' } }
  catch (e) { pwErr.value = e.message }
}

async function load() {
  loading.value = true
  try { history.value = (await api.historyList()).history || [] } catch { history.value = [] }
  loading.value = false
}
async function del(id) {
  try { await api.historyDel(id); history.value = history.value.filter((h) => h.id !== id) } catch { /* */ }
}
async function invite() {
  refMsg.value = null; refErr.value = null
  try { await api.referral(refEmail.value); refMsg.value = 'Invitation envoyée ✓'; refEmail.value = '' }
  catch (e) { refErr.value = e.message }
}
function fmt(s) { try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }
onMounted(load)
const card = 'border:1px solid var(--border-subtle);border-radius:18px;background:var(--surface-elevated);box-shadow:var(--shadow-sm);padding:24px;'
</script>

<template>
  <main style="max-width:880px;margin:0 auto;padding:48px 32px 90px;">
    <button @click="emit('home')" style="font-family:var(--font-sans);font-size:14px;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:0;margin-bottom:24px;">← Retour à l'accueil</button>
    <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:28px;">
      <h1 style="font-family:var(--font-display);font-weight:700;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0;">Bonjour, {{ user?.name || 'vous' }}.</h1>
      <button @click="emit('logout')" style="font-family:var(--font-sans);font-weight:600;font-size:14px;color:var(--text-secondary);background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:10px;padding:9px 16px;cursor:pointer;">Déconnexion</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr;gap:18px;">
      <!-- Historique -->
      <div :style="card">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:24px;margin:0 0 4px;">Historique de vos ponts</h2>
        <p style="font-size:13.5px;color:var(--text-secondary);margin:0 0 18px;">Métadonnées uniquement (IA source/cible, périmètre, date). <strong style="color:var(--text-primary);">Aucun contenu n'est conservé.</strong></p>
        <p v-if="loading" style="color:var(--text-muted);font-size:14px;">Chargement…</p>
        <p v-else-if="!history.length" style="color:var(--text-muted);font-size:14px;">Aucune migration enregistrée pour l'instant.</p>
        <div v-else style="display:flex;flex-direction:column;gap:10px;">
          <div v-for="h in history" :key="h.id" style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid var(--border-subtle);border-radius:12px;">
            <div>
              <div style="font-size:15px;font-weight:600;color:var(--text-primary);">{{ h.label || (h.source_ai + ' → ' + h.target_ai) }}</div>
              <div style="font-size:12.5px;color:var(--text-muted);">{{ (h.axes||[]).join(', ') }} · {{ h.scope }} · {{ fmt(h.created_at) }}</div>
            </div>
            <button @click="del(h.id)" aria-label="Supprimer" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;">🗑</button>
          </div>
        </div>
      </div>

      <!-- Parrainage -->
      <div :style="card">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:24px;margin:0 0 4px;">Inviter un contact</h2>
        <p style="font-size:13.5px;color:var(--text-secondary);margin:0 0 16px;">Un e-mail unique sera envoyé depuis contact@essn.fr. L'adresse n'est pas conservée.</p>
        <form @submit.prevent="invite" style="display:flex;gap:10px;flex-wrap:wrap;">
          <input v-model="refEmail" type="email" required placeholder="email@exemple.com" style="flex:1;min-width:220px;font-size:15px;padding:12px 14px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);" />
          <button type="submit" style="font-family:var(--font-sans);font-weight:600;font-size:15px;color:#fff;background:var(--coral-500);border:none;border-radius:10px;padding:12px 20px;cursor:pointer;">Inviter</button>
        </form>
        <p v-if="refMsg" style="font-size:13.5px;color:var(--success);margin:12px 0 0;">{{ refMsg }}</p>
        <p v-if="refErr" style="font-size:13.5px;color:#c0392b;margin:12px 0 0;">⚠ {{ refErr }}</p>
      </div>

      <!-- Profil / RGPD -->
      <div :style="card">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:24px;margin:0 0 12px;">Votre compte</h2>
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.9;">
          <div><strong style="color:var(--text-primary);">E-mail</strong> : {{ user?.email }} <span v-if="user && !user.email_verified" style="color:var(--coral-600);">(à confirmer)</span></div>
          <div v-if="user?.organization"><strong style="color:var(--text-primary);">Organisation</strong> : {{ user.organization }}</div>
          <div><strong style="color:var(--text-primary);">Rappel téléphonique</strong> : {{ user?.consent_callback ? 'accepté' : 'non' }}</div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin:14px 0 0;">Droits RGPD (accès, rectification, suppression, portabilité) : contact@essn.fr.</p>
      </div>

      <!-- Changer le mot de passe -->
      <div :style="card">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:24px;margin:0 0 12px;">Changer le mot de passe</h2>
        <form @submit.prevent="changePw" style="display:flex;flex-direction:column;gap:12px;max-width:420px;">
          <input v-model="pw.cur" type="password" required placeholder="Mot de passe actuel" style="font-size:15px;padding:12px 14px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);" />
          <input v-model="pw.neo" type="password" required placeholder="Nouveau mot de passe (10 caractères min.)" style="font-size:15px;padding:12px 14px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);" />
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <button type="submit" style="font-family:var(--font-sans);font-weight:600;font-size:15px;color:#fff;background:var(--coral-500);border:none;border-radius:10px;padding:12px 20px;cursor:pointer;">Mettre à jour</button>
            <span v-if="pwMsg" style="font-size:13.5px;color:var(--success);">{{ pwMsg }}</span>
            <span v-if="pwErr" style="font-size:13.5px;color:#c0392b;">⚠ {{ pwErr }}</span>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
