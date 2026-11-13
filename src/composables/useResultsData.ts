import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import axios from 'axios'
import { API_ENDPOINTS, STATIC_CSV_CACHE_TTL_MS, buildStaticCsvRequestUrl } from '@/constants/api'
import { IMAGE_PLACEHOLDERS } from '@/constants/ui'
import {
  getRealDatasetLabel,
  REAL_DATASET_LABELS,
  REAL_RESULT_DATASET_ID_SET,
  MULTI_MODAL_REAL_DATASET_ID_SET,
  MULTI_MODAL_REAL_DATASET_TOOL_SUPPORT,
  TOOL_REAL_DATASET_MODAL_RANGES,
  GROUNDTRUTH_STREAM_GLOBAL_UNAVAILABLE,
  SIM_FULL_COMBOS
} from '@/constants/datasets'
import {
  DATASET_ID_SIMULATION_DATASETS,
  findSimulationDatasetById,
  formatNumberWithCommas,
  parseSizeKey,
  topologyKeyToLabel,
  type TopologyKey
} from '@/constants/simulation'
import {
  getToolPublicName,
  getUsabilityMethodName,
  resolveToolName,
  TOOL_DEFINITIONS,
  hasPublishedToolResults,
  isSimulationSupportedTool,
  USABILITY_METHOD_NAMES
} from '@/constants/tools'
import {
  getBenchmarkCombinationState, getBenchmarkFigureState, getBenchmarkModality, getDatasetMetricNotApplicableReason,
  isToolInSimulationModality
} from '@/constants/benchmark-results'
import { normalizeEfficiencyToolName } from '@/constants/efficiency-tools'
import { TOOL_DESCRIPTIONS } from '@/constants/toolDescriptions'
import { VELOCITY_TYPES } from '@/constants/velocity'
import { excludesMetricResults, getResultPlotRoles } from '@/constants/result-display'
import { GENERAL_METRICS_ORDER, SIMULATION_METRICS_ORDER, getMetricShortNames } from '@/constants/metrics'
import { buildAggregateMetricPath } from '@/constants/measurement-paths'
import { configuredResultImage } from '@/constants/result-image-assets'
import { isMetricApplicable } from '@/utils/metric-applicability'
import { isMetricMissing } from '@/constants/measurement-missing'
import { isValidRealDatasetId, validateSimulationDatasetContext } from '@/utils/route-validators'
import {
  createPlaceholder,
  evaluateSectionPlaceholder,
  parseMissingSpec,
  type PlaceholderDisplay,
  type PlaceholderMode,
  type ResultStatus
} from '@/utils/placeholderUtils'
import { buildSimulationIdentifier, formatSimulationScale, normalizeSimulationShapeKey } from '@/utils/formatters'
import {
  buildMetricImagePath,
  buildVelocityImagePath,
  resolveVelocityDisplayLabel
} from '@/utils/result/imagePathBuilder'
import { resolveBenchmarkImageAsset } from '@/utils/path'
import { buildAccessionLink, buildAccessionSegments, buildPublicationLink, normalizeUrl } from '@/utils/urlBuilders'
import { csvTextToObjects } from '@/utils/csvUtils'
import type { ResultRouteState } from '@/composables/useResultRoute'
import type {
  DatasetDetailEntry, DatasetSection, DatasetTool, MetricCategory,
  MetricCategorySection, ToolMetadata
} from '@/types/results'
import {
  DEFAULT_NO_RESULT_CONFIG,
  type ToolMissingConfig,
  type ToolNoResultConfig
} from '@/constants/results/noResultConfig'
import { TOOL_REAL_DATASET_WHITELIST_SETS } from '@/constants/tool-dataset-support'
import {
  CYCLE_INFERENCE_TOOL_SET,
  isCycleDatasetContext,
  isCycleRealDatasetId,
  isCycleSimulationDatasetId
} from '@/constants/cycle-support'

function buildSpatialMetricsResults(isSimulation: boolean): MetricCategorySection[] {
  const base = 'images/measurements/Spatial_Metrics'
  const mk = (name: 'Time consistency' | 'Velocity consistency', file: string): MetricCategorySection => {
    const imageUrl = configuredResultImage(resolveBenchmarkImageAsset(`${base}/${file}`))
    return {
    category: name,
    images: [
      {
        name,
        shortName: file.replace(/\.png$/i, ''),
        imageUrl,
        placeholder: imageUrl ? null : { mode: 'upload' },
        status: imageUrl ? 'idle' : 'upload',
        predetermined: !imageUrl
      }
    ],
    placeholder: null
    }
  }

  return [
    mk('Time consistency', `time_consistency_${isSimulation ? 'sim' : 'real'}.png`),
    mk('Velocity consistency', `velocity_consistency_${isSimulation ? 'sim' : 'real'}.png`)
  ]
}

interface DatasetContext {
  type: 'real' | 'simulation'
  id?: string | undefined
  shape?: string | undefined
  size?: string | undefined
}

interface DatasetDataPayload {
  title: string
  description: string
  detailEntries: DatasetDetailEntry[]
  toolResults: DatasetTool[]
  isRealDataset: boolean
  lineageValue: string
  simulationMode: 'full' | 'efficiency-only' | null
  metadataUnavailable?: boolean
}

interface MethodDataPayload {
  sections: DatasetSection[]
  metadata: ToolMetadata | null
}

interface NormalizedMissingSpec {
  mode: PlaceholderMode
  message?: string | null
}

interface NormalizedVelocityMissing {
  section: NormalizedMissingSpec | null
  defaultItem: NormalizedMissingSpec | null
  items: Map<string, NormalizedMissingSpec | null>
}

interface NormalizedMetricsCategory {
  section: NormalizedMissingSpec | null
  defaultItem: NormalizedMissingSpec | null
  items: Map<string, NormalizedMissingSpec | null>
}

interface NormalizedMetricsMissing {
  section: NormalizedMissingSpec | null
  defaultItem: NormalizedMissingSpec | null
  categories: Map<string, NormalizedMetricsCategory>
}

export interface UseResultsDataOptions {
  routeState: Ref<ResultRouteState | undefined> | ComputedRef<ResultRouteState | undefined>
  noResultConfig?: Ref<Record<string, ToolNoResultConfig>> | undefined
}

