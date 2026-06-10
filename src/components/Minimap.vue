<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  wrapper: HTMLDivElement | null
  canvas: HTMLCanvasElement | null
}>()
const minimapCanvas = ref<HTMLCanvasElement | null>(null)
const drawMinimap = () => {
  const mainCanvas = props.canvas
  const wrapper = props.wrapper

  if (!mainCanvas || !wrapper) return

  const canvas = minimapCanvas.value

  if (!canvas) return

  const ctx = canvas.getContext('2d')

  if (!ctx) return

  canvas.width = 180
  canvas.height = 180

  const minimapWidth = 180
  const minimapHeight = 180

  const scale = Math.min(
    minimapWidth / mainCanvas.width,
    minimapHeight / mainCanvas.height,
  )

  const scaledWidth =
    mainCanvas.width * scale

  const scaledHeight =
    mainCanvas.height * scale

  ctx.fillStyle = '#dddddd'

  ctx.fillRect(
    0,
    0,
    scaledWidth,
    scaledHeight,
  )

  const viewportX =
    wrapper.scrollLeft * scale

  const viewportY =
    wrapper.scrollTop * scale

  const viewportWidth =
    wrapper.clientWidth * scale

  const viewportHeight =
    wrapper.clientHeight * scale

  ctx.strokeStyle = 'red'
  ctx.lineWidth = 2

  ctx.strokeRect(
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
)
}

const handleScroll = () => {
  drawMinimap()
}

onMounted(() => {
  drawMinimap()

  props.wrapper?.addEventListener(
    'scroll',
    handleScroll,
  )
})

onUnmounted(() => {
  props.wrapper?.removeEventListener(
    'scroll',
    handleScroll,
  )
})
</script>

<template>
  <div class="minimap">
    <canvas ref="minimapCanvas"></canvas>
  </div>
</template>

<style scoped>
.minimap {
  position: absolute;
  right: 20px;
  bottom: 60px;

  width: 180px;
  height: 180px;

  background: white;
  border: 1px solid #ccc;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>