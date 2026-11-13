import {
  normalizeEfficiencyToolName,
  parseDatasetIdToEfficiencyFilters,
  type EfficiencyScale,
  type EfficiencyToolName,
  type EfficiencyTopology
} from './efficiency-tools'
import { getToolPublicName, resolveToolName } from './tools'
import {
  GENERATED_SCALENE_BLOCKED_TOOLS,
  GENERATED_SCALENE_MANIFEST
} from './generated/scalene-generated'
import { resolvePublicAsset } from '../utils/path'

export type ScaleneHotspotItem = {
  file: string
  label: string
  lineno: number
  cpuPercent: number
  peakMemoryMb: number
  gpuPeakMemoryMb: number
}

export type ScaleneHotspotFile = {
  file: string
  cpuPercent: number
  peakMemoryMb: number
  gpuPeakMemoryMb: number
}

export type ScaleneDatasetSummary = {
  reportType: 'scalene-profile'
  id: string
  title: string
  scaleneWallTimeSec: number
  maxFootprintMb: number
  hasGpuMetrics: boolean
  maxGpuPeakMemoryMb: number
  selfContainedHtml: boolean
  topFiles: ScaleneHotspotFile[]
  topCpuFunctions: ScaleneHotspotItem[]
  topMemoryLines: ScaleneHotspotItem[]
  topGpuLines: ScaleneHotspotItem[]
  rawHtmlPath: string
  rawJsonPath: string
}

export type ManualLogTimelinePoint = {
  timestamp: string
  block: string
  elapsedSec: number | null
  runtimeSec: number | null
  hangSec: number | null
  cpuValue: number | null
  cpuMetric: string
  memoryMb: number | null
  gpuMb: number | null
}

export type ManualLogPeakPoint = {
  value: number
  block: string
  timestamp: string
  runtimeSec: number | null
  metric?: string
}

export type ManualLogResourceSummary = {
  sampleCount: number
  timeline: ManualLogTimelinePoint[]
  firstTimestamp: string
  lastTimestamp: string
  totalRuntimeSec: number | null
  lastBlock: string
  cpuMetric: string
  gpuMetric: string | null
  peakCpu: ManualLogPeakPoint | null
  peakMemory: ManualLogPeakPoint | null
  peakGpu: ManualLogPeakPoint | null
  hasGpuMetrics: boolean
}

export type ManualLogStageSummary = {
  stage: string
  source: string
  startedAt: string
  endedAt: string
  durationSec: number | null
}

export type ManualLogBlockSummary = {
  stageCount: number
  stages: ManualLogStageSummary[]
  longestStage: ManualLogStageSummary | null
}

export type ManualLogCrashSection = {
  heading: string
  lines: string[]
}

export type ManualLogCrashSummary = {
  status: 'completed' | 'resource-limit'
  headline: string
  lastBlock: string
  runtimeSec: number | null
  hangSec: number | null
  stack: string
  sections: ManualLogCrashSection[]
  snippet: string[]
}

export type ManualLogDatasetSummary = {
  reportType: 'manual-log'
  id: string
  title: string
  status: ManualLogCrashSummary['status']
  statusHeadline: string
  totalRuntimeSec: number | null
  peakMemoryMb: number
  hasGpuMetrics: boolean
  peakGpuMb: number
  lastBlock: string
  resourceSummary: ManualLogResourceSummary
  blockSummary: ManualLogBlockSummary
  crashSummary: ManualLogCrashSummary
}

export type ScaleneReportPageData = {
  id: string
  tool: string
  toolLabel: string
  dataType: string
  dataTypeLabel: string
  title: string
  description: string
  datasets: ScaleneDatasetSummary[]
}

export type ManualLogReportPageData = Omit<ScaleneReportPageData, 'datasets'> & {
  datasets: ManualLogDatasetSummary[]
}

export type ScaleneDatasetManifest = Omit<
  ScaleneDatasetSummary,
  'topFiles' | 'topCpuFunctions' | 'topMemoryLines' | 'topGpuLines'
>

export type ManualLogDatasetManifest = Omit<
  ManualLogDatasetSummary,
  'resourceSummary' | 'blockSummary' | 'crashSummary'
>

export type ScaleneReportManifestData = Omit<ScaleneReportPageData, 'datasets'> & {
  reportType: 'scalene-profile'
  shardPath: string
  datasets: ScaleneDatasetManifest[]
}

