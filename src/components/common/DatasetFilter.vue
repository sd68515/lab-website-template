<!--
  数据集筛选通用组件
  按 Data modality → Data type（Real/Simulated）→ Dataset 筛选
  scRNA 模拟数据支持 Simulation group → Cell count → Gene count

  表单字段命名规范（name 属性）：
  - dataset-type: 数据集类型（Real/Simulation）
  - data-scope: 数据模态（All / 各模态）
  - dataset-id: 数据集 ID（真实数据 / Dataset ID 型模拟数据）
  - simulation-topology: 模拟数据拓扑类型
  - simulation-cells: 模拟数据细胞数量
  - simulation-genes: 模拟数据基因数量
  - tool-name: 工具名称（可选筛选器）
-->
<template>
  <div class="dataset-filter">
    <div class="dataset-filter__group dataset-filter__group--scope">
      <v-select
        :id="fieldIds.scope"
        name="data-scope"
        :aria-label="text('common.dataModality')"
        v-model="dataScope"
        class="dataset-filter__select dataset-filter__select--scope"
        :label="text('common.dataModality')"
        :items="dataScopeOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
      />
    </div>

    <div class="dataset-filter__group">
      <v-select
        :id="fieldIds.dataType"
        name="dataset-type"
        :aria-label="text('common.dataType')"
        :model-value="dataType"
        @update:model-value="updateDataType"
        class="dataset-filter__select dataset-filter__select--type"
        :label="text('common.dataType')"
        placeholder=""
        :items="dataTypeOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
      />
    </div>

    <div v-if="showDirectDataset" class="dataset-filter__group">
      <v-autocomplete
        :key="`dataset-${dataType}-${dataScope}-${simulationResetKey}`"
        :id="fieldIds.dataset"
        name="dataset-id"
        :aria-label="text('datasetFilter.dataset')"
        :model-value="datasetId ?? null"
        @update:model-value="updateDatasetId"
        class="dataset-filter__select dataset-filter__select--dataset"
        :label="text('datasetFilter.dataset')"
        :items="directDatasetOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        clearable
        hide-details
      />
    </div>

    <!-- 模拟数据：三级级联选择 / Dataset ID 拓扑模式 -->
    <template v-if="showSimulationCascade">
      <!-- Level 1: Topology 拓扑结构 -->
      <div class="dataset-filter__group">
        <v-select
          :key="`topology-${dataType}-${simulationResetKey}`"
          :id="fieldIds.topology"
          name="simulation-topology"
          :aria-label="text('common.simulationGroup')"
          v-model="simulationTopology"
          class="dataset-filter__select dataset-filter__select--topology"
          :label="text('common.simulationGroup')"
          placeholder=""
          :items="topologyOptions"
          :item-title="item => localizedItemTitle(item, 'label')"
          item-value="value"
          :clearable="Boolean(simulationTopology)"
          density="comfortable"
          variant="outlined"
          color="primary"
          hide-details
        />
      </div>

      <!-- Additional data / Bursting tree / Lineage tracing：直接选择 Dataset ID -->
      <div
        v-if="simulationTopology && requiresDatasetIdSelection"
        class="dataset-filter__group"
      >
        <v-autocomplete
          :key="`additional-${simulationTopology}-${simulationResetKey}`"
          :id="fieldIds.dataset"
          name="dataset-id"
          :aria-label="text('datasetFilter.datasetID')"
          :model-value="datasetId ?? null"
          @update:model-value="updateDatasetId"
          class="dataset-filter__select dataset-filter__select--dataset"
          :label="text('datasetFilter.datasetID')"
          placeholder=""
          :items="datasetIdSimulationOptions"
          :item-title="item => localizedItemTitle(item, 'label')"
          item-value="value"
          density="comfortable"
          variant="outlined"
          color="primary"
          clearable
          hide-details
        />
      </div>

      <!-- 标准拓扑：Level 2: Cell count 细胞数（依赖 Topology） -->
      <div
        v-else-if="simulationTopology"
        class="dataset-filter__group"
      >
        <v-select
          :key="`cells-${simulationTopology}-${simulationResetKey}`"
          :id="fieldIds.cells"
          name="simulation-cells"
          :aria-label="text('datasetFilter.cells')"
          v-model="simulationCell"
          class="dataset-filter__select dataset-filter__select--cell"
          :label="text('datasetFilter.cells')"
          placeholder=""
          :items="eligibleCellOptions"
          :item-title="item => localizedItemTitle(item, 'label')"
          item-value="value"
          :clearable="Boolean(simulationCell)"
          density="comfortable"
          variant="outlined"
          color="primary"
          hide-details
        />
      </div>

      <!-- 标准拓扑：Level 3: Gene count 基因数（依赖 Topology + Cell） -->
      <div v-if="simulationTopology && simulationCell && !requiresDatasetIdSelection" class="dataset-filter__group">
        <v-select
          :key="`genes-${simulationCell}-${simulationResetKey}`"
          :id="fieldIds.genes"
          name="simulation-genes"
          :aria-label="text('datasetFilter.genes')"
          v-model="simulationGene"
          class="dataset-filter__select dataset-filter__select--gene"
          :label="text('datasetFilter.genes')"
          placeholder=""
          :items="eligibleGeneOptions"
          :item-title="item => localizedItemTitle(item, 'label')"
          item-value="value"
          :clearable="Boolean(simulationGene)"
          density="comfortable"
          variant="outlined"
          color="primary"
          hide-details
        />
      </div>
    </template>

    <!-- 工具筛选（可选，仅在需要时显示） -->
    <div v-if="showToolFilter && toolOptions.length > 0" class="dataset-filter__group">
      <v-autocomplete
        :id="fieldIds.tool"
        name="tool-name"
        :aria-label="text('datasetFilter.tool')"
        :model-value="tool ?? null"
        @update:model-value="updateTool"
        class="dataset-filter__select dataset-filter__select--tool"
        :label="text('datasetFilter.tool')"
        placeholder=""
        :items="toolOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        clearable
        hide-details
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getResultScopeLabel } from '@/constants/catalogueLabels'
import { text, localizedItemTitle } from '@/utils/locale'
import { ref, computed, watch, useId } from 'vue'
import {
  getScRnaSimulationTopologyOptions,
  getDatasetIdBasedSimulationOptions,
  requiresSimulationDatasetIdSelection
} from '@/constants/simulation'
import { RESULT_SCOPES, getDatasetResultScopes, type ResultScope } from '@/constants/result-scope'
import { useSimulationCascade } from '@/composables/useSimulationCascade'

