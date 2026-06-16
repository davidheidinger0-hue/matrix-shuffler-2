<template>
  <div class="data-table-container">
    <div class="data-table-header">
      <h3 class="data-table-title">Dataset</h3>
      <div class="data-table-controls">
        <div class="button-group">
          <button @click="loadSampleData" class="btn-primary">Load Sample Data</button>
          <button @click="clearData" class="btn-secondary">Clear</button>
        </div>
        <span class="data-status">{{ getDataStatus }}</span>
        <!-- Recently Loaded Datasets -->
        <div v-if="recentDatasets.length" class="recent-datasets">
          <h4 class="recent-title">Recently Loaded:</h4>
          <div class="recent-list">
            <button
              v-for="(ds, index) in recentDatasets"
              :key="index"
              @click="loadFromCSV(ds.data, ds.name)"
              class="recent-btn"
            >
              {{ ds.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="handsontable-container" ref="tableContainer">
      <div v-if="tableData.length === 0 || !hasRealData" class="empty-state">
        <p class="empty-state-message">No data loaded. Click "Load Sample Data" to get started.</p>
      </div>
      <HotTable
        v-else
        ref="hotTableRef"
        :key="tableKey"
        :data="hotTableData"
        :colHeaders="colHeaderRenderer"
        :rowHeaders="rowHeaderRenderer"
        :width="'100%'"
        :height="'100%'"
        :licenseKey="'non-commercial-and-evaluation'"
        :readOnly="true"
        :manualColumnResize="true"
        :manualRowResize="true"
        :contextMenu="true"
        @afterChange="onDataChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { HotTable } from '@handsontable/vue3'
import 'handsontable/dist/handsontable.full.min.css'
import { useDatasetStore } from '@/stores/dataset'
import { useVisualizationStore } from '@/stores/visualization'

type RecentDataset = {
  name: string
  data: TableData
}

const recentDatasets = ref<RecentDataset[]>([])

const loadRecentDatasets = () => {
  const saved = localStorage.getItem('recentDatasets')
  recentDatasets.value = saved ? JSON.parse(saved) : []
}

const saveRecentDataset = (name: string, data: TableData) => {
  const newEntry = { name, data }

  // Remove existing entry with same name
  const filtered = recentDatasets.value.filter((d) => d.name !== name)
  const updated = [newEntry, ...filtered].slice(0, 5) // max 5

  recentDatasets.value = updated
  localStorage.setItem('recentDatasets', JSON.stringify(updated))
}

type CellValue = string | number | null
type TableData = CellValue[][]

const tableData = ref<TableData>([
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
  ['', '', '', '', ''],
])
const hotTableRef = ref()
const tableContainer = ref()
const tableKey = ref(0) // Force table recreation

const emit = defineEmits<{
  dataChanged: [data: TableData]
}>()

const datasetStore = useDatasetStore()
const colHeaders = computed(() => {
  if (tableData.value.length === 0) return []
  return tableData.value[0].slice(1)
})

const rowHeaders = computed(() => {
  if (tableData.value.length <= 1) return []
  return tableData.value.slice(1).map((row) => row[0])
})

const hotTableData = computed(() => {
  if (tableData.value.length <= 1) return []
  return tableData.value.slice(1).map((row) => row.slice(1))
})

const hasRealData = computed(() => {
  return tableData.value.some((row) =>
    row.some((cell) => cell !== null && cell !== undefined && cell !== ''),
  )
})

const getDataStatus = computed(() => {
  if (tableData.value.length === 0 || !hasRealData.value) {
    return 'No data loaded'
  }

  const rows = Math.max(0, tableData.value.length - 1) // subtract header row
  const cols = Math.max(0, (tableData.value[0]?.length || 0) - 1) // subtract label column
  return `${rows} rows × ${cols} columns`
})

const colHeaderRenderer = (col: number) => {
  const label = colHeaders.value[col] || ''
  return `<span class="hot-col-header" title="${label}">${label}</span>`
}

// Custom renderer for row headers to wrap and show tooltip
const rowHeaderRenderer = (row: number) => {
  const label = rowHeaders.value[row] || ''
  return `<span class=\"hot-row-header\" title=\"${label}\">${label}</span>`
}

const updateDatasetStore = (
  data: TableData,
  preserveNormalization: boolean = false,
  datasetName?: string,
) => {
  if (data.length === 0 || !hasRealData.value) {
    datasetStore.reset()
    return
  }

  const rowNames: string[] = []
  const columnNames: string[] = []
  const numericData: number[][] = []

  const headerRow = data[0]
  for (let i = 1; i < headerRow.length; i++) {
    const colName = headerRow[i]?.toString() || `Col ${i}`
    columnNames.push(colName)
  }

  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx]
    if (!row || row.length === 0) continue

    const rowName = row[0]?.toString() || `Row ${rowIdx}`
    rowNames.push(rowName)

    const numericRow: number[] = []
    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      const cell = row[colIdx]
      const numValue = typeof cell === 'number' ? cell : parseFloat(cell?.toString() || '0')
      numericRow.push(isNaN(numValue) ? 0 : numValue)
    }
    numericData.push(numericRow)
  }

  const currentNormalizationType = preserveNormalization ? datasetStore.normalizationType : null

  datasetStore.setParsedData(rowNames, columnNames, numericData, datasetName)

  const visualizationStore = useVisualizationStore()
  if (columnNames.length > 0) {
    const maxNameLength = Math.max(...columnNames.map(name => name.length))
    const defaultRotation = maxNameLength <= 2 ? 0 : 45
    visualizationStore.updateSettings({ labelRotation: defaultRotation })
  }

  if (currentNormalizationType) {
    datasetStore.setNormalizationType(currentNormalizationType)
    datasetStore.normalizeData()
  }
}

