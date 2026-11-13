<!--
  Category A 工具目录页面（Vuetify 版）
  功能：多条件筛选 + 工具对比表 + 列固定/表头固定

  表单字段命名规范（name 属性）：
  - method-type-filter: 方法类型多选筛选器（Category A/multi-omics等）
  - data-modality-filter: 数据模态多选筛选器（转录组、多组学等）
  - platform-filter: 平台单选筛选器（Python/R等）
  - deep-learning-filter: 深度学习单选筛选器（Yes/No）
-->
<template>
  <div class="about-layout tools-page">
    <div class="about-main">
      <article class="about-section tools-catalogue" aria-labelledby="tools-page-title">
        <header class="tools-header">
          <h1 id="tools-page-title" class="about-section-title">{{ text('toolsView.toolCatalogue') }}</h1>
          <p id="tools-page-description" class="tools-description">{{ text('toolsView.toolsPageDescription') }}</p>
        </header>

        <section class="tools-table-section" role="region" aria-labelledby="tools-table-heading">
          <h2 id="tools-table-heading" class="sr-only">{{ text('toolsView.toolComparisonTable') }}</h2>
          <p id="tools-table-description" class="sr-only"> {{ text('toolsView.comparisonOfRNAVelocityAndRelatedAnalysis') }} </p>

          <section
            :class="['tools-filters', { 'tools-filters--disabled': isDataUnavailable }]"
            :aria-label="text('toolsView.toolFilters')"
          >
            <div class="tools-filter">
              <v-select :item-title="item => localizedItemTitle(item)"
                id="velocity-filter"
                name="method-type-filter"
                v-model="velocityTypeFilters"
                :items="velocitySelectItems"
                :disabled="isDataUnavailable"
                multiple
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                color="primary"
                :label="text('catalogue.header.methodType')"
                class="tools-filter__select"
                @update:model-value="handleFilterChange"
              >
                <template #selection="{ index }">
                  <span v-if="index === 0" class="tools-filter__selection-text">
                    {{ getMultiSelectDisplayText(velocityTypeFilters, velocitySelectItems) }}
                  </span>
                </template>
              </v-select>
            </div>

            <div class="tools-filter">
              <v-select :item-title="item => localizedItemTitle(item)"
                id="data-filter"
                name="data-modality-filter"
                v-model="dataTypeFilters"
                :items="dataSelectItems"
                :disabled="isDataUnavailable"
                multiple
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                color="primary"
                :label="text('common.dataModality')"
                class="tools-filter__select"
                @update:model-value="handleFilterChange"
              >
                <template #selection="{ index }">
                  <span v-if="index === 0" class="tools-filter__selection-text">
                    {{ getMultiSelectDisplayText(dataTypeFilters, dataSelectItems) }}
                  </span>
                </template>
              </v-select>
            </div>

            <div class="tools-filter">
              <v-select :item-title="item => localizedItemTitle(item)"
                id="platform-filter"
                name="platform-filter"
                v-model="platformFilters"
                :items="availablePlatforms"
                :disabled="isDataUnavailable"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                color="primary"
                :label="text('toolsView.platform')"
                class="tools-filter__select"
                @update:model-value="handleFilterChange"
              />
            </div>

            <div class="tools-filter">
              <v-select :item-title="item => localizedItemTitle(item)"
                id="deeplearning-filter"
                name="deep-learning-filter"
                v-model="deepLearningFilters"
                :items="deepLearningSelectItems"
                :disabled="isDataUnavailable"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                color="primary"
                :label="text('toolsView.deepLearning')"
                class="tools-filter__select"
                @update:model-value="handleFilterChange"
              />
            </div>

            <v-btn
              type="button"
              class="tools-filter__clear"
              color="primary"
              variant="outlined"
              :disabled="!hasActiveFilters || loading || isDataUnavailable"
              @click="resetFilters"
              :aria-label="text('toolsView.clearAllFilters')"
            > {{ text('common.clear') }} </v-btn>
          </section>

          <p v-if="!isDataUnavailable" role="status" aria-live="polite" aria-atomic="true" class="sr-only">{{ text('catalogue.showing', { count: formatNumber(filteredToolCount), total: formatNumber(distinctToolCount) }) }}</p>

          <!-- 数据加载、失败与空状态 -->
          <div v-if="loadError" class="tools-empty-card">
            <v-icon size="64" color="primary" class="tools-empty-card__icon" icon="$mdi-table-off" />
            <p class="tools-empty-card__title">{{ text('toolsView.dataFileTemporarilyUnavailable') }}</p>
          </div>

          <StatusMessage
            v-else-if="loading"
            class="tools-loading"
            state="loading"
            centered
            :title="text('toolsView.loadingToolCatalogue')"
          />

          <div v-else-if="toolRows.length === 0" class="tools-empty-card">
            <v-icon size="64" color="primary" class="tools-empty-card__icon" icon="$mdi-table-off" />
            <p class="tools-empty-card__title">{{ text('toolsView.noDataAvailable') }}</p>
          </div>

          <!-- 正常表格 -->
          <template v-else>
            <div ref="tableShell" class="tools-table-shell" :style="{ '--tools-table-width': `${tableWidth}px` }">
              <v-data-table
                :headers="resolvedHeaders"
                :items="filteredRows"
                :loading="loading"
                :height="tableHeight"
                :items-per-page="-1"
                fixed-header
                hover
                density="comfortable"
                item-value="rowKey"
                :class="['tools-table', 'v-table--fixed-height', 'v-table--fixed-header', { 'tools-table--pinned': pinnedToolName }]"
                hide-default-footer
              >
                <template #[`header.toolName`]="{ column }">
                  <div class="header-with-pin">
                    <span class="header-text">
                      {{ displayText(column.title) }}
                      <span class="tools-tool-count" aria-hidden="true">{{ formatNumber(filteredToolCount) }}</span>
                    </span>
                    <button
                      type="button"
                      :class="['pin-icon', { active: pinnedToolName }]"
                      :aria-pressed="pinnedToolName ? 'true' : 'false'"
                      :aria-label="pinnedToolName ? text('toolsView.unpinToolNameColumn') : text('toolsView.pinToolNameColumn')"
                      :title="text('toolsView.togglePinForToolNameColumn')"
                      @click.stop="togglePinnedColumn"
                    >
                      <v-icon :icon="pinnedToolName ? '$mdi-pin' : '$mdi-pin-off'" size="20" aria-hidden="true" />
                    </button>
                  </div>
                </template>

                <template v-slot:[`item.toolName`]="{ item }">
                  <div class="tool-name-cell" translate="no">
                    {{ item.toolName }}
                  </div>
                </template>

                <template v-slot:[`item.velocityTypes`]="{ item }">
                  <div class="supported-contexts-cell">
                    <span
                      v-for="velocityType in item.velocityTypes"
                      :key="`velocity::${velocityType}`"
                      class="supported-context"
                    >
                      {{ getVelocityLabel(velocityType) }}
                    </span>
                  </div>
                </template>

                <template v-slot:[`item.dataTypes`]="{ item }">
                  <div class="supported-contexts-cell">
                    <span
                      v-for="dataType in item.dataTypes"
                      :key="`data::${dataType}`"
                      class="supported-context"
                    >
                      {{ getDataTypeLabel(dataType) }}
                    </span>
                  </div>
                </template>

                <template v-slot:[`item.paper`]="{ item }">
                  <a
                    v-if="item.link"
                    :href="item.link"
                    class="tools-link paper-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    :title="item.paper"
                  >
                    {{ item.paper }}
                  </a>
                <span v-else class="paper-text" :title="item.paper">
                  {{ item.paper }}
                </span>
              </template>

              <template v-slot:[`item.pmid`]="{ item }">
                <a
                  v-if="item.pmidLink"
                  :href="item.pmidLink"
                  class="tools-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ item.pmid }}
                </a>
                <span v-else>{{ item.pmid }}</span>
              </template>

              <template v-slot:[`item.deepLearning`]="{ item }">
                {{ text(item.deepLearning === 'yes' ? 'common.yes' : 'common.no') }}
              </template>

              <template v-slot:[`item.accessibilityLabel`]="{ item }">
                <a
                  v-if="item.accessibilityUrl"
                  :href="item.accessibilityUrl"
                  class="tools-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ item.accessibilityLabel }}
                </a>
                <span v-else class="accessibility-text">
                  {{ item.accessibilityLabel }}
                </span>
              </template>
            </v-data-table>
            </div>
          </template>

        </section>
      </article>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import Papa from 'papaparse';
