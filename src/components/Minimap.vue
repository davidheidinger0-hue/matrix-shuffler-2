<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps<{
  wrapper: HTMLDivElement | null
  canvas: HTMLCanvasElement | null
  version: number
}>()
const minimapCanvas = ref<HTMLCanvasElement | null>(null)
const MINIMAP_SIZE = 180

const position = ref({
  x: window.innerWidth - 200,
  y: window.innerHeight - 220,
})

const moveState = {
  active: false,
  offsetX: 0,
  offsetY: 0,
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
  //const canvas = minimapCanvas.value

  //if (!canvas) return

  //const rect = canvas.getBoundingClientRect()
  const rect = minimapCanvas.value!.getBoundingClientRect()

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

const handleMouseMove = (event: MouseEvent) => {
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
}

const handlePanelPointerDown = (event: PointerEvent) => {
  console.log("PANEL DRAG START")
  moveState.active = true

  moveState.offsetX = event.clientX - position.value.x
  moveState.offsetY = event.clientY - position.value.y
}

const handlePanelPointerMove = (event: PointerEvent) => {
  if (!moveState.active) return

  position.value.x = event.clientX - moveState.offsetX
  position.value.y = event.clientY - moveState.offsetY
}

const handlePanelPointerUp = () => {
  moveState.active = false
}

const getScale = () => {
  if (!props.canvas) return 1

  return Math.min(
    MINIMAP_SIZE / props.canvas.width,
    MINIMAP_SIZE / props.canvas.height,
  )
}

const handleScroll = () => {
  drawMinimap()
}

onMounted(async () => {
  await nextTick()

  drawMinimap()

  props.wrapper?.addEventListener(
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

  // for moving minimap
  window.addEventListener(
    'pointermove',
    handlePanelPointerMove
  )
  window.addEventListener(
    'pointerup',
    handlePanelPointerUp
  )
})

onUnmounted(() => {
  props.wrapper?.removeEventListener(
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

   window.removeEventListener(
    'pointermove',
    handlePanelPointerMove
  )
  window.removeEventListener(
    'pointerup',
    handlePanelPointerUp
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
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
    }"
    @pointerdown="handlePanelPointerDown"
  >
    <canvas ref="minimapCanvas"></canvas>
  </div>
</template>

<style scoped>
.minimap {
  position: fixed;
  /*right: 20px;
  bottom: 60px;*/

  width: 180px;
  height: 180px;

  background: white;
  border: 1px solid #ccc;

  z-index: 9999;

  user-select: none;
}
canvas {
  pointer-events: none;
  width: 100%;
  height: 100%;
  display: block;
}
</style>