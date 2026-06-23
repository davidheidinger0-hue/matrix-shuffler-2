<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, reactive } from 'vue'

defineOptions({
  name: 'MiniMap'
})

const props = defineProps<{
  wrapper: HTMLDivElement | null
  canvas: HTMLCanvasElement | null
  version: number
  panX: number
  panY: number
}>()
const minimapCanvas = ref<HTMLCanvasElement | null>(null)
const MINIMAP_SIZE = 180

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
  canvas.height = MINIMAP_SIZE

  const scale = getScale()

  const scaledWidth =
    mainCanvas.width * scale

  const scaledHeight =
    mainCanvas.height * scale

  const offsetX =
    (MINIMAP_SIZE - scaledWidth) / 2

  const offsetY =
    (MINIMAP_SIZE - scaledHeight) / 2

  ctx.fillStyle = '#dddddd'

  ctx.fillRect(
    offsetX,
    offsetY,
    scaledWidth,
    scaledHeight,
  )

  const viewportX =
    offsetX - props.panX * scale

  const viewportY =
    offsetY - props.panY * scale

  const viewportWidth =
    wrapper.clientWidth * scale

  const viewportHeight =
    wrapper.clientHeight * scale
  
  viewport.x = viewportX
  viewport.y = viewportY
  viewport.width = viewportWidth
  viewport.height = viewportHeight

  ctx.strokeStyle = 'red'
  ctx.lineWidth = 2

  ctx.strokeRect(
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
)
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
}

const handleMouseUp = () => {
  dragState.active = false
}

// Dragging and scrolling in minimap is deactivated now
/*const handleMouseMove = (event: MouseEvent) => {
  if (!dragState.active) return

  const canvas = minimapCanvas.value

  if (!canvas) return
  if (!props.wrapper) return
  if (!props.canvas) return

  const rect = canvas.getBoundingClientRect()

  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const newViewportX =
    mouseX - dragState.offsetX

  const newViewportY =
    mouseY - dragState.offsetY
    const scale = getScale()

  const scaledWidth =
    props.canvas.width * scale
  const scaledHeight =
    props.canvas.height * scale
  const offsetX =
    (MINIMAP_SIZE - scaledWidth) / 2
  const offsetY =
    (MINIMAP_SIZE - scaledHeight) / 2

  const maxViewportX =
  offsetX + scaledWidth - viewport.width

  const maxViewportY =
    offsetY + scaledHeight - viewport.height

  const clampedViewportX = Math.max(
    offsetX,
    Math.min(newViewportX, maxViewportX),
  )

  const clampedViewportY = Math.max(
    offsetY,
    Math.min(newViewportY, maxViewportY),
  )

  props.wrapper.scrollLeft =
    (clampedViewportX - offsetX) / scale

  props.wrapper.scrollTop =
    (clampedViewportY - offsetY) / scale
}*/

const getScale = () => {
  if (!props.canvas) return 1

  return Math.min(
    MINIMAP_SIZE / props.canvas.width,
    MINIMAP_SIZE / props.canvas.height,
  )
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

  window.addEventListener(
    'mouseup',
    handleMouseUp,
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
  handleMouseUp,
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
      Minimap
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
  padding: 0 6px;
  font-size: 12px;
  user-select: none;
}
canvas {
  width: 100%;
  height: calc(100% - 24px);
  display: block;
}
</style>