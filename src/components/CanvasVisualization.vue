<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useDatasetStore } from '@/stores/dataset'
import { useInteractionStore } from '@/stores/interaction'
import { useVisualizationStore } from '@/stores/visualization'
import MatrixInteractionOverlay from './MatrixInteractionOverlay.vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const datasetStore = useDatasetStore()
const interactionStore = useInteractionStore()
const visualizationStore = useVisualizationStore()

const minTopPadding = 140
const rowLabelMargin = 20

const getCellSize = () => visualizationStore.settings.cellSize || 40
const getLabelRotation = () => visualizationStore.settings.labelRotation ?? 45

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '')
  const bigint = parseInt(cleanHex, 16)

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

const interpolateColor = (value: number, minColor: string, maxColor: string) => {
  const min = hexToRgb(minColor)
  const max = hexToRgb(maxColor)

  const r = Math.round(min.r + (max.r - min.r) * value)
  const g = Math.round(min.g + (max.g - min.g) * value)
  const b = Math.round(min.b + (max.b - min.b) * value)

  return `rgb(${r}, ${g}, ${b})`
}

const getTextColor = (normalizedValue: number) => {
  return normalizedValue > 0.55 ? 'white' : 'black'
}

const drawColorCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  normalizedValue: number,
  cellColor: string,
) => {
  ctx.globalAlpha = normalizedValue
  ctx.fillStyle = cellColor
  ctx.fillRect(x, y, cellSize - 2, cellSize - 2)
  ctx.globalAlpha = 1

  ctx.strokeStyle = cellColor
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, cellSize - 2, cellSize - 2)
}

const drawCircleCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  normalizedValue: number,
  cellColor: string,
) => {
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 0.05
  ctx.strokeRect(x, y, cellSize - 2, cellSize - 2)

  ctx.beginPath()
  ctx.arc(
    x + cellSize / 2,
    y + cellSize / 2,
    normalizedValue * (cellSize / 2),
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = cellColor
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1
}

const drawCircleColorCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  normalizedValue: number,
  cellColor: string,
) => {
  drawColorCell(ctx, x, y, cellSize, normalizedValue * 0.6, cellColor)

  const radius = Math.max(normalizedValue * (cellSize / 2.5), cellSize / 8)

  ctx.beginPath()
  ctx.arc(x + cellSize / 2, y + cellSize / 2, radius, 0, Math.PI * 2)
  ctx.fillStyle = cellColor
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1
}

const drawColorTextCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  normalizedValue: number,
  cellColor: string,
  value: number,
) => {
  drawColorCell(ctx, x, y, cellSize, normalizedValue, cellColor)

  ctx.fillStyle = getTextColor(normalizedValue)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(value.toString(), x + cellSize / 2, y + cellSize / 2)
}

const drawBarChartCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  normalizedValue: number,
  inkColor: string,
  borderColor: string,
) => {
  ctx.fillStyle = 'white'
  ctx.fillRect(x, y, cellSize - 2, cellSize - 2)

  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, cellSize - 2, cellSize - 2)

  const barHeight = Math.round(normalizedValue * cellSize)

  if (barHeight > 0) {
    const yStart = y + cellSize - barHeight

    ctx.fillStyle = inkColor
    ctx.fillRect(x, yStart, cellSize - 2, barHeight)

    ctx.strokeStyle = inkColor
    ctx.strokeRect(x, yStart, cellSize - 2, barHeight)
  }
}

const drawHatchedBarChartsCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  normalizedValue: number,
  inkColor: string,
  borderColor: string,
) => {
  const safeValue = Math.max(0, Math.min(1, normalizedValue || 0))

  ctx.fillStyle = 'white'
  ctx.fillRect(x, y, cellSize - 2, cellSize - 2)

  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, cellSize - 2, cellSize - 2)

  const hatchHeight = Math.round(Math.min(1, safeValue * 2) * cellSize)

  if (hatchHeight > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, cellSize - 2, hatchHeight)
    ctx.clip()

    ctx.strokeStyle = inkColor
    ctx.lineWidth = 1

    const gap = 4

    for (let i = -cellSize; i < cellSize * 2; i += gap) {
      ctx.beginPath()
      ctx.moveTo(x + i, y + hatchHeight)
      ctx.lineTo(x + i + hatchHeight, y)
      ctx.stroke()
    }

    ctx.restore()
  }

  if (safeValue > 0.5) {
    const blackHeight = Math.round((safeValue - 0.5) * 2 * cellSize)
    const blackYStart = y + cellSize - blackHeight

    ctx.fillStyle = inkColor
    ctx.fillRect(x, blackYStart, cellSize - 2, blackHeight)

    ctx.strokeStyle = inkColor
    ctx.strokeRect(x, blackYStart, cellSize - 2, blackHeight)
  }
}

