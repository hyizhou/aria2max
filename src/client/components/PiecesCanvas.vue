<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  colors: string[]
  height?: number
}>(), {
  height: 10
})

const canvas = ref<HTMLCanvasElement>()
let observer: ResizeObserver | null = null

const draw = () => {
  const el = canvas.value
  if (!el) return

  const ctx = el.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = props.height

  el.width = w * dpr
  el.height = h * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const n = props.colors.length
  if (n === 0 || w === 0) return

  const pw = w / n

  for (let i = 0; i < n; i++) {
    ctx.fillStyle = props.colors[i]
    ctx.fillRect(Math.floor(i * pw), 0, Math.ceil(pw), h)
  }
}

onMounted(() => {
  draw()
  if (canvas.value) {
    observer = new ResizeObserver(draw)
    observer.observe(canvas.value)
  }
})

onUnmounted(() => observer?.disconnect())

watch(() => props.colors, draw, { deep: true })
watch(() => props.height, draw)
</script>

<template>
  <canvas ref="canvas" :style="{ width: '100%', height: height + 'px', display: 'block' }" />
</template>
