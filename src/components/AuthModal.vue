<script setup>
/* PortabIA — modale connexion / inscription (charte V3). E²SN — Guillaume BOUTON. Apache-2.0. */
import { ref, reactive } from 'vue'
import { api, setToken } from '../api/client.js'

const emit = defineEmits(['close', 'authed'])
const mode = ref('login') // login | register
const loading = ref(false)
const error = ref(null)
const form = reactive({
  email: '', password: '', name: '', phone: '', professional_function: '',
  organization: '', consent_callback: false,
})

async function submit() {
  error.value = null; loading.value = true
  try {
    const res = mode.value === 'login'
      ? await api.login({ email: form.email, password: form.password })
      : await api.register({ ...form })
    setToken(res.token)
    emit('authed', res.user)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
const inp = 'width:100%;font-family:var(--font-sans);font-size:15px;padding:12px 14px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-canvas);color:var(--text-primary);'
const lbl = 'display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin:0 0 6px;'
</script>

<template>
  <div @click.self="emit('close')" style="position:fixed;inset:0;z-index:100;background:rgb(13 27 42 / .55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;">
    <div style="width:100%;max-width:460px;max-height:92vh;overflow:auto;background:var(--surface-elevated);border-radius:22px;box-shadow:var(--shadow-lg);padding:30px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h2 style="font-family:var(--font-display);font-weight:400;font-size:28px;margin:0;">{{ mode==='login' ? 'Connexion' : 'Créer un compte' }}</h2>
        <button @click="emit('close')" aria-label="Fermer" style="background:none;border:none;font-size:22px;color:var(--text-muted);cursor:pointer;">×</button>
      </div>
      <p style="font-size:13.5px;color:var(--text-secondary);margin:0 0 20px;">Le compte débloque la migration sur-mesure, l'historique et la sauvegarde. <strong style="color:var(--text-primary);">Votre contenu reste toujours dans votre navigateur.</strong></p>

      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <button @click="mode='login'" :style="'flex:1;padding:9px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:1px solid var(--border-default);'+(mode==='login'?'background:var(--coral-500);color:#fff;border-color:var(--coral-500);':'background:var(--surface-canvas);color:var(--text-secondary);')">Connexion</button>
        <button @click="mode='register'" :style="'flex:1;padding:9px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:1px solid var(--border-default);'+(mode==='register'?'background:var(--coral-500);color:#fff;border-color:var(--coral-500);':'background:var(--surface-canvas);color:var(--text-secondary);')">Inscription</button>
      </div>

      <form @submit.prevent="submit" style="display:flex;flex-direction:column;gap:14px;">
        <template v-if="mode==='register'">
          <div><label :style="lbl">Nom complet *</label><input v-model="form.name" required :style="inp" /></div>
          <div style="display:flex;gap:12px;">
            <div style="flex:1;"><label :style="lbl">Téléphone</label><input v-model="form.phone" :style="inp" placeholder="+33…" /></div>
            <div style="flex:1;"><label :style="lbl">Fonction</label><input v-model="form.professional_function" :style="inp" placeholder="Ex. Formateur" /></div>
          </div>
          <div><label :style="lbl">Organisation</label><input v-model="form.organization" :style="inp" /></div>
        </template>
        <div><label :style="lbl">E-mail *</label><input v-model="form.email" type="email" required :style="inp" /></div>
        <div><label :style="lbl">Mot de passe *</label><input v-model="form.password" type="password" required :style="inp" :placeholder="mode==='register' ? '10 caractères minimum' : ''" /></div>

        <label v-if="mode==='register'" style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--text-secondary);cursor:pointer;">
          <input type="checkbox" v-model="form.consent_callback" style="margin-top:2px;flex:none;" />
          <span>J'accepte d'être <strong style="color:var(--text-primary);">recontacté par téléphone</strong> par E²SN (optionnel, révocable à tout moment — base : consentement CNIL).</span>
        </label>

        <p v-if="error" style="font-size:13.5px;color:#c0392b;margin:0;">⚠ {{ error }}</p>

        <button type="submit" :disabled="loading" style="font-family:var(--font-sans);font-weight:600;font-size:16px;color:#fff;background:var(--coral-500);border:none;border-radius:12px;padding:14px;cursor:pointer;min-height:50px;box-shadow:var(--shadow-glow-coral);">{{ loading ? '…' : (mode==='login' ? 'Se connecter' : 'Créer mon compte') }}</button>
        <p v-if="mode==='register'" style="font-size:11.5px;color:var(--text-muted);margin:0;line-height:1.5;">En créant un compte, vous acceptez les CGU. Vos données (identité + métadonnées d'action) sont traitées conformément à notre politique de confidentialité. Le contenu migré n'est jamais stocké.</p>
      </form>
    </div>
  </div>
</template>
