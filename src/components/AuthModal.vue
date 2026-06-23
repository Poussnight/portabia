<script setup>
/* PortabIA — modale connexion / inscription / mot de passe (charte V4).
 * Mécaniques alignées sur E²SNauthor. E²SN — Guillaume BOUTON. Apache-2.0. */
import { ref, reactive } from 'vue'
import { api, setToken } from '../api/client.js'

const props = defineProps({ resetToken: { type: String, default: '' } })
const emit = defineEmits(['close', 'authed'])
const mode = ref(props.resetToken ? 'reset' : 'login') // login | register | forgot | reset
const loading = ref(false)
const error = ref(null)
const notice = ref(null)
const form = reactive({
  email: '', password: '', name: '', phone: '', professional_function: '',
  organization: '', consent_callback: false, password2: '',
})

const BENEFITS = [
  ['Migration sur-mesure', 'Réglez axe par axe : tout, ou seulement l’essentiel.'],
  ['Axes avancés', 'Projets, mémoire long terme et personas en plus du basique.'],
  ['Import de fichier', 'Déposez un export (conversations.json, CLAUDE.md, AGENTS.md…).'],
  ['Historique', 'Retrouvez et rejouez vos migrations précédentes.'],
]

async function submit() {
  error.value = null; notice.value = null; loading.value = true
  try {
    if (mode.value === 'login') {
      const res = await api.login({ email: form.email, password: form.password })
      setToken(res.token); emit('authed', res.user)
    } else if (mode.value === 'register') {
      const res = await api.register({ ...form })
      setToken(res.token); emit('authed', res.user)
    } else if (mode.value === 'forgot') {
      await api.forgotPassword(form.email)
      notice.value = 'Si un compte existe, un lien de réinitialisation vient d’être envoyé par e-mail (valable 1 h).'
    } else if (mode.value === 'reset') {
      if (form.password !== form.password2) { error.value = 'Les deux mots de passe ne correspondent pas.'; return }
      await api.resetPassword(props.resetToken, form.password)
      notice.value = 'Mot de passe réinitialisé. Vous pouvez vous connecter.'
      mode.value = 'login'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const titles = { login: 'Connexion', register: 'Créer un compte', forgot: 'Mot de passe oublié', reset: 'Nouveau mot de passe' }
const inp = 'width:100%;font-family:var(--font-sans);font-size:15px;padding:12px 14px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);'
const lbl = 'display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin:0 0 6px;'
</script>

<template>
  <div @click.self="emit('close')" style="position:fixed;inset:0;z-index:100;background:rgb(0 16 36 / .55);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;">
    <div class="pa-authcard" style="width:100%;max-width:820px;max-height:94vh;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;background:var(--surface-elevated);border-radius:24px;box-shadow:var(--shadow-lg);">

      <!-- PANNEAU GAUCHE : fonctionnalités offertes -->
      <aside class="pa-authaside" style="position:relative;overflow:hidden;background:radial-gradient(130% 110% at 18% 0%,#0A2036 0%,#001024 60%,#000B18 100%);color:#F4EFE9;padding:34px 32px;display:flex;flex-direction:column;">
        <span class="pa-blob" style="top:-100px;right:-90px;width:340px;height:340px;background:radial-gradient(circle,rgba(217,119,87,.32),transparent 64%);"></span>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%;">
          <div style="font-family:var(--font-serif);font-size:26px;">Portab<span style="font-style:italic;color:#F7A791;">IA</span></div>
          <h3 style="font-family:var(--font-display);font-weight:700;font-size:24px;line-height:1.12;letter-spacing:-.02em;margin:26px 0 6px;">Votre compte débloque <span style="font-family:var(--font-serif);font-weight:400;font-style:italic;color:#F7A791;">le sur-mesure</span>.</h3>
          <p style="font-size:13.5px;color:#AEB6C2;margin:0 0 22px;">La migration de base reste gratuite et sans compte.</p>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:16px;">
            <li v-for="b in BENEFITS" :key="b[0]" style="display:flex;gap:12px;align-items:flex-start;">
              <span style="flex:none;margin-top:3px;width:20px;height:20px;border-radius:50%;background:rgba(217,119,87,.18);display:flex;align-items:center;justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#F7A791" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span><span style="display:block;font-weight:600;font-size:14.5px;color:#fff;">{{ b[0] }}</span><span style="display:block;font-size:12.5px;color:#9BA3B0;margin-top:2px;line-height:1.45;">{{ b[1] }}</span></span>
            </li>
          </ul>
          <p style="margin-top:auto;padding-top:22px;font-size:11.5px;color:#7E8898;line-height:1.5;">Votre contenu migré n’est <strong style="color:#AEB6C2;">jamais</strong> stocké — tout se passe dans votre navigateur. Service gratuit opéré par E²SN.</p>
        </div>
      </aside>

      <!-- PANNEAU DROIT : formulaire -->
      <div style="padding:30px;overflow:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h2 style="font-family:var(--font-display);font-weight:700;font-size:25px;letter-spacing:-.02em;margin:0;">{{ titles[mode] }}</h2>
          <button @click="emit('close')" aria-label="Fermer" style="background:none;border:none;font-size:24px;color:var(--text-muted);cursor:pointer;line-height:1;">×</button>
        </div>

        <div v-if="mode==='login' || mode==='register'" style="display:flex;gap:8px;margin:16px 0 20px;">
          <button @click="mode='login'" :style="'flex:1;padding:9px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:1px solid var(--border-default);'+(mode==='login'?'background:var(--coral-500);color:#fff;border-color:var(--coral-500);':'background:var(--surface-canvas);color:var(--text-secondary);')">Connexion</button>
          <button @click="mode='register'" :style="'flex:1;padding:9px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:1px solid var(--border-default);'+(mode==='register'?'background:var(--coral-500);color:#fff;border-color:var(--coral-500);':'background:var(--surface-canvas);color:var(--text-secondary);')">Inscription</button>
        </div>

        <p v-if="mode==='forgot'" style="font-size:13.5px;color:var(--text-secondary);margin:14px 0 18px;">Entrez votre e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
        <p v-if="mode==='reset'" style="font-size:13.5px;color:var(--text-secondary);margin:14px 0 18px;">Choisissez un nouveau mot de passe (10 caractères minimum).</p>

        <form @submit.prevent="submit" style="display:flex;flex-direction:column;gap:14px;">
          <template v-if="mode==='register'">
            <div><label :style="lbl">Nom complet *</label><input v-model="form.name" required :style="inp" /></div>
            <div style="display:flex;gap:12px;">
              <div style="flex:1;"><label :style="lbl">Téléphone</label><input v-model="form.phone" :style="inp" placeholder="+33…" /></div>
              <div style="flex:1;"><label :style="lbl">Fonction</label><input v-model="form.professional_function" :style="inp" placeholder="Ex. Formateur" /></div>
            </div>
            <div><label :style="lbl">Organisation</label><input v-model="form.organization" :style="inp" /></div>
          </template>

          <div v-if="mode!=='reset'"><label :style="lbl">E-mail *</label><input v-model="form.email" type="email" required :style="inp" /></div>

          <div v-if="mode==='login' || mode==='register'"><label :style="lbl">Mot de passe *</label><input v-model="form.password" type="password" required :style="inp" :placeholder="mode==='register' ? '10 caractères minimum' : ''" /></div>

          <template v-if="mode==='reset'">
            <div><label :style="lbl">Nouveau mot de passe *</label><input v-model="form.password" type="password" required :style="inp" placeholder="10 caractères minimum" /></div>
            <div><label :style="lbl">Confirmer *</label><input v-model="form.password2" type="password" required :style="inp" /></div>
          </template>

          <div v-if="mode==='login'" style="text-align:right;margin-top:-6px;">
            <button type="button" @click="mode='forgot'; error=null; notice=null" style="font-family:var(--font-sans);font-size:13px;font-weight:600;color:var(--coral-700);background:none;border:none;cursor:pointer;padding:0;">Mot de passe oublié ?</button>
          </div>

          <label v-if="mode==='register'" style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--text-secondary);cursor:pointer;">
            <input type="checkbox" v-model="form.consent_callback" style="margin-top:2px;flex:none;" />
            <span>J'accepte d'être <strong style="color:var(--text-primary);">recontacté par téléphone</strong> par E²SN (optionnel, révocable — base : consentement CNIL).</span>
          </label>

          <p v-if="error" style="font-size:13.5px;color:var(--danger,#c0392b);margin:0;">⚠ {{ error }}</p>
          <p v-if="notice" style="font-size:13.5px;color:var(--success);margin:0;">✓ {{ notice }}</p>

          <button type="submit" :disabled="loading" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:#fff;background:linear-gradient(145deg,#E59A6E,#D97757);border:none;border-radius:12px;padding:14px;cursor:pointer;min-height:50px;box-shadow:var(--shadow-glow-coral);">
            {{ loading ? '…' : (mode==='login' ? 'Se connecter' : mode==='register' ? 'Créer mon compte' : mode==='forgot' ? 'Envoyer le lien' : 'Réinitialiser') }}
          </button>

          <button v-if="mode==='forgot' || (mode==='reset')" type="button" @click="mode='login'; error=null; notice=null" style="font-family:var(--font-sans);font-size:13px;font-weight:600;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:0;">← Retour à la connexion</button>

          <p v-if="mode==='register'" style="font-size:11.5px;color:var(--text-muted);margin:0;line-height:1.5;">En créant un compte, vous acceptez les CGU. Vos données (identité + métadonnées d'action) sont traitées conformément à notre politique de confidentialité. Le contenu migré n'est jamais stocké.</p>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 720px) {
  .pa-authcard { grid-template-columns: 1fr !important; max-width: 460px !important; }
  .pa-authaside { display: none !important; }
}
</style>
