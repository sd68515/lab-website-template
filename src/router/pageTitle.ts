import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { MessageKey } from '@/locales/en'
import { ROUTE_NAMES } from '@/constants/routes'
import { getRealDatasetLabel } from '@/constants/datasets'
import { getResultScopeLabel } from '@/constants/catalogueLabels'
import { METRICS_METADATA } from '@/constants/metrics'
import { parseResultScope } from '@/constants/result-scope'
import { getToolPublicName } from '@/constants/tools'
import { buildSimulationIdentifier } from '@/utils/formatters'
import { displayText, text } from '@/utils/locale'

const PAGE_MESSAGES: Readonly<Record<string, MessageKey>> = {
  [ROUTE_NAMES.HOME]: 'common.home',
  [ROUTE_NAMES.TOOLS]: 'common.tools',
  [ROUTE_NAMES.DOWNLOAD]: 'common.download',
  [ROUTE_NAMES.HELP]: 'common.help',
  [ROUTE_NAMES.ABOUT]: 'common.contact',
  NotFound: 'notFound.404PageNotFound'
}

const stringValue = (value: unknown): string => typeof value === 'string' ? value : ''

export function getPageTitle(route: RouteLocationNormalizedLoaded): string {
  const parts: string[] = []
  if (route.name === ROUTE_NAMES.DATASET_RESULT || route.name === ROUTE_NAMES.METHOD_RESULT) {
    if (route.name === ROUTE_NAMES.DATASET_RESULT) {
      const id = stringValue(route.query.id)
      parts.push(route.query.type === 'real'
        ? getRealDatasetLabel(id)
        : id || buildSimulationIdentifier(stringValue(route.query.shape), stringValue(route.query.size)))
    } else {
      parts.push(getToolPublicName(stringValue(route.query.tool)))
    }
    const scope = parseResultScope(route.query.scope)
    parts.push(scope && scope !== 'all' ? getResultScopeLabel(scope) : text('pageTitle.allModalities'))
  } else if (route.name === ROUTE_NAMES.SCALENE_ANALYSIS || route.name === ROUTE_NAMES.SCALENE_REPORT_VIEWER) {
    parts.push(getToolPublicName(stringValue(route.params.tool)))
    parts.push(stringValue(route.params.dataset) || stringValue(route.params.dataType))
    parts.push(text(route.name === ROUTE_NAMES.SCALENE_ANALYSIS ? 'pageTitle.scaleneAnalysis' : 'pageTitle.scaleneReport'))
  } else {
    const canonicalPath = route.matched[route.matched.length - 1]?.path
    const metric = METRICS_METADATA.find(item => item.route === canonicalPath)
    if (metric) {
      if (route.name === ROUTE_NAMES.USABILITY && typeof route.query.tool === 'string') {
        parts.push(getToolPublicName(route.query.tool))
      }
      parts.push(displayText(metric.displayName ?? metric.name))
    } else {
      const message = typeof route.name === 'string' ? PAGE_MESSAGES[route.name] : undefined
      if (message) parts.push(text(message))
    }
  }
  return [...parts.filter(Boolean), text('appMenu.velocityBenchmarking')].join(' | ')
}
