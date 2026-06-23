<script setup lang="ts">
import { ref } from 'vue'
import PixiVisualizationWrapper from './components/PixiVisualizationWrapper.vue'
import DataTable from './components/DataTable.vue'
import SettingsPanel from './components/SettingsPanel.vue'

import { useVisualizationStore } from './stores/visualization'
import { useDatasetStore } from './stores/dataset'

import { useFileUpload } from '@/utils/utils'
import { generateMatrixSVG } from '@/utils/svgGenerator'
import CanvasVisualization from './components/CanvasVisualization.vue'

const showImportModal = ref(false)
const showExampleModal = ref(false)
const showAboutModal = ref(false)
const showHowToUseModal = ref(false)
const selectedRenderer = ref<'canvas' | 'pixi'>('canvas')

const visualizationStore = useVisualizationStore()
const datasetStore = useDatasetStore()

const colorSchemes = {
  blues: { minColor: '#e3f0fb', maxColor: '#7daee6' },
  reds: { minColor: '#fde8e8', maxColor: '#f59e9e' },
  greens: { minColor: '#e6f9ed', maxColor: '#7ed6a2' },
  black: { minColor: '#f0f0f0', maxColor: '#000000' },
}

const applyColorScheme = (scheme: keyof typeof colorSchemes) => {
  visualizationStore.updateSettings({
    colorScheme: scheme,
    minColor: colorSchemes[scheme].minColor,
    maxColor: colorSchemes[scheme].maxColor
  })
}

const changeEncoding = (encoding: string) => {
  visualizationStore.setEncoding(encoding as 'circle' | 'color' | 'circle-color' | 'color-text' | 'hatched-bar-charts' | 'bar-chart')
}

const handleImportData = () => {
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
}

const { fileError } = useFileUpload()
const dataTableRef = ref()
const pixiVisRef = ref<typeof PixiVisualizationWrapper | null>(null)
const importedDisplayName = ref<string | null>(null)

const handleDataChange = () => {
  // Data updated in visualization
}

const exportAsPNG = () => {
  const name = importedDisplayName.value
    ? importedDisplayName.value.replace(/\.[^/.]+$/, '.png')
    : 'exported_image.png'
  pixiVisRef.value?.$refs?.pixiVisualizationRef?.exportCanvasAsPNG?.(name)
}

const exportAsSVG = () => {
  const matrix = datasetStore.currentMatrix
  if (!matrix || !matrix.rowNames.length || !matrix.columnNames.length) {
    alert('No dataset loaded to export.')
    return
  }
  const encoding = visualizationStore.config.encoding || 'circle'
  const cellSize = visualizationStore.config.matrixCellDimension || 40
  const cellSpacing = visualizationStore.config.matrixCellSpacing || 2
  const fontSize = visualizationStore.config.labelSize || 14
  const labelRotation = visualizationStore.settings.labelRotation || 0
  const minColor = visualizationStore.settings.minColor || '#e3f0fb'
  const maxColor = visualizationStore.settings.maxColor || '#7daee6'
  const svg = generateMatrixSVG(matrix, {
    encoding,
    cellSize,
    cellSpacing,
    labelRotation,
    minColor,
    maxColor,
    fontSize,
  })
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    datasetStore.datasetName.replace(/\.[^/.]+$/, '.svg') ||
    importedDisplayName.value?.replace(/\.[^/.]+$/, '.svg') ||
    'exported_visualization.svg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const handleTranspose = () => {
  dataTableRef.value?.transposeData()
}

const resetDataOrder = () => {
  datasetStore.resetOrder()
}

const apply2DSort = () => {
  datasetStore.twoDimSort()
}

const handleCSVImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  // Ensure DataTable panel is shown so ref is available
  showDataTablePanel.value = true

  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      if (csv) {
        // Parse CSV data
        const lines = csv.split('\n').filter((line) => line.trim())
        const data = lines.map((line) => {
          const values = line.split(',').map((val) => val.trim())
          return values.map((val, index) => {
            // First column is usually text (item names), others are numbers
            if (index === 0) return val
            const num = parseFloat(val)
            return isNaN(num) ? val : num
          })
        })

        if (dataTableRef.value && data.length > 0) {
          const displayName = file.name || 'Imported CSV'
          importedDisplayName.value = displayName
          dataTableRef.value.loadFromCSV(data, displayName)
        }
      }
    }
    reader.readAsText(file)
  }
  closeImportModal()
}

const exampleDatasets = [
  { name: 'appropriateness.csv', path: './examples/appropriateness.csv' },
  { name: 'bertin-hotel.csv', path: './examples/bertin-hotel.csv' },
  { name: 'bertin-navy.csv', path: './examples/bertin-navy.csv' },
  { name: 'bertin-towns.csv', path: './examples/bertin-towns.csv' },
  { name: 'cereal.csv', path: './examples/cereal.csv' },
  { name: 'european-values.csv', path: './examples/european-values.csv' },
  { name: 'motor-trend-cars', path: './examples/motor-trend-cars.csv' },
  { name: 'sample-data.csv', path: './examples/sample-data.csv' },
  { name: 'test-data.csv', path: './examples/test-data.csv' },
  { name: 'wholesale-customers-data', path: './examples/wholesale-customers-data.csv' },
  { name: 'wine-analysis.csv', path: './examples/wine-analysis.csv' },
  { name: 'zoo.csv', path: './examples/zoo.csv' },
]

const openExampleModal = () => {
  showExampleModal.value = true
}
const closeExampleModal = () => {
  showExampleModal.value = false
}

const handleLoadExample = async (dataset: { name: string; path: string }) => {
  try {
    // Fetch CSV from public/examples
    showDataTablePanel.value = true
    console.log('Loading example dataset:', dataset.name, dataset.path)
    const response = await fetch(dataset.path)
    const csv = await response.text()
    const lines = csv.split('\n').filter((line) => line.trim())
    const data = lines.map((line) => {
      const values = line.split(',').map((val) => val.trim())
      return values.map((val, index) => {
        if (index === 0) return val
        const num = parseFloat(val)
        return isNaN(num) ? val : num
      })
    })
    if (dataTableRef.value && data.length > 0) {
      importedDisplayName.value = dataset.name
      dataTableRef.value.loadFromCSV(data, dataset.name)
    }
    closeExampleModal()
  } catch {
    alert('Failed to load example dataset: ' + dataset.name)
  }
}

const showSettingsPanel = ref(false)
const toggleSettingsPanel = () => {
  showSettingsPanel.value = !showSettingsPanel.value
}

const showDataTablePanel = ref(false)
const toggleDataTablePanel = () => {
  showDataTablePanel.value = !showDataTablePanel.value
}

const dataTablePanelWidth = ref(340)
const minDataTablePanelWidth = 340
const maxDataTablePanelWidth = 1200
let isResizingDataTablePanel = false

const startResizeDataTablePanel = () => {
  isResizingDataTablePanel = true
  document.body.style.cursor = 'ew-resize'
  window.addEventListener('mousemove', resizeDataTablePanel)
  window.addEventListener('mouseup', stopResizeDataTablePanel)
}

const resizeDataTablePanel = (e: MouseEvent) => {
  if (!isResizingDataTablePanel) return
  const newWidth = Math.min(maxDataTablePanelWidth, Math.max(minDataTablePanelWidth, e.clientX))
  dataTablePanelWidth.value = newWidth
}

const stopResizeDataTablePanel = () => {
  isResizingDataTablePanel = false
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', resizeDataTablePanel)
  window.removeEventListener('mouseup', stopResizeDataTablePanel)
}

const settingsPanelWidth = ref(340)
const minSettingsPanelWidth = 340
const maxSettingsPanelWidth = 800
let isResizingSettingsPanel = false

