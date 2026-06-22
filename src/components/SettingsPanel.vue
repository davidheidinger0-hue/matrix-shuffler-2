<template>
  <div class="settings-panel">
    <div class="panel-header">
      <h3>Settings</h3>
    </div>

    <div class="panel-content" v-show="isOpen">
      <div class="setting-group">
        <h3 class="settings-heading">Normalisation</h3>
        <div class="radio-group">
          <label>
            <input
              type="radio"
              v-model="localSettings.normalization"
              value="none"
              @change="applySettings"
            />
            None
          </label>
          <label>
            <input
              type="radio"
              v-model="localSettings.normalization"
              value="row"
              @change="applySettings"
            />
            Row-wise
          </label>
          <label>
            <input
              type="radio"
              v-model="localSettings.normalization"
              value="column"
              @change="applySettings"
            />
            Column-wise
          </label>
          <label>
            <input
              type="radio"
              v-model="localSettings.normalization"
              value="global"
              @change="applySettings"
            />
            Global
          </label>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="settings-heading">Label Rotation</h3>
        <label>
          Rotate Column Labels: {{ localSettings.labelRotation }}°
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            v-model="localSettings.labelRotation"
            @input="applySettings"
          />
        </label>
        <div class="rotation-controls">
          <button @click="setRotation(0)" class="btn-preset">0°</button>
          <button @click="setRotation(45)" class="btn-preset">45°</button>
          <button @click="setRotation(90)" class="btn-preset">90°</button>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="settings-heading">Cell Size</h3>
        <label>
          Cell Dimension: {{ localSettings.cellSize }}
          <input
            type="range"
            min="10"
            max="40"
            step="1"
            v-model.number="localSettings.cellSize"
            @input="applyCellSizeSettings"
          />
        </label>
        <div class="cell-size-controls">
          <button @click="setCellSize(10)" class="btn-preset">10</button>
          <button @click="setCellSize(20)" class="btn-preset">20</button>
          <button @click="setCellSize(40)" class="btn-preset">40</button>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="settings-heading">Visualisation Colours</h3>
        <div class="color-inputs">
          <div class="color-input-group">
            <label>Min Colour:</label>
            <input type="color" v-model="localSettings.minColor" @change="applySettings" />
            <span class="color-preview" :style="{ backgroundColor: localSettings.minColor }"></span>
          </div>
          <div class="color-input-group">
            <label>Max Colour:</label>
            <input type="color" v-model="localSettings.maxColor" @change="applySettings" />
            <span class="color-preview" :style="{ backgroundColor: localSettings.maxColor }"></span>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <button @click="resetSettings" class="btn-reset">Reset to Defaults</button>
      </div>

      <div class="setting-group" v-if="datasetStore.hasData">
        <h3 class="settings-heading">Matrix Sorting</h3>
        <div class="sort-subsection">
          <h5>Quick Actions</h5>
          <div class="sort-button-grid">
            <button @click="datasetStore.resetOrder()" class="sort-btn">Reset Order</button>
            <button @click="datasetStore.shuffleRows()" class="sort-btn">Shuffle Rows</button>
            <button @click="datasetStore.shuffleColumns()" class="sort-btn">Shuffle Cols</button>
          </div>
        </div>

        <div class="sort-subsection">
          <h5>Algorithmic Solutions</h5>
          <div class="sort-button-grid">
            <button @click="datasetStore.applySeriation()" class="sort-btn">
              Greedy Seriation
            </button>
            <button @click="datasetStore.twoDimSort()" class="sort-btn">2D Sort</button>
          </div>
        </div>

        <!-- Statistical Sorting -->
        <div class="sort-subsection">
          <h5>Statistical Sorting</h5>
          <div class="sort-controls">
            <label>Method:</label>
            <select v-model="selectedMethod" class="sort-select">
              <option value="sum">Sum</option>
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="max">Maximum</option>
              <option value="min">Minimum</option>
              <option value="variance">Variance</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
          <div class="sort-controls">
            <label>Direction:</label>
            <select v-model="selectedDirection" class="sort-select">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <div class="sort-button-grid">
            <button @click="sortRows" class="sort-btn">Sort Rows</button>
            <button @click="sortColumns" class="sort-btn">Sort Columns</button>
            <button @click="sortMatrix" class="sort-btn-accent">Sort Both</button>
          </div>
        </div>

        <!-- Similarity Sorting -->
        <div class="sort-subsection">
          <h5>Similarity Sorting</h5>
          <div class="sort-controls">
            <label>Reference Row:</label>
            <select v-model="selectedRowIndex" class="sort-select">
              <option v-for="(name, index) in datasetStore.rowNames" :key="index" :value="index">
                {{ name || `Row ${index + 1}` }}
              </option>
            </select>
            <button @click="sortRowsBySimilarity" class="sort-btn full-width">
              Sort by Row Similarity
            </button>
          </div>

          <div class="sort-controls">
            <label>Reference Column:</label>
            <select v-model="selectedColIndex" class="sort-select">
              <option v-for="(name, index) in datasetStore.columnNames" :key="index" :value="index">
                {{ name || `Col ${index + 1}` }}
              </option>
            </select>
            <button @click="sortColumnsBySimilarity" class="sort-btn full-width">
              Sort by Column Similarity
            </button>
          </div>
        </div>

        <!-- Matrix Info -->
        <div class="sort-subsection">
          <h5>Matrix Info</h5>
          <div class="matrix-info">
            <span
              >{{ datasetStore.rowNames.length }} rows ×
              {{ datasetStore.columnNames.length }} columns</span
            >
            <span>Normalisation: {{ datasetStore.normalizationType }}</span>
          </div>
          <div class="interaction-toggle">
            <span>Cell Drag & Drop</span>

            <label class="switch">
              <input
                type="checkbox"
                v-model="localSettings.enableCellDragging"
                @change="applySettings"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useVisualizationStore, type VisualizationSettings } from '@/stores/visualization'