export type ManualLogReportManifestData = Omit<ManualLogReportPageData, 'datasets'> & {
  reportType: 'manual-log'
  shardPath: string
  datasets: ManualLogDatasetManifest[]
}

type GeneratedScaleneReportPageData = ScaleneReportPageData | ManualLogReportPageData
type GeneratedScaleneReportManifestData = ScaleneReportManifestData | ManualLogReportManifestData
type RawGeneratedScaleneReportPageData = Omit<GeneratedScaleneReportPageData, 'toolLabel' | 'title' | 'description'>
type RawGeneratedScaleneReportManifestData = Omit<GeneratedScaleneReportManifestData, 'toolLabel' | 'title' | 'description'>

export type ScaleneAnalysisReportSummary = GeneratedScaleneReportManifestData
export type ScaleneAnalysisReportPageData = GeneratedScaleneReportPageData
export type ScaleneAnalysisReportKind = GeneratedScaleneReportManifestData['reportType']

export type ScaleneEntryMatchMode = 'extra-large' | 'missing-only'

export type ScaleneEfficiencyEntryConfig = {
  tool: EfficiencyToolName
  scale: EfficiencyScale
  topology: EfficiencyTopology | null
  reportTool: string
  reportDataType: string
  datasets: string[]
  matchMode: ScaleneEntryMatchMode
}

export type ResolvedScaleneEfficiencyEntry = {
  tool: EfficiencyToolName
  toolLabel: string
  reportTool: string
  reportDataType: string
  reportKind: ScaleneAnalysisReportKind
  datasetIds: string[]
  matchedDatasetIds: string[]
  matchMode: ScaleneEntryMatchMode
}

function normalizeScalenePolicyToolName(tool: string): string {
  const resolved = resolveToolName(tool)
  return resolved ?? tool.trim()
}

const RAW_SCALENE_BLOCKED_TOOLS = GENERATED_SCALENE_BLOCKED_TOOLS as readonly string[]

const SCALENE_BLOCKED_TOOL_SET = new Set<string>(
  RAW_SCALENE_BLOCKED_TOOLS.map((tool) => normalizeScalenePolicyToolName(tool))
)

export const SCALENE_BLOCKED_TOOLS: readonly string[] = Array.from(SCALENE_BLOCKED_TOOL_SET)

export function isScaleneEfficiencyToolSupported(tool: EfficiencyToolName): boolean {
  return !SCALENE_BLOCKED_TOOL_SET.has(tool)
}

function buildScaleneReportTitle(toolLabel: string, dataScopeLabel: string): string {
  return `Scalene results: ${toolLabel} on ${dataScopeLabel} datasets`
}

function formatScaleneTitleScopeLabel(report: Pick<ScaleneReportPageData, 'dataType' | 'dataTypeLabel'>): string {
  return report.dataType === 'extra-large' ? 'extra-large' : report.dataTypeLabel
}

function buildScaleneReportDescription(toolLabel: string, dataTypeLabel: string): string {
  return `This page presents the Scalene analysis summaries and raw reports for ${toolLabel} on ${dataTypeLabel} simulated datasets.`
}

const RAW_SCALENE_MANIFEST = GENERATED_SCALENE_MANIFEST as unknown as {
  defaultReport?: {
    tool: string
    dataType: string
    datasetId: string
  } | null
  reports?: readonly RawGeneratedScaleneReportManifestData[]
}

function isScaleneToolBlocked(tool: string | null | undefined): boolean {
  if (typeof tool !== 'string') return false
  const trimmed = tool.trim()
  if (!trimmed) return false
  return SCALENE_BLOCKED_TOOL_SET.has(normalizeScalenePolicyToolName(trimmed))
}

function isScaleneReportEnabled(report: Pick<GeneratedScaleneReportManifestData, 'tool'>): boolean {
  return !isScaleneToolBlocked(report.tool)
}

function buildResolvedReportDisplayFields(report: Pick<ScaleneReportPageData, 'tool' | 'dataType' | 'dataTypeLabel'>) {
  const toolLabel = getToolPublicName(report.tool)

  return {
    toolLabel,
    title: buildScaleneReportTitle(toolLabel, formatScaleneTitleScopeLabel(report)),
    description: buildScaleneReportDescription(toolLabel, report.dataTypeLabel)
  }
}