const startResizeSettingsPanel = () => {
  isResizingSettingsPanel = true
  document.body.style.cursor = 'ew-resize'
  window.addEventListener('mousemove', resizeSettingsPanel)
  window.addEventListener('mouseup', stopResizeSettingsPanel)
}

const resizeSettingsPanel = (e: MouseEvent) => {
  if (!isResizingSettingsPanel) return
  const newWidth = Math.min(maxSettingsPanelWidth, Math.max(minSettingsPanelWidth, window.innerWidth - e.clientX))
  settingsPanelWidth.value = newWidth
}

const stopResizeSettingsPanel = () => {
  isResizingSettingsPanel = false
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', resizeSettingsPanel)
  window.removeEventListener('mouseup', stopResizeSettingsPanel)
}

const exportDatasetAsCSV = () => {
  const matrix = datasetStore.currentMatrix
  if (!matrix || !matrix.rowNames.length || !matrix.columnNames.length) {
    alert('No dataset loaded to export.')
    return
  }
  const header = [''].concat(matrix.columnNames).join(',')
  const rows = matrix.rowNames.map((rowName, i) => {
    const row = matrix.values[i].map((cell) => cell.initialValue)
    return [rowName, ...row].join(',')
  })
  const csvContent = [header, ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    datasetStore.datasetName ||
    importedDisplayName.value?.replace(/\.[^/.]+$/, '.csv') ||
    'exported_data.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const openAboutModal = () => {
  showAboutModal.value = true
}
const closeAboutModal = () => {
  showAboutModal.value = false
}

const openHowToUseModal = () => {
  showHowToUseModal.value = true
}
const closeHowToUseModal = () => {
  showHowToUseModal.value = false
}

const showMinimap = ref(true)
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <nav class="main-nav">
        <ul>
          <li class="dropdown">
            <a href="#" class="dropbtn">File</a>
            <div class="dropdown-content">
              <a href="#" @click.prevent="handleImportData">Import Data</a>
              <a href="#" @click.prevent="openExampleModal">Load Example Dataset</a>
              <a href="#" @click.prevent="exportDatasetAsCSV">Export Data</a>
              <a href="#" @click="exportAsPNG">Export as PNG</a>
              <a href="#" @click="exportAsSVG">Export as SVG</a>
            </div>
          </li>

          <li class="dropdown">
            <a href="#" class="dropbtn">Encoding</a>
            <div class="dropdown-content">
              <a href="#" @click.prevent="changeEncoding('circle')" class="tooltip-trigger" :class="{ 'active-check': visualizationStore.config.encoding === 'circle' }">
                Circles
                <span class="tooltip-box">Uses circles to convey values. The larger the circle the higher the value. An empty cell corresponds to the minimum value on the row, a circle filling the cell corresponds to the maximum value.</span>
              </a>
              <a href="#" @click.prevent="changeEncoding('color')" class="tooltip-trigger" :class="{ 'active-check': visualizationStore.config.encoding === 'color' }">
                Gradient
                <span class="tooltip-box">Uses colour gradients to convey values. The darker the shade the higher the value. A cell with the lightest shade corresponds to the minimum value on the row, a cell with the darkest shade corresponds to the maximum value.</span>
              </a>
              <a href="#" @click.prevent="changeEncoding('circle-color')" class="tooltip-trigger" :class="{ 'active-check': visualizationStore.config.encoding === 'circle-color' }">
                Circle + Gradient
                <span class="tooltip-box">Uses both circles and colour gradients to convey values simultaneously. The larger and darker the circle the higher the value. An empty cell corresponds to the minimum value on the row, a completely filled and darkest circle corresponds to the maximum value.</span>
              </a>
              <a href="#" @click.prevent="changeEncoding('color-text')" class="tooltip-trigger" :class="{ 'active-check': visualizationStore.config.encoding === 'color-text' }">
                Text + Gradient
                <span class="tooltip-box">Uses exact numerical text superimposed on colour gradients to convey values. The darker the shade the higher the value. A cell with the lightest shade corresponds to the minimum value, while the text displays the exact underlying data.</span>
              </a>
              <a href="#" @click.prevent="changeEncoding('hatched-bar-charts')" class="tooltip-trigger" :class="{ 'active-check': visualizationStore.config.encoding === 'hatched-bar-charts' }">
                Hatched Bar Charts
                <span class="tooltip-box">Uses bar charts with hatched lines to convey values. A white cell corresponds to the minimum value on the row; a cell filled with hatched lines corresponds to the midpoint value, and a black cell corresponds to the maximum value.</span>
              </a>
              <a href="#" @click.prevent="changeEncoding('bar-chart')" class="tooltip-trigger" :class="{ 'active-check': visualizationStore.config.encoding === 'bar-chart' }">
                Bar Chart
                <span class="tooltip-box">Uses bar charts to convey values. The higher the bar the higher the value. A bar with zero height corresponds to the minimum value on the row, a bar with maximum height corresponds to the maximum value.</span>
              </a>
            </div>
          </li>

          <li class="dropdown">
            <a href="#" class="dropbtn">Colour Scheme</a>
            <div class="dropdown-content">
              <a href="#" @click.prevent="applyColorScheme('black')" :class="{ 'active-check': visualizationStore.settings.colorScheme === 'black' }">Black</a>
              <a href="#" @click.prevent="applyColorScheme('blues')" :class="{ 'active-check': visualizationStore.settings.colorScheme === 'blues' }">Blues</a>
              <a href="#" @click.prevent="applyColorScheme('reds')" :class="{ 'active-check': visualizationStore.settings.colorScheme === 'reds' }">Reds</a>
              <a href="#" @click.prevent="applyColorScheme('greens')" :class="{ 'active-check': visualizationStore.settings.colorScheme === 'greens' }">Greens</a>
            </div>
          </li>

          <li class="dropdown">
            <a href="#" class="dropbtn">Actions</a>
            <div class="dropdown-content">
              <a href="#" @click.prevent="resetDataOrder">Original Data Order</a>
              <a href="#" @click.prevent="apply2DSort">2D Sort</a>
              <a href="#" @click.prevent="handleTranspose">Transpose Matrix</a>
            </div>
          </li>

          <li class="dropdown">
            <a href="#" class="dropbtn">Help</a>
            <div class="dropdown-content">
              <a href="#" @click.prevent="openHowToUseModal">How to use</a>
              <a href="#" @click.prevent="openAboutModal">About</a>
            </div>
          </li>

          <li class="menu-separator">|</li>
            <li class="menu-button">
              <a href="#"
                @click.prevent="showMinimap = !showMinimap"
                :class="{ active: showMinimap }"
              >
                Minimap{{ showMinimap ? ' ✓' : '' }}
              </a>
            </li>
        </ul>
      </nav>
    </header>

    <main class="content-area">
      <div class="wrapper">
        <div class="main-content">
          <!-- Data Table Panel -->
          <div>
            <transition name="slide-left-panel">
              <div
                v-if="showDataTablePanel"
                class="side-panel-data"
                :style="`width: ${dataTablePanelWidth}px;`"
              >
                <DataTable ref="dataTableRef" @dataChanged="handleDataChange" />
                <div
                  class="resize-handle"
                  @mousedown="startResizeDataTablePanel"
                  title="Resize panel"
                ></div>
              </div>
            </transition>
          </div>
          <!-- PixiJS Visualization View -->

          <div
            class="visualization-view"
            :style="{
              marginLeft: showDataTablePanel ? `${dataTablePanelWidth}px` : '0',
              marginRight: showSettingsPanel ? `${settingsPanelWidth}px` : '0',
            }"
          >
            <div class="renderer-toolbar">
              <button class="chevron-btn chevron-left" @click="toggleDataTablePanel" :title="showDataTablePanel ? 'Hide Data' : 'Show Data'">
                {{ showDataTablePanel ? '❮' : '❯' }}
              </button>
              
              <div class="renderer-select-group">
                <label for="renderer-select">Renderer:</label>
                <select id="renderer-select" v-model="selectedRenderer">
                  <option value="canvas">Canvas 2D</option>
                  <option value="pixi">PixiJS</option>
                </select>
              </div>

              <button class="chevron-btn chevron-right" @click="toggleSettingsPanel" :title="showSettingsPanel ? 'Hide Settings' : 'Show Settings'">
                {{ showSettingsPanel ? '❯' : '❮' }}
              </button>
            </div>

            <CanvasVisualization 
              v-if="selectedRenderer === 'canvas'" 
              :showMinimap="showMinimap"
            />

            <PixiVisualizationWrapper
             v-else
              ref="pixiVisRef"
              :useRandomData="false"
          />
          </div>
        </div>

        <transition name="slide-side-panel">
          <div v-if="showSettingsPanel" class="side-panel" :style="`width: ${settingsPanelWidth}px;`">
            <div
              class="resize-handle-left"
              @mousedown="startResizeSettingsPanel"
              title="Resize panel"
            ></div>
            <SettingsPanel />
          </div>
        </transition>
      </div>
    </main>

    <div v-if="showImportModal" class="modal-overlay" @click.self="closeImportModal">
      <div class="modal-content">
        <button class="modal-close-button" @click="closeImportModal">&times;</button>
        <h3>Import Data</h3>
        <p>Select the dataset</p>
        <!-- Example: File input for import -->
        <input type="file" accept=".csv,.tsv" @change="handleCSVImport" />
        <div v-if="fileError" class="file-error">
          <p>Error: {{ fileError }}</p>
        </div>
        <!--
        <div
          v-if="fileData && showFileData"
          class="file-output"
          style="max-height: 300px; overflow-y: auto"
        >
          <h4>File Content Summary:</h4>
          <pre>{{ fileData }}</pre>
        </div>
        -->
        <div class="modal-actions">
          <button @click="closeImportModal">Cancel</button>
          <button @click="closeImportModal">Import</button>
          <!--
          <button v-if="fileData" @click="showFileData = !showFileData" style="margin-left: 10px">
            {{ showFileData ? 'Hide' : 'Show' }} File Summary
          </button>
          -->
        </div>
      </div>
    </div>

    <div v-if="showExampleModal" class="modal-overlay" @click.self="closeExampleModal">
      <div class="modal-content">
        <button class="modal-close-button" @click="closeExampleModal">&times;</button>
        <h3>Load Example Dataset</h3>
        <p>Select an example dataset to load:</p>
        <ul style="list-style: none; padding: 0">
          <li v-for="dataset in exampleDatasets" :key="dataset.name" style="margin-bottom: 10px">
            <button
              @click="handleLoadExample(dataset)"
              style="
                width: 100%;
                text-align: left;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #ccc;
                background: #f7f7f7;
                cursor: pointer;
              "
            >
              {{ dataset.name }}
            </button>
          </li>
        </ul>
        <div class="modal-actions">
          <button @click="closeExampleModal">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showAboutModal" class="modal-overlay" @click.self="closeAboutModal">
      <div class="modal-content">
        <button class="modal-close-button" @click="closeAboutModal">&times;</button>
        <h2>About Matrix Shuffler 2</h2>
        <p>
          Matrix Shuffler 2 is an extension of Matrix Shuffler, an interactive tool for
          visualizing and reordering matrices.  <br />
          This version adds new features and
          improvements while building upon the original project.<br /><br />
          <strong>License:</strong> MIT<br />
          <strong
            >Developed as part of the Information Visualisation course at Graz University of
            Technology (Technische Universität Graz).</strong
          ><br /><br />
          <strong>Original Matrix Shuffler:</strong><br />
          Created by Andrej Knaus, Esma Karic, and Laura Thaçi. <br /><br />
          <strong>Matrix Shuffler 2:</strong><br />
          Extended and further developed by Lukas Auer, David Heidinger, Nina Tschikof and Christina Vogel<br /><br />
          <strong>GitHub Repositories:</strong><br />
          Matrix Shuffler:
          <a href="https://github.com/AndrejKnaus/matrix-shuffler" target="_blank" rel="noopener"
            >https://github.com/AndrejKnaus/matrix-shuffler</a
          ><br />
          Matrix Shuffler 2:
          <a href="https://github.com/davidheidinger0-hue/matrix-shuffler-2" target="_blank" rel="noopener"
            >https://github.com/davidheidinger0-hue/matrix-shuffler-2</a
          >
        </p>
      </div>
    </div>

    <div v-if="showHowToUseModal" class="modal-overlay" @click.self="closeHowToUseModal">
      <div class="modal-content">
        <button class="modal-close-button" @click="closeHowToUseModal">&times;</button>
        <h2>How to use</h2>
        <ul style="padding-left: 1.2em">
          <li><b>Reorder row/column:</b> Click and drag row or column labels</li>
          <li><b>Zoom:</b> Use the mouse wheel or touchpad gestures</li>
          <li><b>Pan visualisation:</b> Use the middle mouse button or drag the red box in the minimap</li>
          <li><b>Show tooltip:</b> Hover over a cell</li>
          <li><b>Transpose matrix:</b> Use the Actions menu</li>
          <li><b>Export:</b> Use the File menu for PNG, SVG, or CSV export</li>
        </ul>
      </div>
    </div>

    <!--
  <RouterView />
  --></div>
