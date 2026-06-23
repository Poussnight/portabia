<template>
  <svg :width="size" :height="size" viewBox="0 0 80 80" fill="none" :aria-label="ariaLabel">
    <rect x="2" y="2" width="76" height="76" rx="18" :fill="bgFill"/>
    <text x="20" y="55" font-family="Instrument Serif" font-size="44" :fill="eFill" letter-spacing="-0.04em">E</text>
    <text x="46" y="36" font-family="Instrument Serif" font-style="italic" font-size="22" fill="oklch(64% 0.150 30)">2</text>
    <text x="46" y="55" font-family="Geist, sans-serif" font-size="14" font-weight="600" :fill="snFill" letter-spacing="0.05em">SN</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: { type: Number, default: 36 },
  dark: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'E2SN' },
})

const bgFill = computed(() => props.dark ? 'oklch(98.5% 0.004 70)' : 'oklch(17% 0.050 248)')
const eFill = computed(() => props.dark ? 'oklch(17% 0.050 248)' : 'oklch(98.5% 0.004 70)')
const snFill = computed(() => props.dark ? 'oklch(40% 0.012 55)' : 'oklch(78% 0.020 60)')
</script>