import { API_ENDPOINTS, buildStaticCsvRequestUrl } from '@/constants/api';
import { CATALOGUE_VELOCITY_LABELS, CATALOGUE_DATA_LABELS, getVelocityLabel, getDataTypeLabel } from '@/constants/catalogueLabels';
import { formatNumber, text, displayText, localizedItemTitle } from '@/utils/locale';
import { buildPublicationLink, normalizeUrl } from '@/utils/urlBuilders';
import { useScrollContainer } from '@/composables/useScrollContainer';

type ColumnKey =
  | 'toolName'
  | 'velocityTypes'
  | 'no'
  | 'paper'
  | 'pmid'
  | 'journal'
  | 'year'
  | 'dataTypes'
  | 'accessibilityLabel'
  | 'platform'
  | 'deepLearning';

interface TableHeader {
  title: string;
  key: ColumnKey;
  width?: number;
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;
}

interface SupportedContext {
  key: string;
  velocityType: string;
  dataType: string;
}

interface ProcessedToolRow {
  rowKey: string;
  supportedContexts: SupportedContext[];
  velocityTypes: string[];
  dataTypes: string[];
  no: number | string;
  rawToolName: string;
  toolName: string;
  paper: string;
  link: string | null;
  pmid: string;
  pmidLink: string | null;
  journal: string;
  year: number | string;
  accessibilityLabel: string;
  accessibilityUrl: string;
  platform: string;
  deepLearning: 'yes' | 'no';
}