const toolCategories = ['Category A', 'Category B', 'Category C']
const TOOL_DATASET_SUPPORT: Record<
  string,
  {
    realIds?: string[]
    simulationShapes?: string[]
    simulationSizes?: string[]
    simulationIds?: string[]
  }
> = {
  ExampleMethod09: {},
  ExampleMethod10: {}
}
const METHOD_TOOL_REAL_DATASET_WHITELIST = TOOL_REAL_DATASET_WHITELIST_SETS

// Cycle inference 工具支持范围由 constants/cycle-support.ts 统一管理
const imagePlaceholderText = IMAGE_PLACEHOLDERS.NOT_AVAILABLE

const datasetInfoFieldOrder: Array<{ key: string; label: string }> = [
  { key: 'Species', label: 'Field A' },
  { key: 'Tissue', label: 'Field B' },
  { key: 'Sequencing type', label: 'Input type' },
  { key: 'Label', label: 'Label' },
  { key: 'Accession ID/Link', label: 'Reference' },
  { key: 'PMID/DOI', label: 'Reference record' },
  { key: 'Lineage', label: 'Group sequence' },
  { key: 'Label type', label: 'Group label' }
]

const LONG_TEXT_FIELDS = new Set(['Label', 'Lineage'])

function isToolSupportedForDatasetContext(toolName: string, context: DatasetContext): boolean {
  const rule = TOOL_DATASET_SUPPORT[toolName]

  if (context.type === 'real') {
    const modalRange = TOOL_REAL_DATASET_MODAL_RANGES[toolName]
    if (modalRange && (context.id == null || !modalRange.includes(context.id))) {
      return false
    }
    if (!rule) return true
    if (!rule.realIds || rule.realIds.length === 0) return true
    return context.id != null && rule.realIds.includes(context.id)
  }

  if (!rule) return true

  if (rule.simulationShapes && rule.simulationShapes.length > 0) {
    const shape = context.shape ?? ''
    if (!rule.simulationShapes.includes(shape)) return false
  }
  if (rule.simulationSizes && rule.simulationSizes.length > 0) {
    const size = context.size ?? ''
    if (!rule.simulationSizes.includes(size)) return false
  }
  if (rule.simulationIds && rule.simulationIds.length > 0) {
    const id = context.id ?? ''
    if (!rule.simulationIds.includes(id)) return false
  }

  return true
}

export function useResultsData(options: UseResultsDataOptions) {
  const { routeState, noResultConfig } = options
  const effectiveNoResultConfig = computed(() => noResultConfig?.value ?? DEFAULT_NO_RESULT_CONFIG)

  const datasetTitle = ref('')
  const datasetDescription = ref('')
  const datasetDetailEntries = ref<DatasetDetailEntry[]>([])
  const datasetInfoLoading = ref(false)
  const toolResults = ref<DatasetTool[]>([])
  const toolResultsLoading = ref(false)
  const isRealDataset = ref(false)
  const lineageValue = ref('')
  const simulationMode = ref<'full' | 'efficiency-only' | null>(null)
  const metadataUnavailable = ref(false)

  const datasetSections = ref<DatasetSection[]>([])
  const sectionsLoading = ref(false)
  const toolMetadata = ref<ToolMetadata | null>(null)

  const loadError = ref<string | null>(null)

  const realDatasetInfoCache = ref<TimedCsvCacheState<Map<string, Record<string, string>>>>({
    value: null,
    fetchedAt: 0,
    retryAfter: 0,
    pendingRequest: null
  })
  const toolMetadataCache = ref<TimedCsvCacheState<Map<string, ToolMetadata>>>({
    value: new Map(),
    fetchedAt: 0,
    retryAfter: 0,
    pendingRequest: null
  })
  const downloadLinkCache = ref<TimedCsvCacheState<Map<string, string>>>({
    value: null,
    fetchedAt: 0,
    retryAfter: 0,
    pendingRequest: null
  })

  let activeToken = 0

  const resetDatasetView = () => {
    datasetTitle.value = 'Dataset Results'
    datasetDescription.value = ''
    datasetDetailEntries.value = []
    toolResults.value = []
    datasetInfoLoading.value = false
    toolResultsLoading.value = false
    isRealDataset.value = false
    lineageValue.value = ''
    simulationMode.value = null
    metadataUnavailable.value = false
  }

  const resetMethodView = () => {
    datasetSections.value = []
    sectionsLoading.value = false
    toolMetadata.value = null
  }

  const applyDatasetPayload = (payload: DatasetDataPayload) => {
    datasetTitle.value = payload.title
    datasetDescription.value = payload.description
    datasetDetailEntries.value = payload.detailEntries
    toolResults.value = payload.toolResults
    isRealDataset.value = payload.isRealDataset
    lineageValue.value = payload.lineageValue
    simulationMode.value = payload.simulationMode
    metadataUnavailable.value = payload.metadataUnavailable ?? false
  }

  const applyMethodPayload = (payload: MethodDataPayload) => {
    datasetSections.value = payload.sections
    toolMetadata.value = payload.metadata
  }

  const loadDatasetData = async (state: ResultRouteState, token: number) => {
    datasetInfoLoading.value = true
    toolResultsLoading.value = true
    loadError.value = null

    try {
      if (!state.dataset) {
        resetDatasetView()
        return
      }

      const payload = await buildDatasetResultForContext(
        state.dataset,
        effectiveNoResultConfig.value,
        realDatasetInfoCache
      )
      payload.detailEntries = await appendProcessedDataEntry(
        payload.detailEntries,
        state.dataset,
        downloadLinkCache
      )
      if (token !== activeToken) {
        return
      }
      applyDatasetPayload(payload)
    } catch (error) {
      if (token !== activeToken) {
        return
      }
      console.error('[useResultsData] failed to load dataset result', error)
      loadError.value = 'Failed to load dataset result data. Please try again later.'
      resetDatasetView()
    } finally {
      if (token === activeToken) {
        datasetInfoLoading.value = false
        toolResultsLoading.value = false
      }
    }
  }

  const loadMethodData = async (state: ResultRouteState, token: number) => {
    sectionsLoading.value = true
    loadError.value = null

    try {
      const payload = await buildMethodResult(state, effectiveNoResultConfig.value, {
        realDatasetInfoCache,
        toolMetadataCache,
        downloadLinkCache
      })
      if (token !== activeToken) {
        return
      }
      applyMethodPayload(payload)
    } catch (error) {
      if (token !== activeToken) {
        return
      }
      console.error('[useResultsData] failed to load method result', error)
      loadError.value = error instanceof Error ? error.message : 'Failed to load method result data.'
      resetMethodView()
    } finally {
      if (token === activeToken) {
        sectionsLoading.value = false
      }
    }
  }

  const loadByMode = async (state: ResultRouteState | undefined) => {
    const token = ++activeToken
    if (!state) {
      resetDatasetView()
      resetMethodView()
      loadError.value = null
      return
    }

    if (state.mode === 'by-dataset') {
      resetMethodView()
      await loadDatasetData(state, token)
    } else {
      await loadMethodData(state, token)
    }
  }

  watch(() => JSON.stringify(routeState.value), () => {
    loadByMode(routeState.value)
  }, { immediate: true })

  const refresh = async () => {
    await loadByMode(routeState.value)
  }

  return {
    datasetTitle,
    datasetDescription,
    datasetDetailEntries,
    datasetInfoLoading,
    toolResults,
    toolResultsLoading,
    isRealDataset,
    lineageValue,
    simulationMode,
    metadataUnavailable,
    datasetSections,
    sectionsLoading,
    toolMetadata,
    loadError,
    refresh,
    imagePlaceholderText,
    toolCategories
  }
}

