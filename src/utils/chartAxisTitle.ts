let measureContext: CanvasRenderingContext2D | null = null

export function measureChartTextWidth(text: string, font: string): number {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) throw new Error('Canvas text measurement is unavailable')
  measureContext.font = font
  return measureContext.measureText(text).width
}

/** 轴标题按实际文字宽度换行，保留长数据集名称的完整内容。 */
export function wrapChartAxisTitle(title: string, maxWidth: number, font: string): string {
  if (!title || maxWidth <= 0) return title
  const lines: string[] = []
  let line = ''
  for (const character of title) {
    if (character === '\n' || (line && measureChartTextWidth(line + character, font) > maxWidth)) {
      lines.push(line)
      line = ''
    }
    if (character !== '\n') line += character
  }
  lines.push(line)
  return lines.join('\n')
}
