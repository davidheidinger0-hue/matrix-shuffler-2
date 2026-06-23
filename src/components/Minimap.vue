<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, reactive } from 'vue'

defineOptions({
  name: 'MiniMap'
})

const props = defineProps<{
  wrapper: HTMLDivElement | null
  canvas: HTMLCanvasElement | null
  version: number
}>()
const minimapCanvas = ref<HTMLCanvasElement | null>(null)
  const wrapperRef = ref<HTMLDivElement | null>(null)
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
  offsetX: 0,
  offsetY: 0,
}
const position = reactive({
  x: 60,
  y: 20,
})

const drawMinimap = () => {
  const mainCanvas = props.canvas
  const wrapper = wrapperRef.value

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
    offsetX + wrapper.scrollLeft * scale

  const viewportY =
    offsetY + wrapper.scrollTop * scale

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

// Dragging and scrolling in minimap
const handleMouseMove = (event: MouseEvent) => {
  if (!dragState.active) return

  const canvas = minimapCanvas.value

  if (!canvas) return
  if (!wrapperRef.value) return
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

  wrapperRef.value.scrollLeft =
    (clampedViewportX - offsetX) / scale

  wrapperRef.value.scrollTop =
    (clampedViewportY - offsetY) / scale
}

const getScale = () => {
  if (!props.canvas) return 1

  return Math.min(
    MINIMAP_SIZE / props.canvas.width,
    MINIMAP_SIZE / props.canvas.height,
  )
}

const handlePanelMouseDown = (event: MouseEvent) => {
  panelDrag.active = true

  panelDrag.offsetX = event.clientX - position.x
  panelDrag.offsetY = event.clientY - position.y

  window.addEventListener('mousemove', handlePanelMouseMove)
  window.addEventListener('mouseup', handlePanelMouseUp)
}

const handlePanelMouseMove = (event: MouseEvent) => {
  if (!panelDrag.active) return

  position.x = event.clientX - panelDrag.offsetX
  position.y = event.clientY - panelDrag.offsetY
}

const handlePanelMouseUp = () => {
  panelDrag.active = false

  window.removeEventListener('mousemove', handlePanelMouseMove)
  window.removeEventListener('mouseup', handlePanelMouseUp)
}

const handleScroll = () => {
  drawMinimap()
}

onMounted(async () => {
  await nextTick()

  wrapperRef.value = props.wrapper

  drawMinimap()

  wrapperRef.value?.addEventListener(
    'scroll',
    handleScroll,
  )

  window.addEventListener(
    'mousemove',
    handleMouseMove,
  )

  window.addEventListener(
    'mouseup',
    handleMouseUp,
  )
})

onUnmounted(() => {
  wrapperRef.value?.removeEventListener(
    'scroll',
    handleScroll,
  )

  window.removeEventListener(
    'mousemove',
    handleMouseMove,
  )

  window.removeEventListener(
    'mouseup',
    handleMouseUp,
  )
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
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
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
  right: 20px;
  bottom: 60px;

  width: 180px;
  height: 180px;
  display: flex;
  flex-direction: column;

  background: white;
  border: 1px solid #ccc;

  z-index: 9999;
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