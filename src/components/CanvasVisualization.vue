<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useDatasetStore } from '@/stores/dataset'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const datasetStore = useDatasetStore()

const hoveredCell = ref<{ row: number; col: number } | null>(null)

const cellSize = 40
const padding = 120

const drawMatrix = () => {
  const canvas = canvasRef.value
  const matrix = datasetStore.currentMatrix

  if (!canvas || !matrix) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = padding + matrix.columnNames.length * cellSize + 40
  canvas.height = padding + matrix.rowNames.length * cellSize + 40

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Column labels
  matrix.columnNames.forEach((name, colIndex) => {
    ctx.save()

    ctx.translate(
      padding + colIndex * cellSize + cellSize / 2,
      padding - 10,
    )

    ctx.rotate(-Math.PI / 4)

    ctx.fillStyle = 'black'
    ctx.fillText(name, 0, 0)

    ctx.restore()
  })

  // Row labels
  ctx.textAlign = 'right'

  matrix.rowNames.forEach((name, rowIndex) => {
    ctx.fillStyle = 'black'

    ctx.fillText(
      name,
      padding - 10,
      padding + rowIndex * cellSize + cellSize / 2,
    )
  })

  // Cells
  matrix.values.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const value = Number(cell.initialValue) || 0

      const intensity = Math.min(
        255,
        Math.max(0, 255 - value * 255),
      )

      ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`

      const x = padding + colIndex * cellSize
      const y = padding + rowIndex * cellSize

      ctx.fillRect(
        x,
        y,
        cellSize - 2,
        cellSize - 2,
      )

      // Hover outline
      if (
        hoveredCell.value &&
        hoveredCell.value.row === rowIndex &&
        hoveredCell.value.col === colIndex
      ) {
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2

        ctx.strokeRect(
          x,
          y,
          cellSize - 2,
          cellSize - 2,
        )
      }
    })
  })
}

const handleMouseMove = (event: MouseEvent) => {
  const canvas = canvasRef.value
  const matrix = datasetStore.currentMatrix

  if (!canvas || !matrix) return

  const rect = canvas.getBoundingClientRect()

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const col = Math.floor((x - padding) / cellSize)
  const row = Math.floor((y - padding) / cellSize)

  if (
    row >= 0 &&
    row < matrix.rowNames.length &&
    col >= 0 &&
    col < matrix.columnNames.length
  ) {
    hoveredCell.value = { row, col }
  } else {
    hoveredCell.value = null
  }

  drawMatrix()
}

const handleMouseLeave = () => {
  hoveredCell.value = null
  drawMatrix()
}

onMounted(drawMatrix)

watch(
  () => datasetStore.currentMatrix,
  () => drawMatrix(),
  { deep: true },
)
</script>

<template>
  <div class="canvas-wrapper">
    <canvas
      ref="canvasRef"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    ></canvas>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: white;
}

canvas {
  display: block;
}
</style>
