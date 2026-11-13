import { computed, reactive, ref, unref, watch, type Ref } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import Papa from 'papaparse'
import {
  EFFICIENCY_ALWAYS_NA_NOTE_TOOLS,
  EFFICIENCY_TOOL_COLORS,
  EFFICIENCY_TOOL_NAMES,
  EFFICIENCY_TOOLS_BY_MODALITY,
  EFFICIENCY_VRAM_TOOLS_BY_MODALITY,
  type EfficiencyModality,
  type EfficiencyMetricType,
  type EfficiencyMemoryResourceType,
  type EfficiencyScale,
  type EfficiencyToolName,
  type EfficiencyTopology,
  buildEfficiencyCsvPath,
  formatXAxisLabel,
  getEfficiencyToolLabel,
  normalizeEfficiencyToolName,
  getEfficiencyScaleOptions,
  getEfficiencyTopologyOptions,
  matchesEfficiencyDataset
} from '@/constants/efficiency-tools'
import { getToolPublicName } from '@/constants/tools'
import { resolvePublicAsset } from '@/utils/path'
import { text as localizedText } from '@/utils/locale'
import { getTopologyLabel } from '@/constants/catalogueLabels'

type EfficiencyCsvData = {
  columns: string[]
  valuesByTool: Record<EfficiencyToolName, Array<number | null>>
}

type MaybeRef<T> = T | Ref<T>

const CSV_CACHE = new Map<string, Promise<EfficiencyCsvData>>()

function isToolSetEqual(a: EfficiencyToolName[], b: EfficiencyToolName[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  if (bSet.size !== b.length) return false
  return a.every((item) => bSet.has(item))
}

function isNaCell(value: string | undefined): boolean {
  const trimmed = (value ?? '').trim()
  return !trimmed || trimmed.toUpperCase() === 'NA'
}

function safeParseNumber(value: string | undefined): number | null {
  if (isNaCell(value)) return null
  const parsed = Number(String(value).trim())
  if (!Number.isFinite(parsed)) throw new Error(`Invalid efficiency value: ${value}`)
  return parsed
}

function createEmptyValuesMap(columnsCount: number): Record<EfficiencyToolName, Array<number | null>> {
  return Object.fromEntries(
    EFFICIENCY_TOOL_NAMES.map((tool) => [tool, new Array(columnsCount).fill(null)])
  ) as Record<EfficiencyToolName, Array<number | null>>
}

function parseEfficiencyCsv(text: string): EfficiencyCsvData {
  const cleaned = (text || '').replace(/^\uFEFF/, '')
  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim()
  })

  if (parsed.errors.length > 0) throw new Error(parsed.errors[0]?.message ?? 'Failed to parse CSV')

  const fields = (parsed.meta.fields ?? []).map((field) => field.trim()).filter(Boolean)
  const columns = fields.filter((field) => field !== 'Method')
  if (!fields.includes('Method') || !columns.length || Object.keys(parsed.meta.renamedHeaders ?? {}).length) {
    throw new Error('Invalid efficiency CSV headers')
  }
  const valuesByTool = createEmptyValuesMap(columns.length)
  const seen = new Set<EfficiencyToolName>()

  parsed.data.forEach((row) => {
    const method = (row.Method ?? '').trim()
    if (!method) return
    // The legacy ExampleMethod13 row is retained as NA, outside the efficiency benchmark.
    if (method === 'ExampleMethod13' && columns.every(column => isNaCell(row[column]))) return
    const tool = normalizeEfficiencyToolName(method)
    if (!tool) throw new Error(`Unknown efficiency method: ${method}`)
    if (seen.has(tool)) throw new Error(`Duplicate efficiency method: ${method}`)
    seen.add(tool)
    const values = valuesByTool[tool]

    columns.forEach((columnName, index) => {
      values[index] = safeParseNumber(row[columnName])
    })
  })

  return { columns, valuesByTool }
}