type MultiOrSingleSelection = readonly string[] | string[] | string | null | undefined;

type FilterSelections = {
  velocity?: MultiOrSingleSelection;
  data?: MultiOrSingleSelection;
  platform?: MultiOrSingleSelection;
  deep?: MultiOrSingleSelection;
};

const getHeaders = (): TableHeader[] => [
  { title: text('catalogue.header.toolName'), key: 'toolName', width: 200, sortable: false },
  { title: text('catalogue.header.methodType'), key: 'velocityTypes', width: 220 },
  { title: text('common.dataModality'), key: 'dataTypes', width: 240 },
  { title: text('catalogue.header.paper'), key: 'paper', width: 400 },
  { title: text('catalogue.header.year'), key: 'year', width: 90 },
  { title: text('catalogue.header.journal'), key: 'journal', width: 220 },
  { title: text('catalogue.header.pmid'), key: 'pmid', width: 140 },
  { title: text('catalogue.header.accessibilityLabel'), key: 'accessibilityLabel', width: 230 },
  { title: text('catalogue.header.platform'), key: 'platform', width: 128 },
  { title: text('catalogue.header.deepLearning'), key: 'deepLearning', width: 160 }
];

const loading = ref<boolean>(true);
const loadError = ref<string>('');
const toolRows = ref<ProcessedToolRow[]>([]);
const pinnedToolName = ref<boolean>(true);
const tableShell = ref<HTMLElement | null>(null);
const tableHeight = ref(525);
const { containerRef: scrollContainerRef } = useScrollContainer();
const cleanupHeaderGuards: Array<() => void> = [];

const velocityTypeFilters = ref<string[]>([]);
const dataTypeFilters = ref<string[]>([]);
const platformFilters = ref<string | null>(null);
const deepLearningFilters = ref<string | null>(null);

const DEFAULT_VELOCITY_FILTER_OPTIONS = Object.keys(CATALOGUE_VELOCITY_LABELS);
const DEFAULT_DATA_TYPE_FILTER_OPTIONS = Object.keys(CATALOGUE_DATA_LABELS);

