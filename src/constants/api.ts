/**
 * API 端点配置
 * 定义所有静态数据文件路径
 */

// 静态数据文件基础路径
export const STATIC_DATA_BASE_PATH = './sheets'

// CSV 数据文件端点
export const API_ENDPOINTS = {
  TOOL_LIST: `${STATIC_DATA_BASE_PATH}/tool_list.csv`,        // 工具列表数据
  REALDATA_INFO: `${STATIC_DATA_BASE_PATH}/realdata_info.csv`, // 真实数据集信息
  SIMDATA_INFO: `${STATIC_DATA_BASE_PATH}/simdata_info.csv`,   // 模拟数据集信息
  DOWNLOAD_LINK: `${STATIC_DATA_BASE_PATH}/download_link.csv`  // 处理后数据下载链接
} as const

export const STATIC_CSV_CACHE_TTL_MS = 60 * 1000

export function buildStaticCsvRequestUrl(url: string, timestamp = Date.now()): string {
  const version = Math.floor(timestamp / STATIC_CSV_CACHE_TTL_MS)
  return `${url}?v=${version}`
}
