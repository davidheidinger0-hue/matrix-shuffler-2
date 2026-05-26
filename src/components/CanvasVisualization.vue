<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useDatasetStore } from '@/stores/dataset'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const datasetStore = useDatasetStore()

const hoveredCell = ref<{ row: number; col: number } | null>(null)
const hoveredLabel = ref<{ type: 'row' | 'column'; index: number } | null>(null)
const mousePosition = ref({ x: 0, y: 0 })

const dragState = ref<{
  type: 'row' | 'column'
  fromIndex: number
} | null>(null)

const dragTargetIndex = ref<number | null>(null)

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

  // Column labels
  matrix.columnNames.forEach((name, colIndex) => {
    const isHovered =
      hoveredLabel.value?.type === 'column' && hoveredLabel.value.index === colIndex

    const isDragged =
      dragState.value?.type === 'column' && dragState.value.fromIndex === colIndex

    const x = padding + colIndex * cellSize
    //const y = padding - 75

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

  // Row labels
  matrix.rowNames.forEach((name, rowIndex) => {
    const isHovered =
      hoveredLabel.value?.type === 'row' && hoveredLabel.value.index === rowIndex

    const isDragged =
      dragState.value?.type === 'row' && dragState.value.fromIndex === rowIndex

    //const x = 10
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

  // Cells
  matrix.values.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const value = Number(cell.initialValue) || 0
      const intensity = Math.min(255, Math.max(0, 255 - value * 255))

      const x = padding + colIndex * cellSize
      const y = padding + rowIndex * cellSize

      ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`
      ctx.fillRect(x, y, cellSize - 2, cellSize - 2)

      if (
        hoveredCell.value &&
        hoveredCell.value.row === rowIndex &&
        hoveredCell.value.col === colIndex
      ) {
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, cellSize - 2, cellSize - 2)
      }
    })
  })

  // Drag target indicator
  if (dragState.value && dragTargetIndex.value !== null) {
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3

    if (dragState.value.type === 'row') {
      const y = padding + dragTargetIndex.value * cellSize
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + matrix.columnNames.length * cellSize, y)
      ctx.stroke()
    }

    if (dragState.value.type === 'column') {
      const x = padding + dragTargetIndex.value * cellSize
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + matrix.rowNames.length * cellSize)
      ctx.stroke()
    }
  }
}

const getMousePosition = (event: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const updateHoverState = (x: number, y: number) => {
  const matrix = datasetStore.currentMatrix
  if (!matrix) return

  const col = Math.floor((x - padding) / cellSize)
  const row = Math.floor((y - padding) / cellSize)

  hoveredCell.value = null
  hoveredLabel.value = null

  const isInsideCell =
    row >= 0 &&
    row < matrix.rowNames.length &&
    col >= 0 &&
    col < matrix.columnNames.length

  if (isInsideCell) {
    hoveredCell.value = { row, col }
    return
  }

  const isRowLabel =
    x >= 10 &&
    x <= padding - 10 &&
    row >= 0 &&
    row < matrix.rowNames.length

  if (isRowLabel) {
    hoveredLabel.value = { type: 'row', index: row }
    return
  }

  const isColumnLabel =
    y >= padding - 85 &&
    y <= padding &&
    col >= 0 &&
    col < matrix.columnNames.length

  if (isColumnLabel) {
    hoveredLabel.value = { type: 'column', index: col }
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const matrix = datasetStore.currentMatrix
  const pos = getMousePosition(event)
  if (!matrix || !pos) return

  mousePosition.value = pos

  updateHoverState(pos.x, pos.y)

  if (dragState.value?.type === 'row') {
    const target = Math.round((pos.y - padding) / cellSize)
    dragTargetIndex.value = Math.max(0, Math.min(matrix.rowNames.length, target))
  }

  if (dragState.value?.type === 'column') {
    const target = Math.round((pos.x - padding) / cellSize)
    dragTargetIndex.value = Math.max(0, Math.min(matrix.columnNames.length, target))
  }

  const canvas = canvasRef.value
  if (canvas) {
    canvas.style.cursor = hoveredLabel.value || dragState.value ? 'grab' : 'default'
  }

  drawMatrix()
}

const handleMouseDown = (event: MouseEvent) => {
  const pos = getMousePosition(event)
  if (!pos) return

  updateHoverState(pos.x, pos.y)

  if (hoveredLabel.value) {
    dragState.value = {
      type: hoveredLabel.value.type,
      fromIndex: hoveredLabel.value.index,
    }

    dragTargetIndex.value = hoveredLabel.value.index
  }

  drawMatrix()
}

const handleMouseUp = () => {
  if (!dragState.value || dragTargetIndex.value === null) {
    dragState.value = null
    dragTargetIndex.value = null
    drawMatrix()
    return
  }

  if (dragState.value.type === 'row') {
    const newOrder = [...datasetStore.rowOrder]
    const [movedRow] = newOrder.splice(dragState.value.fromIndex, 1)

    let targetIndex = dragTargetIndex.value
    if (targetIndex > dragState.value.fromIndex) targetIndex -= 1

    newOrder.splice(targetIndex, 0, movedRow)
    datasetStore.setRowOrder(newOrder)
  }

  if (dragState.value.type === 'column') {
    const newOrder = [...datasetStore.columnOrder]
    const [movedColumn] = newOrder.splice(dragState.value.fromIndex, 1)

    let targetIndex = dragTargetIndex.value
    if (targetIndex > dragState.value.fromIndex) targetIndex -= 1

    newOrder.splice(targetIndex, 0, movedColumn)
    datasetStore.setColumnOrder(newOrder)
  }

  dragState.value = null
  dragTargetIndex.value = null
  drawMatrix()
}

const handleMouseLeave = () => {
  hoveredCell.value = null
  hoveredLabel.value = null
  dragState.value = null
  dragTargetIndex.value = null
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
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    ></canvas>

    <div
      v-if="hoveredCell && datasetStore.currentMatrix"
      class="tooltip"
      :style="{
        left: mousePosition.x + 16 + 'px',
        top: mousePosition.y + 16 + 'px',
      }"
    >
      <strong>
        {{ datasetStore.currentMatrix.rowNames[hoveredCell.row] }}
        ×
        {{ datasetStore.currentMatrix.columnNames[hoveredCell.col] }}
      </strong>
      <br />
      Value:
      {{
        datasetStore.currentMatrix.values[hoveredCell.row][hoveredCell.col]
          .initialValue
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