const availableVelocityTypes = ref<string[]>([...DEFAULT_VELOCITY_FILTER_OPTIONS]);
const availableDataTypes = ref<string[]>([...DEFAULT_DATA_TYPE_FILTER_OPTIONS]);

const availablePlatforms = ref<string[]>(['Python', 'R']);
const availableDeepLearning = ref<string[]>(['yes', 'no']);

const resolvedHeaders = computed<TableHeader[]>(getHeaders);
const tableWidth = computed(() => resolvedHeaders.value.reduce((sum, column) => sum + (column.width ?? 0), 0));
const velocitySelectItems = computed(() => availableVelocityTypes.value.map(value => ({ value, title: getVelocityLabel(value) })));
const dataSelectItems = computed(() => availableDataTypes.value.map(value => ({ value, title: getDataTypeLabel(value) })));
const deepLearningSelectItems = computed(() => availableDeepLearning.value.map(value => ({ value, title: text(value === 'yes' ? 'common.yes' : 'common.no') })));

const distinctToolCount = computed<number>(() => {
  const names = new Set(toolRows.value.map(row => row.rawToolName || row.toolName));
  return names.size;
});

const toArray = (value: MultiOrSingleSelection): string[] => {
  if (Array.isArray(value)) {
    return Array.from(value)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

const filterContextsBy = (
  contexts: SupportedContext[],
  {
    velocity = velocityTypeFilters.value,
    data = dataTypeFilters.value
  }: Pick<FilterSelections, 'velocity' | 'data'> = {}
): SupportedContext[] => {
  const velocityArray = toArray(velocity);
  const dataArray = toArray(data);

  return contexts.filter(context => {
    const matchVelocity = velocityArray.length === 0 || velocityArray.includes(context.velocityType);
    const matchData = dataArray.length === 0 || dataArray.includes(context.dataType);
    return matchVelocity && matchData;
  });
};

const filterRowsBy = (
  rows: ProcessedToolRow[],
  {
    velocity = velocityTypeFilters.value,
    data = dataTypeFilters.value,
    platform = platformFilters.value,
    deep = deepLearningFilters.value
  }: FilterSelections = {}
) => {
  const platformArray = toArray(platform);
  const deepArray = toArray(deep);

  return rows.filter(row => {
    const matchedContexts = filterContextsBy(row.supportedContexts, { velocity, data });
    const matchContext = matchedContexts.length > 0;
    const matchPlatform = platformArray.length === 0 || platformArray.includes(row.platform);
    const matchDeepLearning = deepArray.length === 0 || deepArray.includes(row.deepLearning);
    return matchContext && matchPlatform && matchDeepLearning;
  });
};

const filteredRows = computed<ProcessedToolRow[]>(() => {
  return filterRowsBy(toolRows.value).map(row => {
    const matchedContexts = filterContextsBy(row.supportedContexts);
    return {
      ...row,
      accessibilityLabel: formatAccessibility(row.toolName, row.accessibilityUrl),
      supportedContexts: matchedContexts,
      velocityTypes: Array.from(new Set(matchedContexts.map(context => context.velocityType))),
      dataTypes: Array.from(new Set(matchedContexts.map(context => context.dataType)))
    };
  });
});

const filteredToolCount = computed(() =>
  new Set(filteredRows.value.map(row => row.rawToolName || row.toolName)).size
);

const hasActiveFilters = computed(() => {
  const platformActive = typeof platformFilters.value === 'string' && platformFilters.value.trim().length > 0;
  const deepActive = typeof deepLearningFilters.value === 'string' && deepLearningFilters.value.trim().length > 0;
  return (
    velocityTypeFilters.value.length > 0 ||
    dataTypeFilters.value.length > 0 ||
    platformActive ||
    deepActive
  );
});

const isDataUnavailable = computed(() => {
  return loading.value || !!loadError.value || toolRows.value.length === 0;
});

type SelectItem =
  | string
  | {
      title?: string;
      value?: string;
      [key: string]: unknown;
    };

const getSelectItemValue = (item: SelectItem): string => {
  if (typeof item === 'string') return item;
  if (typeof item.value === 'string') return item.value;
  return '';
};

const getSelectItemTitle = (item: SelectItem): string => {
  if (typeof item === 'string') return item;
  if (typeof item.title === 'string') return item.title;
  return getSelectItemValue(item);
};

// 多选框显示文本：0 选中显示空（label 会显示），1 选中显示可读标题，≥2 显示 "N selected"
const getMultiSelectDisplayText = (selected: unknown[], items: SelectItem[] = []): string => {
  if (!Array.isArray(selected) || selected.length === 0) return '';
  if (selected.length >= 2) return text('common.selected', { count: formatNumber(selected.length) });

  const first = selected[0];
  if (typeof first === 'string') {
    const matched = items.find(item => getSelectItemValue(item) === first);
    return matched ? getSelectItemTitle(matched) : first;
  }

  if (first && typeof first === 'object') {
    const maybeTitle = (first as { title?: unknown; text?: unknown; label?: unknown }).title
      ?? (first as { text?: unknown }).text
      ?? (first as { label?: unknown }).label;
    if (typeof maybeTitle === 'string') return maybeTitle;

    const maybeValue = (first as { value?: unknown }).value;
    if (typeof maybeValue === 'string') {
      const matched = items.find(item => getSelectItemValue(item) === maybeValue);
      return matched ? getSelectItemTitle(matched) : maybeValue;
    }
  }

  return String(first ?? '');
};

const formatAccessibility = (toolName: string, link: string): string => {
  if (!link) {
    return text('common.unavailable');
  }
  const lower = link.toLowerCase();
  const baseName = toolName || 'Tool';
  if (!lower.includes('github')) {
    return text('catalogue.homepage', { tool: baseName });
  }
  return text('catalogue.repository', { tool: baseName });
};

const normalizeVelocityType = (rawType: string): string => {
  const normalized = rawType.trim();
  const lowerCase = normalized.toLowerCase();
  if (lowerCase.includes('lineage')) {
    return 'lineage';
  }
  if (lowerCase.includes('cycle') && (lowerCase.includes('rna') || lowerCase.includes('velocity'))) {
    return 'cycle';
  }
  if (lowerCase.includes('chromatin-aided')) {
    return 'chromatin-aided';
  }
  if (lowerCase === 'chromatin velocity') {
    return 'chromatin';
  }
  if (lowerCase.includes('chromatin') && lowerCase.includes('rna')) {
    return 'chromatin-aided';
  }
  if (lowerCase.includes('chromatin')) {
    return 'chromatin';
  }
  if (lowerCase.includes('spatial')) {
    return 'spatial';
  }
  if (lowerCase.includes('rna')) {
    return 'rna';
  }
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeDataType = (rawType: string, velocityType: string): string => {
  const normalized = rawType.trim();
  const lowerCase = normalized.toLowerCase();
  if (lowerCase.includes('lineage')) {
    return 'lineage';
  }
  if (lowerCase.includes('single') && lowerCase.includes('cell')) {
    return 'scrna';
  }
  if (lowerCase.includes('spatial') && lowerCase.includes('transcriptom')) {
    return 'spatial';
  }
  if (lowerCase.includes('epigenom')) {
    // The CSV uses Epigenomics for both RNA + ATAC and chromatin-only methods.
    return velocityType === 'chromatin' ? 'chromatin' : 'atac';
  }
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const buildContextKey = (velocityType: string, dataType: string): string => {
  return `${velocityType}::${dataType}`;
};

const dedupeSupportedContexts = (contexts: SupportedContext[]): SupportedContext[] => {
  const seenKeys = new Set<string>();
  return contexts.filter(context => {
    if (seenKeys.has(context.key)) {
      return false;
    }
    seenKeys.add(context.key);
    return true;
  });
};

const parseSupportedContexts = (row: Record<string, string>): SupportedContext[] => {
  const velocityValues = (row['Method type'] ?? '')
    .split(';')
    .map(value => value.trim())
    .filter(value => value.length > 0);
  const dataValues = (row['Data type'] ?? '')
    .split(';')
    .map(value => value.trim())
    .filter(value => value.length > 0);

  if (velocityValues.length > 0 && dataValues.length > 0) {
    const rawPairs: Array<[string, string]> = [];

    if (velocityValues.length === dataValues.length) {
      velocityValues.forEach((velocityValue, index) => {
        rawPairs.push([velocityValue, dataValues[index] ?? '']);
      });
    } else if (velocityValues.length === 1) {
      dataValues.forEach(dataValue => {
        rawPairs.push([velocityValues[0] ?? '', dataValue]);
      });
    } else if (dataValues.length === 1) {
      velocityValues.forEach(velocityValue => {
        rawPairs.push([velocityValue, dataValues[0] ?? '']);
      });
    } else {
      const contextCount = Math.min(velocityValues.length, dataValues.length);
      Array.from({ length: contextCount }, (_, index) => {
        rawPairs.push([velocityValues[index] ?? '', dataValues[index] ?? '']);
      });
    }

    const pairedContexts = rawPairs
      .map(([rawVelocityType, rawDataType]) => {
        const velocityType = normalizeVelocityType(rawVelocityType);
        const dataType = normalizeDataType(rawDataType, velocityType);
        return {
          key: buildContextKey(velocityType, dataType),
          velocityType,
          dataType
        };
      })
      .filter(context => context.velocityType.length > 0 && context.dataType.length > 0);

    if (pairedContexts.length > 0) {
      return dedupeSupportedContexts(pairedContexts);
    }
  }

  return [];
};

const sanitizeCsvRow = (row: Record<string, unknown>): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
      return;
    }
    if (value === null || value === undefined) {
      sanitized[key] = '';
      return;
    }
    sanitized[key] = String(value).trim();
  });
  return sanitized;
};

