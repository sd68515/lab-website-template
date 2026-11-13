<template>
  <div :class="level === 0 ? 'dataset-result-nav-group' : 'method-result-nav-sub-group'" :data-nav-group="group.id">
    <component
      :is="collapsible ? 'button' : 'div'"
      :type="collapsible ? 'button' : undefined"
      :class="level === 0 ? 'dataset-result-nav-group-title' : 'method-result-nav-sub-title'"
      :aria-expanded="collapsible ? !collapsed[group.id] : undefined"
      :aria-controls="collapsible ? `nav-group-${group.id}` : undefined"
      @click="collapsible && $emit('toggle', group.id)"
    >
      <span class="dataset-result-nav-group-title-text">{{ displayText(group.title) }}</span>
      <v-icon
        v-if="collapsible"
        class="dataset-result-nav-group-toggle"
        :class="{ 'dataset-result-nav-group-toggle--collapsed': collapsed[group.id] }"
        icon="$mdi-chevron-down"
        aria-hidden="true"
      />
    </component>
    <div :id="`nav-group-${group.id}`" v-show="!collapsible || !collapsed[group.id]">
      <button
        v-for="section in group.items ?? []"
        :key="section.id"
        type="button"
        class="dataset-result-nav-item"
        :class="{ 'dataset-result-nav-item--active': section.id === activeId, 'dataset-result-nav-item--dense': dense }"
        :data-nav-key="section.id"
        :title="section.fullLabel"
        :aria-current="section.id === activeId ? 'location' : undefined"
        @click="$emit('select', section.id)"
      >
        <span class="dataset-result-nav-dot" aria-hidden="true"></span>
        <span class="dataset-result-nav-label" :class="{ 'nav-item--wrap-text': section.wrapText }">{{ displayText(section.label) }}</span>
      </button>
      <ResultNavigationGroup
        v-for="child in group.subGroups ?? []"
        :key="child.id"
        :group="child"
        :level="level + 1"
        :collapsed="collapsed"
        :active-id="activeId"
        :collapsible="collapsible"
        :dense="dense"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResultNavigationGroup as NavigationGroup } from '@/types/resultNavigation'
import { displayText } from '@/utils/locale'

defineProps<{
  group: NavigationGroup
  level: number
  collapsed: Record<string, boolean>
  activeId: string
  collapsible: boolean
  dense: boolean
}>()
defineEmits<{ toggle: [id: string]; select: [id: string] }>()
</script>
