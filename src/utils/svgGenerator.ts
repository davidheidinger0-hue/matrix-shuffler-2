import type { MatrixData } from '@/stores/dataset'

interface SvgGenOptions {
  encoding: 'circle' | 'color' | 'circle-color' | 'color-text' | 'dual-bar-charts' | 'bar-chart'
  cellSize: number
  cellSpacing: number
  labelRotation: number
  fontSize: number
}

// Helper: hex color to RGB
function hexToRgb(hex: string) {
  hex = hex.replace('#', '')
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  const num = parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

// Helper: interpolate between two hex colors
function lerpColor(a: string, b: string, t: number) {
  const c1 = hexToRgb(a)
  const c2 = hexToRgb(b)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b_ = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b_})`
}

// Helper: estimate rotated text width
function getRotatedTextBBox(text: string, fontSize: number, angle: number) {
  // crude estimate: width = text.length * fontSize * 0.6
  const w = text.length * fontSize * 0.6
  const h = fontSize
  const rad = (angle * Math.PI) / 180
  // bounding box after rotation
  const width = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))
  const height = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))
  return { width, height }
}

export function generateMatrixSVG(
  matrixData: MatrixData,
  options: SvgGenOptions & { minColor?: string; maxColor?: string },
): string {
  const {
    encoding,
    cellSize,
    cellSpacing,
    labelRotation,
    fontSize = 14,
    minColor = '#e3f0fb',
    maxColor = '#7daee6',
  } = options

  const rows = matrixData.rowNames.length
  const cols = matrixData.columnNames.length

  // Calculate right/top padding for rotated column labels
  let maxColLabel = matrixData.columnNames.reduce((a, b) => (a.length > b.length ? a : b), '')
  const colLabelBox = getRotatedTextBBox(maxColLabel, fontSize, labelRotation)
  const extraRight = labelRotation ? colLabelBox.width + 12 : 24
  const extraTop = labelRotation ? colLabelBox.height + 8 : fontSize + 16

  // Calculate left padding for row labels based on the longest label
  const maxRowLabel = matrixData.rowNames.reduce((a, b) => (a.length > b.length ? a : b), '')
  const rowLabelWidth = maxRowLabel.length * fontSize * 0.6
  const labelPadX = 16 + rowLabelWidth + 8 // 8px extra padding
  const labelPadY = extraTop
  const width = labelPadX + cols * (cellSize + cellSpacing) + extraRight
  const height = labelPadY + rows * (cellSize + cellSpacing) + 16

  // interpolate minColor/maxColor
  const getColor = (v: number) => lerpColor(minColor, maxColor, v)

  // Find min/max for normalization
  let min = Infinity,
    max = -Infinity
  for (const row of matrixData.values) {
    for (const cell of row) {
      const val = cell.normalizedValue ?? cell.initialValue
      if (val < min) min = val
      if (val > max) max = val
    }
  }
  if (min === max) {
    min = 0
    max = 1
  }

  let svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' font-family='sans-serif' font-size='${fontSize}'>\n`

  // Column labels (rotated if needed)
  svg += `<g class='col-labels'>\n`
  matrixData.columnNames.forEach((col, j) => {
    const x = labelPadX + j * (cellSize + cellSpacing) + cellSize / 2
    const y = labelPadY - 8
    if (labelRotation) {
      svg += `<text x='${x}' y='${y}' text-anchor='start' dominant-baseline='middle' transform='rotate(${-labelRotation},${x},${y})'>${col}</text>`
    } else {
      svg += `<text x='${x}' y='${y}' text-anchor='middle' dominant-baseline='auto'>${col}</text>`
    }
  })
  svg += `</g>\n`

  // Row labels (left-aligned, close to matrix, with right padding and proper anchor)
  svg += `<g class='row-labels'>\n`
  matrixData.rowNames.forEach((row, i) => {
    const x = labelPadX - rowLabelWidth - 8 // align left edge of text to matrix, with right padding
    const y = labelPadY + i * (cellSize + cellSpacing) + cellSize / 2 + fontSize * 0.35
    svg += `<text x='${x}' y='${y}' text-anchor='start' dominant-baseline='middle'>${row}</text>`
  })
  svg += `</g>\n`

  // Matrix cells
  svg += `<g class='matrix-cells' stroke-width='1'>\n`
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = matrixData.values[i][j]
      const val = cell.normalizedValue ?? cell.initialValue
      const norm = (val - min) / (max - min)
      const x = labelPadX + j * (cellSize + cellSpacing)
      const y = labelPadY + i * (cellSize + cellSpacing)

      const gridStroke = '#e0e0e0'
      const shapeStroke = '#444444'

      if (encoding === 'circle') {
        const r = (cellSize / 2) * norm
        svg += `  <rect x='${x}' y='${y}' width='${cellSize}' height='${cellSize}' fill='white' fill-opacity='1' stroke='${gridStroke}' />\n`
        svg += `  <circle cx='${x + cellSize / 2}' cy='${y + cellSize / 2}' r='${r}' fill='${getColor(norm)}' fill-opacity='${norm}' stroke='${shapeStroke}' />\n`
      } else if (encoding === 'color') {
        svg += `  <rect x='${x}' y='${y}' width='${cellSize}' height='${cellSize}' fill='${getColor(norm)}' fill-opacity='${norm}' stroke='${gridStroke}' />\n`
      } else if (encoding === 'color-text') {
        svg += `  <rect x='${x}' y='${y}' width='${cellSize}' height='${cellSize}' fill='${getColor(norm)}' fill-opacity='${norm}' stroke='${gridStroke}' />\n`
        svg += `  <text x='${x + cellSize / 2}' y='${y + cellSize / 2 + fontSize * 0.35}' text-anchor='middle' dominant-baseline='middle' fill='#222'>${cell.initialValue}</text>\n`
      } else if (encoding === 'circle-color') {
        const r = (cellSize / 2) * norm
        svg += `  <rect x='${x}' y='${y}' width='${cellSize}' height='${cellSize}' fill='white' fill-opacity='1' stroke='${gridStroke}' />\n`
        svg += `  <circle cx='${x + cellSize / 2}' cy='${y + cellSize / 2}' r='${r}' fill='${getColor(norm)}' fill-opacity='${norm}' stroke='${shapeStroke}' />\n`
      }
    }
  }
  svg += `</g>\n`

  svg += `</svg>\n`
  return svg
}
