export interface MatrixLayout {
  leftPadding: number
  topPadding: number
}

interface MatrixLayoutInput {
  rowNames: string[]
  columnNames: string[]
  labelSize: number
}

const measureTextWidth = (text: string, labelSize: number) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return text.length * labelSize * 0.6

  ctx.font = `${labelSize}px Arial`
  return ctx.measureText(text).width
}

export const getMatrixLayout = ({
  rowNames,
  columnNames,
  labelSize,
}: MatrixLayoutInput): MatrixLayout => {
  const longestRowLabelWidth = Math.max(
    ...rowNames.map((name) => measureTextWidth(name, labelSize)),
  )

  const longestColumnLabelWidth = Math.max(
    ...columnNames.map((name) => measureTextWidth(name, labelSize)),
  )

  return {
    leftPadding: Math.max(120, longestRowLabelWidth + 30),
    topPadding: Math.max(140, longestColumnLabelWidth * 0.75 + 40),
  }
}