</template>

<style scoped>

.renderer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  background: white;
  border-bottom: 1px solid #ddd;
}

.renderer-select-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chevron-btn {
  background-color: var(--color-primary-light);
  color: white;
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron-btn:hover {
  background-color: var(--color-primary);
}

.chevron-left {
  border-radius: 0 8px 8px 0;
}

.chevron-right {
  border-radius: 8px 0 0 8px;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-header {
  width: 100%;
  background-color: var(--color-primary);
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-nav ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: flex-start; /* Or center, space-around, etc. */
}

.main-nav li {
  position: relative; /* For dropdown positioning */
}

.menu-button a {
  display: block;
  color: white;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
}

.menu-separator {
  color: white;
  padding: 14px 4px;
  user-select: none;
}

.main-nav a.dropbtn {
  display: block;
  color: white;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
}

.main-nav li a:hover,
.dropdown:hover .dropbtn {
  background-color: var(--color-primary-light);
  color: var(--color-on-hover);
  transition: 0.1s;
}

/* Dropdown Content (Hidden by Default) */
.dropdown-content {
  display: none;
  position: absolute;
  background-color: var(--color-background-soft);
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1400;
}

/* Links inside the dropdown */
.dropdown-content a {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  text-align: left;
  white-space: nowrap;
}

/* Change color of dropdown links on hover */
.dropdown-content a:hover {
  background-color: #ddd;
}

/* Show the dropdown menu on hover */
.dropdown:hover .dropdown-content {
  display: block;
}

.content-area {
  flex: 1 1 0;
  width: 100%;
  height: calc(100vh - 60px); /* header height */
  margin-top: 52px; /* header height */
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* Ensure modal is on top */
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-width: 80%;
  position: relative;
}

.modal-close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #333;
}

.modal-actions {
  margin-top: 20px;
  text-align: right;
}

.modal-actions button {
  margin-left: 10px;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions button:first-child {
  background-color: #eee;
  border: 1px solid #ccc;
}

.modal-actions button:last-child {
  background-color: var(--color-primary-light); /* Example primary action color */
  color: white;
  border: 1px solid var(--color-primary);
}

.wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  min-width: 0;
}

.main-content {
  display: flex;
  height: 100%;
  padding: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.data-panel {
  flex: 0 0 auto;
  min-height: 250px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Responsive layout for wider screens */
@media (min-width: 768px) {
  .main-content {
    flex-direction: row;
    padding: 0;
  }

  .data-panel {
    flex: 0 0 350px;
    min-height: 0;
    max-height: none;
    max-width: 350px;
  }
}

@media (min-width: 1024px) {
  .data-panel {
    flex: 0 0 400px;
    max-width: 400px;
  }
}

@media (min-width: 1200px) {
  .data-panel {
    flex: 0 0 420px;
    max-width: 420px;
  }
}

.visualization-view {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  transition: margin 0.3s ease;
}

.side-panel {
  position: fixed;
  top: 52px;
  right: 0;
  width: 340px;
  height: calc(100vh - 52px);
  background: white;
  border-left: 1px solid var(--color-border);
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1300;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.side-panel-data {
  position: fixed;
  top: 52px;
  left: 0;
  /* width is now dynamic via inline style */
  height: calc(100vh - 52px);
  background: white;
  border-right: 1px solid var(--color-border);
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1300;
  display: flex;
  flex-direction: column;
}

.close-side-panel {
  position: absolute;
  top: 10px;
  left: 50px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #333;
  cursor: pointer;
  z-index: 1400;
}

/* Right side panel transition */
.slide-side-panel-enter-active,
.slide-side-panel-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-side-panel-enter-from,
.slide-side-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-side-panel-enter-to,
.slide-side-panel-leave-from {
  transform: translateX(0);
  opacity: 1;
}

/* Left side panel transition */
.slide-left-panel-enter-active,
.slide-left-panel-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-left-panel-enter-from,
.slide-left-panel-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-left-panel-enter-to,
.slide-left-panel-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -6px;
  width: 12px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  z-index: 1400;
  transition: background 0.2s;


}

.resize-handle::after {
  content: '⋮⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #1f6feb;
  font-size: 20px;
  font-weight: bold;
  letter-spacing: -4px;
}
.resize-handle:hover {
  background: rgba(0, 0, 0, 0.07);
}

.resize-handle-left {
  position: absolute;
  top: 0;
  left: -6px;
  width: 12px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  z-index: 1400;
  transition: background 0.2s;
}

.resize-handle-left::after {
  content: '⋮⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #1f6feb;
  font-size: 20px;
  font-weight: bold;
  letter-spacing: -4px;
}
.resize-handle-left:hover {
  background: rgba(0, 0, 0, 0.07);
}

.example-dataset-list {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

.example-dataset-item {
  margin: 10px 0;
}

.load-example-btn {
  background-color: var(--color-primary-light);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 15px;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.load-example-btn:hover {
  background-color: var(--color-primary);
}

.dropdown-content a::before {
  content: '';
  display: inline-block;
  width: 20px;
  font-weight: bold;
}

.dropdown-content a.active-check::before {
  content: '✓';
}
</style>

<style scoped>
.tooltip-trigger {
  position: relative;
}

.tooltip-trigger .tooltip-box {
  visibility: hidden;
  width: 250px;
  background-color: #3c7add;
  color: #ffffff;
  text-align: left;
  border-radius: 0;
  padding: 12px;
  position: absolute;
  z-index: 1000;

  top: 0;
  left: 100%;
  margin-left: 5px;

  font-size: 0.85rem;
  line-height: 1.4;
  opacity: 0;
  transform: translateX(-5px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  white-space: normal;

  pointer-events: none;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.15);
  border: none;
}

.tooltip-trigger .tooltip-box::after {
  content: "";
  position: absolute;
  top: 15px;
  right: 100%;
  margin-top: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent #3c7add transparent transparent;
}

.dropdown-content a:hover.tooltip-trigger .tooltip-box {
  visibility: visible;
  opacity: 1;
  transform: translateX(0);
}
</style>