import { useDatasetStore, type SortMethod, type SortDirection } from '@/stores/dataset'

const visualizationStore = useVisualizationStore()
const datasetStore = useDatasetStore()
const isOpen = ref(true)

// Sorting state
const selectedMethod = ref<SortMethod>('sum')
const selectedDirection = ref<SortDirection>('desc')
const selectedRowIndex = ref(0)
const selectedColIndex = ref(0)

const localSettings = reactive<VisualizationSettings>({
  colorScheme: 'blues',
  minColor: '#e3f0fb',
  maxColor: '#7daee6',
  normalization: 'none',
  labelRotation: 90,
  cellSize: 40,
  enableCellDragging: false,
})

//const colorSchemes = {
//  blues: { minColor: '#e3f0fb', maxColor: '#7daee6' },
//  reds: { minColor: '#fde8e8', maxColor: '#f59e9e' },
//  greens: { minColor: '#e6f9ed', maxColor: '#7ed6a2' },
//}

const applySettings = () => {
  visualizationStore.updateSettings(localSettings)

  if (localSettings.normalization !== 'none') {
    datasetStore.setNormalizationType(localSettings.normalization)
    datasetStore.normalizeData()
  } else {
    datasetStore.setNormalizationType('none')
  }
}

//const applyColorScheme = (scheme: keyof typeof colorSchemes) => {
//  localSettings.colorScheme = scheme
//  localSettings.minColor = colorSchemes[scheme].minColor
//  localSettings.maxColor = colorSchemes[scheme].maxColor
//  applySettings()
//}

const resetSettings = () => {
  localSettings.colorScheme = 'blues'
  localSettings.minColor = '#e3f0fb'
  localSettings.maxColor = '#7daee6'
  localSettings.normalization = 'none'
  localSettings.enableCellDragging = false
  localSettings.labelRotation = 45 // Changed from 90 to match new default
  localSettings.cellSize = 40
  applySettings()
}

const sortRows = () => {
  datasetStore.sortRows(selectedMethod.value, selectedDirection.value)
}