function formatSimulationScaleWithUnits(size: string | undefined): string {
  if (!size) return ''
  const spec = parseSizeKey(size)
  if (!spec) return ''
  return `${formatNumberWithCommas(spec.cells)} × ${formatNumberWithCommas(spec.genes)}`
}

function extractSimulationDatasetMarker(datasetId: string): string {
  const dataset = findSimulationDatasetById(datasetId)
  if (dataset?.marker) {
    return dataset.marker
  }

  return datasetId
}

function resolveSimulationHeroTitle(shape: string, size: string, datasetId: string): string {
  const trimmedId = datasetId.trim()
  const dataset = trimmedId ? findSimulationDatasetById(trimmedId) : undefined

  if (dataset) {
    const topologyLabel = topologyKeyToLabel(dataset.topologyKey)

    if (dataset.topologyKey === 'lineage-tracing') {
      return `${topologyLabel} (${extractSimulationDatasetMarker(dataset.id)})`
    }

    if (dataset.topologyKey === 'bursting-tree') {
      const marker = extractSimulationDatasetMarker(dataset.id)
      const scale = formatSimulationScaleWithUnits(
        typeof dataset.cells === 'number' && typeof dataset.genes === 'number'
          ? `${dataset.cells}*${dataset.genes}`
          : size
      )
      return scale ? `${topologyLabel} (${marker}, ${scale})` : `${topologyLabel} (${marker})`
    }

    if (typeof dataset.cells === 'number' && typeof dataset.genes === 'number') {
      return `${topologyLabel} (${formatNumberWithCommas(dataset.cells)} × ${formatNumberWithCommas(dataset.genes)})`
    }

    return `${topologyLabel} (${dataset.id})`
  }

  const normalizedKey = normalizeSimulationShapeKey(shape) as TopologyKey
  const topologyLabel = topologyKeyToLabel(normalizedKey)
  const scaleWithUnits = formatSimulationScaleWithUnits(size)
  return scaleWithUnits ? `${topologyLabel} (${scaleWithUnits})` : topologyLabel
}

function resolveSimulationSize(
  datasetId: string,
  fallbackSize?: string
): string | undefined {
  const dataset = datasetId ? findSimulationDatasetById(datasetId) : undefined
  if (dataset && typeof dataset.cells === 'number' && typeof dataset.genes === 'number') {
    return `${dataset.cells}*${dataset.genes}`
  }
  return fallbackSize
}

function resolveSimulationNavigationLabel(context: DatasetContext): string {
  const simulationId = context.id?.trim()
  if (simulationId) {
    const dataset = findSimulationDatasetById(simulationId)
    if (dataset?.topologyKey === 'lineage-tracing' || dataset?.topologyKey === 'bursting-tree') {
      return extractSimulationDatasetMarker(dataset.id)
    }
  }

  if (context.size) {
    return formatSimulationScale(context.size)
  }

  return simulationId || ''
}

