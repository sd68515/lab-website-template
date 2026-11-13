import type { PlaceholderDisplay, PlaceholderMode, PlaceholderSpec, ResultStatus } from '@/types'
import { getDefaultPlaceholderMessage, resolvePlaceholder } from '@/utils/result'

export type { PlaceholderDisplay, PlaceholderMode, PlaceholderSpec, ResultStatus }

/**
 * 将原始占位符配置解析为标准结构
 * @param raw 原始配置（字符串或对象）
 * @param defaultMode 默认占位模式
 */
export function parseMissingSpec(
  raw: unknown,
  defaultMode: PlaceholderMode
): PlaceholderDisplay | null {
  return resolvePlaceholder(raw, { fallbackMode: defaultMode })
}

/**
 * 创建占位符展示对象
 * @param sectionType 占位归属版块（velocity/metrics）
 * @param spec 占位配置
 * @param fallbackMode 默认模式
 */
export function createPlaceholder(
  _sectionType: 'velocity' | 'metrics',
  spec: PlaceholderSpec | null,
  fallbackMode: PlaceholderMode
): PlaceholderDisplay {
  const parsed = parseMissingSpec(spec, fallbackMode)
  if (parsed) return parsed
  return {
    mode: fallbackMode,
    message: getDefaultPlaceholderMessage(fallbackMode)
  }
}

/**
 * 根据子项及分区占位符，计算最终应展示的占位符
 * - 若分区有占位符，直接返回
 * - 若子项为空，返回空结果占位符；空值不证明未上传或待交付
 * - 其他情况返回 null
 */
export function evaluateSectionPlaceholder<T extends { placeholder: PlaceholderDisplay | null }>(
  items: T[],
  sectionPlaceholder: PlaceholderDisplay | null,
  _sectionType: 'velocity' | 'metrics'
): PlaceholderDisplay | null {
  if (sectionPlaceholder) return sectionPlaceholder
  if (!items || items.length === 0) {
    return {
      mode: 'empty',
      message: getDefaultPlaceholderMessage('empty')
    }
  }
  return null
}
