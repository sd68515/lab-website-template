/**
 * UI 组件常量配置
 * 定义筛选器、表格、图片等 UI 组件的默认值和配置项
 */

// 筛选器默认配置
export const FILTER_DEFAULTS = {
  PLACEHOLDER: 'All'  // 筛选器默认占位文本
} as const

// 表格分页配置
export const TABLE_CONFIG = {
  PAGE_SIZE: 20,                    // 默认每页显示行数
  PAGE_SIZES: [10, 20, 50, 100]     // 可选的每页行数选项
} as const

// 图片占位符文案
export const IMAGE_PLACEHOLDERS = {
  NOT_AVAILABLE: 'Picture not uploaded'  // 图片未上传时的提示文案
} as const
