<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useDatasetStore } from '@/stores/dataset'
import { useInteractionStore } from '@/stores/interaction'
import MatrixInteractionOverlay from './MatrixInteractionOverlay.vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const datasetStore = useDatasetStore()
const interactionStore = useInteractionStore()

const cellSize = 40
const padding = 140

const drawMatrix = () => {
  const canvas = canvasRef.value
  const matrix = datasetStore.currentMatrix
  if (!canvas || !matrix) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = padding + matrix.columnNames.length * cellSize + 80
  canvas.height = padding + matrix.rowNames.length * cellSize + 80

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.font = '12px Arial'
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
    ctx.rotate(-Math.PI / 4)
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
      const value = Number(cell.initialValue) || 0
      const intensity = Math.min(255, Math.max(0, 255 - value * 255))

      const x = padding + colIndex * cellSize
      const y = padding + rowIndex * cellSize

      ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`
      ctx.fillRect(x, y, cellSize - 2, cellSize - 2)

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
  () => datasetStore.currentMatrix,
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
