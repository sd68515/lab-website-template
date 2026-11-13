<template>
  <nav v-if="scopes.length > 1" class="result-scope-tabs" :aria-label="text('resultScopeTabs.resultScope')">
    <span class="result-scope-tabs__label">{{ text('resultScopeTabs.results') }}</span>
    <button
      v-for="option in options"
      :key="option"
      type="button"
      class="result-scope-tabs__button"
      :class="{ 'result-scope-tabs__button--active': option === scope }"
      :aria-current="option === scope ? 'page' : undefined"
      :aria-pressed="option === scope"
      @click="$emit('select', option)"
    >
      {{ option === 'SPATIAL' && spatialBaseline ? text('scope.spatialBaseline') : labels[option] }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { text } from '@/utils/locale'
import { computed } from 'vue'
import { getResultScopeLabel } from '@/constants/catalogueLabels'
import { RESULT_SCOPES, type ResultScope } from '@/constants/result-scope'

const props = defineProps<{ scopes: ResultScope[]; scope: ResultScope; spatialBaseline?: boolean }>()
defineEmits<{ select: [scope: ResultScope] }>()

const labels = computed(() => Object.fromEntries([...RESULT_SCOPES.map(scope => [scope, getResultScopeLabel(scope)]), ['all', text('common.all')]]))

const options = computed<ResultScope[]>(() => [...props.scopes, 'all'])
</script>