async function buildDatasetResultForContext(
  dataset: DatasetContext,
  configMap: Record<string, ToolNoResultConfig>,
  realDatasetInfoCache: Ref<TimedCsvCacheState<Map<string, Record<string, string>>>>,
  targetTool?: string
): Promise<DatasetDataPayload> {
  if (!dataset) {
    return {
      title: 'Dataset Results',
      description: 'Please select a dataset to view its details.',
      detailEntries: [],
      toolResults: [],
      isRealDataset: false,
      lineageValue: '',
      simulationMode: null
    }
  }

  if (dataset.type === 'real') {
    const id = dataset.id ?? ''
    if (!isValidRealDatasetId(id)) {
      throw new Error('Dataset metadata not found. Please return and choose again.')
    }

    let detailEntries: DatasetDetailEntry[] = []
    let lineageValue = ''
    let metadataUnavailable = false

    try {
      const infoMap = await fetchRealDatasetInfoMap(realDatasetInfoCache)
      const detail = infoMap?.get(String(id))
      if (detail) {
        detailEntries = buildDetailEntries(detail, getRealDatasetLabel(id))
        const lineageEntry = detailEntries.find((entry) => entry.key === 'Lineage')
        lineageValue = lineageEntry ? lineageEntry.value : ''
      } else {
        metadataUnavailable = true
      }
    } catch {
      metadataUnavailable = true
    }

    const toolResults = buildToolResultsForContext({ type: 'real', id }, configMap, null, targetTool)

    return {
      title: id ? getRealDatasetLabel(id) : 'Dataset',
      description: '',
      detailEntries,
      toolResults,
      isRealDataset: true,
      lineageValue,
      simulationMode: null,
      metadataUnavailable
    }
  }

  const datasetIdentifier = dataset.id ? dataset.id.trim() : ''
  const shape = dataset.shape
  const size = resolveSimulationSize(datasetIdentifier, dataset.size)
  if (!shape) {
    throw new Error('Simulation dataset parameters are incomplete.')
  }

  const validationResult = validateSimulationDatasetContext(shape, size, dataset.id)
  if (!validationResult.valid || validationResult.mode === 'efficiency-only') {
    throw new Error('Simulation combination is not supported.')
  }

  const identifierSlug = datasetIdentifier || buildSimulationIdentifier(shape, size)
  const detailEntries: DatasetDetailEntry[] = []

  const groundtruthEntry = buildSimulationGroundtruthEntry(identifierSlug, shape, size)
  if (groundtruthEntry) detailEntries.push(groundtruthEntry)
  const simulationDataset = findSimulationDatasetById(identifierSlug)
  if (simulationDataset?.sourceRealDatasetId) {
    detailEntries.push({ key: 'source-dataset', label: 'Source dataset', value: simulationDataset.sourceRealDatasetId, isLong: false, type: 'text' })
  }
  if (simulationDataset?.differentiationPath) {
    detailEntries.push({ key: 'Lineage', label: 'Group sequence', value: simulationDataset.differentiationPath, isLong: true, type: 'text' })
  }

  const toolResults = buildToolResultsForContext(
    {
      type: 'simulation',
      shape,
      ...(size !== undefined ? { size } : {}),
      ...(datasetIdentifier ? { id: datasetIdentifier } : {})
    },
    configMap,
    validationResult.mode ?? null,
    targetTool
  )

  return {
    title: resolveSimulationHeroTitle(shape, size ?? '', datasetIdentifier),
    description: '',
    detailEntries,
    toolResults,
    isRealDataset: false,
    lineageValue: simulationDataset?.differentiationPath ?? '',
    simulationMode: validationResult.mode ?? null
  }
}

async function buildMethodResult(
  state: ResultRouteState,
  configMap: Record<string, ToolNoResultConfig>,
  caches: {
    realDatasetInfoCache: Ref<TimedCsvCacheState<Map<string, Record<string, string>>>>
    toolMetadataCache: Ref<TimedCsvCacheState<Map<string, ToolMetadata>>>
    downloadLinkCache: Ref<TimedCsvCacheState<Map<string, string>>>
  }
): Promise<MethodDataPayload> {
  const rawTool = state.method?.tool ?? ''
  if (!rawTool) {
    return { sections: [], metadata: null }
  }

  const canonicalTool = resolveToolName(rawTool)
  if (!canonicalTool) {
    throw new Error(`The tool "${rawTool}" is not supported yet.`)
  }

  const metadata = await fetchToolMetadata(canonicalTool, caches.toolMetadataCache)

  if (!hasPublishedToolResults(canonicalTool)) {
    return { sections: [], metadata }
  }

  const sections: DatasetSection[] = []
  const isCycleTool = CYCLE_INFERENCE_TOOL_SET.has(canonicalTool)

  // Real datasets
  for (let index = 0; index < REAL_DATASET_LABELS.length; index += 1) {
    const id = String(index + 1)
    const realContext: DatasetContext = { type: 'real', id }
    if (!isValidRealDatasetId(id)) {
      continue
    }
    if (isCycleTool && !isCycleRealDatasetId(id)) {
      continue
    }
    if (!isToolSupportedForDatasetContext(canonicalTool, realContext)) {
      continue
    }

    try {
      const payload = await buildDatasetResultForContext(
        realContext,
        configMap,
        caches.realDatasetInfoCache,
        canonicalTool
      )
      payload.detailEntries = await appendProcessedDataEntry(
        payload.detailEntries,
        realContext,
        caches.downloadLinkCache
      )

      const tool = payload.toolResults.find((item) => item.name === canonicalTool)
      if (!tool) {
        continue
      }

      sections.push(transformToDatasetSection(payload, tool, realContext))
    } catch {
      // 忽略单个数据集的错误，继续处理其他数据集
      continue
    }
  }

  if (isSimulationSupportedTool(canonicalTool)) {
    for (const [shape, combos] of Object.entries(SIM_FULL_COMBOS)) {
      const fullCombos = combos.full.map(([cells, genes]) => `${cells}*${genes}`)

      for (const size of fullCombos) {
        if (isCycleTool && !isCycleSimulationDatasetId(buildSimulationIdentifier(shape, size))) {
          continue
        }
        const simulationContext: DatasetContext = { type: 'simulation', shape, size }
        if (!isToolSupportedForDatasetContext(canonicalTool, simulationContext)) {
          continue
        }
        try {
          const payload = await buildDatasetResultForContext(
            simulationContext,
            configMap,
            caches.realDatasetInfoCache,
            canonicalTool
          )
          payload.detailEntries = await appendProcessedDataEntry(
            payload.detailEntries,
            simulationContext,
            caches.downloadLinkCache
          )

          const tool = payload.toolResults.find((item) => item.name === canonicalTool)
          if (!tool) {
            continue
          }

          sections.push(transformToDatasetSection(payload, tool, simulationContext))
        } catch {
          continue
        }
      }
    }

    for (const dataset of DATASET_ID_SIMULATION_DATASETS) {
      if (isCycleTool && !isCycleSimulationDatasetId(dataset.id)) {
        continue
      }
      const shapeLabel = topologyKeyToLabel(dataset.topologyKey)
      const size =
        typeof dataset.cells === 'number' && typeof dataset.genes === 'number'
          ? `${dataset.cells}*${dataset.genes}`
          : undefined
      const simulationContext: DatasetContext = {
        type: 'simulation',
        shape: shapeLabel,
        ...(size !== undefined ? { size } : {}),
        id: dataset.id
      }
      if (!isToolSupportedForDatasetContext(canonicalTool, simulationContext)) {
        continue
      }

      try {
        const payload = await buildDatasetResultForContext(
          simulationContext,
          configMap,
          caches.realDatasetInfoCache,
          canonicalTool
        )
        payload.detailEntries = await appendProcessedDataEntry(
          payload.detailEntries,
          simulationContext,
          caches.downloadLinkCache
        )

        const tool = payload.toolResults.find((item) => item.name === canonicalTool)
        if (!tool) {
          continue
        }

        sections.push(transformToDatasetSection(payload, tool, simulationContext))
      } catch {
        continue
      }
    }
  }

  return {
    sections,
    metadata
  }
}

