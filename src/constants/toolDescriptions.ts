import type { VelocityTool } from './tools'

// Fictional text for the example methods. / 以下为虚构方法说明。
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  MethodA: 'This fictional method illustrates a reusable result page.',
  MethodB: 'This fictional method provides a second example for comparison.'
}
export function getToolDescription(name: VelocityTool): string {
  return TOOL_DESCRIPTIONS[name] ?? 'Illustrative method description.'
}
