<!--
  HomeView - 首页搜索栏

  表单字段命名规范（name 属性）：
  - data-modality: 数据模态
  - dataset-type: 数据类型（Real/Simulation）
  - dataset-id: 数据集 ID（真实数据 / Dataset ID 型模拟数据）
  - simulation-topology: scRNA 模拟数据组
  - simulation-cells: 模拟数据细胞数量
  - simulation-genes: 模拟数据基因数量
  - method-type: 方法类型（Category A/multi-omics等）
  - tool-name: 具体工具名称
-->
<template>
  <v-container class="home-page main-content" fluid>
        <!-- 英雄区域 -->
        <div class="hero-bleed">
          <div class="hero-container hero-grid">
            <div class="hero-visual">
              <h1 class="hero-title hero-title--sm">{{ text('home.title') }}</h1>
              <div class="hero-image-wrapper">
                <div class="hero-image hero-image-placeholder" role="img" :aria-label="text('homeView.velocityBenchmarkingIllustration')">
                  {{ text('homeView.velocityBenchmarkingIllustration') }}
                </div>
              </div>
            </div>

            <div class="hero-content">
              <p class="hero-paragraph">{{ text('home.heroIntro') }}</p>
              <p class="hero-paragraph">{{ text('home.heroSummary') }}</p>
            </div>
          </div>
        </div>

        <!-- 搜索和筛选区域 -->
        <section class="search-section">
          <div class="search-block">
            <div class="search-block-header">
              <h2 class="big_title big_title--section">{{ text('homeView.viewByData') }}</h2>
            </div>
            <form novalidate class="search-bar-container" :aria-label="text('homeView.datasetSearchForm')" @submit.prevent="submitDatasetSearch">
              <v-select
                v-model="dataScope"
                :id="selectIds.dataScope"
                name="data-modality"
                :items="dataScopeOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('common.dataModality')"
                :aria-label="selectAriaLabels.dataScope"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
              />

              <v-select
                v-model="datasetType"
                :id="selectIds.datasetType"
                name="dataset-type"
                :aria-label="selectAriaLabels.datasetType"
                :aria-describedby="datasetErrors.datasetType || datasetTypeAvailabilityHint ? `${selectIds.datasetType}-messages` : datasetType ? undefined : 'dataset-type-hint'"
                :aria-invalid="Boolean(datasetErrors.datasetType)"
                :error-messages="datasetErrors.datasetType ? text(datasetErrors.datasetType) : ''"
                :items="datasetTypeOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('common.dataType')"
                :hint="datasetTypeAvailabilityHint"
                persistent-hint
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <p v-if="!datasetType && !datasetTypeAvailabilityHint" id="dataset-type-hint" class="visually-hidden"> {{ text('homeView.selectADatasetTypeToContinue') }} </p>

              <v-autocomplete
                v-if="datasetType === DATASET_TYPE.REAL"
                v-model="datasetId"
                :id="selectIds.datasetId"
                name="dataset-id"
                :aria-label="selectAriaLabels.datasetId"
                :aria-invalid="Boolean(datasetErrors.datasetId)"
                :aria-describedby="datasetErrors.datasetId ? `${selectIds.datasetId}-messages` : undefined"
                :error-messages="datasetErrors.datasetId ? text(datasetErrors.datasetId) : ''"
                :items="realDatasetSelectOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.dataset')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <v-autocomplete
                v-if="datasetType === DATASET_TYPE.SIMULATION_FULL && dataScope !== 'scRNA'"
                v-model="simulationDatasetId"
                :id="selectIds.datasetId"
                :items="simulationDatasetSelectOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.dataset')"
                name="dataset-id"
                :aria-label="text('homeView.simulationDatasetFilter')"
                :aria-invalid="Boolean(datasetErrors.datasetId)"
                :aria-describedby="datasetErrors.datasetId ? `${selectIds.datasetId}-messages` : undefined"
                :error-messages="datasetErrors.datasetId ? text(datasetErrors.datasetId) : ''"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <v-select
                v-if="datasetType === DATASET_TYPE.SIMULATION_FULL && dataScope === 'scRNA'"
                v-model="simulationShape"
                :id="selectIds.simulationShape"
                name="simulation-topology"
                :aria-label="selectAriaLabels.simulationShape"
                :aria-invalid="Boolean(datasetErrors.simulationShape)"
                :aria-describedby="datasetErrors.simulationShape ? `${selectIds.simulationShape}-messages` : undefined"
                :error-messages="datasetErrors.simulationShape ? text(datasetErrors.simulationShape) : ''"
                :items="simulationShapeOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('common.simulationGroup')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <!-- Additional data / Bursting tree / Lineage tracing：按 Dataset ID 选择 -->
              <v-autocomplete
                v-if="datasetType === DATASET_TYPE.SIMULATION_FULL && dataScope === 'scRNA' && requiresDatasetIdSelection"
                v-model="specialSimulationDatasetId"
                :id="selectIds.datasetId"
                name="dataset-id"
                :aria-label="text('homeView.simulationDatasetID')"
                :aria-invalid="Boolean(datasetErrors.datasetId)"
                :aria-describedby="datasetErrors.datasetId ? `${selectIds.datasetId}-messages` : undefined"
                :error-messages="datasetErrors.datasetId ? text(datasetErrors.datasetId) : ''"
                :items="specialSimulationDatasetOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.datasetID')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <!-- 标准拓扑：Cells -->
              <v-select
                v-else-if="datasetType === DATASET_TYPE.SIMULATION_FULL && dataScope === 'scRNA' && simulationShape"
                v-model="simulationCell"
                :id="selectIds.simulationCell"
                name="simulation-cells"
                :aria-label="selectAriaLabels.simulationCell"
                :aria-invalid="Boolean(datasetErrors.simulationCell)"
                :aria-describedby="datasetErrors.simulationCell ? `${selectIds.simulationCell}-messages` : undefined"
                :error-messages="datasetErrors.simulationCell ? text(datasetErrors.simulationCell) : ''"
                :items="availableSimulationCells"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.cells')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <!-- 标准拓扑：Genes -->
              <v-select
                v-if="datasetType === DATASET_TYPE.SIMULATION_FULL && dataScope === 'scRNA' && simulationShape && simulationCell && !requiresDatasetIdSelection"
                v-model="simulationGene"
                :id="selectIds.simulationGene"
                name="simulation-genes"
                :aria-label="selectAriaLabels.simulationGene"
                :aria-invalid="Boolean(datasetErrors.simulationGene)"
                :aria-describedby="datasetErrors.simulationGene ? `${selectIds.simulationGene}-messages` : undefined"
                :error-messages="datasetErrors.simulationGene ? text(datasetErrors.simulationGene) : ''"
                :items="availableSimulationGenes"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.genes')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
                :disabled="availableSimulationGenes.length === 0"
              />

              <div class="search-actions">
                <div class="search-buttons">
                  <v-btn
                    variant="flat"
                    :prepend-icon="mdiMagnify"
                    class="search-btn search-btn--submit"
                    height="52"
                    type="submit"
                    :loading="datasetSearchLoading"
                    :disabled="datasetSearchLoading"
                  > {{ text('common.search') }} </v-btn>
                  <v-btn
                    variant="outlined"
                    color="primary"
                    class="search-btn search-btn--clean"
                    :disabled="(isDatasetCleanDisabled && !hasDatasetErrors && !datasetNavigationError) || datasetSearchLoading"
                    height="52"
                    type="button"
                    @click="clearDatasetFilters"
                  > {{ text('common.clear') }} </v-btn>
                </div>
                <p v-if="datasetNavigationError" class="search-navigation-error" role="alert">{{ datasetNavigationError ? text(datasetNavigationError) : '' }}</p>
              </div>
            </form>
          </div>

          <div class="search-divider"></div>

          <div class="search-block">
            <div class="search-block-header">
              <h2 class="big_title big_title--section">{{ text('homeView.viewByTool') }}</h2>
            </div>
            <form novalidate class="search-bar-container" :aria-label="text('homeView.toolSearchForm')" @submit.prevent="submitToolSearch">
              <v-select
                v-model="toolCategory"
                :id="selectIds.toolCategory"
                name="method-type"
                :aria-label="selectAriaLabels.toolCategory"
                :items="toolCategoryOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.methodType')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
              />

              <v-autocomplete
                v-model="toolName"
                :id="selectIds.toolName"
                name="tool-name"
                :aria-label="selectAriaLabels.toolName"
                :aria-invalid="Boolean(toolNameError)"
                :aria-describedby="toolNameError ? `${selectIds.toolName}-messages` : undefined"
                :error-messages="toolNameError ? text(toolNameError) : ''"
                :items="availableToolOptions"
                :item-title="item => localizedItemTitle(item, 'label')"
                item-value="value"
                :label="text('homeView.tool')"
                class="search-select"
                variant="outlined"
                color="primary"
                density="comfortable"
                clearable
              />

              <div class="search-actions">
                <div class="search-buttons">
                  <v-btn
                    variant="flat"
                    :prepend-icon="mdiMagnify"
                    class="search-btn search-btn--submit"
                    height="52"
                    type="submit"
                    :loading="toolSearchLoading"
                    :disabled="toolSearchLoading"
                  > {{ text('common.search') }} </v-btn>
                  <v-btn
                    variant="outlined"
                    color="primary"
                    class="search-btn search-btn--clean"
                    :disabled="(isToolCleanDisabled && !toolNameError && !toolNavigationError) || toolSearchLoading"
                    height="52"
                    type="button"
                    @click="clearToolFilters"
                  > {{ text('common.clear') }} </v-btn>
                </div>
                <p v-if="toolNavigationError" class="search-navigation-error" role="alert">{{ toolNavigationError ? text(toolNavigationError) : '' }}</p>
              </div>
            </form>
          </div>
        </section>

        <section class="measurement-section">
          <h2 class="big_title big_title--section measurement-heading">{{ text('homeView.browseByMeasurements') }}</h2>

          <div class="measurement-subsection">
            <div class="measurement-subheading-row">
              <h3 class="measurement-subheading">{{ text('homeView.generalMetrics') }}</h3>
            </div>
            <div class="measurement-grid measurement-grid--general">
              <v-card
                v-for="item in generalMeasurementItems"
                :key="item.value"
                class="measurement-card"
                variant="outlined"
                :elevation="0"
              >
                <div class="measurement-card-body">
                  <router-link :to="{ path: item.path }" class="measurement-link">
                    <h3 class="measurement-title">{{ displayText(getMetricDisplayName(item.value)) }}</h3>
                  </router-link>
                </div>
              </v-card>
            </div>
          </div>

          <div class="measurement-subsection measurement-subsection--simulation">
            <div class="measurement-subheading-row">
              <h3 class="measurement-subheading">{{ text('homeView.simulationSpecificMetrics') }}</h3>
            </div>
            <div class="measurement-grid measurement-grid--simulation">
              <v-card
                v-for="item in simulationMeasurementItems"
                :key="item.value"
                class="measurement-card measurement-card--compact"
                variant="outlined"
                :elevation="0"
              >
                <div class="measurement-card-body">
                  <router-link :to="{ path: item.path }" class="measurement-link">
                    <h3 class="measurement-title">{{ displayText(getMetricDisplayName(item.value)) }}</h3>
                  </router-link>
                </div>
              </v-card>
            </div>
          </div>
        </section>
  </v-container>