const sortColumns = () => {
  datasetStore.sortColumns(selectedMethod.value, selectedDirection.value)
}

const sortMatrix = () => {
  datasetStore.sortMatrix(selectedMethod.value, selectedDirection.value)
}

const sortRowsBySimilarity = () => {
  datasetStore.sortRowsBySimilarity(selectedRowIndex.value, selectedDirection.value)
}

const sortColumnsBySimilarity = () => {
  datasetStore.sortColumnsBySimilarity(selectedColIndex.value, selectedDirection.value)
}

const setRotation = (rotation: number) => {
  localSettings.labelRotation = rotation
  applySettings()
}

const applyCellSizeSettings = () => {
  const cellSize = Number(localSettings.cellSize)
  visualizationStore.setMatrixCellDimension(cellSize)
  applySettings()
}

const setCellSize = (size: number) => {
  localSettings.cellSize = size
  applyCellSizeSettings()
}

watch(
  () => visualizationStore.settings.labelRotation,
  (newRotation) => {
    localSettings.labelRotation = newRotation
  }
)

onMounted(() => {
  Object.assign(localSettings, visualizationStore.settings)
})
</script>

<style scoped>
.settings-heading {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}
.settings-panel {
  position: fixed;
  top: 52px;
  right: 0;
  width: 360px;
  height: calc(100vh - 52px);
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  transition: transform 0.3s ease;
}

.settings-panel.panel-open {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.panel-header h3 {
  margin: 0;
  color: var(--color-text);
}

.toggle-btn {
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary-light);
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  color: white;
  padding: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  z-index: 1002;
}

.toggle-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.panel-content {
  padding: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h4 {
  margin: 0 0 12px 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text);
}

.color-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input-group label {
  min-width: 80px;
  color: var(--color-text);
  font-size: 14px;
}

.color-input-group input[type='color'] {
  width: 40px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}

.color-preview {
  width: 20px;
  height: 20px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
}

.color-schemes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.color-scheme-btn {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  color: black;
  cursor: pointer;
  transition: all 0.2s;
}

.color-scheme-btn:hover {
  background: var(--color-background-soft);
}

.color-scheme-btn.active {
  background: var(--color-primary-light);
  color: white;
  border-color: var(--color-primary-light);
}

.btn-reset {
  width: 100%;
  padding: 10px;
  background: var(--color-primary-light);
  color: white;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: var(--color-primary);
}

.sort-subsection {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.sort-subsection:last-child {
  border-bottom: none;
}

.sort-subsection h5 {
  margin: 0 0 10px 0;
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.sort-button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sort-controls {
  margin-bottom: 10px;
}

.sort-controls label {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text);
  font-size: 12px;
  font-weight: 500;
}

.sort-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  color: var(--color-text);
  font-size: 12px;
  margin-bottom: 8px;
}

.sort-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.sort-btn,
.sort-btn-accent {
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  color: var(--color-text);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s;
  text-align: center;
}

.sort-btn:hover {
  background: var(--color-background-soft);
  border-color: var(--color-primary);
}

.sort-btn-accent {
  background: var(--color-primary-light);
  color: white;
  border-color: var(--color-primary-light);
}

.sort-btn-accent:hover {
  background: var(--color-primary);
}

.sort-btn.full-width {
  grid-column: 1 / -1;
  margin-top: 5px;
}

.matrix-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.matrix-info span {
  padding: 4px 8px;
  background: var(--color-background-soft);
  border-radius: 3px;
  border: 1px solid var(--color-border);
}

.rotation-controls {
  display: flex;
  gap: 8px;
}

.cell-size-controls {
  display: flex;
  gap: 8px;
}

.btn-preset {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  color: var(--color-text);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-auto:hover,
.btn-preset:hover {
  background: var(--color-background-soft);
}

.interaction-toggle {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text);
}

.switch {
  position: relative;
  width: 42px;
  height: 22px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 22px;
  cursor: pointer;
  transition: 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}

.switch input:checked + .slider {
  background: var(--color-primary);
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}
</style>
