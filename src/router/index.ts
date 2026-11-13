import { watch } from 'vue'
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useLocale } from '@/composables/useLocale'
import { datasets, methods, metrics } from '@/data/demo'
import { site } from '@/data/site'

// Route names are shared by navigation and links; stable sample IDs live in data/demo.ts.
// 路由名称供导航和链接共用；稳定的示例 ID 定义在 data/demo.ts。
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/methods', name: 'methods', component: () => import('@/views/CatalogView.vue') },
  { path: '/datasets/:datasetId', name: 'dataset-result', component: () => import('@/views/ResultView.vue'), props: { kind: 'dataset' } },
  { path: '/methods/:methodId', name: 'method-result', component: () => import('@/views/ResultView.vue'), props: { kind: 'method' } },
  { path: '/metrics/:metricId', name: 'metric', component: () => import('@/views/MetricView.vue') },
  { path: '/download', name: 'download', component: () => import('@/views/InfoView.vue'), props: { page: 'download' } },
  { path: '/help', name: 'help', component: () => import('@/views/InfoView.vue'), props: { page: 'help' } },
  { path: '/about', name: 'about', component: () => import('@/views/InfoView.vue'), props: { page: 'about' } },
  { path: '/404', name: 'not-found', component: () => import('@/views/NotFound.vue') },
  { path: '/:pathMatch(.*)*', redirect: { name: 'not-found' } }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  // Restore the previous position on Back; new pages start at the top.
  // 后退时恢复位置；进入新页面时回到顶部。
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return to.path !== from.path ? { top: 0 } : false
  }
})
router.beforeEach(to => {
  if (to.name === 'dataset-result' && !datasets.some(item => item.id === to.params.datasetId)) return { name: 'not-found' }
  if (to.name === 'method-result' && !methods.some(item => item.id === to.params.methodId)) return { name: 'not-found' }
  if (to.name === 'metric' && !metrics.some(item => item.id === to.params.metricId)) return { name: 'not-found' }
  return true
})

const { locale, t, localize } = useLocale()
watch([router.currentRoute, locale], ([route]) => {
  const labels: Record<string, string> = {
    home: t('Home', '首页'), methods: t('Methods', '方法'), download: t('Download', '下载'),
    help: t('Help', '帮助'), about: t('Contact', '联系'), 'not-found': t('Not found', '页面不存在'),
    'dataset-result': datasets.find(item => item.id === route.params.datasetId)?.name || t('Dataset', '数据集'),
    'method-result': methods.find(item => item.id === route.params.methodId)?.name || t('Method', '方法'),
    metric: metrics.find(item => item.id === route.params.metricId)?.name || t('Metric', '指标')
  }
  document.title = `${labels[String(route.name)] || t('Home', '首页')} | ${localize(site.title)}`
}, { immediate: true })

export default router
