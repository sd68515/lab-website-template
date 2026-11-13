/**
 * 速度可视化类型常量配置
 * 定义 Category A 可视化的四种基础类型
 */

/**
 * 速度可视化类型定义
 * 用于指定速度图的展示方式
 */
export const VELOCITY_TYPES = [
  { key: 'cell_map', label: 'Figure A' },
  { key: 'stream', label: 'Figure B' },
  { key: 'grid', label: 'Figure C' },
  { key: 'pseudotime', label: 'Figure D' }
] as const

/**
 * 速度类型键名类型 (从 VELOCITY_TYPES 自动推导)
 */
export type VelocityTypeKey = (typeof VELOCITY_TYPES)[number]['key']

/**
 * 速度类型对象类型
 */
export type VelocityType = (typeof VELOCITY_TYPES)[number]