</template>

<script setup lang="ts">
import { mdiMagnify } from '@mdi/js'
import type { MessageKey } from '@/locales/en'
import { displayText, text, localizedItemTitle } from '@/utils/locale'
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import router from '@/router';
import { isNavigationFailure, NavigationFailureType, type RouteLocationRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes';
import {
  REAL_DATASET_LABELS,
  ALLOWED_REAL_DATASET_IDS,
  HOME_DATASET_TYPES,
  type DatasetTypeValue
} from '@/constants/datasets';
import {
  getScRnaSimulationTopologyOptions,
  getDatasetIdBasedSimulationOptions,
  findSimulationDatasetById,
  requiresSimulationDatasetIdSelection,
  topologyKeyToLabel,
  DATASET_ID_SIMULATION_DATASETS,
  STANDARD_SIMULATION_TOPOLOGY_KEYS,
  getAvailableSizesForTopology,
  type TopologyKey
} from '@/constants/simulation';
import {
  getToolPublicName,
  TOOL_DEFINITIONS,
  TOOL_SCIENTIFIC_TYPE_DEFINITIONS,
  getToolsByScientificType,
  type ToolScientificType,
  type ToolDefinition
} from '@/constants/tools';
import { getScientificTypeLabel, getResultScopeLabel } from '@/constants/catalogueLabels';
import { RESULT_SCOPES, getDatasetResultScopes, type DatasetResultScope } from '@/constants/result-scope';
import { useSimulationCascade } from '@/composables/useSimulationCascade';
import { getGeneralMetrics, getMetricDisplayName } from '@/constants/metrics';


// 指标卡片项数据类型：包含标题、路由、图标、描述
type MeasurementItem = {
  value: string;
  path: string;
  icon: string;
  des: string;
};

// 标签值对数据类型：用于下拉选项
type LabeledValue = {
  value: string;
  label: string;
};

// 数据集类型枚举：复用常量定义
const DATASET_TYPE = HOME_DATASET_TYPES;


const selectIds = {
  dataScope: 'home-select-data-modality',
  datasetType: 'home-select-dataset-type',
  datasetId: 'home-select-dataset-id',
  simulationShape: 'home-select-simulation-shape',
  simulationCell: 'home-select-simulation-cell',
  simulationGene: 'home-select-simulation-gene',
  toolCategory: 'home-select-tool-category',
  toolName: 'home-select-tool-name'
} as const;

const selectAriaLabels = computed<Record<keyof typeof selectIds, string>>(() => ({
  dataScope: text('common.dataModality'),
  datasetType: text('common.dataType'),
  datasetId: text('home.ariaDataset'),
  simulationShape: text('common.simulationGroup'),
  simulationCell: text('home.ariaCells'),
  simulationGene: text('home.ariaGenes'),
  toolCategory: text('home.ariaMethod'),
  toolName: text('home.ariaTool')
}));

// 某些结果页首进需要加载较大的按需模块（route-level chunk），
// 过短的超时会触发误判，导致频繁进入兜底刷新；过长又会让用户误以为卡死。
const NAVIGATION_TIMEOUT = 6000;

// 跨数据集指标项列表：通用评估指标卡片
const generalMeasurementItems: MeasurementItem[] = getGeneralMetrics().map(metric => ({
  value: metric.name,
  path: metric.route,
  icon: '',
  des: ''
}));

// 模拟数据专属指标项列表：模拟运行特定评估指标
const simulationMeasurementItems = ref<MeasurementItem[]>([
  { value: 'Ground-truth correlation', path: ROUTE_PATHS.GROUND_TRUTH_CORRELATION, icon: '', des: '' },
  { value: 'Running time', path: ROUTE_PATHS.RUNNING_TIME, icon: '', des: '' },
  { value: 'Memory efficiency', path: ROUTE_PATHS.MEMORY_EFFICIENCY, icon: '', des: '' },
  { value: 'Down-sampling', path: ROUTE_PATHS.DOWN_SAMPLING, icon: '', des: '' },
  { value: 'Batch-run', path: ROUTE_PATHS.BATCH_RUN, icon: '', des: '' }
]);

// Dataset selections
// 当前选中的数据集类型
const datasetType = ref<DatasetTypeValue | '' | undefined>(undefined);
const dataScope = ref<DatasetResultScope | 'all'>('all');
// 当前选中的真实数据集ID
const datasetId = ref<string | undefined>(undefined);
const simulationDatasetId = ref<string | undefined>(undefined);
// scRNA 模拟数据级联选择（Simulation group / Cells / Genes）由 composable 管理
const {
  topology: simulationShape,
  cells: simulationCell,
  genes: simulationGene,
  cellOptions: availableSimulationCells,
  geneOptions: availableSimulationGenes,
  reset: resetSimulationCascade
} = useSimulationCascade({
  includeEfficiencyOnly: false
});
// 当前选中的按 Dataset ID 选择的模拟数据（Additional / Bursting tree / Lineage tracing）
const specialSimulationDatasetId = ref<string | undefined>(undefined);
type DatasetErrorField = 'datasetType' | 'datasetId' | 'simulationShape' | 'simulationCell' | 'simulationGene';
const datasetErrors = ref<Partial<Record<DatasetErrorField, MessageKey>>>({});
const hasDatasetErrors = computed(() => Object.keys(datasetErrors.value).length > 0);
const datasetNavigationError = ref<MessageKey | ''>('');
const datasetSearchLoading = ref(false);

const clearDatasetError = (field: DatasetErrorField): void => {
  if (!datasetErrors.value[field]) return;
  const errors = { ...datasetErrors.value };
  delete errors[field];
  datasetErrors.value = errors;
};

const flagDatasetError = (field: DatasetErrorField, message: MessageKey): void => {
  datasetErrors.value = { ...datasetErrors.value, [field]: message };
  void nextTick(() => document.getElementById(selectIds[field])?.focus());
};

// 重置模拟数据选择：当数据集类型变化时调用
const resetSimulationSelections = (): void => {
  resetSimulationCascade();
  specialSimulationDatasetId.value = undefined;
  simulationDatasetId.value = undefined;
};

// 真实数据集下拉选项列表：从常量映射生成
const ALL_REAL_DATASET_OPTIONS: LabeledValue[] = REAL_DATASET_LABELS.map((label, index) => ({
  value: String(index + 1),
  label: label.startsWith(`${index + 1}_`) ? label : `${index + 1} · ${label}`
}));

const ALL_SIMULATION_DATASET_OPTIONS: LabeledValue[] = [
  ...STANDARD_SIMULATION_TOPOLOGY_KEYS.flatMap(topology =>
    getAvailableSizesForTopology(topology).map(size => {
      const id = `${topology}_cell${size.cells}_gene${size.genes}`;
      return { value: id, label: id };
    })
  ),
  ...DATASET_ID_SIMULATION_DATASETS.map(dataset => ({ value: dataset.id, label: dataset.id }))
];

// 模态先于真实/模拟筛选，选项从两类可浏览数据的并集生成。
const dataScopeOptions = computed<LabeledValue[]>(() => [
  { label: text('common.all'), value: 'all' },
  ...RESULT_SCOPES
    .filter(scope => ALL_REAL_DATASET_OPTIONS.some(option =>
      ALLOWED_REAL_DATASET_IDS.has(option.value) && getDatasetResultScopes('real', option.value).includes(scope)
    ) || ALL_SIMULATION_DATASET_OPTIONS.some(option => getDatasetResultScopes('simulation', option.value).includes(scope)))
    .map(scope => ({ label: getResultScopeLabel(scope), value: scope }))
]);

const realDatasetSelectOptions = computed<LabeledValue[]>(() =>
  ALL_REAL_DATASET_OPTIONS.filter(option =>
    ALLOWED_REAL_DATASET_IDS.has(option.value) &&
    (dataScope.value === 'all' || getDatasetResultScopes('real', option.value).includes(dataScope.value))
  )
);

const simulationDatasetSelectOptions = computed<LabeledValue[]>(() =>
  ALL_SIMULATION_DATASET_OPTIONS.filter(option =>
    dataScope.value === 'all' || getDatasetResultScopes('simulation', option.value).includes(dataScope.value)
  )
);

// 禁用没有数据的类型，同时保留原因供下拉菜单和辅助技术读取。
const datasetTypeOptions = computed(() => [
  { label: text('common.realData'), value: DATASET_TYPE.REAL, count: realDatasetSelectOptions.value.length },
  { label: text('common.simulatedData'), value: DATASET_TYPE.SIMULATION_FULL, count: simulationDatasetSelectOptions.value.length }
].map(({ count, ...option }) => ({
  ...option,
  props: {
    disabled: count === 0,
    'aria-disabled': count === 0,
    ...(count === 0 ? { subtitle: text('homeView.noDataForModalityType', { type: option.label }) } : {})
  }
})));

const datasetTypeAvailabilityHint = computed(() =>
  datasetTypeOptions.value.find(option => option.props.disabled)?.props.subtitle ?? ''
);

watch(dataScope, (scope, previousScope) => {
  const currentType = datasetTypeOptions.value.find(option => option.value === datasetType.value);
  if (currentType?.props.disabled) {
    datasetType.value = datasetTypeOptions.value.find(option => !option.props.disabled)?.value;
  }
  if (datasetId.value && !realDatasetSelectOptions.value.some(option => option.value === datasetId.value)) {
    datasetId.value = undefined;
  }
  // ID 下拉与 scRNA 级联是两套选择，切换模式时不能恢复隐藏的旧值。
  if (scope === 'scRNA' || previousScope === 'scRNA' ||
    (simulationDatasetId.value && !simulationDatasetSelectOptions.value.some(option => option.value === simulationDatasetId.value))) {
    simulationDatasetId.value = undefined;
  }
  resetSimulationCascade();
  specialSimulationDatasetId.value = undefined;
  datasetErrors.value = {};
  datasetNavigationError.value = '';
});

// 模拟数据拓扑结构选项
const simulationShapeOptions = computed<LabeledValue[]>(() =>
  getScRnaSimulationTopologyOptions()
);

// 当前拓扑是否通过 Dataset ID 选择
const requiresDatasetIdSelection = computed<boolean>(() =>
  requiresSimulationDatasetIdSelection(simulationShape.value)
);

// 基于 Dataset ID 的模拟数据选项列表
const specialSimulationDatasetOptions = computed<LabeledValue[]>(() =>
  getDatasetIdBasedSimulationOptions(simulationShape.value)
);

// 解析后的模拟数据规模：细胞数*基因数 格式
const resolvedSimulationSize = computed<string>(() => {
  if (!simulationCell.value || !simulationGene.value) {
    return '';
  }
  return `${simulationCell.value}*${simulationGene.value}`;
});

// 切换模拟组时不能沿用另一组的 Dataset ID。
watch(simulationShape, () => {
  specialSimulationDatasetId.value = undefined;
  if (requiresDatasetIdSelection.value) {
    simulationCell.value = null;
    simulationGene.value = null;
  }
});

// 工具定义列表：统一复用全局常量（确保 displayName 与文件名映射一致）
const toolDefinitions: ToolDefinition[] = TOOL_DEFINITIONS;

// 当前选中的工具类别
const toolCategory = ref<ToolScientificType | 'all'>('all');
// 当前选中的工具名称
const toolName = ref<string | undefined>(undefined);
const toolNameError = ref<MessageKey | ''>('');
const toolNavigationError = ref<MessageKey | ''>('');
const toolSearchLoading = ref(false);

watch(datasetType, () => {
  // 切换真实/模拟保留模态，并清除另一套控件的下游选择。
  datasetId.value = undefined;
  resetSimulationSelections();
  datasetErrors.value = {};
  datasetNavigationError.value = '';
});
watch([datasetId, simulationDatasetId, specialSimulationDatasetId, simulationShape, simulationCell, simulationGene], () => {
  datasetNavigationError.value = '';
});
watch(datasetId, (value) => { if (value) clearDatasetError('datasetId'); });
watch(simulationDatasetId, (value) => { if (value) clearDatasetError('datasetId'); });
watch(specialSimulationDatasetId, (value) => { if (value) clearDatasetError('datasetId'); });
watch(simulationShape, (value) => {
  if (value) clearDatasetError('simulationShape');
  if (requiresDatasetIdSelection.value) {
    clearDatasetError('simulationCell');
    clearDatasetError('simulationGene');
  } else {
    clearDatasetError('datasetId');
    if (!value) {
      clearDatasetError('simulationCell');
      clearDatasetError('simulationGene');
    }
  }
});
watch(simulationCell, (value) => {
  if (value) clearDatasetError('simulationCell');
  else clearDatasetError('simulationGene');
});
watch(simulationGene, (value) => { if (value) clearDatasetError('simulationGene'); });
watch([toolName, toolCategory], () => {
  if (toolName.value) toolNameError.value = '';
  toolNavigationError.value = '';
});

const buildFallbackUrl = (target: RouteLocationRaw): string => {
  const resolved = router.resolve(target);
  if (resolved.href) {
    return resolved.href;
  }
  const base = router.options.history.base ?? '';
  const fullPath = resolved.fullPath ?? '';
  return `${window.location.origin}${base}${fullPath}`;
};

const normalizeQuery = (query: Record<string, unknown>): string => {
  const entries: Array<[string, string]> = [];

  for (const [key, rawValue] of Object.entries(query ?? {})) {
    if (rawValue == null) continue;

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value == null) continue;
        entries.push([key, String(value)]);
      }
      continue;
    }

    entries.push([key, String(rawValue)]);
  }

  entries.sort((a, b) => {
    const keyCompare = a[0].localeCompare(b[0]);
    if (keyCompare !== 0) return keyCompare;
    return a[1].localeCompare(b[1]);
  });

  return entries.map(([k, v]) => `${k}=${v}`).join('&');
};

