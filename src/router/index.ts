/**
 * Vue Router 配置文件
 * 使用 Hash 模式路由，所有路由路径和名称从 constants/routes.ts 引入
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw, type RouterScrollBehavior } from 'vue-router'
import { watchEffect } from 'vue'
import { getPageTitle } from './pageTitle'

import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes'
import HomeView from '@/views/HomeView.vue'
import {
  isValidRealDatasetId,
  validateSimulationDatasetContext,
  isValidSimulationId,
  isValidToolName
} from '@/utils/route-validators'
import { getToolPublicName, getUsabilityMethodName, resolveToolName, USABILITY_METHOD_NAMES } from '@/constants/tools'
import {
  getDatasetResultScopes,
  getToolResultScopes,
  isResultScopeSupported,
  parseResultScope
} from '@/constants/result-scope'
import { buildSimulationIdentifier } from '@/utils/formatters'
import { findSimulationDatasetById, TOPOLOGY_KEYS } from '@/constants/simulation'

const USABILITY_VALID_TOOLS_SET = new Set<string>(USABILITY_METHOD_NAMES)
const USABILITY_ALLOWED_QUERY_KEYS = new Set<string>(['tool', 'autoScroll'])

const getQueryString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined
}

const buildUsabilityQuery = (tool?: string, autoScroll?: string) => {
  const query: Record<string, string> = {}
  if (tool) {
    query.tool = tool
  }
  if (tool && autoScroll) {
    query.autoScroll = autoScroll
  }
  return query
}

const isSameQueryShape = (left: Record<string, unknown>, right: Record<string, string>) => {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return rightKeys.every((key) => left[key] === right[key])
}

const getNotFoundRedirect = () => {
  return { name: 'NotFound', replace: true } as const
}

// 首页随入口加载，避免首屏串行请求；其他页面按需加载。
const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.HOME,
    name: ROUTE_NAMES.HOME,
    component: HomeView
  },
  {
    path: ROUTE_PATHS.TOOLS,
    name: ROUTE_NAMES.TOOLS,
    component: () => import('@/views/ToolsView.vue')
  },
  {
    path: ROUTE_PATHS.DATASET_RESULT,
    name: ROUTE_NAMES.DATASET_RESULT,
    component: () => import('@/views/DatasetResult.vue')
  },
  {
    path: ROUTE_PATHS.METHOD_RESULT,
    name: ROUTE_NAMES.METHOD_RESULT,
    component: () => import('@/views/MethodResult.vue')
  },

  // Measurement 路由：父路由包含所有指标子路由
  {
    path: ROUTE_PATHS.MEASUREMENT,
    name: ROUTE_NAMES.MEASUREMENT,
    component: () => import('@/views/MeasurementResult.vue'),
    redirect: ROUTE_PATHS.ICCOH,
    children: [
      // General Metrics 子路由（主路径）
      {
        path: 'general-metrics/metric-a',
        name: ROUTE_NAMES.ICCOH,
        component: () => import('@/views/measurements/ICCoh.vue')
      },
      {
        path: 'general-metrics/metric-b',
        name: ROUTE_NAMES.CBDIR,
        component: () => import('@/views/measurements/CBDir.vue')
      },
      {
        path: 'general-metrics/metric-c',
        name: ROUTE_NAMES.TRANSITION_SCORE,
        component: () => import('@/views/measurements/TransitionScore.vue')
      },
      {
        path: 'general-metrics/metric-d',
        name: ROUTE_NAMES.ANGLE_CONSISTENCY,
        component: () => import('@/views/measurements/AngleConsistency.vue')
      },
      {
        path: 'general-metrics/metric-e',
        name: ROUTE_NAMES.CONSISTENCY_SCORE,
        component: () => import('@/views/measurements/ConsistencyScore.vue')
      },
      {
        path: 'general-metrics/metric-f',
        name: ROUTE_NAMES.USABILITY,
        component: () => import('@/views/measurements/Usability.vue')
      },

      // Simulation-Specific Metrics 子路由
      {
        path: 'simulation/metric-g',
        name: ROUTE_NAMES.GROUND_TRUTH_CORRELATION,
        component: () => import('@/views/measurements/GroundTrueCorrelation.vue')
      },
      {
        path: 'simulation/metric-h',
        name: ROUTE_NAMES.RUNNING_TIME,
        component: () => import('@/views/measurements/RunningTime.vue')
      },
      {
        path: 'simulation/metric-i',
        name: ROUTE_NAMES.MEMORY_EFFICIENCY,
        component: () => import('@/views/measurements/MemoryEfficiency.vue')
      },
      {
        path: 'simulation/metric-j',
        name: ROUTE_NAMES.DOWN_SAMPLING,
        component: () => import('@/views/measurements/DownSampling.vue')
      },
      {
        path: 'simulation/metric-k',
        name: ROUTE_NAMES.BATCH_RUN,
        component: () => import('@/views/measurements/BatchRun.vue')
      }
    ]
  },

  {
    path: ROUTE_PATHS.ABOUT,
    name: ROUTE_NAMES.ABOUT,
    component: () => import('@/views/AboutView.vue')
  },
  {
    path: ROUTE_PATHS.DOWNLOAD,
    name: ROUTE_NAMES.DOWNLOAD,
    component: () => import('@/views/DownloadView.vue')
  },
  {
    path: ROUTE_PATHS.HELP,
    name: ROUTE_NAMES.HELP,
    component: () => import('@/views/Help.vue')
  },

  // 独立的 404 路由，便于在地址栏中保持 /404 路径
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  },
  // Catch-all：将所有未匹配路径重定向到 /404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

// 滚动行为：路由切换时不由 Vue Router 处理滚动（由 AppShell 统一处理）
const scrollBehavior: RouterScrollBehavior = () => {
  return false
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior
})

router.beforeEach(async (to) => {
  if (to.name === 'NotFound' || to.path === '/404') {
    return true
  }

  if (to.name === ROUTE_NAMES.DATASET_RESULT) {
    const type = getQueryString(to.query.type)
    const id = getQueryString(to.query.id)
    const shape = getQueryString(to.query.shape)
    const size = getQueryString(to.query.size)

    if (!type || (type !== 'real' && type !== 'simulation')) {
      return getNotFoundRedirect()
    }

    if (type === 'real') {
      if (!id || !isValidRealDatasetId(id)) {
        return getNotFoundRedirect()
      }
    }

    if (type === 'simulation') {
      const result = validateSimulationDatasetContext(shape, size, id)
      if (!result.valid || result.mode === 'efficiency-only') {
        return getNotFoundRedirect()
      }

      if (!isValidSimulationId(id)) {
        return getNotFoundRedirect()
      }
    }

    // Preserve bookmarks created while this scRNA simulation topology was mislabeled LINEAGE.
    if (type === 'simulation' && id && to.query.scope === 'LINEAGE' &&
      findSimulationDatasetById(id)?.topologyKey === TOPOLOGY_KEYS.LINEAGE_TRACING) {
      return {
        path: to.path,
        query: { ...to.query, scope: 'scRNA' },
        replace: true
      }
    }

    const scope = parseResultScope(to.query.scope)
    const datasetId = type === 'real' ? id : id || buildSimulationIdentifier(shape ?? '', size ?? '')
    if (!scope || !datasetId || !isResultScopeSupported(scope, getDatasetResultScopes(type, datasetId))) {
      return getNotFoundRedirect()
    }

    return true
  }

  if (to.name === ROUTE_NAMES.METHOD_RESULT) {
    const tool = getQueryString(to.query.tool)
    if (!tool || !isValidToolName(tool)) {
      return getNotFoundRedirect()
    }

    const resolvedTool = resolveToolName(tool)
    if (!resolvedTool) {
      return getNotFoundRedirect()
    }

    const scope = parseResultScope(to.query.scope)
    if (!scope || !isResultScopeSupported(scope, getToolResultScopes(resolvedTool))) {
      return getNotFoundRedirect()
    }

    const publicToolName = getToolPublicName(resolvedTool)
    if (tool !== publicToolName) {
      return {
        path: to.path,
        query: { ...to.query, tool: publicToolName },
        replace: true
      }
    }

    return true
  }

  if (to.name === ROUTE_NAMES.USABILITY) {
    const rawKeys = Object.keys(to.query)
    const toolKeyPresent = rawKeys.includes('tool')
    const toolParam = getQueryString(to.query.tool)
    const autoScrollParam = getQueryString(to.query.autoScroll)

    if (toolKeyPresent && !toolParam) {
      console.warn('Malformed tool query for Usability metric page.')
      return getNotFoundRedirect()
    }

    if (!toolParam) {
      const cleanedQuery = buildUsabilityQuery()
      if (!isSameQueryShape(to.query, cleanedQuery)) {
        return {
          path: to.path,
          query: cleanedQuery,
          replace: true
        }
      }
      return true
    }

    const normalizedTool = getUsabilityMethodName(toolParam)
    if (!USABILITY_VALID_TOOLS_SET.has(normalizedTool)) {
      console.warn(`Invalid tool for Usability metric page: ${toolParam}`)
      return getNotFoundRedirect()
    }

    const hasUnexpectedQueryKey = rawKeys.some((key) => !USABILITY_ALLOWED_QUERY_KEYS.has(key))
    const cleanedQuery = buildUsabilityQuery(normalizedTool, autoScrollParam)

    if (toolParam !== normalizedTool || hasUnexpectedQueryKey || !isSameQueryShape(to.query, cleanedQuery)) {
      return {
        path: to.path,
        query: cleanedQuery,
        replace: true
      }
    }

    return true
  }


  return true
})

watchEffect(() => {
  document.title = getPageTitle(router.currentRoute.value)
})

export default router
