export interface VisualizationConfig {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  colorScheme: 'blues' | 'greens' | 'heatmap'
  cellShape: 'rect' | 'circle'
  showLabels: boolean
  encoding: VisualizationEncoding
  matrixCellDimension: number
  matrixCellSpacing: number
  labelSize: number
}

export type VisualizationEncoding = 'circle' | 'color' | 'circle-color' | 'color-text'