async function fetchEfficiencyCsv(url: string): Promise<EfficiencyCsvData> {
  const cached = CSV_CACHE.get(url)
  if (cached) return cached

  const promise = (async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch CSV file`)
    }
    const csvText = await response.text()
    if (!csvText.trim()) {
      throw new Error('CSV file is empty')
    }
    return parseEfficiencyCsv(csvText)
  })()

  CSV_CACHE.set(url, promise)

  try {
    return await promise
  } catch (error) {
    CSV_CACHE.delete(url)
    throw error
  }
}

export function useEfficiencyMetric(options: {
  metricType: EfficiencyMetricType
  unit: 'min' | 'GB'
  decimals: number
  yAxisName: string
  resourceType?: MaybeRef<EfficiencyMemoryResourceType>
}) {
  const route = useRoute()
  const router = useRouter()

  const resourceType = computed<EfficiencyMemoryResourceType>(() => {
    if (options.metricType !== 'memory-efficiency') return 'RAM'
    return unref(options.resourceType ?? 'RAM')
  })

  const eligibleToolNames = computed<EfficiencyToolName[]>(() => {
    if (options.metricType === 'memory-efficiency' && resourceType.value === 'VRAM') {
      return [...EFFICIENCY_VRAM_TOOLS_BY_MODALITY[filterState.modality]]
    }
    return [...EFFICIENCY_TOOLS_BY_MODALITY[filterState.modality]]
  })

  const filterState = reactive<{
    modality: EfficiencyModality
    scale: EfficiencyScale | null
    topology: EfficiencyTopology | null
    selectedTools: EfficiencyToolName[]
  }>({
    modality: 'scRNA',
    scale: null,
    topology: null,
    selectedTools: []
  })
  filterState.selectedTools = [...eligibleToolNames.value]
  const scaleneSelectedTools = ref<EfficiencyToolName[]>([...eligibleToolNames.value])

  // 用于处理从 DataResult / MethodResult 的"模拟指标"超链接跳转（autoSelect=true&tool=...）
  // 仅在初始跳转时单选该工具；用户修改筛选条件后不再强制。
  const autoSelectedTool = ref<EfficiencyToolName | null>(null)

  // 追踪上一次的 scale 值，用于检测 scale 是否变化
  const previousScale = ref<EfficiencyScale | null>(null)
  // 追踪上一次组合下可用的工具集，用于识别“全选语义”
  const previousAvailableTools = ref<EfficiencyToolName[]>([...eligibleToolNames.value])

  const isLoading = ref(false)
  const errorMessage = ref('')
  const isTopologyComparison = computed(() => filterState.modality === 'ATAC' && filterState.scale === 'large')
  const canRenderChart = computed(() => {
    if (!filterState.scale) return false
    if (filterState.modality === 'SPATIAL') return true
    if (isTopologyComparison.value) return true
    if (filterState.scale === 'extra-large') return true
    return Boolean(filterState.topology)
  })

  const loadedCsvData = ref<EfficiencyCsvData | null>(null)
  const csvData = computed<EfficiencyCsvData | null>(() => {
    const data = loadedCsvData.value
    // Incomplete filters must not turn cached data into an empty tool context.
    if (!data || !canRenderChart.value) return null
    if (filterState.modality === 'scRNA') return data
    const indices = data.columns.flatMap((column, index) =>
      matchesEfficiencyDataset(column, filterState.modality, filterState.scale, filterState.topology) ? [index] : [])
    return {
      columns: indices.map(index => data.columns[index]!),
      valuesByTool: Object.fromEntries(EFFICIENCY_TOOL_NAMES.map(tool => [
        tool, indices.map(index => data.valuesByTool[tool][index] ?? null)
      ])) as EfficiencyCsvData['valuesByTool']
    }
  })
  const isApplyingQuery = ref(false)
  const skipNextScaleneSelectionSync = ref(false)

  const csvUrl = computed(() => {
    if (!filterState.scale) return ''
    const relative = buildEfficiencyCsvPath(
      options.metricType,
      filterState.scale,
      filterState.topology,
      resourceType.value,
      filterState.modality
    )
    if (!relative) return ''
    return resolvePublicAsset(relative).replace(/\\+/g, '/')
  })

  let requestToken = 0

  watch(
    csvUrl,
    async (nextUrl) => {
      requestToken += 1
      const token = requestToken

      errorMessage.value = ''
      loadedCsvData.value = null
      isLoading.value = false

      if (!nextUrl) {
        return
      }

      isLoading.value = true

      try {
        const data = await fetchEfficiencyCsv(nextUrl)
        if (token !== requestToken) return

        loadedCsvData.value = data
      } catch (error) {
        if (token !== requestToken) return
        const message = error instanceof Error ? error.message : 'Unknown error occurred while loading CSV data'
        errorMessage.value = message
        console.warn(`[${options.metricType}] Failed to load data:`, message, { url: nextUrl, error })
      } finally {
        if (token === requestToken) {
          isLoading.value = false
        }
      }
    },
    { immediate: true }
  )

  const xAxisLabels = computed(() => (csvData.value?.columns ?? []).map(column => {
    if (!isTopologyComparison.value) return formatXAxisLabel(column)
    const topology = column.match(/^\d+_(linear|bifurcation3|bifurcation5)_/)?.[1]
    return topology === 'linear' || topology === 'bifurcation3' || topology === 'bifurcation5'
      ? getTopologyLabel(topology) : column
  }))

  const selectedToolSet = computed(() => new Set(filterState.selectedTools))

  const orderedToolNames = computed<EfficiencyToolName[]>(() => {
    return eligibleToolNames.value.filter((tool) => selectedToolSet.value.has(tool))
  })

  const series = computed(() => {
    const data = csvData.value
    if (!data) return []

    return orderedToolNames.value
      .filter((toolName) => selectedToolSet.value.has(toolName))
      .map((toolName) => {
        const values = data.valuesByTool[toolName] ?? []
        const hasValid = values.some((value) => value !== null)
        return {
          name: toolName,
          color: EFFICIENCY_TOOL_COLORS[toolName],
          values,
          hasValid
        }
      })
      .filter((item) => item.hasValid)
  })

  const availableTools = computed<EfficiencyToolName[]>(() => {
    const data = csvData.value
    if (!data) return [...eligibleToolNames.value]
    return eligibleToolNames.value.filter((tool) => (data.valuesByTool[tool] ?? []).some((value) => value !== null))
  })

  const allNaTools = computed<string[]>(() => {
    const data = csvData.value
    if (!data) return []

    // 判断是否为全选状态（selectedTools 等于 availableTools）
    const isAllSelected = isToolSetEqual(filterState.selectedTools, availableTools.value)

    if (isAllSelected) {
      const allNaFromEfficiency = eligibleToolNames.value.filter(
        (tool) => (data.valuesByTool[tool] ?? []).every((v) => v === null)
      )
      const noteTools = resourceType.value === 'VRAM' ? [] : EFFICIENCY_ALWAYS_NA_NOTE_TOOLS
      return Array.from(new Set([...allNaFromEfficiency, ...noteTools]))
    } else {
      // 用户修改了筛选框：只显示 selectedTools 中的全 NA 工具
      return filterState.selectedTools.filter((tool) => (data.valuesByTool[tool] ?? []).every((v) => v === null))
    }
  })

  const naToolsDescription = computed(() => {
    if (!csvData.value) return ''
    const parts: string[] = []

    if (allNaTools.value.length) {
      const labels = allNaTools.value.map((tool) => {
        const normalized = normalizeEfficiencyToolName(tool)
        return normalized ? getEfficiencyToolLabel(normalized) : getToolPublicName(tool)
      })
      parts.push(localizedText('efficiency.allNa', { tools: labels.join(', ') }))
    }

    if (resourceType.value === 'VRAM' && filterState.modality === 'scRNA') {
      parts.push(localizedText('efficiency.cpuOnlyVram'))
    }

    return parts.join(' ')
  })

  const missingDatasetIdsByTool = computed(() => {
    const data = csvData.value
    return Object.fromEntries(
      EFFICIENCY_TOOL_NAMES.map((tool) => {
        if (!data) return [tool, []]

        const values = data.valuesByTool[tool] ?? []
        const missingDatasetIds = data.columns.filter((datasetId, index) => values[index] === null)
        return [tool, missingDatasetIds]
      })
    ) as Record<EfficiencyToolName, string[]>
  })

  watch(
    () => filterState.modality,
    () => {
      filterState.scale = null
      filterState.topology = null
      autoSelectedTool.value = null
      previousScale.value = null
      previousAvailableTools.value = [...eligibleToolNames.value]
      filterState.selectedTools = [...eligibleToolNames.value]
      scaleneSelectedTools.value = [...eligibleToolNames.value]
    },
    { flush: 'sync' }
  )

  watch(
    resourceType,
    (nextResourceType, prevResourceType) => {
      if (nextResourceType === prevResourceType) return

      isApplyingQuery.value = true
      try {
        autoSelectedTool.value = null
        filterState.selectedTools = [...eligibleToolNames.value]
        scaleneSelectedTools.value = [...eligibleToolNames.value]
        previousAvailableTools.value = [...eligibleToolNames.value]
      } finally {
        isApplyingQuery.value = false
      }
    }
  )

  watch(
    () => csvData.value,
    (nextData) => {
      if (!nextData) return

      const nextAvailable = availableTools.value
      const availableSet = new Set(nextAvailable)
      const wasAllSelectedInPreviousContext = isToolSetEqual(
        filterState.selectedTools,
        previousAvailableTools.value
      )

      // 检测 scale 是否变化
      const currentScale = filterState.scale
      const scaleChanged = previousScale.value !== null && previousScale.value !== currentScale

      // 特殊处理：URL 跳转单选的保持（即使工具不在 available 列表）
      const shouldKeepAutoSelectedTool =
        Boolean(autoSelectedTool.value) &&
        filterState.selectedTools.length === 1 &&
        filterState.selectedTools[0] === autoSelectedTool.value

      let nextSelection: EfficiencyToolName[]
      if (shouldKeepAutoSelectedTool) {
        // URL 跳转单选：保持该工具（即使不可用，也让用户看到"无数据"而非自动全选）
        nextSelection = [autoSelectedTool.value as EfficiencyToolName]
      } else if (scaleChanged) {
        // scale 变化时：重置为全选所有非 NA 工具
        nextSelection = nextAvailable
      } else if (wasAllSelectedInPreviousContext) {
        // 处于“全选当前可用工具”状态时，topology 变化后也应保持全选语义
        nextSelection = nextAvailable
      } else {
        // scale 未变化（只是 topology 变化）：保留用户选择，只移除失效工具
        const validSelection = filterState.selectedTools.filter((tool) => availableSet.has(tool))
        nextSelection = validSelection
      }

      // 更新 previousScale
      previousScale.value = currentScale

      previousAvailableTools.value = [...nextAvailable]
      if (isToolSetEqual(nextSelection, filterState.selectedTools)) return

      // 图表可用工具会随着 CSV 数据自动裁剪，但底部 Scalene 卡片需要保留
      // “用户显式选择/重置后的工具范围”，不能被这类内部收缩覆盖。
      skipNextScaleneSelectionSync.value = true
      isApplyingQuery.value = true
      try {
        filterState.selectedTools = nextSelection
      } finally {
        previousAvailableTools.value = [...nextAvailable]
        isApplyingQuery.value = false
      }
    },
    { immediate: true }
  )

  watch(
    () => filterState.scale,
    (nextScale, prevScale) => {
      if (nextScale === 'extra-large' || isTopologyComparison.value) {
        filterState.topology = null
      }

      // scale 从一个有效值切换到另一个有效值时，立即重置 tools 筛选框
      if (prevScale && nextScale && prevScale !== nextScale) {
        if (!isApplyingQuery.value && !autoSelectedTool.value) {
          isApplyingQuery.value = true
          try {
            filterState.selectedTools = [...eligibleToolNames.value]
            scaleneSelectedTools.value = [...eligibleToolNames.value]
            previousScale.value = nextScale
          } finally {
            isApplyingQuery.value = false
          }
        }
      }
    }
  )

  watch(
    () => ({
      scale: filterState.scale,
      topology: filterState.topology,
      selectedTools: filterState.selectedTools.slice()
    }),
    () => {
      if (skipNextScaleneSelectionSync.value) {
        skipNextScaleneSelectionSync.value = false
        return
      }
      if (isApplyingQuery.value) return
      scaleneSelectedTools.value = [...filterState.selectedTools]
      // 用户手动修改筛选条件后，不再保留“跳转自动单选工具”的状态
      if (autoSelectedTool.value) {
        const stillSingleSameTool =
          filterState.selectedTools.length === 1 && filterState.selectedTools[0] === autoSelectedTool.value
        if (!stillSingleSameTool) {
          autoSelectedTool.value = null
        }
      }
    },
    { deep: true }
  )

  watch(
    () => route.query,
    (query) => {
      isApplyingQuery.value = true

      try {
        const autoSelect = String(query.autoSelect ?? '') === 'true'
        if (!autoSelect) return
        const scale = typeof query.scale === 'string' ? query.scale : ''
        const topology = typeof query.topology === 'string' ? query.topology : ''
        const tool = typeof query.tool === 'string' ? query.tool : ''
        const modality = query.modality
        if (modality === 'scRNA' || modality === 'ATAC' || modality === 'SPATIAL') filterState.modality = modality

        const scaleOption = getEfficiencyScaleOptions(filterState.modality).find(option => option.value === scale)
        if (scaleOption) {
          filterState.scale = scaleOption.value
          if (scale === 'extra-large' || isTopologyComparison.value) {
            filterState.topology = null
          } else {
            filterState.topology = getEfficiencyTopologyOptions(filterState.modality).find(option => option.value === topology)?.value ?? null
          }
        }

        if (autoSelect) {
          const normalizedTool = normalizeEfficiencyToolName(tool)
          if (normalizedTool && eligibleToolNames.value.includes(normalizedTool)) {
            autoSelectedTool.value = normalizedTool
            filterState.selectedTools = [normalizedTool]
            scaleneSelectedTools.value = [normalizedTool]
          }

          const nextQuery: LocationQueryRaw = { ...query }
          delete nextQuery.autoSelect
          delete nextQuery.topology
          delete nextQuery.tool
          router.replace({ path: route.path, query: nextQuery }).catch(() => {})
        }
      } finally {
        isApplyingQuery.value = false
      }
    },
    { immediate: true }
  )

  const emptyHintText = computed(() => {
    if (filterState.scale === 'extra-large') return ''
    if (filterState.modality === 'SPATIAL') return localizedText('efficiency.selectScale')
    return 'Please select data scale and topology to view the chart.'
  })

  return {
    filterState,
    canRenderChart,
    isLoading,
    errorMessage,

    unit: options.unit,
    decimals: options.decimals,
    yAxisName: options.yAxisName,

    xAxisLabels,
    series,
    isTopologyComparison,
    availableTools,
    scaleneSelectedTools,
    missingDatasetIdsByTool,
    naToolsDescription,
    hasNonPositiveValues: computed(() => series.value.some(item => item.values.some(value => value !== null && value <= 0))),

    emptyHintText
  }
}