async function fetchTimedCsvMap<T>(
  cacheRef: Ref<TimedCsvCacheState<Map<string, T>>>,
  endpoint: string,
  getKey: (record: Record<string, string>) => string,
  logLabel: string,
  mapValue?: (record: Record<string, string>) => T
): Promise<Map<string, T> | null> {
  const now = Date.now()
  const cacheState = cacheRef.value

  if (cacheState.value && now - cacheState.fetchedAt < STATIC_CSV_CACHE_TTL_MS) {
    return cacheState.value
  }

  if (cacheState.pendingRequest) {
    return cacheState.pendingRequest
  }

  if (now < cacheState.retryAfter) {
    return cacheState.value
  }

  const pendingRequest = axios
    .get<string>(buildStaticCsvRequestUrl(endpoint, now), { responseType: 'text' })
    .then((response) => {
      const records = csvTextToObjects(response.data)
      const map = new Map<string, T>()

      records.forEach((record) => {
        const key = getKey(record).trim()
        if (!key) {
          return
        }
        map.set(key, mapValue ? mapValue(record) : (record as T))
      })

      cacheRef.value = {
        value: map,
        fetchedAt: Date.now(),
        retryAfter: 0,
        pendingRequest: null
      }

      return map
    })
    .catch((error) => {
      console.warn(`[useResultsData] failed to load ${logLabel} CSV`, error)
      cacheRef.value = {
        value: cacheState.value,
        fetchedAt: cacheState.fetchedAt,
        retryAfter: Date.now() + STATIC_CSV_RETRY_COOLDOWN_MS,
        pendingRequest: null
      }
      return cacheState.value
    })

  cacheRef.value = {
    ...cacheState,
    pendingRequest
  }

  return pendingRequest
}

async function fetchRealDatasetInfoMap(
  cacheRef: Ref<TimedCsvCacheState<Map<string, Record<string, string>>>>
): Promise<Map<string, Record<string, string>> | null> {
  const map = await fetchTimedCsvMap(
    cacheRef,
    API_ENDPOINTS.REALDATA_INFO,
    (record: Record<string, string>) => (record['No.'] ?? '').toString().trim(),
    'real dataset info'
  )

  return map
}

async function fetchToolMetadata(
  toolName: string,
  cacheRef: Ref<TimedCsvCacheState<Map<string, ToolMetadata>>>
): Promise<ToolMetadata | null> {
  const resolvedName = getUsabilityMethodName(toolName)
  const cached = cacheRef.value.value?.get(resolvedName.toLowerCase()) ?? null
  if (cached) {
    return cached
  }

  const metadataMap = await fetchTimedCsvMap(
    cacheRef,
    API_ENDPOINTS.TOOL_LIST,
    (record) => ((record['Tool name'] ?? '') as string).trim().toLowerCase(),
    'tool metadata',
    (record) => ({
      toolName: ((record['Tool name'] ?? '') as string).trim(),
      paperTitle: (record.Paper ?? '').trim(),
      paperLink: buildPublicationLink(record.Link),
      pmid: (record.PMID ?? '').trim() || null,
      pmidLink: buildPublicationLink(record.PMID),
      journal: (record.Journal ?? '').trim() || null,
      year: (record.Year ?? '').trim() || null,
      platform: (record.Platform ?? '').trim() || null,
      deepLearning: (record['Deep learning'] ?? '').trim() || null
    })
  )

  return metadataMap?.get(resolvedName.toLowerCase()) ?? null
}

interface DownloadLinkRecord {
  dataset_type?: string
  dataset_key?: string
  download_url?: string
  [key: string]: string | undefined
}

interface TimedCsvCacheState<T> {
  value: T | null
  fetchedAt: number
  retryAfter: number
  pendingRequest: Promise<T | null> | null
}

const STATIC_CSV_RETRY_COOLDOWN_MS = 15 * 1000

function buildDownloadLookupKey(datasetType: 'real' | 'simulation', datasetKey: string): string {
  return `${datasetType}|${datasetKey}`
}

function resolveDownloadDatasetKey(dataset: DatasetContext): string | null {
  if (dataset.type === 'real') {
    return dataset.id?.trim() || null
  }

  if (dataset.id?.trim()) {
    return dataset.id.trim()
  }

  if (!dataset.shape || !dataset.size) {
    return null
  }

  return buildSimulationIdentifier(dataset.shape, dataset.size)
}

async function fetchDownloadLinkMap(
  cacheRef: Ref<TimedCsvCacheState<Map<string, string>>>
): Promise<Map<string, string> | null> {
  const now = Date.now()
  const cacheState = cacheRef.value

  if (cacheState.value && now - cacheState.fetchedAt < STATIC_CSV_CACHE_TTL_MS) {
    return cacheState.value
  }

  if (cacheState.pendingRequest) {
    return cacheState.pendingRequest
  }

  if (now < cacheState.retryAfter) {
    return cacheState.value
  }

  const pendingRequest = axios
    .get<string>(buildStaticCsvRequestUrl(API_ENDPOINTS.DOWNLOAD_LINK, now), { responseType: 'text' })
    .then((response) => {
      const records = csvTextToObjects<DownloadLinkRecord>(response.data)
      const map = new Map<string, string>()

      records.forEach((record) => {
        const datasetType = (record.dataset_type ?? '').trim()
        const datasetKey = (record.dataset_key ?? '').trim()
        if ((datasetType !== 'real' && datasetType !== 'simulation') || !datasetKey) {
          return
        }
        map.set(buildDownloadLookupKey(datasetType, datasetKey), normalizeUrl(record.download_url) ?? '')
      })

      cacheRef.value = {
        value: map,
        fetchedAt: Date.now(),
        retryAfter: 0,
        pendingRequest: null
      }

      return map
    })
    .catch((error) => {
      console.warn('[useResultsData] failed to load download link CSV', error)
      cacheRef.value = {
        value: cacheState.value,
        fetchedAt: cacheState.fetchedAt,
        retryAfter: Date.now() + STATIC_CSV_RETRY_COOLDOWN_MS,
        pendingRequest: null
      }
      return cacheState.value
    })

  cacheRef.value = {
    ...cacheState,
    pendingRequest
  }

  return pendingRequest
}