const drawMatrix = () => {
  const cellSize = getCellSize()
  const canvas = canvasRef.value
  const matrix = datasetStore.currentMatrix

  if (!canvas || !matrix) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.font = `${visualizationStore.config.labelSize}px Arial`
  ctx.textBaseline = 'middle'

  const longestRowLabelWidth = Math.max(
    ...matrix.rowNames.map((name) => ctx.measureText(name).width),
  )

  const longestColumnLabelWidth = Math.max(
    ...matrix.columnNames.map((name) => ctx.measureText(name).width),
  )

  const leftPadding = Math.max(120, longestRowLabelWidth + 30)
  const dynamicTopPadding = Math.max(minTopPadding, longestColumnLabelWidth * 0.75 + 40)//+ 30)

  canvas.width = leftPadding + matrix.columnNames.length * cellSize + 80
  canvas.height = dynamicTopPadding + matrix.rowNames.length * cellSize + 80

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Canvas resets context state after resizing, so restore font settings.
  ctx.font = `${visualizationStore.config.labelSize}px Arial`
  ctx.textBaseline = 'middle'

  matrix.columnNames.forEach((name, colIndex) => {
    const isHovered =
      interactionStore.hoveredLabel?.type === 'column' &&
      interactionStore.hoveredLabel.index === colIndex

    const isDragged =
      interactionStore.dragState?.type === 'column' &&
      interactionStore.dragState.fromIndex === colIndex

    const x = leftPadding + colIndex * cellSize

    if (isHovered || isDragged) {
      ctx.strokeStyle = isDragged ? '#1f6feb' : '#999'
      ctx.lineWidth = isDragged ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(x, dynamicTopPadding - 5)
      ctx.lineTo(x + cellSize - 2, dynamicTopPadding - 5)
      ctx.stroke()
    }

    /*ctx.save()
    ctx.translate(x + cellSize / 2, dynamicTopPadding - 15)
    ctx.rotate((-getLabelRotation() * Math.PI) / 180)
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.fillText(name, 0, 0)
    ctx.restore()
    */

    ctx.save()
    ctx.translate(x + cellSize / 2, dynamicTopPadding - 10)
    ctx.rotate((-getLabelRotation() * Math.PI) / 180)
    ctx.fillStyle = 'black'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 0, 0)
    ctx.restore()
  })

  matrix.rowNames.forEach((name, rowIndex) => {
    const isHovered =
      interactionStore.hoveredLabel?.type === 'row' &&
      interactionStore.hoveredLabel.index === rowIndex

    const isDragged =
      interactionStore.dragState?.type === 'row' &&
      interactionStore.dragState.fromIndex === rowIndex

    const y = dynamicTopPadding + rowIndex * cellSize

    if (isHovered || isDragged) {
      ctx.strokeStyle = isDragged ? '#1f6feb' : '#999'
      ctx.lineWidth = isDragged ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(leftPadding - 8, y)
      ctx.lineTo(leftPadding - 8, y + cellSize - 2)
      ctx.stroke()
    }

    ctx.fillStyle = 'black'
    ctx.textAlign = 'left'
    ctx.fillText(name, rowLabelMargin, y + cellSize / 2)
  })

  const maxInitialValue = Math.max(
    ...matrix.values.flat().map((cell) => Number(cell.initialValue) || 0),
  )

  matrix.values.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const rawValue = Number(cell.initialValue) || 0
      const value = cell.normalizedValue ?? (maxInitialValue > 0 ? rawValue / maxInitialValue : 0)
      const normalizedValue = Math.min(1, Math.max(0, value))

      const x = leftPadding + colIndex * cellSize
      const y = dynamicTopPadding + rowIndex * cellSize

      const cellColor = interpolateColor(
        normalizedValue,
        visualizationStore.settings.minColor,
        visualizationStore.settings.maxColor,
      )

  switch (visualizationStore.config.encoding) {
    case 'circle':
      drawCircleCell(ctx, x, y, cellSize, normalizedValue, cellColor)
      break

    case 'circle-color':
      drawCircleColorCell(ctx, x, y, cellSize, normalizedValue, cellColor)
      break

    case 'color-text':
      drawColorTextCell(
        ctx,
        x,
        y,
        cellSize,
        normalizedValue,
        cellColor,
        Number(cell.initialValue),
      )
      break

    case 'bar-chart':
      drawBarChartCell(
        ctx,
        x,
        y,
        cellSize,
        normalizedValue,
        interpolateColor(
          1,
          visualizationStore.settings.minColor,
          visualizationStore.settings.maxColor,
        ),
        cellColor,
      )
      break

    case 'hatched-bar-charts':
      drawHatchedBarChartsCell(
        ctx,
        x,
        y,
        cellSize,
        normalizedValue,
        interpolateColor(
          1,
          visualizationStore.settings.minColor,
          visualizationStore.settings.maxColor,
        ),
        cellColor,
      )
      break

    case 'color':
    default:
      drawColorCell(ctx, x, y, cellSize, normalizedValue, cellColor)
      break
  }

      if (
        interactionStore.hoveredCell &&
        interactionStore.hoveredCell.row === rowIndex &&
        interactionStore.hoveredCell.col === colIndex
      ) {
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, cellSize - 2, cellSize - 2)
      }
    })
  })

  if (interactionStore.dragState && interactionStore.dragTargetIndex !== null) {
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3

    if (interactionStore.dragState.type === 'row') {
      const y = dynamicTopPadding + interactionStore.dragTargetIndex * cellSize
      ctx.beginPath()
      ctx.moveTo(leftPadding, y)
      ctx.lineTo(leftPadding + matrix.columnNames.length * cellSize, y)
      ctx.stroke()
    }

    if (interactionStore.dragState.type === 'column') {
      const x = leftPadding + interactionStore.dragTargetIndex * cellSize
      ctx.beginPath()
      ctx.moveTo(x, dynamicTopPadding)
      ctx.lineTo(x, dynamicTopPadding + matrix.rowNames.length * cellSize)
      ctx.stroke()
    }
  }
}

