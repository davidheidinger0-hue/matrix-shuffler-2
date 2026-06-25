import type { VisualizationConfig, VisualizationEncoding } from '@/types/visualizationConfig'

import { defineStore } from 'pinia'

export interface VisualizationSettings {
  colorScheme: string
  minColor: string
  maxColor: string
  normalization: 'none' | 'row' | 'column' | 'global'
  labelRotation: number
  cellSize: number
  enableCellDragging: boolean
}

export const useVisualizationStore = defineStore('visualization', {
  state: (): {
    config: VisualizationConfig
    settings: VisualizationSettings
  } => ({
    config: {
      width: 600,
      height: 600,
      margin: { top: 50, right: 50, bottom: 50, left: 50 },
      colorScheme: 'black',
      cellShape: 'circle',
      showLabels: true,
      encoding: 'circle',
      matrixCellDimension: 40,
      matrixCellSpacing: 2,
      labelSize: 14,
    },
    settings: {
      colorScheme: 'black',
      minColor: '#f0f0f0',
      maxColor: '#000000',
      normalization: 'none',
      labelRotation: 45,
      cellSize: 40,
      enableCellDragging: true,
    },
  }),
  actions: {
    updateConfig(partialConfig: Partial<VisualizationConfig>) {
      this.config = { ...this.config, ...partialConfig }
    },
    setEncoding(encoding: VisualizationEncoding) {
      this.config.encoding = encoding
    },
    updateSettings(partialSettings: Partial<VisualizationSettings>) {
      this.settings = { ...this.settings, ...partialSettings }
    },
    setNormalization(normalization: 'none' | 'row' | 'column' | 'global') {
      this.settings.normalization = normalization
    },
    setMatrixCellDimension(size: number) {
      this.config.matrixCellDimension = size
      this.settings.cellSize = size

      if (size < 18) {
        this.config.labelSize = 10
      } else if (size < 28) {
        this.config.labelSize = 12
      } else {
        this.config.labelSize = 14
      }
    },
  },
})
