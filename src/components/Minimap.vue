<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, reactive, computed } from 'vue'

defineOptions({
  name: 'MiniMap'
})

const props = defineProps<{
  wrapper: HTMLDivElement | null
  canvas: HTMLCanvasElement | null
  version: number
  panX: number
  panY: number
  zoomScale: number
}>()

const emit = defineEmits<{
  (e: 'pan', x: number, y: number): void
}>()
const minimapCanvas = ref<HTMLCanvasElement | null>(null)
const MINIMAP_SIZE = 180
const minimapContentZoom = ref(1)

const zoomInMinimap = () => {
  minimapContentZoom.value = Math.min(5, minimapContentZoom.value + 0.25)
  nextTick(() => drawMinimap())
}

const zoomOutMinimap = () => {
  minimapContentZoom.value = Math.max(0.1, minimapContentZoom.value - 0.25)
  nextTick(() => drawMinimap())
}

type Rect = {
  x: number
  y: number
  width: number
  height: number
}
const viewport: Rect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

const dragState = {
  active: false,
  offsetX: 0,
  offsetY: 0,
}
const panelDrag = {
  active: false,
  startX: 0,
  startY: 0,
  startPosX: 0,
  startPosY: 0,
}
const desiredPosition = reactive({
  x: 0,
  y: 0,
})
const position = reactive({
  x: 0,
  y: 0,
})

const updateVisualPosition = () => {
  if (!props.wrapper) return
  const W = props.wrapper.clientWidth
  const H = props.wrapper.clientHeight
  
  const min_x = 20 - W / 2
  const max_x = W / 2 - 200
  
  const min_y = 20 - H / 2
  const max_y = H / 2 - 200

  position.x = Math.max(min_x, Math.min(desiredPosition.x, max_x))
  position.y = Math.max(min_y, Math.min(desiredPosition.y, max_y))
}

const drawMinimap = () => {
  const mainCanvas = props.canvas
  const wrapper = props.wrapper

  if (!mainCanvas || !wrapper) return

  const canvas = minimapCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = MINIMAP_SIZE
  canvas.height = MINIMAP_SIZE - 24

  const rawBaseWidth = mainCanvas.width / props.zoomScale
  const rawBaseHeight = mainCanvas.height / props.zoomScale
  
  const PADDING = 50
  const defaultBaseWidth = rawBaseWidth + PADDING * 2
  const defaultBaseHeight = rawBaseHeight + PADDING * 2

  const defaultScale = Math.min(
    MINIMAP_SIZE / defaultBaseWidth,
    (MINIMAP_SIZE - 24) / defaultBaseHeight,
  )

  const scale = defaultScale * minimapContentZoom.value

  const grayBoxWidth = rawBaseWidth * scale
  const grayBoxHeight = rawBaseHeight * scale

  const offsetX = (MINIMAP_SIZE - grayBoxWidth) / 2
  const offsetY = ((MINIMAP_SIZE - 24) - grayBoxHeight) / 2

  ctx.fillStyle = '#dddddd'
  ctx.fillRect(offsetX, offsetY, grayBoxWidth, grayBoxHeight)
  
  // Draw preview of the matrix
  ctx.drawImage(mainCanvas, offsetX, offsetY, grayBoxWidth, grayBoxHeight)

  const viewportBaseX = -props.panX / props.zoomScale
  const viewportBaseY = -props.panY / props.zoomScale
  const viewportBaseWidth = wrapper.clientWidth / props.zoomScale
  const viewportBaseHeight = wrapper.clientHeight / props.zoomScale

  const rectX = offsetX + viewportBaseX * scale
  const rectY = offsetY + viewportBaseY * scale
  const rectWidth = viewportBaseWidth * scale
  const rectHeight = viewportBaseHeight * scale
  
  viewport.x = rectX
  viewport.y = rectY
  viewport.width = rectWidth
  viewport.height = rectHeight

  ctx.strokeStyle = 'red'
  ctx.lineWidth = 2
  ctx.strokeRect(rectX, rectY, rectWidth, rectHeight)
}

const handleMouseDown = (event: MouseEvent) => {
  const canvas = minimapCanvas.value

  if (!canvas) return

  const rect = canvas.getBoundingClientRect()

  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const hitPadding = 5

  const insideViewport =
  mouseX >= viewport.x - hitPadding &&
  mouseX <= viewport.x + viewport.width + hitPadding &&
  mouseY >= viewport.y - hitPadding &&
  mouseY <= viewport.y + viewport.height + hitPadding

  if (!insideViewport) return

  dragState.active = true
  dragState.offsetX = mouseX - viewport.x
  dragState.offsetY = mouseY - viewport.y

  window.addEventListener('mousemove', handleViewportMouseMove)
  window.addEventListener('mouseup', handleViewportMouseUp)
}

