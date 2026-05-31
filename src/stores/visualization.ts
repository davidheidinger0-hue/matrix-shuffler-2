import type { VisualizationConfig, VisualizationEncoding } from '@/types/visualizationConfig'

import { defineStore } from 'pinia'

export interface VisualizationSettings {
  colorScheme: string
  minColor: string
  maxColor: string
  normalization: 'none' | 'row' | 'column' | 'global'
  labelRotation: number
  cellSize: number
}

const calculateOptimalLabelRotation = (
  columnNames: string[],
  cellSize: number,
  fontSize: number = 14,
): number => {
  if (!columnNames || columnNames.length === 0) return 45

  const maxLabelLength = Math.max(...columnNames.map((name) => name.length))
  const estimatedTextWidth = maxLabelLength * fontSize * 0.6

  const availableWidth = cellSize

  if (estimatedTextWidth <= availableWidth) {
    return 0
  }

  if (estimatedTextWidth > availableWidth * 3) {
    return 90
  }

  const spaceRatio = availableWidth / estimatedTextWidth

  if (spaceRatio > 0.8) return 15
  if (spaceRatio > 0.6) return 30
  if (spaceRatio > 0.4) return 45
  if (spaceRatio > 0.2) return 60
  return 75
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
      colorScheme: 'blues',
      cellShape: 'circle',
      showLabels: true,
      encoding: 'color',
      matrixCellDimension: 40,
      matrixCellSpacing: 2,
      labelSize: 14,
    },
    settings: {
      colorScheme: 'blues',
      minColor: '#e3f0fb',
      maxColor: '#7daee6',
      normalization: 'none',
      labelRotation: 45,
      cellSize: 40,
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
    calculateAndSetOptimalLabelRotation(columnNames: string[], cellSize?: number) {
      const optimalRotation = calculateOptimalLabelRotation(
        columnNames,
        cellSize || this.config.matrixCellDimension,
      )
      this.settings.labelRotation = optimalRotation
    },
  },
})