onMounted(drawMatrix)

watch(
  [
    () => datasetStore.currentMatrix,
    () => visualizationStore.settings,
    () => visualizationStore.config.encoding,
  ],
  () => drawMatrix(),
  { deep: true },
)

watch(
  () => [
    interactionStore.hoveredCell,
    interactionStore.hoveredLabel,
    interactionStore.dragState,
    interactionStore.dragTargetIndex,
  ],
  () => drawMatrix(),
  { deep: true },
)
</script>

<template>
  <div class="canvas-wrapper">
    <canvas ref="canvasRef"></canvas>

    <MatrixInteractionOverlay />

    <div
      v-if="interactionStore.hoveredCell && datasetStore.currentMatrix"
      class="tooltip"
      :style="{
        left: interactionStore.mousePosition.x + 16 + 'px',
        top: interactionStore.mousePosition.y + 16 + 'px',
      }"
    >
      <strong>
        {{ datasetStore.currentMatrix.rowNames[interactionStore.hoveredCell.row] }}
        ×
        {{ datasetStore.currentMatrix.columnNames[interactionStore.hoveredCell.col] }}
      </strong>
      <br />
      Value:
      {{
        datasetStore.currentMatrix.values[interactionStore.hoveredCell.row][
          interactionStore.hoveredCell.col
        ].initialValue
      }}
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: white;
}

canvas {
  display: block;
}

.tooltip {
  position: absolute;
  pointer-events: none;
  background: white;
  border: 1px solid #aaa;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