const handleViewportMouseMove = (event: MouseEvent) => {
  if (!dragState.active) return

  const canvas = minimapCanvas.value
  if (!canvas || !props.wrapper || !props.canvas) return

  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const newRectX = mouseX - dragState.offsetX
  const newRectY = mouseY - dragState.offsetY

  const rawBaseWidth = props.canvas.width / props.zoomScale
  const rawBaseHeight = props.canvas.height / props.zoomScale
  const PADDING = 50
  const defaultBaseWidth = rawBaseWidth + PADDING * 2
  const defaultBaseHeight = rawBaseHeight + PADDING * 2

  const defaultScale = Math.min(MINIMAP_SIZE / defaultBaseWidth, (MINIMAP_SIZE - 24) / defaultBaseHeight)
  const scale = defaultScale * minimapContentZoom.value
  
  const grayBoxWidth = rawBaseWidth * scale
  const grayBoxHeight = rawBaseHeight * scale
  
  const offsetX = (MINIMAP_SIZE - grayBoxWidth) / 2
  const offsetY = ((MINIMAP_SIZE - 24) - grayBoxHeight) / 2

  const newViewportBaseX = (newRectX - offsetX) / scale
  const newViewportBaseY = (newRectY - offsetY) / scale

  const newPanX = -newViewportBaseX * props.zoomScale
  const newPanY = -newViewportBaseY * props.zoomScale

  emit('pan', newPanX, newPanY)
}

const handleViewportMouseUp = () => {
  if (dragState.active) {
    dragState.active = false
    window.removeEventListener('mousemove', handleViewportMouseMove)
    window.removeEventListener('mouseup', handleViewportMouseUp)
  }
}

const handlePanelMouseDown = (event: MouseEvent) => {
  panelDrag.active = true

  desiredPosition.x = position.x
  desiredPosition.y = position.y

  panelDrag.startX = event.clientX
  panelDrag.startY = event.clientY
  panelDrag.startPosX = desiredPosition.x
  panelDrag.startPosY = desiredPosition.y

  window.addEventListener('mousemove', handlePanelMouseMove)
  window.addEventListener('mouseup', handlePanelMouseUp)
}

const handlePanelMouseMove = (event: MouseEvent) => {
  if (!panelDrag.active) return

  const deltaX = event.clientX - panelDrag.startX
  const deltaY = event.clientY - panelDrag.startY

  desiredPosition.x = panelDrag.startPosX + deltaX
  desiredPosition.y = panelDrag.startPosY + deltaY
  
  updateVisualPosition()
}

const handlePanelMouseUp = () => {
  panelDrag.active = false

  window.removeEventListener('mousemove', handlePanelMouseMove)
  window.removeEventListener('mouseup', handlePanelMouseUp)
}

const handleScroll = () => {
  drawMinimap()
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()

  if (props.wrapper) {
    // Start it near top right initially
    const W = props.wrapper.clientWidth
    const H = props.wrapper.clientHeight
    desiredPosition.x = W / 2 - 200
    desiredPosition.y = 20 - H / 2
    updateVisualPosition()
  }

  drawMinimap()

  props.wrapper?.addEventListener(
    'scroll',
    handleScroll,
  )

  if (props.wrapper) {
    resizeObserver = new ResizeObserver(() => {
      updateVisualPosition()
    })
    resizeObserver.observe(props.wrapper)
  }
})

onUnmounted(() => {
  props.wrapper?.removeEventListener(
    'scroll',
    handleScroll,
  )

  window.removeEventListener(
  'mouseup',
  handleViewportMouseUp,
  )

  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

watch(
  () => props.version,
  () => {
    drawMinimap()
  }
)

watch(
  () => props.canvas,
  () => {
    drawMinimap()
  }
)
</script>

<template>
  <div
    class="minimap"
    :style="{ left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)` }"
  >
    <div
      class="minimap-handle"
      @mousedown="handlePanelMouseDown"
    >
      <span>Minimap</span>
      <div class="minimap-controls">
        <button @mousedown.stop @click.stop.prevent="zoomOutMinimap" class="minimap-btn">-</button>
        <button @mousedown.stop @click.stop.prevent="zoomInMinimap" class="minimap-btn">+</button>
      </div>
    </div>

    <canvas
      ref="minimapCanvas"
      @mousedown="handleMouseDown"
    ></canvas>
  </div>
</template>

<style scoped>
.minimap {
  position: absolute;
  width: 180px;
  height: 180px;
  display: flex;
  flex-direction: column;

  background: white;
  border: 1px solid #ccc;

  z-index: 1100;
}
.minimap-handle {
  height: 24px;
  background: #eee;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  font-size: 12px;
  user-select: none;
}
.minimap-controls {
  display: flex;
  gap: 4px;
}
.minimap-btn {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
.minimap-btn:hover {
  background: #ddd;
}
canvas {
  width: 100%;
  height: calc(100% - 24px);
  display: block;
}
</style>