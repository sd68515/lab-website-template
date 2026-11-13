import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseResultScope, type ResultScope } from '@/constants/result-scope'

export function useResultScope() {
  const route = useRoute()
  const router = useRouter()
  const scope = computed<ResultScope>(() => parseResultScope(route.query.scope) ?? 'all')

  function selectScope(nextScope: ResultScope): void {
    if (nextScope === scope.value) return
    const query = { ...route.query }
    if (nextScope === 'all') delete query.scope
    else query.scope = nextScope
    void router.push({ path: route.path, query, hash: route.hash })
  }

  return { scope, selectScope }
}