const getToolNameValue = (row: Record<string, string>): string => {
  return row['Tool name'] ?? '';
};

const updateAvailableOptions = () => {
  const rowsForVelocity = filterRowsBy(toolRows.value, {
    velocity: [],
    data: dataTypeFilters.value,
    platform: platformFilters.value,
    deep: deepLearningFilters.value
  });
  const rowsForData = filterRowsBy(toolRows.value, {
    velocity: velocityTypeFilters.value,
    data: [],
    platform: platformFilters.value,
    deep: deepLearningFilters.value
  });
  const rowsForPlatform = filterRowsBy(toolRows.value, {
    velocity: velocityTypeFilters.value,
    data: dataTypeFilters.value,
    platform: [],
    deep: deepLearningFilters.value
  });
  const rowsForDeep = filterRowsBy(toolRows.value, {
    velocity: velocityTypeFilters.value,
    data: dataTypeFilters.value,
    platform: platformFilters.value,
    deep: []
  });

  const velocityOptions = new Set([
    ...rowsForVelocity.flatMap(row =>
      filterContextsBy(row.supportedContexts, {
        velocity: [],
        data: dataTypeFilters.value
      }).map(context => context.velocityType)
    ),
    ...toArray(velocityTypeFilters.value)
  ]);
  const dataOptions = new Set([
    ...rowsForData.flatMap(row =>
      filterContextsBy(row.supportedContexts, {
        velocity: velocityTypeFilters.value,
        data: []
      }).map(context => context.dataType)
    ),
    ...toArray(dataTypeFilters.value)
  ]);
  const platformOptions = new Set<string>();
  const currentPlatform = typeof platformFilters.value === 'string' ? platformFilters.value.trim() : '';
  if (currentPlatform) {
    platformOptions.add(currentPlatform);
  }
  rowsForPlatform.forEach(row => {
    platformOptions.add(row.platform);
  });

  const deepOptions = new Set<string>();
  const currentDeep = typeof deepLearningFilters.value === 'string' ? deepLearningFilters.value.trim() : '';
  if (currentDeep) {
    deepOptions.add(currentDeep);
  }
  rowsForDeep.forEach(row => {
    deepOptions.add(row.deepLearning);
  });

  availableVelocityTypes.value = DEFAULT_VELOCITY_FILTER_OPTIONS.filter(option => velocityOptions.has(option));
  availableDataTypes.value = DEFAULT_DATA_TYPE_FILTER_OPTIONS.filter(option => dataOptions.has(option));
  availablePlatforms.value = Array.from(platformOptions);
  availableDeepLearning.value = Array.from(deepOptions);
};

