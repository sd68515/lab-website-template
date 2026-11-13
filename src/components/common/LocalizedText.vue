<template>
  <template v-for="(part, index) in parts" :key="index">
    <slot v-if="part.kind === 'slot'" :name="part.value" />
    <template v-else>{{ part.value }}</template>
  </template>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { getMessage, type MessageValues } from '@/utils/locale'
import type { MessageKey } from '@/locales/en'

const props = defineProps<{ message: MessageKey; values?: MessageValues }>()
const slots = useSlots()

// Named slots preserve links/emphasis without HTML strings or v-html in translation resources.
const parts = computed(() => getMessage(props.message).split(/(\{[A-Za-z][\w]*\})/g).map(value => {
  if (!/^\{[A-Za-z][\w]*\}$/.test(value)) return { kind: 'text', value }
  const name = value.slice(1, -1)
  if (slots[name]) return { kind: 'slot', value: name }
  const replacement = props.values?.[name]
  if (replacement === undefined) throw new Error(`Missing ${name} in interface message: ${props.message}`)
  return { kind: 'text', value: String(replacement) }
}))
</script>
