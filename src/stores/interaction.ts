import { defineStore } from 'pinia'

export const useInteractionStore = defineStore('interaction', {
  state: () => ({
    hoveredCell: null as { row: number; col: number } | null,

    hoveredLabel: null as {
      type: 'row' | 'column'
      index: number
    } | null,

    dragState: null as {
      type: 'row' | 'column'
      fromIndex: number
    } | null,

    dragTargetIndex: null as number | null,

    mousePosition: {
      x: 0,
      y: 0,
    },
  }),

  actions: {
    clearHover() {
      this.hoveredCell = null
      this.hoveredLabel = null
    },

    clearDrag() {
      this.dragState = null
      this.dragTargetIndex = null
    },

    clearInteraction() {
      this.clearHover()
      this.clearDrag()
    },
  },
})