async function appendProcessedDataEntry(
  entries: DatasetDetailEntry[],
  dataset: DatasetContext,
  cacheRef: Ref<TimedCsvCacheState<Map<string, string>>>
): Promise<DatasetDetailEntry[]> {
  const datasetKey = resolveDownloadDatasetKey(dataset)
  if (!datasetKey) {
    return entries
  }

  const linkMap = await fetchDownloadLinkMap(cacheRef)
  if (!linkMap) {
    return entries
  }

  const lookupKey = buildDownloadLookupKey(dataset.type, datasetKey)
  if (!linkMap.has(lookupKey)) {
    return entries
  }

  const downloadUrl = linkMap.get(lookupKey) ?? ''
  const processedEntry: DatasetDetailEntry = {
    key: 'Processed data',
    label: 'Resource',
    value: downloadUrl ? 'Download resource' : 'Resource not configured',
    isLong: false,
    type: 'text',
    link: downloadUrl || null,
    tooltip: downloadUrl ? null : 'Link unavailable.'
  }

  const accessionIndex = entries.findIndex((entry) => entry.key === 'Accession ID/Link')
  if (accessionIndex === -1) {
    return [...entries, processedEntry]
  }

  return [
    ...entries.slice(0, accessionIndex + 1),
    processedEntry,
    ...entries.slice(accessionIndex + 1)
  ]
}

function buildDetailEntries(detail: Record<string, string>, fallbackLabel: string): DatasetDetailEntry[] {
  return datasetInfoFieldOrder.map(({ key, label }) => {
    const rawValue = detail?.[key]
    const value =
      rawValue === undefined || rawValue === null || String(rawValue).trim() === '' ? 'NA' : String(rawValue)

    const link =
      key === 'Accession ID/Link'
        ? buildAccessionLink(value)
        : key === 'PMID/DOI'
          ? buildPublicationLink(value)
          : null

    const entry: DatasetDetailEntry = {
      key,
      label,
      value,
      isLong: LONG_TEXT_FIELDS.has(key),
      type: 'text',
      link,
      links: key === 'Accession ID/Link' ? buildAccessionSegments(value) : null
    }

    if (entry.key === 'Label' && entry.value === 'NA') {
      return { ...entry, value: fallbackLabel }
    }

    return entry
  })
}

export function buildSimulationGroundtruthEntry(
  identifierSlug: string,
  shapeLabel: string,
  size: string | undefined
): DatasetDetailEntry | null {
  const label = 'Reference image'
  const simulationDataset = identifierSlug ? findSimulationDatasetById(identifierSlug) : undefined

  if (simulationDataset && simulationDataset.hasGroundtruthStream === false) {
    return null
  }

  const normalizedSize = size || ''
  const globalUnavailable = normalizedSize && GROUNDTRUTH_STREAM_GLOBAL_UNAVAILABLE.has(normalizedSize)
  if (globalUnavailable) {
    return {
      key: 'groundtruth-stream',
      label,
      value: '',
      isLong: false,
      type: 'message',
      message: 'A reference image is not available for this example.',
      messageType: 'muted',
      messageDisplay: 'placeholder'
    }
  }

  if (!identifierSlug) {
    return {
      key: 'groundtruth-stream',
      label,
      value: '',
      isLong: false,
      type: 'message',
      message: 'A reference image has not been added for this dataset.',
      messageType: 'muted',
      messageDisplay: 'placeholder'
    }
  }

  const imageUrl = configuredResultImage(resolveBenchmarkImageAsset(
    `images/velocity_result/${getBenchmarkModality(identifierSlug, 'simulation') === 'ATAC' ? 'atac_groundtruthstream' : 'groundtruthstream'}/${identifierSlug}_groundtruthstream.png`
  ))
  if (!imageUrl) {
    return {
      key: 'groundtruth-stream', label, value: '', isLong: false, type: 'message',
      message: 'A reference image has not been added for this dataset.',
      messageType: 'muted', messageDisplay: 'placeholder'
    }
  }
  return {
    key: 'groundtruth-stream', label, value: '', isLong: false,
    type: 'image', imageUrl, imageAlt: `${shapeLabel} reference image`
  }
}