const ensureNavigationApplied = async (target: RouteLocationRaw): Promise<boolean> => {
  const resolved = router.resolve(target);
  await nextTick();

  const current = router.currentRoute.value;
  const expectedQuery = normalizeQuery(resolved.query as Record<string, unknown>);
  const actualQuery = normalizeQuery(current.query as Record<string, unknown>);

  return (
    resolved.path === current.path &&
    expectedQuery === actualQuery &&
    (resolved.hash ?? '') === (current.hash ?? '')
  );
};

const pushWithTimeout = (target: RouteLocationRaw): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Navigation timeout'));
    }, NAVIGATION_TIMEOUT);

    router.push(target).then(
      value => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
};

const navigateWithFallback = async (
  target: RouteLocationRaw,
  showNavigationError: (message: MessageKey) => void
): Promise<void> => {
  try {
    await pushWithTimeout(target);
    // 兜底：极少数情况下 push 已 resolve 但视图/route 状态未同步。
    if (!(await ensureNavigationApplied(target))) {
      throw new Error('Navigation state mismatch');
    }
  } catch (navigationError: unknown) {
    if (isNavigationFailure(navigationError, NavigationFailureType.duplicated)) {
      return;
    }

    console.error('Navigation error detected, applying hard reload fallback:', navigationError);

    const fallbackUrl = buildFallbackUrl(target);
    if (import.meta.env.DEV) {
      showNavigationError('homeView.navigationFailed');
      return;
    }
    showNavigationError('homeView.navigationRetrying');

    // 注意：Hash 路由下仅改变 hash 不会触发浏览器真正刷新，这会导致“URL 变了但视图没变”。
    // 这里先 replace 到目标 URL（避免污染历史记录）。
    // 在 Hash 路由下，如果只改变 hash，replace 通常不会触发完整刷新，所以需要在下一帧强制 reload。
    // 若 replace 触发了真正的页面导航，当前 JS 上下文会被卸载，rAF 回调自然不会执行，这属于预期行为。
    window.location.replace(fallbackUrl);
    requestAnimationFrame(() => window.location.reload());
  }
};