// Props：组件属性定义
const props = defineProps<{
  dataType: 'real' | 'simulated'
  datasetId: string | number | null | undefined
  tool?: string
  realDatasets: Array<{ label: string; value: string | number }>
  simulationDatasets: Array<{ label: string; value: string | number }>
  tools?: Array<{ label: string; value: string; category?: string }>
  showToolFilter?: boolean
  includeEfficiencyOnly?: boolean
}>()

// Emits：组件事件定义
const emit = defineEmits<{
  'update:dataType': [value: 'real' | 'simulated']
  'update:datasetId': [value: string | number | null | undefined]
  'update:tool': [value: string]
  'selection-state': [
    {
      hasSelection: boolean
      hasDatasetId: boolean
    }
  ]
}>()

// 模拟数据多级选择状态由 composable 管理
const {
  topology: simulationTopology,
  cells: simulationCell,
  genes: simulationGene,
  cellOptions: availableCellOptions,
  geneOptions: availableGeneOptions,
  reset: resetSimulationSelections,
  constructDatasetId
} = useSimulationCascade({
  includeEfficiencyOnly: props.includeEfficiencyOnly ?? false
})
// 强制重建模拟下拉的 key（解决初次渲染 dirty 状态导致 label 悬浮）
const simulationResetKey = ref(0)