const loadSampleData = () => {
  tableData.value = [
    ['Items', 'Metric A', 'Metric B', 'Metric C', 'Metric D'],
    ['Item A', 0.8, 0.3, 0.6, 0.9],
    ['Item B', 0.2, 0.7, 0.4, 0.5],
    ['Item C', 0.9, 0.1, 0.8, 0.3],
    ['Item D', 0.4, 0.9, 0.2, 0.7],
    ['Item E', 0.6, 0.5, 0.9, 0.1],
    ['Item F', 0.3, 0.8, 0.5, 0.4],
  ]

  tableKey.value++
  updateDatasetStore(tableData.value)
  emit('dataChanged', tableData.value)
  saveRecentDataset('Sample Data', tableData.value)
}

const clearData = () => {
  tableData.value = [
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
  ]

  tableKey.value++
  datasetStore.reset()
  emit('dataChanged', tableData.value)
}

const loadFromCSV = (csvData: TableData, name = 'Imported CSV') => {
  console.log('loadFromCSV:', name)
  tableData.value = csvData
  tableKey.value++
  updateDatasetStore(csvData, false, name)
  emit('dataChanged', tableData.value)
  saveRecentDataset(name, csvData)
}

const loadDataset = () => {
  const currentMatrix = datasetStore.currentMatrix
  if (currentMatrix) {
    const { rowNames, columnNames, values } = currentMatrix
    const newTableData: TableData = []

    newTableData.push(['', ...columnNames])

    for (let i = 0; i < rowNames.length; i++) {
      newTableData.push([rowNames[i], ...values[i].map((v) => v.initialValue)])
    }

    tableData.value = newTableData
    tableKey.value++
    emit('dataChanged', tableData.value)
  } else {
    console.warn('No dataset found in store')
  }
}

const transposeData = () => {
  if (tableData.value.length === 0) return

  const transposed: TableData = []
  const numCols = tableData.value[0]?.length || 0
  const numRows = tableData.value.length

  for (let col = 0; col < numCols; col++) {
    const newRow: (string | number | null)[] = []
    for (let row = 0; row < numRows; row++) {
      newRow.push(tableData.value[row][col] || '')
    }
    transposed.push(newRow)
  }

  tableData.value = transposed
  tableKey.value++
  updateDatasetStore(transposed, true)
  emit('dataChanged', tableData.value)
}

defineExpose({
  loadFromCSV,
  transposeData,
})

const onDataChange = (changes: unknown) => {
  if (changes) {
    updateDatasetStore(tableData.value)
    emit('dataChanged', tableData.value)
  }
}

onMounted(() => {
  // Component ready
  loadRecentDatasets()
  loadDataset()
})
</script>

<style scoped>
.recent-datasets {
  margin-top: 12px;
}

.recent-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text);
  user-select: none !important;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-btn {
  background: white;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
  user-select: none !important;
}

.recent-btn:hover {
  background: var(--color-background-soft);
}
.data-table-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: white;
}

.data-table-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.data-table-header h3 {
  margin: 0;
  color: var(--color-text);
  align-self: flex-start;
}

.data-table-controls {
  flex-direction: column;
  align-items: normal;
  flex: 1;
  width: 100%;
  display: flex;
  gap: 8px;
}

.button-group {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.data-status {
  font-size: 12px;
  color: var(--color-text);
  padding: 6px 8px;
  background: var(--color-background);
  border-radius: 4px;
  border: 1px solid var(--color-border);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none !important;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .data-table-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .button-group {
    flex: 1;
    justify-content: center;
    gap: 8px;
  }
}

.empty-state-message {
  user-select: none !important;
}

.btn-primary,
.btn-secondary {
  padding: 6px 10px;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: fit-content;
  flex: 0 1 auto;
  white-space: nowrap;
  user-select: none !important;
}

@media (min-width: 540px) {
  .btn-primary,
  .btn-secondary {
    padding: 7px 12px;
    font-size: 13px;
    height: 34px;
  }
}

@media (min-width: 768px) {
  .btn-primary,
  .btn-secondary {
    padding: 8px 16px;
    font-size: 14px;
    height: 36px;
  }
}

.btn-primary {
  background: var(--color-primary-light);
  color: white;
  border-color: var(--color-primary-light);
  user-select: none !important;
}

.btn-primary:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-secondary {
  background: white;
  color: var(--color-text);
  border-color: var(--color-border);
  user-select: none !important;
}

.btn-secondary:hover {
  background: var(--color-background-soft);
}

.handsontable-container {
  flex: 1;
  padding: 16px;
  overflow: hidden;
  min-height: 350px;
  position: relative;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--color-text);
  background: var(--color-background);
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  user-select: none !important;
}

.empty-state p {
  margin: 16px;
  font-size: 16px;
}

.data-table-header {
  user-select: none !important;
}

/* Basic Handsontable styling */
:deep(.handsontable) {
  font-family: inherit;
  font-size: 14px;
}

:deep(.handsontable td) {
  text-align: center !important;
  vertical-align: middle !important;
  border: 1px solid #ddd !important;
}

:deep(.handsontable th) {
  background: #f5f5f5 !important;
  font-weight: bold !important;
  text-align: center !important;
}

:deep(.handsontable th .hot-col-header) {
  display: block;
  white-space: normal;
  word-break: break-word;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.hot-col-header {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.handsontable th .hot-row-header) {
  display: block;
  white-space: normal;
  word-break: break-word;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.hot-row-header {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.handsontable),
:deep(.handsontable td),
:deep(.handsontable th) {
  user-select: none !important;
}
</style>
