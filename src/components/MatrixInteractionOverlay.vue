<script setup lang="ts">
import { useDatasetStore } from '@/stores/dataset'
import { useInteractionStore } from '@/stores/interaction'
import { useVisualizationStore } from '@/stores/visualization'
import { getMatrixLayout } from '@/utils/matrixLayout'
import { computed } from 'vue'

const visualizationStore = useVisualizationStore()
const datasetStore = useDatasetStore()
const interactionStore = useInteractionStore()
const draggedName = computed(() => {
  const matrix = datasetStore.currentMatrix
  const dragState = interactionStore.dragState

  if (!matrix || !dragState) return ''

  return dragState.type === 'row'
    ? matrix.rowNames[dragState.fromIndex]
    : matrix.columnNames[dragState.fromIndex]
})

const getCellSize = () => visualizationStore.settings.cellSize || 40
type PendingCellDrag = {
  row: number
  col: number
  startX: number
  startY: number
} | null

let pendingCellDrag: PendingCellDrag = null
const cellDragThreshold = 6

const getCurrentLayout = () => {
  const matrix = datasetStore.currentMatrix
  if (!matrix) return null

  return getMatrixLayout({
    rowNames: matrix.rowNames,
    columnNames: matrix.columnNames,
    labelSize: visualizationStore.config.labelSize || 14,
  })
}

const props = defineProps({
  zoomScale: { type: Number, default: 1 },
  panX: { type: Number, default: 0 },
  panY: { type: Number, default: 0 },
})

const getMousePosition = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLDivElement
  const rect = target.getBoundingClientRect()

  return {
    x: (event.clientX - rect.left - props.panX) / props.zoomScale,
    y: (event.clientY - rect.top - props.panY) / props.zoomScale,
  }
}

const updateHoverState = (x: number, y: number) => {
  const matrix = datasetStore.currentMatrix
  const layout = getCurrentLayout()

  if (!matrix || !layout) return

  const cellSize = getCellSize()
  const leftPadding = layout.leftPadding
  const topPadding = layout.topPadding

  const col = Math.floor((x - leftPadding) / cellSize)
  const row = Math.floor((y - topPadding) / cellSize)

  interactionStore.hoveredCell = null
  interactionStore.hoveredLabel = null

  const isInsideCell =
    row >= 0 &&
    row < matrix.rowNames.length &&
    col >= 0 &&
    col < matrix.columnNames.length

  if (isInsideCell) {
    interactionStore.hoveredCell = { row, col }
    return
  }

  const isRowLabel =
    x >= 10 &&
    x <= leftPadding - 10 &&
    row >= 0 &&
    row < matrix.rowNames.length

  if (isRowLabel) {
    interactionStore.hoveredLabel = { type: 'row', index: row }
    return
  }

  const isColumnLabel =
    y >= topPadding - 85 &&
    y <= topPadding &&
    col >= 0 &&
    col < matrix.columnNames.length

  if (isColumnLabel) {
    interactionStore.hoveredLabel = { type: 'column', index: col }
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const matrix = datasetStore.currentMatrix
  const layout = getCurrentLayout()

  if (!matrix || !layout) return

  const cellSize = getCellSize()
  const pos = getMousePosition(event)

  interactionStore.mousePosition = pos
  //
  if (pendingCellDrag &&
    visualizationStore.settings.enableCellDragging &&
    !interactionStore.dragState) {

    const dx = pos.x - pendingCellDrag.startX
    const dy = pos.y - pendingCellDrag.startY

    if (Math.max(Math.abs(dx), Math.abs(dy)) >= cellDragThreshold) {
      const dragType = Math.abs(dx) > Math.abs(dy) ? 'column' : 'row'

      interactionStore.dragState = {
        type: dragType,
        fromIndex: dragType === 'row' ? pendingCellDrag.row : pendingCellDrag.col,
      }

      interactionStore.dragTargetIndex =
        dragType === 'row' ? pendingCellDrag.row : pendingCellDrag.col

      pendingCellDrag = null
    }
  }

   //
  updateHoverState(pos.x, pos.y)

  if (interactionStore.dragState?.type === 'row') {
    const target = Math.round((pos.y - layout.topPadding) / cellSize)

    interactionStore.dragTargetIndex = Math.max(
      0,
      Math.min(matrix.rowNames.length, target),
    )
  }

  if (interactionStore.dragState?.type === 'column') {
    const target = Math.round((pos.x - layout.leftPadding) / cellSize)

    interactionStore.dragTargetIndex = Math.max(
      0,
      Math.min(matrix.columnNames.length, target),
    )
  }
}

const handleMouseDown = (event: MouseEvent) => {
  const pos = getMousePosition(event)

  pendingCellDrag = null
  updateHoverState(pos.x, pos.y)
  //label drag/drop
  if (interactionStore.hoveredLabel) {
    interactionStore.dragState = {
      type: interactionStore.hoveredLabel.type,
      fromIndex: interactionStore.hoveredLabel.index,
    }

    interactionStore.dragTargetIndex = interactionStore.hoveredLabel.index
    return
  }

  //cell drag/drop
  if (visualizationStore.settings.enableCellDragging &&
    interactionStore.hoveredCell) {

    /*const dragType = event.shiftKey ? 'column' : 'row'

    interactionStore.dragState = {
      type: dragType,
      fromIndex:
        dragType === 'row'
          ? interactionStore.hoveredCell.row
          : interactionStore.hoveredCell.col,
    }

    interactionStore.dragTargetIndex =
      dragType === 'row'
        ? interactionStore.hoveredCell.row
        : interactionStore.hoveredCell.col
  }*/
  pendingCellDrag = {
        row: interactionStore.hoveredCell.row,
        col: interactionStore.hoveredCell.col,
        startX: pos.x,
        startY: pos.y,
      }
}
}

const handleMouseUp = () => {
  pendingCellDrag = null

  if (!interactionStore.dragState || interactionStore.dragTargetIndex === null) {
    interactionStore.clearDrag()
    return
  }

  if (interactionStore.dragState.type === 'row') {
    const newOrder = [...datasetStore.rowOrder]
    const [movedRow] = newOrder.splice(interactionStore.dragState.fromIndex, 1)

    let targetIndex = interactionStore.dragTargetIndex
    if (targetIndex > interactionStore.dragState.fromIndex) targetIndex -= 1

    newOrder.splice(targetIndex, 0, movedRow)
    datasetStore.setRowOrder(newOrder)
  }

  if (interactionStore.dragState.type === 'column') {
    const newOrder = [...datasetStore.columnOrder]
    const [movedColumn] = newOrder.splice(interactionStore.dragState.fromIndex, 1)

    let targetIndex = interactionStore.dragTargetIndex
    if (targetIndex > interactionStore.dragState.fromIndex) targetIndex -= 1

    newOrder.splice(targetIndex, 0, movedColumn)
    datasetStore.setColumnOrder(newOrder)
  }

  interactionStore.clearDrag()
}

const handleMouseLeave = () => {
  pendingCellDrag = null
  interactionStore.clearInteraction()
}
</script>

<template>
  <div
    class="matrix-interaction-overlay"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  >
  <div
      v-if="interactionStore.dragState"
      class="drag-tooltip"
      :style="{
        left: interactionStore.mousePosition.x + 12 + 'px',
        top: interactionStore.mousePosition.y + 12 + 'px',
      }"
    >
      {{ draggedName }}
    </div>
  </div>
</template>

<style scoped>
.matrix-interaction-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: transparent;
}

.drag-tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 20;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(31, 111, 235, 0.15);
  color: #1f6feb;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.75;
  white-space: nowrap;
}
</style>