const normalizeFilterSelections = (): boolean => {
  let hasChanged = false;

  const evaluateMulti = (filtersRef: typeof velocityTypeFilters, availableRef: typeof availableVelocityTypes) => {
    if (filtersRef.value.length === 0) {
      return;
    }
    const availableSet = new Set(availableRef.value);
    const filtered: string[] = [];
    filtersRef.value.forEach(value => {
      if (availableSet.has(value) && !filtered.includes(value)) {
        filtered.push(value);
      }
    });
    if (
      filtered.length !== filtersRef.value.length ||
      filtered.some((value, index) => value !== filtersRef.value[index])
    ) {
      filtersRef.value = filtered;
      hasChanged = true;
    }
  };

  const evaluateSingle = (filtersRef: typeof platformFilters, availableRef: typeof availablePlatforms) => {
    const currentRaw = filtersRef.value;
    if (typeof currentRaw !== 'string') {
      if (currentRaw !== null) {
        filtersRef.value = null;
        hasChanged = true;
      }
      return;
    }

    const normalized = currentRaw.trim();
    if (!normalized) {
      filtersRef.value = null;
      hasChanged = true;
      return;
    }

    if (!availableRef.value.includes(normalized)) {
      filtersRef.value = null;
      hasChanged = true;
      return;
    }

    if (normalized !== currentRaw) {
      filtersRef.value = normalized;
      hasChanged = true;
    }
  };

  evaluateMulti(velocityTypeFilters, availableVelocityTypes);
  evaluateMulti(dataTypeFilters, availableDataTypes);
  evaluateSingle(platformFilters, availablePlatforms);
  evaluateSingle(deepLearningFilters, availableDeepLearning);

  return hasChanged;
};