const rawComponentId = useId()
const baseId = `dataset-filter-${rawComponentId.replace(/[^a-zA-Z0-9_-]/g, '-')}`

const fieldIds = {
  dataType: `${baseId}-data-type`,
  scope: `${baseId}-scope`,
  dataset: `${baseId}-dataset`,
  topology: `${baseId}-topology`,
  cells: `${baseId}-cells`,
  genes: `${baseId}-genes`,
  tool: `${baseId}-tool`
} as const

const dataScope = ref<ResultScope>('all')
const datasets = computed(() => props.dataType === 'real' ? props.realDatasets : props.simulationDatasets)
const matchesScope = (datasetType: 'real' | 'simulation', datasetId: string | number) =>
  dataScope.value === 'all' || getDatasetResultScopes(datasetType, String(datasetId)).includes(dataScope.value)

// Modality options use both metric-specific sources, independent of the selected source.
const dataScopeOptions = computed(() => [
  { label: text('common.all'), value: 'all' },
  ...RESULT_SCOPES
    .filter(scope => props.realDatasets.some(option => getDatasetResultScopes('real', String(option.value)).includes(scope)) ||
      props.simulationDatasets.some(option => getDatasetResultScopes('simulation', String(option.value)).includes(scope)))
    .map(value => ({ label: getResultScopeLabel(value), value }))
])
const dataTypeOptions = computed(() => [
  { label: text('common.realData'), value: 'real' as const, datasets: props.realDatasets, datasetType: 'real' as const },
  { label: text('common.simulatedData'), value: 'simulated' as const, datasets: props.simulationDatasets, datasetType: 'simulation' as const }
].map(option => {
  const disabled = !option.datasets.some(dataset => matchesScope(option.datasetType, dataset.value))
  return {
    label: option.label,
    value: option.value,
    props: { disabled, 'aria-disabled': disabled, ...(disabled ? { subtitle: text('common.dataTypeUnavailable') } : {}) }
  }
}))

const toolOptions = computed(() => props.tools ?? [])

const showSimulationCascade = computed(() => props.dataType === 'simulated' && dataScope.value === 'scRNA')
const showDirectDataset = computed(() => !showSimulationCascade.value)
const eligibleDatasetIds = computed(() => new Set(datasets.value.map(option => String(option.value))))
const directDatasetOptions = computed(() => datasets.value.filter(option =>
  matchesScope(props.dataType === 'real' ? 'real' : 'simulation', option.value)
))

// scRNA only: every topology must lead to a dataset offered by this metric.
const topologyOptions = computed(() => getScRnaSimulationTopologyOptions().filter(option => {
  if (requiresSimulationDatasetIdSelection(option.value)) {
    return getDatasetIdBasedSimulationOptions(option.value)
      .some(dataset => eligibleDatasetIds.value.has(String(dataset.value)))
  }
  return datasets.value.some(dataset => String(dataset.value).startsWith(`${option.value}_cell`))
}))

// 当前拓扑是否通过 Dataset ID 选择
const requiresDatasetIdSelection = computed(() =>
  requiresSimulationDatasetIdSelection(simulationTopology.value)
)

// 基于 Dataset ID 的模拟数据选项
const datasetIdSimulationOptions = computed(() =>
  getDatasetIdBasedSimulationOptions(simulationTopology.value)
    .filter(option => eligibleDatasetIds.value.has(String(option.value)))
)

const eligibleCellOptions = computed(() => availableCellOptions.value.filter(option =>
  datasets.value.some(dataset => String(dataset.value).startsWith(`${simulationTopology.value}_cell${option.value}_gene`))
))
const eligibleGeneOptions = computed(() => availableGeneOptions.value.filter(option =>
  eligibleDatasetIds.value.has(`${simulationTopology.value}_cell${simulationCell.value}_gene${option.value}`)
))