export function buildToolResultsForContext(
  context: DatasetContext,
  configMap: Record<string, ToolNoResultConfig>,
  simulationMode: 'full' | 'efficiency-only' | null,
  targetTool?: string
): DatasetTool[] {
  if (context.type === 'real' && !REAL_RESULT_DATASET_ID_SET.has(context.id ?? '')) {
    return []
  }

  const isSimulation = context.type === 'simulation'
  const datasetIdentifier = isSimulation
    ? (context.id ? context.id.trim() : '') || buildSimulationIdentifier(context.shape ?? '', context.size ?? '')
    : context.id ?? 'unknown'

  const metricsOrder = isSimulation
    ? [...GENERAL_METRICS_ORDER, ...SIMULATION_METRICS_ORDER]
    : [...GENERAL_METRICS_ORDER]
  const isSpatialDataset = getBenchmarkModality(datasetIdentifier, context.type) === 'SPATIAL'
  const isMultiModalRealDataset =
    context.type === 'real' && Boolean(context.id) && MULTI_MODAL_REAL_DATASET_ID_SET.has(context.id!)

  const toolDefinitionsBase = (isSimulation
    ? TOOL_DEFINITIONS.filter(({ name }) => isSimulationSupportedTool(name) && isToolInSimulationModality(name, datasetIdentifier))
    : TOOL_DEFINITIONS
  ).filter(({ name }) => hasPublishedToolResults(name))

  const toolDefinitions = toolDefinitionsBase
    .filter(({ name }) => isToolSupportedForDatasetContext(name, context))
    .filter(({ name }) => !CYCLE_INFERENCE_TOOL_SET.has(name) || isCycleDatasetContext(context))
    .filter(({ name }) => {
      if (!isMultiModalRealDataset || !context.id) return true
      const allowedDatasets = MULTI_MODAL_REAL_DATASET_TOOL_SUPPORT[name]
      return Array.isArray(allowedDatasets) && allowedDatasets.includes(context.id)
    })

  const filteredDefinitions = targetTool
    ? toolDefinitions.filter(({ name }) => name === targetTool)
    : toolDefinitions

  const orderedDefinitions = [
    ...toolCategories.flatMap((category) =>
      filteredDefinitions.filter((tool) => tool.category === category)
    ),
    ...filteredDefinitions.filter((tool) => !toolCategories.includes(tool.category))
  ]

  const definitionsForRender = orderedDefinitions.length ? orderedDefinitions : filteredDefinitions

  return definitionsForRender.flatMap(({ name: toolName, category, displayName }) => {
    const publicToolName = displayName ?? getToolPublicName(toolName)
    const restrictedRealIdSet = METHOD_TOOL_REAL_DATASET_WHITELIST[toolName]
    const toolNote = null
    if (isSimulation && restrictedRealIdSet && !isSimulationSupportedTool(toolName)) {
      return []
    }

    const deliveredState = getBenchmarkCombinationState(toolName, datasetIdentifier, context.type)
    if (deliveredState === 'pending') return []
    const configKey = `${toolName}_${datasetIdentifier}`
    const config = deliveredState === 'ready' ? undefined : configMap[configKey]

    const missingConfig: ToolMissingConfig = config?.missing ?? {}
    const velocityMissing = normalizeVelocityMissingConfig(missingConfig.velocity)
    const metricsMissing = normalizeMetricsMissingConfig(missingConfig.metrics)

    const tool: DatasetTool = {
      name: toolName,
      displayName: publicToolName,
      category,
      description: TOOL_DESCRIPTIONS[toolName] || `Analysis results from ${publicToolName}`,
      note: toolNote,
      velocityResults: [],
      metricsResults: [],
      velocitySectionPlaceholder: null,
      metricsSectionPlaceholder: null,
      velocityPlaceholder: null,
      noResultTitle: null,
      noResultReason: null,
      noResultDetail: null
    }

    if (deliveredState === 'unable_to_compute') {
      tool.noResultReason = 'Unable to compute'
      return [tool]
    }

    if (config && config.type === 'full') {
      tool.noResultReason = config.reason
      return [tool]
    }

    if (isSimulation && simulationMode === 'efficiency-only' && !CYCLE_INFERENCE_TOOL_SET.has(toolName)) {
      tool.velocitySectionPlaceholder = createPlaceholder(
        'velocity',
        { mode: 'metric', message: 'Result images are not available for this example.' },
        'metric'
      )
      tool.velocityResults = []
    } else if (velocityMissing.section) {
      tool.velocitySectionPlaceholder = createPlaceholder('velocity', velocityMissing.section, 'compute')
      tool.velocityResults = []
    } else {
      const defaultRoles = VELOCITY_TYPES.map(({ key }) => key)
      tool.velocityResults = getResultPlotRoles(toolName, defaultRoles).map((key) => {
        const label = VELOCITY_TYPES.find((type) => type.key === key)?.label ?? key
        const resolvedLabel = key === 'cell_map'
          ? 'Figure A'
          : resolveVelocityDisplayLabel(label, datasetIdentifier, key, isSimulation)



        const figureState = getBenchmarkFigureState(toolName, datasetIdentifier, context.type, key === 'cell_map' ? 'umap' : key)
        const itemSpec = figureState === 'ready' ? null
          : velocityMissing.items.get(key) ||
            (key === 'cell_map' ? velocityMissing.items.get('umap') : null) ||
            velocityMissing.defaultItem
        const hasItemSpec = Boolean(itemSpec)
        const imagePath = configuredResultImage(buildVelocityImagePath(toolName, datasetIdentifier, key, isSimulation))

        let placeholder: PlaceholderDisplay | null = null
        let status: ResultStatus = 'idle'
        let predetermined = false

        if (figureState && figureState !== 'ready') {
          const mode: PlaceholderMode = figureState === 'pending' ? 'pending' : figureState === 'not_applicable' ? 'metric' : 'compute'
          placeholder = createPlaceholder('velocity', { mode }, mode)
          status = mode
          predetermined = true
        } else if (hasItemSpec) {
          const created = createPlaceholder('velocity', itemSpec, 'upload')
          placeholder = created
          status = created.mode
          predetermined = true
        } else if (!imagePath) {
          placeholder = createPlaceholder('velocity', { mode: 'upload' }, 'upload')
          status = 'upload'
          predetermined = true
        }

        return {
          type: key,
          label: resolvedLabel,
          imageUrl: imagePath,
          placeholder,
          status,
          predetermined
        }
      })
    }

    tool.velocityPlaceholder = evaluateSectionPlaceholder(
      tool.velocityResults,
      tool.velocitySectionPlaceholder,
      'velocity'
    )

    if (excludesMetricResults(toolName)) return [tool]

    tool.metricsSectionPlaceholder = metricsMissing.section
      ? createPlaceholder('metrics', metricsMissing.section, 'compute')
      : null

    const applicableMetrics = metricsOrder.filter((metricName) => {
      if (metricName === 'Usability' && !USABILITY_METHOD_NAMES.includes(getUsabilityMethodName(toolName))) return false
      if ((metricName === 'Running time' || metricName === 'Memory efficiency') && !normalizeEfficiencyToolName(toolName)) return false
      return isMetricApplicable(metricName, datasetIdentifier, isSimulation ? 'simulated' : 'real')
    })

    const filteredMetrics =
      simulationMode === 'efficiency-only'
        ? applicableMetrics.filter((metric) => metric === 'Running time' || metric === 'Memory efficiency')
        : applicableMetrics

    tool.metricsResults = filteredMetrics
      .map((categoryName) => {
        if (categoryName === 'Usability') {
          return {
            category: categoryName,
            images: [],
            placeholder: null
          }
        }

        const datasetType = isSimulation ? 'simulated' : 'real'
        const usesAggregateMetricImage = categoryName === 'Consistency score'
        // 结果页展示 Consistency score 总图；工具明细图的状态仅用于指标专题页。
        const missingCheck = isMetricMissing(categoryName, toolName, datasetIdentifier, datasetType)

        if (missingCheck.missing && missingCheck.reason) {
          const mode: PlaceholderMode = missingCheck.reason === 'Unable to compute' ? 'compute' : missingCheck.reason === 'Pending' ? 'pending' : 'metric'
          return {
            category: categoryName as MetricCategory,
            images: [],
            placeholder: createPlaceholder('metrics', {
              mode,
              message: missingCheck.reason,
              reason: mode === 'metric'
                ? getDatasetMetricNotApplicableReason(categoryName, datasetIdentifier, isSimulation ? 'simulation' : 'real')
                : null
            }, mode)
          }
        }

        const metricShortName =
          getMetricShortNames(categoryName)[0] ?? categoryName.toLowerCase().replace(/\s+/g, '_')
        const itemKey = metricShortName.toLowerCase().replace(/\s+/g, '_')
        const categorySpec =
          metricsMissing.categories.get(categoryName)?.items.get(itemKey) ??
          metricsMissing.categories.get(categoryName)?.defaultItem ??
          metricsMissing.defaultItem
        const generatedPath = usesAggregateMetricImage
          ? buildAggregateMetricPath(categoryName, datasetIdentifier, isSimulation)
          : buildMetricImagePath(categoryName, toolName, datasetIdentifier, isSimulation)
        const imageUrl = configuredResultImage(generatedPath)
        const imagePlaceholder = categorySpec ? parseMissingSpec(categorySpec, 'upload')
          : imageUrl ? null : createPlaceholder('metrics', { mode: 'upload' }, 'upload')
        const predetermined = Boolean(categorySpec) || !imageUrl
        const status: ResultStatus =
          predetermined && imagePlaceholder ? imagePlaceholder.mode : 'idle'

        return {
          category: categoryName as MetricCategory,
          images: [
            {
              name: categoryName,
              shortName: metricShortName,
              imageUrl,
              placeholder: imagePlaceholder,
              status,
              predetermined
            }
          ],
          placeholder: null
        }
      })

    if (isSpatialDataset) tool.metricsResults.push(...buildSpatialMetricsResults(isSimulation))
    return [tool]
  })
}