// 按方法科学分类筛选，同一工具可以出现在多个方法分类中。
const toolCategoryOptions = computed<LabeledValue[]>(() => [
  { label: text('common.all'), value: 'all' },
  ...TOOL_SCIENTIFIC_TYPE_DEFINITIONS.map(type => ({ label: getScientificTypeLabel(type.value), value: type.value }))
]);

// 可用的工具选项：根据选中的类别过滤
const availableToolOptions = computed<LabeledValue[]>(() => {
  const allowedNames = toolCategory.value === 'all'
    ? null
    : new Set(getToolsByScientificType(toolCategory.value).map(tool => tool.name));
  return toolDefinitions
    .filter(tool => !allowedNames || allowedNames.has(tool.name))
    .map(tool => ({
      label: getToolPublicName(tool.name),
      value: tool.name
    }));
});

// 监听工具类别变化：自动重置或自动选择工具
watch(toolCategory, () => {
  const allowed = new Set(availableToolOptions.value.map(option => option.value));
  if (toolName.value && !allowed.has(toolName.value)) {
    toolName.value = undefined;
  }

  const [onlyOption] = availableToolOptions.value;
  if (toolCategory.value !== 'all' && availableToolOptions.value.length === 1 && onlyOption) {
    toolName.value = onlyOption.value;
  }
});

