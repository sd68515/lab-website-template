/**
 * 路由验证工具函数
 * 用于在路由守卫和页面内部验证 URL 参数的合法性
 * 确保守卫与页面内验证使用相同的逻辑，避免不一致问题
 */

import {
  ALLOWED_REAL_DATASET_IDS,
  SIM_FULL_COMBOS
} from '@/constants/datasets'
import {
  findSimulationDatasetById,
  topologyKeyToLabel
} from '@/constants/simulation'
import { resolveToolName } from '@/constants/tools'

/**
 * 验证真实数据 ID 是否在白名单中
 * @param id - 数据集 ID
 * @returns true 表示在白名单中，false 表示非法
 */
export function isValidRealDatasetId(id: unknown): boolean {
  if (typeof id !== 'string') return false
  return ALLOWED_REAL_DATASET_IDS.has(id)
}

/**
 * 模拟数据 datasetId 验证
 *
 * 目前语义：
 * - 标准模拟数据的路由不需要携带 id（shape + size 即可）
 * - 若提供 id，则用于 Dataset ID 型模拟数据（Additional / Bursting tree / Lineage tracing）
 */
export function isValidSimulationId(id: unknown): boolean {
  // 未提供 id：视为标准模拟数据，合法
  if (id === undefined || id === null || id === '') {
    return true
  }
  if (typeof id !== 'string') {
    return false
  }
  return Boolean(findSimulationDatasetById(id))
}

/**
 * 验证模拟数据组合（shape + size）是否合法
 * @param shape - 形状（必须与 DatasetFilter 的 shape 文本完全一致）
 * @param size - 尺寸（"cells*genes" 格式，如 "1000*10000"）
 * @returns { valid: boolean; mode?: 'full' | 'efficiency-only' }
 *   - valid: 是否合法
 *   - mode: 数据模式（'full' 表示完整数据，'efficiency-only' 表示仅效率指标）
 */
export function isValidSimulationCombo(
  shape: unknown,
  size: unknown
): { valid: boolean; mode?: 'full' | 'efficiency-only' } {
  if (typeof shape !== 'string' || typeof size !== 'string') {
    return { valid: false }
  }

  const combo = SIM_FULL_COMBOS[shape]
  if (!combo) {
    return { valid: false }
  }

  // 解析 size（"500*1000" → [500, 1000]）
  const parts = size.split('*')
  if (parts.length !== 2) {
    return { valid: false }
  }

  const [cellsPart, genesPart] = parts
  if (!cellsPart || !genesPart) {
    return { valid: false }
  }

  const cells = parseInt(cellsPart, 10)
  const genes = parseInt(genesPart, 10)

  if (isNaN(cells) || isNaN(genes) || cells <= 0 || genes <= 0) {
    return { valid: false }
  }

  // 检查 full 白名单
  if (combo.full.some(([c, g]) => c === cells && g === genes)) {
    return { valid: true, mode: 'full' }
  }

  // 检查 efficiencyOnly 白名单
  if (combo.efficiencyOnly.some(([c, g]) => c === cells && g === genes)) {
    return { valid: true, mode: 'efficiency-only' }
  }

  return { valid: false }
}

/**
 * 统一验证模拟数据上下文（标准 full/efficiency-only 组合或基于 Dataset ID 的模拟数据）
 */
export function validateSimulationDatasetContext(
  shape: unknown,
  size: unknown,
  id?: unknown
): { valid: boolean; mode?: 'full' | 'efficiency-only' } {
  if (typeof id === 'string' && id) {
    const dataset = findSimulationDatasetById(id)
    if (!dataset) {
      return { valid: false }
    }

    const expectedShape = topologyKeyToLabel(dataset.topologyKey)
    if (shape !== expectedShape) {
      return { valid: false }
    }

    if (
      typeof dataset.cells === 'number' &&
      typeof dataset.genes === 'number' &&
      size !== `${dataset.cells}*${dataset.genes}`
    ) {
      return { valid: false }
    }

    return { valid: true, mode: 'full' }
  }

  return isValidSimulationCombo(shape, size)
}

/**
 * 验证工具名称是否受支持
 * @param tool - 工具名称
 * @returns true 表示受支持，false 表示非法
 */
export function isValidToolName(tool: unknown): boolean {
  if (typeof tool !== 'string') return false
  return resolveToolName(tool) !== null
}