// Incomplete or unavailable cascades must never leave an old result visible.
watch([simulationTopology, simulationCell, simulationGene], ([topology]) => {
  if (!showSimulationCascade.value) return
  const constructedId = topology && !requiresSimulationDatasetIdSelection(topology)
    ? constructDatasetId()
    : null
  emit('update:datasetId', constructedId && eligibleDatasetIds.value.has(constructedId) ? constructedId : null)
  emitSelectionState()
})

// A source switch preserves modality, but clears source-dependent results and cascades.
watch(() => props.dataType, () => {
  resetDependentSelections()
})

watch(dataScope, () => {
  const currentSource = dataTypeOptions.value.find(option => option.value === props.dataType)
  if (currentSource?.props.disabled) {
    const nextSource = dataTypeOptions.value.find(option => !option.props.disabled)
    if (nextSource) emit('update:dataType', nextSource.value)
  }
  resetDependentSelections()
})

watch(dataScopeOptions, options => {
  if (!options.some(option => option.value === dataScope.value)) dataScope.value = 'all'
})

function resetDependentSelections() {
  resetSimulationSelections()
  simulationResetKey.value += 1
  emit('update:datasetId', null)
  emit('update:tool', '')
  emitSelectionState()
}

watch(datasets, () => {
  if (showSimulationCascade.value) {
    if (simulationTopology.value && !topologyOptions.value.some(option => option.value === simulationTopology.value)) {
      resetSimulationSelections()
    } else if (simulationCell.value && !eligibleCellOptions.value.some(option => option.value === simulationCell.value)) {
      simulationCell.value = null
    } else if (simulationGene.value && !eligibleGeneOptions.value.some(option => option.value === simulationGene.value)) {
      simulationGene.value = null
    } else if (requiresDatasetIdSelection.value && props.datasetId != null &&
      !datasetIdSimulationOptions.value.some(option => String(option.value) === String(props.datasetId))) {
      emit('update:datasetId', null)
    }
  } else if (props.datasetId != null &&
    !directDatasetOptions.value.some(option => String(option.value) === String(props.datasetId))) {
    emit('update:datasetId', null)
  }
})

watch(
  () => props.datasetId,
  () => {
    emitSelectionState()
  },
  { immediate: true }
)

// 事件处理函数
// 更新数据类型
const updateDataType = (value: 'real' | 'simulated') => {
  if (value === props.dataType || !dataTypeOptions.value.some(option => option.value === value && !option.props.disabled)) return
  emit('update:datasetId', null)
  emit('update:tool', '')
  emit('update:dataType', value)
}

// 更新可见数据集 ID
const updateDatasetId = (value: string | number | null | undefined) => {
  const options = showSimulationCascade.value ? datasetIdSimulationOptions.value : directDatasetOptions.value
  emit('update:datasetId', value != null && options.some(option => String(option.value) === String(value)) ? value : null)
}

// 更新工具
const updateTool = (value: string | undefined | null) => {
  emit('update:tool', value ?? '')
}

function emitSelectionState() {
  const id = props.datasetId
  const hasDatasetId = id !== null && id !== undefined && id !== '' &&
    (showSimulationCascade.value
      ? requiresDatasetIdSelection.value
        ? datasetIdSimulationOptions.value.some(option => String(option.value) === String(id))
        : constructDatasetId() === String(id) && eligibleDatasetIds.value.has(String(id))
      : directDatasetOptions.value.some(option => String(option.value) === String(id)))
  const hasSimulationSelection = showSimulationCascade.value &&
    (Boolean(simulationTopology.value) || Boolean(simulationCell.value) || Boolean(simulationGene.value))
  const hasSelection = dataScope.value !== 'all' || hasDatasetId || hasSimulationSelection
  emit('selection-state', { hasSelection, hasDatasetId })
}
</script>

<style lang="scss">
@use '@/styles/components/dataset-filter.scss';
</style>
