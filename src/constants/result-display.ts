/** These three tools only publish basic result plots; all metric views exclude them. */
export const SPECIAL_RESULT_PLOTS: Readonly<Record<string, readonly string[]>> = {
  'ExampleMethod27': ['stream'],
  ExampleMethod09: ['pseudotime'],
  ExampleMethod10: ['pseudotime']
}

export function getResultPlotRoles(toolName: string, defaultRoles: readonly string[]): readonly string[] {
  return SPECIAL_RESULT_PLOTS[toolName] ?? defaultRoles
}

export function excludesMetricResults(toolName: string): boolean {
  return Object.prototype.hasOwnProperty.call(SPECIAL_RESULT_PLOTS, toolName)
}
