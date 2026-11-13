import { computed, reactive, ref, watch } from 'vue'
import Papa from 'papaparse'
import {
  DOWN_SAMPLING_RATIO_OPTIONS,
  DOWN_SAMPLING_TOOL_NAMES,
  normalizeDownSamplingToolName,
  type DownSamplingDimension,
  type DownSamplingModality,
  type DownSamplingRatio,
  type DownSamplingReplicate,
  type DownSamplingToolName
} from '@/constants/down-sampling'
import { getToolPublicName } from '@/constants/tools'
import { getToolColor } from '@/constants/toolColors'
import { resolvePublicAsset } from '@/utils/path'
import { text } from '@/utils/locale'

const EXPECTED_RATIOS = DOWN_SAMPLING_RATIO_OPTIONS.map(option => option.value)

type DownSamplingGroup = {
  sourceDatasetId: string
  ratios: Set<DownSamplingRatio>
  valuesByTool: Map<DownSamplingToolName, Array<number | null>>
}

type DownSamplingSeriesItem = {
  name: DownSamplingToolName
  color: string
  values: Array<number | null>
}

type DownSamplingBarRow = {
  method: DownSamplingToolName
  value: number
}

const CSV_CACHE = new Map<string, Promise<Map<string, DownSamplingGroup>>>()

function parseDownSamplingCsv(text: string): Map<string, DownSamplingGroup> {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  })
  if (parsed.errors.length) throw new Error(parsed.errors[0]?.message ?? 'Failed to parse CSV')
  const required = ['modality', 'downsampling_type', 'source_dataset_id', 'method', 'dataset_id', 'ratio_pct', 'replicate', 'value']
  if (required.some(field => !parsed.meta.fields?.includes(field))) {
    throw new Error('Missing down-sampling data columns')
  }

  const groups = new Map<string, DownSamplingGroup>()
  const seen = new Set<string>()
  for (const row of parsed.data) {
    const modality = row.modality
    const dimension = row.downsampling_type
    const replicate = row.replicate
    const ratio = row.ratio_pct as DownSamplingRatio
    if ((modality !== 'scRNA' && modality !== 'ATAC')
      || (dimension !== 'cell' && dimension !== 'gene')
      || !EXPECTED_RATIOS.includes(ratio)
      || (modality === 'ATAC' ? dimension !== 'cell' || (replicate !== '1' && replicate !== '2') : replicate !== '1')) {
      throw new Error(`Invalid down-sampling condition: ${row.dataset_id}`)
    }
    const tool = normalizeDownSamplingToolName(row.method ?? '', modality)
    if (!tool) throw new Error(`Unknown down-sampling method: ${row.method}`)
    const raw = (row.value ?? '').trim()
    const value = raw === 'NA' ? null : Number(raw)
    if (!raw || (value !== null && !Number.isFinite(value))) {
      throw new Error(`Invalid down-sampling value: ${row.method} / ${row.dataset_id}`)
    }
    const key = `${modality}:${dimension}:${replicate}`
    const cellKey = `${key}:${tool}:${ratio}`
    if (seen.has(cellKey)) throw new Error(`Duplicate down-sampling value: ${cellKey}`)
    seen.add(cellKey)
    if (!row.source_dataset_id || !row.dataset_id) throw new Error('Missing down-sampling dataset ID')
    let group = groups.get(key)
    if (!group) {
      group = { sourceDatasetId: row.source_dataset_id, ratios: new Set(), valuesByTool: new Map() }
      groups.set(key, group)
    }
    if (group.sourceDatasetId !== row.source_dataset_id) throw new Error(`Mixed reference datasets: ${key}`)
    group.ratios.add(ratio)
    let values = group.valuesByTool.get(tool)
    if (!values) {
      values = new Array<number | null>(EXPECTED_RATIOS.length).fill(null)
      group.valuesByTool.set(tool, values)
    }
    values[EXPECTED_RATIOS.indexOf(ratio)] = value
  }
  if (!groups.size) throw new Error('Down-sampling CSV file is empty')
  return groups
}