// 数据集搜索清空按钮禁用状态：当没有选择时禁用
const isDatasetCleanDisabled = computed<boolean>(() => {
  return !(
    datasetType.value ||
    datasetId.value ||
    simulationShape.value ||
    simulationCell.value ||
    simulationGene.value ||
    specialSimulationDatasetId.value ||
    simulationDatasetId.value ||
    dataScope.value !== 'all'
  );
});

// 工具搜索清空按钮禁用状态：当没有选择时禁用
const isToolCleanDisabled = computed<boolean>(() => toolCategory.value === 'all' && !toolName.value);

const prefetchResultRoutes = () => {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV) return;

  const prefetch = () => {
    void import('@/views/DatasetResult.vue');
    void import('@/views/MethodResult.vue');
  };

  const requestIdle = (window as unknown as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => void })
    .requestIdleCallback;

  if (typeof requestIdle === 'function') {
    requestIdle(prefetch, { timeout: 1500 });
    return;
  }

  window.setTimeout(prefetch, 800);
};

onMounted(() => {
  prefetchResultRoutes();
});

// 数据集搜索提交：根据选择导航到结果页面
const submitDatasetSearch = async (): Promise<void> => {
  datasetNavigationError.value = '';
  if (!datasetType.value) {
    flagDatasetError('datasetType', 'homeView.selectDatasetTypeError');
    return;
  }

  let navigationTarget:
    | {
        name: (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
        query: Record<string, string>;
      }
    | null = null;

  if (datasetType.value === DATASET_TYPE.REAL) {
    if (!datasetId.value || !realDatasetSelectOptions.value.some(option => option.value === datasetId.value)) {
      flagDatasetError('datasetId', 'homeView.selectRealDatasetError');
      return;
    }
    navigationTarget = {
      name: ROUTE_NAMES.DATASET_RESULT,
      query: {
        type: DATASET_TYPE.REAL,
        id: datasetId.value,
        ...(dataScope.value === 'all' ? {} : { scope: dataScope.value })
      }
    };
  } else if (datasetType.value === DATASET_TYPE.SIMULATION_FULL) {
    if (dataScope.value !== 'scRNA') {
      if (!simulationDatasetId.value || !simulationDatasetSelectOptions.value.some(option => option.value === simulationDatasetId.value)) {
        flagDatasetError('datasetId', 'homeView.selectSimulationDatasetError');
        return;
      }
      const selectedId = simulationDatasetId.value;
      const special = findSimulationDatasetById(selectedId);
      if (special) {
        navigationTarget = {
          name: ROUTE_NAMES.DATASET_RESULT,
          query: {
            type: 'simulation',
            id: selectedId,
            shape: topologyKeyToLabel(special.topologyKey),
            ...(special.cells && special.genes ? { size: `${special.cells}*${special.genes}` } : {}),
            ...(dataScope.value === 'all' ? {} : { scope: dataScope.value })
          }
        };
      } else {
        const match = selectedId.match(/^(.*)_cell(\d+)_gene(\d+)$/);
        if (!match?.[1] || !match[2] || !match[3]) {
          flagDatasetError('datasetId', 'homeView.unsupportedSimulationDatasetError');
          return;
        }
        navigationTarget = {
          name: ROUTE_NAMES.DATASET_RESULT,
          query: {
            type: 'simulation',
            shape: topologyKeyToLabel(match[1] as TopologyKey),
            size: `${match[2]}*${match[3]}`
          }
        };
      }
    } else {
    if (!simulationShape.value || !simulationShapeOptions.value.some(option => option.value === simulationShape.value)) {
      flagDatasetError('simulationShape', 'homeView.selectTopologyError');
      return;
    }

    if (requiresDatasetIdSelection.value) {
      if (!specialSimulationDatasetId.value || !specialSimulationDatasetOptions.value.some(option => option.value === specialSimulationDatasetId.value)) {
        flagDatasetError('datasetId', 'homeView.selectSimulationDatasetIdError');
        return;
      }

      const specialDataset = findSimulationDatasetById(specialSimulationDatasetId.value);
      if (!specialDataset) {
        flagDatasetError('datasetId', 'homeView.unsupportedSimulationDatasetError');
        return;
      }

      const topologyLabel = topologyKeyToLabel(specialDataset.topologyKey);
      const size =
        typeof specialDataset.cells === 'number' && typeof specialDataset.genes === 'number'
          ? `${specialDataset.cells}*${specialDataset.genes}`
          : undefined;

      navigationTarget = {
        name: ROUTE_NAMES.DATASET_RESULT,
        query: {
          type: 'simulation',
          shape: topologyLabel,
          ...(size ? { size } : {}),
          id: specialSimulationDatasetId.value,
          scope: 'scRNA'
        }
      };
    } else {
      if (!simulationCell.value || !simulationGene.value) {
        if (!simulationCell.value) {
          flagDatasetError('simulationCell', 'homeView.selectCellsError');
        } else {
          flagDatasetError('simulationGene', 'homeView.selectGenesError');
        }
        return;
      }

      const topologyLabel = topologyKeyToLabel(simulationShape.value as TopologyKey);

      navigationTarget = {
        name: ROUTE_NAMES.DATASET_RESULT,
        query: {
          type: 'simulation',
          shape: topologyLabel,
          size: resolvedSimulationSize.value,
          scope: 'scRNA'
        }
      };
    }
    }
  }

  if (!navigationTarget) {
    return;
  }

  datasetSearchLoading.value = true;
  try {
    await navigateWithFallback(navigationTarget, message => { datasetNavigationError.value = message; });
  } finally {
    datasetSearchLoading.value = false;
  }
};

// 数据集搜索清空：重置所有数据集选择
const clearDatasetFilters = (): void => {
  datasetErrors.value = {};
  datasetNavigationError.value = '';
  datasetType.value = undefined;
  dataScope.value = 'all';
  datasetId.value = undefined;
  resetSimulationSelections();
};

// 工具搜索提交：导航到方法结果页面
const submitToolSearch = async (): Promise<void> => {
  toolNavigationError.value = '';
  if (!toolName.value) {
    toolNameError.value = 'homeView.selectToolError';
    void nextTick(() => document.getElementById(selectIds.toolName)?.focus());
    return;
  }

  toolSearchLoading.value = true;
  try {
    await navigateWithFallback({
      name: ROUTE_NAMES.METHOD_RESULT,
      query: {
        tool: getToolPublicName(toolName.value),
        ...(toolCategory.value === 'all' ? {} : {
          scope: TOOL_SCIENTIFIC_TYPE_DEFINITIONS.find(type => type.value === toolCategory.value)?.scope ?? 'scRNA'
        })
      }
    }, message => { toolNavigationError.value = message; });
  } finally {
    toolSearchLoading.value = false;
  }
};

// 工具搜索清空：重置所有工具选择
const clearToolFilters = (): void => {
  toolNameError.value = '';
  toolNavigationError.value = '';
  toolCategory.value = 'all';
  toolName.value = undefined;
};
</script>

<style lang="scss">
@use '@/styles/pages/home.scss';
</style>

<style scoped lang="scss">
.hero-image-placeholder {
  aspect-ratio: 1600 / 1131;
  display: grid;
  place-items: center;
  border: 2px dashed var(--color-border);
  background: var(--color-surface-muted);
  color: var(--text-muted-color);
  text-align: center;
}
</style>