const loadTools = async (): Promise<void> => {
  try {
    loading.value = true;
    loadError.value = '';
    const response = await fetch(buildStaticCsvRequestUrl(API_ENDPOINTS.TOOL_LIST));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const csvText = await response.text();
    if (!csvText.trim()) {
      throw new Error('CSV is empty');
    }
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: header => header.trim()
    });

    if (parsed.errors.length > 0) {
      const blockingError = parsed.errors.find(err => err.type !== 'FieldMismatch');
      if (blockingError) {
        throw new Error(blockingError.message || 'Failed to parse tool catalogue.');
      }
      console.warn('CSV parse warnings', parsed.errors);
    }

    const sanitizedRows = parsed.data
      .map(rawRow => sanitizeCsvRow(rawRow))
      .filter(row => getToolNameValue(row).length > 0);

    if (sanitizedRows.length === 0) {
      throw new Error('Tool catalogue did not return any rows.');
    }

    const processedRows: ProcessedToolRow[] = sanitizedRows
      .map(row => {
        const supportedContexts = parseSupportedContexts(row);
        const noRaw = row['No.'] ?? '';
        const noValue = noRaw && !Number.isNaN(Number(noRaw)) ? Number(noRaw) : noRaw;
        const rawToolName = getToolNameValue(row);
        const toolName = rawToolName;
        const pmidValue = row.PMID ?? '';
        const journalValue = row.Journal ?? '';
        const yearRaw = row.Year ?? '';
        const yearValue = yearRaw && !Number.isNaN(Number(yearRaw)) ? Number(yearRaw) : yearRaw;
        const platformValue = row.Platform ?? '';
        const deepLearningRaw = String(row['Deep learning'] ?? '').trim().toLowerCase();
        const deepLearningValue: 'yes' | 'no' =
          ['yes', 'true', '1', 'y'].includes(deepLearningRaw) ? 'yes' : 'no';
        const link = buildPublicationLink(row.Link);
        const accessibilityUrl = normalizeUrl(row.Accessibility) ?? '';
        const rowKey = [
          rawToolName || '',
          supportedContexts.map(context => context.key).join(';;'),
          String(noValue ?? ''),
          pmidValue ?? '',
          deepLearningValue
        ].join('::');
        const paperText = row.Paper ?? '';

        return {
          rowKey,
          supportedContexts,
          velocityTypes: Array.from(new Set(supportedContexts.map(context => context.velocityType))),
          dataTypes: Array.from(new Set(supportedContexts.map(context => context.dataType))),
          no: noValue,
          rawToolName,
          toolName,
          paper: paperText,
          link,
          pmid: pmidValue,
          pmidLink: buildPublicationLink(pmidValue),
          journal: journalValue,
          year: yearValue,
          accessibilityUrl,
          accessibilityLabel: formatAccessibility(toolName, accessibilityUrl),
          platform: platformValue,
          deepLearning: deepLearningValue
        };
      })
      .filter(row => row.supportedContexts.length > 0);

    const seenKeys = new Set<string>();
    const dedupedRows: ProcessedToolRow[] = [];

    processedRows.forEach(row => {
      const key = row.rowKey;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        dedupedRows.push(row);
      }
    });

    loadError.value = '';
    toolRows.value = dedupedRows;
    velocityTypeFilters.value = [];
    dataTypeFilters.value = [];
    platformFilters.value = null;
    deepLearningFilters.value = null;
    updateAvailableOptions();
  } catch (error) {
    console.error('Failed to load tool list:', error);
    toolRows.value = [];
    loadError.value = 'Unable to load the tool catalogue. Please try again.';
    availableVelocityTypes.value = [...DEFAULT_VELOCITY_FILTER_OPTIONS];
    availableDataTypes.value = [...DEFAULT_DATA_TYPE_FILTER_OPTIONS];
    availablePlatforms.value = ['Python', 'R'];
    availableDeepLearning.value = ['yes', 'no'];
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  velocityTypeFilters.value = [];
  dataTypeFilters.value = [];
  platformFilters.value = null;
  deepLearningFilters.value = null;
  updateAvailableOptions();
};