async function fetchDownSamplingCsv(url: string): Promise<Map<string, DownSamplingGroup>> {
  const cached = CSV_CACHE.get(url)
  if (cached) return cached
  const promise = (async () => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch CSV file`)
    return parseDownSamplingCsv(await response.text())
  })()
  CSV_CACHE.set(url, promise)
  try {
    return await promise
  } catch (error) {
    CSV_CACHE.delete(url)
    throw error
  }
}

export function useDownSamplingMetric() {
  const filterState = reactive<{
    modality: DownSamplingModality
    dimension: DownSamplingDimension | null
    ratio: DownSamplingRatio | null
    replicate: DownSamplingReplicate
  }>({ modality: 'scRNA', dimension: null, ratio: null, replicate: '1' })

  watch(() => filterState.modality, modality => {
    if (modality === 'ATAC') filterState.dimension = 'cell'
    filterState.replicate = '1'
    filterState.ratio = null
  }, { flush: 'sync' })
  watch(() => filterState.dimension, dimension => {
    if (!dimension) filterState.ratio = null
  }, { flush: 'sync' })

  const isLoading = ref(true)
  const errorMessage = ref('')
  const csvData = ref<Map<string, DownSamplingGroup> | null>(null)
  const csvUrl = resolvePublicAsset('sheets/down-sampling.csv').replace(/\\+/g, '/')

  void fetchDownSamplingCsv(csvUrl).then(data => {
    csvData.value = data
  }).catch((error: unknown) => {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load down-sampling data'
    console.warn('[down-sampling] Failed to load data:', error)
  }).finally(() => {
    isLoading.value = false
  })

  const selectedGroup = computed(() => csvData.value?.get(
    `${filterState.modality}:${filterState.dimension}:${filterState.modality === 'ATAC' ? filterState.replicate : '1'}`
  ))
  const toolNames = computed<readonly DownSamplingToolName[]>(() => DOWN_SAMPLING_TOOL_NAMES[filterState.modality])
  const xAxisLabels = computed(() => EXPECTED_RATIOS.map(ratio => `${ratio}%`))
  const ratioIndex = computed(() => filterState.ratio ? EXPECTED_RATIOS.indexOf(filterState.ratio) : -1)

  const series = computed<DownSamplingSeriesItem[]>(() => {
    const group = selectedGroup.value
    if (!group) return []
    return toolNames.value.flatMap(tool => {
      const values = group.valuesByTool.get(tool)
      return values?.some(value => value !== null)
        ? [{ name: tool, color: getToolColor(tool), values }]
        : []
    })
  })

  const barRows = computed<DownSamplingBarRow[]>(() => {
    const group = selectedGroup.value
    if (!group || ratioIndex.value < 0) return []
    return toolNames.value.flatMap(tool => {
      const value = group.valuesByTool.get(tool)?.[ratioIndex.value] ?? null
      return value === null ? [] : [{ method: tool, value }]
    }).sort((a, b) => b.value - a.value)
  })

  const noteText = computed(() => {
    const group = selectedGroup.value
    if (!group) return ''
    const naTools = toolNames.value.filter(tool => {
      const values = group.valuesByTool.get(tool)
      if (!values) return false
      return filterState.ratio ? values[ratioIndex.value] === null : values.every(value => value === null)
    })
    if (!naTools.length) return ''
    const context = filterState.ratio ? 'at the selected down-sampling level' : 'at all down-sampling levels'
    return `Tools with NA ${context} (not shown): ${naTools.map(getToolPublicName).join(', ')}.`
  })

  const referenceDatasetId = computed(() => selectedGroup.value?.sourceDatasetId ?? '')

  const selectionErrorMessage = computed(() => {
    if (!filterState.dimension || !csvData.value) return ''
    const group = selectedGroup.value
    return !group || (filterState.ratio && !group.ratios.has(filterState.ratio))
      ? 'Data file temporarily unavailable' : ''
  })
  const isRatioDisabled = computed(() => !selectedGroup.value)
  const missingToolsWarning = computed(() => {
    const group = selectedGroup.value
    if (!group) return ''
    const missing = toolNames.value.filter(tool => !group.valuesByTool.has(tool))
    return missing.length
      ? `The following tools are missing from the current data file and are temporarily unavailable: ${missing.map(getToolPublicName).join(', ')}.`
      : ''
  })
  const emptyHintText = computed(() => text('downSampling.selectDimension'))
  const missingRatioWarning = computed(() => {
    const group = selectedGroup.value
    if (!group) return ''
    const missing = EXPECTED_RATIOS.filter(ratio => !group.ratios.has(ratio))
    return missing.length ? `Down-sampling data at ${missing.map(ratio => `${ratio}%`).join(', ')} is temporarily unavailable.` : ''
  })

  return {
    filterState, isLoading, errorMessage, xAxisLabels, series, barRows, noteText,
    referenceDatasetId, selectionErrorMessage, isRatioDisabled, missingToolsWarning,
    emptyHintText, missingRatioWarning
  }
}
