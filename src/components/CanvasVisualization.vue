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

const padding = 140

const getCellSize = () => visualizationStore.settings.cellSize || 40
const getLabelRotation = () => visualizationStore.settings.labelRotation || 45

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '')
  const bigint = parseInt(cleanHex, 16)

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

// interpolate color between the configured min and max color
const interpolateColor = (value: number, minColor: string, maxColor: string) => {
  const min = hexToRgb(minColor)
  const max = hexToRgb(maxColor)

  const r = Math.round(min.r + (max.r - min.r) * value)
  const g = Math.round(min.g + (max.g - min.g) * value)
  const b = Math.round(min.b + (max.b - min.b) * value)

  return `rgb(${r}, ${g}, ${b})`
}
// encodings
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
  ctx.strokeStyle = cellColor
  ctx.lineWidth = 1
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

  ctx.fillStyle = 'black'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(value.toString(), x + cellSize / 2, y + cellSize / 2)
}

const drawMatrix = () => {
  const cellSize = getCellSize()
  const canvas = canvasRef.value
  const matrix = datasetStore.currentMatrix

  if (!canvas || !matrix) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = padding + matrix.columnNames.length * cellSize + 80
  canvas.height = padding + matrix.rowNames.length * cellSize + 80

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.font = `${visualizationStore.config.labelSize}px Arial`
  ctx.textBaseline = 'middle'

  matrix.columnNames.forEach((name, colIndex) => {
    const isHovered =
      interactionStore.hoveredLabel?.type === 'column' &&
      interactionStore.hoveredLabel.index === colIndex

    const isDragged =
      interactionStore.dragState?.type === 'column' &&
      interactionStore.dragState.fromIndex === colIndex

    const x = padding + colIndex * cellSize

    if (isHovered || isDragged) {
      ctx.strokeStyle = isDragged ? '#1f6feb' : '#999'
      ctx.lineWidth = isDragged ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(x, padding - 5)
      ctx.lineTo(x + cellSize - 2, padding - 5)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(x + cellSize / 2, padding - 35)
    ctx.rotate((-getLabelRotation() * Math.PI) / 180)
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
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

    const y = padding + rowIndex * cellSize

    if (isHovered || isDragged) {
      ctx.strokeStyle = isDragged ? '#1f6feb' : '#999'
      ctx.lineWidth = isDragged ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(padding - 8, y)
      ctx.lineTo(padding - 8, y + cellSize - 2)
      ctx.stroke()
    }

    ctx.fillStyle = 'black'
    ctx.textAlign = 'right'
    ctx.fillText(name, padding - 10, y + cellSize / 2)
  })

  matrix.values.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const value = cell.normalizedValue ?? Number(cell.initialValue) ?? 0
      const normalizedValue = Math.min(1, Math.max(0, value))
      //const alpha = normalizedValue

      const x = padding + colIndex * cellSize
      const y = padding + rowIndex * cellSize

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
      const y = padding + interactionStore.dragTargetIndex * cellSize
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + matrix.columnNames.length * cellSize, y)
      ctx.stroke()
    }

    if (interactionStore.dragState.type === 'column') {
      const x = padding + interactionStore.dragTargetIndex * cellSize
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + matrix.rowNames.length * cellSize)
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

/*
watch(
  () => visualizationStore.settings,
  () => drawMatrix(),
  { deep: true },
)

watch(
  () => visualizationStore.config.encoding,
  () => drawMatrix(),
)*/
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
