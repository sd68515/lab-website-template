import { TOOL_DEFINITIONS, resolveToolName } from './tools'

/** 原34色按原顺序保留，追加12色。只能追加，不要重排已有色号。 */
export const TOOL_COLOR_PALETTE = [
  '#d73027',
  '#fc8d59',
  '#fee090',
  '#91bfdb',
  '#4575b4',
  '#66c2a5',
  '#3288bd',
  '#abdda4',
  '#e6f598',
  '#fee08b',
  '#f46d43',
  '#e7298a',
  '#a6cee3',
  '#1f78b4',
  '#b2df8a',
  '#33a02c',
  '#fb9a99',
  '#e31a1c',
  '#fdbf6f',
  '#ff7f00',
  '#cab2d6',
  '#6a3d9a',
  '#ffff99',
  '#b15928',
  '#8dd3c7',
  '#bc80bd',
  '#ccebc5',
  '#ffed6f',
  '#999999',
  '#8B0000',
  '#006400',
  '#FF69B4',
  '#00CED1',
  '#FFD700',
  '#542788',
  '#01665e',
  '#c51b7d',
  '#a6611a',
  '#2166ac',
  '#b2182b',
  '#5e4fa2',
  '#1b7837',
  '#762a83',
  '#dfc27d',
  '#80cdc1',
  '#c2a5cf',
] as const

/** 按工具名固定取色；与工具注册顺序、筛选、图表排序及结果就绪状态无关。 */
export const TOOL_COLORS = {
  MethodA: TOOL_COLOR_PALETTE[0],
  'ExampleMethod02': TOOL_COLOR_PALETTE[1],
  'ExampleMethod03': TOOL_COLOR_PALETTE[2],
  MethodB: TOOL_COLOR_PALETTE[3],
  ExampleMethod05: TOOL_COLOR_PALETTE[4],
  ExampleMethod06: TOOL_COLOR_PALETTE[5],
  ExampleMethod07: TOOL_COLOR_PALETTE[6],
  ExampleMethod08: TOOL_COLOR_PALETTE[7],
  ExampleMethod11: TOOL_COLOR_PALETTE[8],
  ExampleMethod14: TOOL_COLOR_PALETTE[9],
  ExampleMethod16: TOOL_COLOR_PALETTE[10],
  'ExampleMethod17': TOOL_COLOR_PALETTE[11],
  ExampleMethod19: TOOL_COLOR_PALETTE[12],
  ExampleMethod20: TOOL_COLOR_PALETTE[13],
  ExampleMethod23: TOOL_COLOR_PALETTE[14],
  'ExampleMethod24': TOOL_COLOR_PALETTE[15],
  ExampleMethod25: TOOL_COLOR_PALETTE[16],
  ExampleMethod12: TOOL_COLOR_PALETTE[17],
  ExampleMethod21: TOOL_COLOR_PALETTE[18],
  ExampleMethod22: TOOL_COLOR_PALETTE[19],
  ExampleMethod18: TOOL_COLOR_PALETTE[20],
  ExampleMethod45: TOOL_COLOR_PALETTE[21],
  ExampleMethod44: TOOL_COLOR_PALETTE[22],
  ExampleMethod33: TOOL_COLOR_PALETTE[23],
  ExampleMethod30: TOOL_COLOR_PALETTE[24],
  ExampleMethod29: TOOL_COLOR_PALETTE[25],
  ExampleMethod31: TOOL_COLOR_PALETTE[26],
  ExampleMethod32: TOOL_COLOR_PALETTE[27],
  ExampleMethod34: TOOL_COLOR_PALETTE[28],
  ExampleMethod36: TOOL_COLOR_PALETTE[29],
  ExampleMethod37: TOOL_COLOR_PALETTE[30],
  ExampleMethod38: TOOL_COLOR_PALETTE[31],
  'ExampleMethod40': TOOL_COLOR_PALETTE[32],
  ExampleMethod39: TOOL_COLOR_PALETTE[33],
  ExampleMethod43: TOOL_COLOR_PALETTE[34],
  ExampleMethod42: TOOL_COLOR_PALETTE[35],
  ExampleMethod41: TOOL_COLOR_PALETTE[36],
  ExampleMethod35: TOOL_COLOR_PALETTE[37],
  ExampleMethod09: TOOL_COLOR_PALETTE[38],
  ExampleMethod10: TOOL_COLOR_PALETTE[39],
  'ExampleMethod13': TOOL_COLOR_PALETTE[40],
  ExampleMethod15: TOOL_COLOR_PALETTE[41],
  ExampleMethod26: TOOL_COLOR_PALETTE[42],
  'ExampleMethod27': TOOL_COLOR_PALETTE[44],
  ExampleMethod28: TOOL_COLOR_PALETTE[45],
} as const

export type ToolColorName = keyof typeof TOOL_COLORS

function hasToolColor(toolName: string): toolName is ToolColorName {
  return Object.prototype.hasOwnProperty.call(TOOL_COLORS, toolName)
}

const missingColorTools = TOOL_DEFINITIONS.filter(tool => !hasToolColor(tool.name))
if (missingColorTools.length > 0) {
  throw new Error(`Missing fixed colors for: ${missingColorTools.map(tool => tool.name).join(', ')}`)
}

export function getToolColor(toolName: string): string {
  const canonical = resolveToolName(toolName) ?? toolName
  if (!hasToolColor(canonical)) {
    throw new Error(`Missing fixed color for: ${toolName}`)
  }
  return TOOL_COLORS[canonical]
}
