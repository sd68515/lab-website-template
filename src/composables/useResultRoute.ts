import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { ResultRouteState } from '@/types';
import { resolveToolName } from '@/constants/tools'

export type { ResultRouteState } from '@/types';

/**
 * 解析当前路由 query，生成结果页所需的路由状态
 * - datasetResult: mode = by-dataset
 * - methodResult: mode = by-method
 */
export function useResultRoute() {
  const route = useRoute();

  const state = computed<ResultRouteState | undefined>(() => {
    const { path, query } = route;
    if (path.includes('datasetResult')) {
      const type = typeof query.type === 'string' ? query.type : undefined;
      const id = typeof query.id === 'string' ? query.id : undefined;
      const shape = typeof query.shape === 'string' ? query.shape : undefined;
      const size = typeof query.size === 'string' ? query.size : undefined;
      if (!type) return undefined;
      return {
        mode: 'by-dataset',
        dataset: {
          type: type as 'real' | 'simulation',
          ...(id !== undefined ? { id } : {}),
          ...(shape !== undefined ? { shape } : {}),
          ...(size !== undefined ? { size } : {})
        }
      };
    }
    if (path.includes('methodResult')) {
      const rawTool = typeof query.tool === 'string' ? query.tool : undefined;
      const tool = rawTool ? resolveToolName(rawTool) : null
      if (!tool) return undefined;
      return {
        mode: 'by-method',
        method: { tool }
      };
    }
    return undefined;
  });

  return {
    routeState: state
  };
}
