<!--
  结果页侧边导航组件
  - 展示 section 列表和可递归分组（工具或数据集）
  - 通过 activeId 高亮当前 section，点击触发 select 事件
  - 支持可选“返回顶部”按钮，触发 backTop 事件
-->
<template>
  <aside
    ref="containerRef"
    :class="[
      'dataset-result-tool-navigation',
      `dataset-result-tool-navigation--${props.positionMode}`
    ]"
    :style="containerStyle"
    role="complementary"
    :aria-label="text('resultNavigationSidebar.resultSectionNavigation')"
  >
    <div
      ref="sidebarRef"
      class="v-sheet dataset-result-nav-surface"
      :style="surfaceStyle"
    >
      <div class="dataset-result-nav-header">
        <h2 class="dataset-result-nav-title">
          {{ displayText(title) }}
        </h2>
        <button
          v-if="showBackTop"
          class="dataset-result-back-top"
          type="button"
          :aria-label="text('resultNavigationSidebar.backToTop')"
          :style="backTopStyle"
          @click="handleBackTop"
        >
          <v-icon class="dataset-result-back-top-icon" icon="$mdi-chevron-up" aria-hidden="true" />
        </button>
      </div>

      <div class="dataset-result-nav-shell">
        <nav
          class="dataset-result-nav-content"
          :aria-label="text('resultNavigationSidebar.resultSectionShortcuts')"
        >
          <template v-if="hasGroups">
            <ResultNavigationGroup
              v-for="group in groups"
              :key="group.id"
              :group="group"
              :level="0"
              :collapsed="collapsedGroups"
              :active-id="activeId"
              :collapsible="collapsible"
              :dense="dense"
              @toggle="toggleGroup"
              @select="handleSelect"
            />
          </template>

          <template v-else>
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              :class="[
                'dataset-result-nav-item',
                { 'dataset-result-nav-item--active': section.id === activeId },
                { 'dataset-result-nav-item--dense': dense }
              ]"
              :data-nav-key="section.id"
              :aria-current="section.id === activeId ? 'location' : undefined"
              @click="handleSelect(section.id)"
            >
              <span class="dataset-result-nav-dot" aria-hidden="true"></span>
              <span
                :class="[
                  'dataset-result-nav-label',
                  { 'nav-item--wrap-text': section.wrapText }
                ]"
              >
                {{ displayText(section.label) }}
              </span>
            </button>
          </template>
        </nav>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { computed, ref, watch, type CSSProperties } from 'vue';
import { SIDEBAR_WIDTH, NAV_HEIGHT } from '@/constants/measurement-layout';
import ResultNavigationGroup from './ResultNavigationGroup.vue'
import { findNavigationGroupPath, type ResultNavigationGroup as NavigationGroup, type ResultNavigationSection } from '@/types/resultNavigation'
import { useAffixWidthSync } from '@/composables/useAffixWidthSync';

const props = withDefaults(
  defineProps<{
    sections: ResultNavigationSection[];
    groups?: NavigationGroup[];
    activeId: string;
    dense?: boolean;
    showBackTop?: boolean;
    // 工具/数据模式，决定标题文案
    mode?: 'tools' | 'data';
    // 是否允许分组折叠
    collapsible?: boolean;
    // 顶部偏移量，默认等于主导航高度
    topOffset?: number;
    // 底部偏移量，用于避让 footer（由 useFooterOffset 提供）
    footerOffset?: number;
    // 定位模式：结果页保持 fixed，特殊页面可使用 sticky
    positionMode?: 'fixed' | 'sticky';
  }>(),
  {
    dense: false,
    showBackTop: true,
    mode: 'tools',
    collapsible: true,
    topOffset: NAV_HEIGHT,
    footerOffset: 0,
    positionMode: 'fixed'
  }
);

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'backTop'): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const isFixedMode = computed(() => props.positionMode === 'fixed')

// 利用 useAffixWidthSync 在固定布局时保持侧栏宽度与容器一致
useAffixWidthSync({
  container: containerRef,
  target: sidebarRef,
  enabled: isFixedMode
});

const title = computed(() => (props.mode === 'data' ? 'Datasets' : 'Methods'));

const hasGroups = computed(() => Boolean(props.groups && props.groups.length));

const collapsedGroups = ref<Record<string, boolean>>({});

const expandForActive = () => {
  for (const id of findNavigationGroupPath(props.groups ?? [], props.activeId)) {
    collapsedGroups.value[id] = false;
  }
};

function toggleGroup(id: string) {
  collapsedGroups.value[id] = !collapsedGroups.value[id];
}

watch(
  () => props.groups,
  groups => {
    const activePath = findNavigationGroupPath(groups ?? [], props.activeId);
    const initialPath = activePath.length ? activePath : [groups?.[0]?.id ?? ''];
    const previous = collapsedGroups.value;
    const next: Record<string, boolean> = {};
    const visit = (items: readonly NavigationGroup[]) => {
      for (const group of items) {
        // Translations can rebuild the tree; retain the user's expanded groups by stable ID.
        next[group.id] = previous[group.id] ?? !initialPath.includes(group.id);
        visit(group.subGroups ?? []);
      }
    };
    visit(groups ?? []);
    collapsedGroups.value = next;
    expandForActive();
  },
  { immediate: true }
);

watch(() => props.activeId, expandForActive);

const containerStyle = computed<CSSProperties>(() => {
  const top = props.topOffset + 12
  if (props.positionMode === 'sticky') {
    return {
      width: `${SIDEBAR_WIDTH}px`,
      alignSelf: 'stretch',
      height: '100%'
    }
  }

  const style: CSSProperties = {
    top: `${top}px`,
    width: `${SIDEBAR_WIDTH}px`
  }

  // 必须始终设置 bottom，否则导航栏高度失控
  const offset = props.footerOffset ?? 0

  if (offset > 0) {
    // Footer 进入视口时，增加底部间距避让
    style.bottom = `${offset + 16}px`
  } else {
    // 默认底部间距，保持与视口底部一定距离
    style.bottom = '16px'
  }

  return style
})

const surfaceStyle = computed<CSSProperties | undefined>(() => {
  if (props.positionMode !== 'sticky') {
    return undefined
  }

  // sticky 位于 .app-shell-main 的内部滚动坐标系；该容器已有主导航 padding-top。
  // props.topOffset 是视口坐标，因此需要扣除主导航高度，fixed 模式则不需要。
  const top = Math.max(12, props.topOffset + 12 - NAV_HEIGHT)
  return {
    position: 'sticky',
    top: `${top}px`,
    height: `calc(100vh - ${props.topOffset + 28}px)`,
    width: '100%'
  }
})

const backTopStyle = computed(() => {
  if (props.positionMode === 'sticky') {
    return {}
  }
  const offset = props.footerOffset ?? 0;
  return offset > 0 ? { bottom: `${offset + 16}px` } : {};
});

function handleSelect(id: string) {
  emit('select', id);
}

function handleBackTop() {
  emit('backTop');
}
</script>

<style lang="scss">
@use '@/styles/components/result-navigation.scss';
</style>