const handleFilterChange = () => {
  if (typeof platformFilters.value === 'string') {
    const trimmed = platformFilters.value.trim();
    platformFilters.value = trimmed || null;
  }

  if (typeof deepLearningFilters.value === 'string') {
    const trimmed = deepLearningFilters.value.trim();
    deepLearningFilters.value = trimmed || null;
  }

  updateAvailableOptions();
  if (normalizeFilterSelections()) {
    updateAvailableOptions();
  }
};

const togglePinnedColumn = () => {
  pinnedToolName.value = !pinnedToolName.value;
};

const handleResize = () => {
  if (!tableShell.value) return;
  // 使用未滚动时的位置，避免窗口缩放把外层滚动距离计入表格高度。
  const tableTop = tableShell.value.getBoundingClientRect().top + (scrollContainerRef.value?.scrollTop ?? 0);
  tableHeight.value = Math.max(280, window.innerHeight - tableTop - 24);
};

watch(tableShell, (shell, _previous, onCleanup) => {
  if (!shell) return;
  const viewport = shell.querySelector<HTMLElement>('.v-table__wrapper');
  if (viewport) {
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-labelledby', 'tools-table-heading');
    viewport.setAttribute('aria-describedby', 'tools-table-description');
  }
  const observer = new ResizeObserver(handleResize);
  observer.observe(shell);
  shell.closest('.tools-catalogue')?.querySelectorAll('.tools-header, .tools-filters').forEach(element => observer.observe(element));
  handleResize();
  onCleanup(() => observer.disconnect());
}, { flush: 'post' });

onMounted(() => {
  window.addEventListener('resize', handleResize);
  nextTick(() => {
    const headers = document.querySelectorAll<HTMLElement>('.tools-table .v-data-table-header__content');
    headers.forEach(header => {
      const handler = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target && target.closest('.v-data-table-header__sort-icon')) {
          return;
        }
        event.stopPropagation();
      };
      header.addEventListener('click', handler, { capture: true });
      cleanupHeaderGuards.push(() => header.removeEventListener('click', handler, { capture: true }));
    });
  });
  void loadTools();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  cleanupHeaderGuards.forEach(fn => fn());
});
</script>

<style lang="scss">
@use '@/styles/pages/tools-view.scss';
</style>