function transformToDatasetSection(
  payload: DatasetDataPayload,
  tool: DatasetTool,
  context: DatasetContext
): DatasetSection {
  const simulationIdentifier =
    context.type === 'simulation'
      ? (context.id ? context.id.trim() : '') ||
        buildSimulationIdentifier(context.shape ?? '', context.size ?? '')
      : ''
  const keyBase =
    context.type === 'real'
      ? `real-${context.id}`
      : `simulation-${simulationIdentifier}`
  const navigationLabel = context.type === 'real'
    ? getRealDatasetLabel(context.id ?? '')
    : resolveSimulationNavigationLabel(context)

  let simulation: DatasetSection['simulation']
  if (context.type === 'simulation') {
    const sizeKey = context.size ?? ''
    const [cells = '', genes = ''] = sizeKey.split('*')
    simulation = {
      shape: context.shape ?? '',
      shapeKey: normalizeSimulationShapeKey(context.shape ?? ''),
      cells,
      genes,
      sizeKey,
      simulationMode: payload.simulationMode ?? 'full',
      ...(context.id ? { additionalId: context.id.trim() } : {})
    }
  }

  return {
    key: keyBase,
    anchorId: keyBase,
    type: context.type,
    title: payload.title,
    navigationLabel,
    noResultReason: tool.noResultReason,
    noResultDetail: tool.noResultDetail,
    metadataEntries: payload.detailEntries,
    velocityResults: tool.velocityResults,
    velocityPlaceholder: tool.velocityPlaceholder,
    metrics: tool.metricsResults,
    ...(simulation ? { simulation } : {})
  }
}

function normalizeVelocityMissingConfig(rawConfig: unknown): NormalizedVelocityMissing {
  if (!rawConfig) {
    return {
      section: null,
      defaultItem: null,
      items: new Map<string, NormalizedMissingSpec | null>()
    }
  }

  if (
    typeof rawConfig === 'string' ||
    (typeof rawConfig === 'object' &&
      rawConfig !== null &&
      !(rawConfig as Record<string, unknown>).items &&
      !(rawConfig as Record<string, unknown>).section &&
      !(rawConfig as Record<string, unknown>).default)
  ) {
    const spec = parseMissingSpec(rawConfig, 'compute')
    return {
      section: spec,
      defaultItem: null,
      items: new Map<string, NormalizedMissingSpec | null>()
    }
  }

  const record = rawConfig as Record<string, unknown>
  const section = parseMissingSpec(record.section, 'compute')
  const defaultItem = parseMissingSpec(record.default, 'compute')
  const items = new Map<string, NormalizedMissingSpec | null>()

  if (record.items) {
    Object.entries(record.items as Record<string, unknown>).forEach(([key, value]) => {
      items.set(key, parseMissingSpec(value, 'compute'))
    })
  }

  return {
    section,
    defaultItem,
    items
  }
}

function normalizeMetricsMissingConfig(rawConfig: unknown): NormalizedMetricsMissing {
  if (!rawConfig) {
    return {
      section: null,
      defaultItem: null,
      categories: new Map<string, NormalizedMetricsCategory>()
    }
  }

  const record = rawConfig as Record<string, unknown>
  const section = parseMissingSpec(record.section, 'compute')
  const defaultItem = parseMissingSpec(record.default, 'compute')
  const categories = new Map<string, NormalizedMetricsCategory>()

  if (record.categories) {
    Object.entries(record.categories as Record<string, unknown>).forEach(([categoryName, categoryValue]) => {
      const categorySection = parseMissingSpec((categoryValue as Record<string, unknown>).section, 'compute')
      const categoryDefaultItem = parseMissingSpec((categoryValue as Record<string, unknown>).default, 'compute')
      const items = new Map<string, NormalizedMissingSpec | null>()
      const rawItems = ((categoryValue as Record<string, unknown>).items as Record<string, unknown>) ?? {}
      Object.entries(rawItems).forEach(([itemKey, itemValue]) => {
        items.set(itemKey, parseMissingSpec(itemValue, 'compute'))
      })
      categories.set(categoryName, {
        section: categorySection,
        defaultItem: categoryDefaultItem,
        items
      })
    })
  }

  return {
    section,
    defaultItem,
    categories
  }
}