function resolveGeneratedReportSummary(report: RawGeneratedScaleneReportManifestData): GeneratedScaleneReportManifestData {
  return {
    ...report,
    ...buildResolvedReportDisplayFields(report)
  } as GeneratedScaleneReportManifestData
}

function resolveGeneratedReportPageData(report: RawGeneratedScaleneReportPageData): GeneratedScaleneReportPageData {
  return {
    ...report,
    ...buildResolvedReportDisplayFields(report)
  } as GeneratedScaleneReportPageData
}

const RAW_SCALENE_REPORTS = Array.isArray(RAW_SCALENE_MANIFEST.reports)
  ? RAW_SCALENE_MANIFEST.reports
  : []

const RESOLVED_REPORTS: GeneratedScaleneReportManifestData[] = RAW_SCALENE_REPORTS
  .filter(isScaleneReportEnabled)
  .map(resolveGeneratedReportSummary)

export const SCALENE_REPORTS: ScaleneReportManifestData[] = RESOLVED_REPORTS
  .filter((report): report is ScaleneReportManifestData => {
    return report.reportType === 'scalene-profile'
  })

export const MANUAL_LOG_REPORTS: ManualLogReportManifestData[] = RESOLVED_REPORTS
  .filter((report): report is ManualLogReportManifestData => {
    return report.reportType === 'manual-log'
  })

const ALL_SCALENE_ANALYSIS_REPORTS: ScaleneAnalysisReportSummary[] = RESOLVED_REPORTS

type ScaleneEfficiencyEntryInternalConfig = ScaleneEfficiencyEntryConfig & {
  reportKind: ScaleneAnalysisReportKind
}

export const SCALENE_EFFICIENCY_ENTRY_CONFIGS: ScaleneEfficiencyEntryInternalConfig[] = ALL_SCALENE_ANALYSIS_REPORTS.flatMap((report) => {
  const normalizedTool = normalizeScaleneToolName(report.tool)
  const efficiencyTool = normalizedTool ? normalizeEfficiencyToolName(normalizedTool) : null
  const firstDataset = report.datasets[0]
  const filters = firstDataset ? parseDatasetIdToEfficiencyFilters(firstDataset.id) : null

  if (!efficiencyTool || !firstDataset || !filters) return []
  if (!isScaleneEfficiencyToolSupported(efficiencyTool)) return []

  const reportKind = firstDataset.reportType

  return [{
    tool: efficiencyTool,
    scale: filters.scale,
    topology: filters.topology,
    reportTool: report.tool,
    reportDataType: report.dataType,
    reportKind,
    datasets: report.datasets.map((dataset) => dataset.id),
    matchMode: filters.scale === 'extra-large' ? 'extra-large' : 'missing-only'
  }]
})

export type ScaleneDatasetId = string

export function hasScaleneReports(): boolean {
  return SCALENE_REPORTS.length > 0
}

export function hasScaleneAnalysisReports(): boolean {
  return ALL_SCALENE_ANALYSIS_REPORTS.length > 0
}

export function getDefaultScaleneReport(): ScaleneAnalysisReportSummary | undefined {
  const defaultReport = RAW_SCALENE_MANIFEST.defaultReport
  if (defaultReport) {
    const matchedReport = getScaleneAnalysisReportByToolAndDataType(defaultReport.tool, defaultReport.dataType)
    if (matchedReport?.datasets.some((dataset) => dataset.id === defaultReport.datasetId)) {
      return matchedReport
    }
  }

  return ALL_SCALENE_ANALYSIS_REPORTS[0]
}

function normalizeScaleneToolName(tool: string | null | undefined): string | null {
  if (typeof tool !== 'string') return null
  const trimmed = tool.trim()
  if (!trimmed) return null

  const resolved = resolveToolName(trimmed)
  if (resolved) return resolved

  const matchedReport = ALL_SCALENE_ANALYSIS_REPORTS.find((report) => report.tool.toLowerCase() === trimmed.toLowerCase())
  return matchedReport?.tool ?? null
}

export function getScaleneReportByTool(tool: string | null | undefined): ScaleneReportManifestData | undefined {
  const normalizedTool = normalizeScaleneToolName(tool)
  if (!normalizedTool) return undefined
  return SCALENE_REPORTS.find((report) => report.tool === normalizedTool)
}

export function getScaleneAnalysisReportByToolAndDataType(
  tool: string | null | undefined,
  dataType: string | null | undefined
): ScaleneAnalysisReportSummary | undefined {
  const normalizedTool = normalizeScaleneToolName(tool)
  if (!normalizedTool || !dataType) return undefined
  return ALL_SCALENE_ANALYSIS_REPORTS.find((report) => report.tool === normalizedTool && report.dataType === dataType)
}

export function getScaleneReportByToolAndDataType(
  tool: string | null | undefined,
  dataType: string | null | undefined
): ScaleneReportManifestData | undefined {
  const normalizedTool = normalizeScaleneToolName(tool)
  if (!normalizedTool || !dataType) return undefined
  return SCALENE_REPORTS.find((report) => report.tool === normalizedTool && report.dataType === dataType)
}

export function getScaleneReportByToolAndDatasetId(
  tool: string | null | undefined,
  id: string | null | undefined
): ScaleneReportManifestData | undefined {
  const normalizedTool = normalizeScaleneToolName(tool)
  if (!normalizedTool || !id) return undefined
  return SCALENE_REPORTS.find((report) => {
    return report.tool === normalizedTool && report.datasets.some((dataset) => dataset.id === id)
  })
}

export function getScaleneDatasetByToolAndId(
  tool: string | null | undefined,
  id: string | null | undefined
): ScaleneDatasetManifest | undefined {
  if (!id) return undefined
  const report = getScaleneReportByToolAndDatasetId(tool, id)
  return report?.datasets.find((dataset) => dataset.id === id)
}

const SCALENE_REPORT_PAGE_CACHE = new Map<string, Promise<ScaleneAnalysisReportPageData>>()

function buildScaleneReportCacheKey(tool: string, dataType: string): string {
  return `${tool}__${dataType}`.toLowerCase()
}

export async function loadScaleneAnalysisReportPageData(
  tool: string | null | undefined,
  dataType: string | null | undefined
): Promise<ScaleneAnalysisReportPageData | null> {
  const report = getScaleneAnalysisReportByToolAndDataType(tool, dataType)
  if (!report) return null

  const cacheKey = buildScaleneReportCacheKey(report.tool, report.dataType)
  const cached = SCALENE_REPORT_PAGE_CACHE.get(cacheKey)
  if (cached) return cached

  const pending = fetch(resolvePublicAsset(report.shardPath))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Scalene report summary is temporarily unavailable.')
      }

      const payload = await response.json() as RawGeneratedScaleneReportPageData
      if (
        !payload
        || payload.tool !== report.tool
        || payload.dataType !== report.dataType
        || !Array.isArray(payload.datasets)
      ) {
        throw new Error('Scalene report summary is temporarily unavailable.')
      }

      return resolveGeneratedReportPageData(payload)
    })
    .catch((error) => {
      SCALENE_REPORT_PAGE_CACHE.delete(cacheKey)
      throw error
    })

  SCALENE_REPORT_PAGE_CACHE.set(cacheKey, pending)
  return pending
}

export function getScaleneEfficiencyEntries(options: {
  scale: EfficiencyScale | null
  topology: EfficiencyTopology | null
  selectedTools?: readonly EfficiencyToolName[] | null
}): ResolvedScaleneEfficiencyEntry[] {
  const { scale, topology, selectedTools } = options
  if (!scale) return []
  if (scale !== 'extra-large' && !topology) return []

  const selectedToolSet = Array.isArray(selectedTools) && selectedTools.length > 0
    ? new Set(selectedTools)
    : null

  return SCALENE_EFFICIENCY_ENTRY_CONFIGS.flatMap((config) => {
    if (config.scale !== scale) return []
    if (scale !== 'extra-large' && config.topology !== topology) return []
    if (selectedToolSet && !selectedToolSet.has(config.tool)) return []

    const report = getScaleneAnalysisReportByToolAndDataType(config.reportTool, config.reportDataType)
    if (!report) return []

    return [{
      tool: config.tool,
      toolLabel: getToolPublicName(config.tool),
      reportTool: report.tool,
      reportDataType: report.dataType,
      reportKind: config.reportKind,
      datasetIds: [...config.datasets],
      matchedDatasetIds: [...config.datasets],
      matchMode: config.matchMode
    }]
  })
}
