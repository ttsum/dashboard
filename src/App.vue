<template>
  <div class="dashboard">
    <main v-if="isProgramEnded" class="task-transition-screen">
      <div class="task-transition-text">实验已结束，请关闭当前页面。</div>
    </main>

    <main v-else-if="isStageEndVisible" class="task-transition-screen">
      <div class="task-transition-text">此阶段任务结束，请按 ESC 退出。</div>
    </main>

    <main v-else-if="isTaskTransitionVisible" class="task-transition-screen">
      <button type="button" class="task-transition-button" @click="enterNextTask">请注视这里，然后点击鼠标进入下一题</button>
    </main>

    <template v-else>
      <DashboardHeader
        :current-task="currentTask"
        :current-task-number="currentTaskNumber"
        :task-count="taskCount"
        @next-task="showTaskTransition"
      />

      <main class="dashboard-main">
        <section class="dashboard-layout">
          <div class="dashboard-left">
            <FilterPanel
              class="dashboard-filter-panel"
              :map-measures="mapMeasures"
              :selected-map-measure="selectedMapMeasure"
              :map-timeframes="mapTimeframes"
              :selected-map-timeframe="selectedMapTimeframe"
              :chart-measures="chartMeasures"
              :selected-chart-measures="selectedChartMeasures"
              @update:selected-map-measure="selectedMapMeasure = $event"
              @update:selected-map-timeframe="selectedMapTimeframe = $event"
              @update:selected-chart-measures="selectedChartMeasures = $event"
              @clear-selected-counties="clearSelectedCounties"
            />

            <TrendPanel
              class="dashboard-trend-panel"
              :selected-measure="selectedMeasure"
              :selected-measure-label="selectedMapMeasure"
              :start-year="startYear"
              :end-year="endYear"
              :min-year="minYear"
              :max-year="maxYear"
              :year-range="yearRange"
              :year-marks="yearMarks"
              :trend-years="trendYears"
              :trend-series-data="trendSeriesData"
              :source-text="MAP_SOURCE_TEXT"
              @update:start-year="startYear = $event"
              @update:end-year="endYear = $event"
              @update:year-range="yearRange = $event"
            />
          </div>

          <section class="dashboard-map-area">
            <MapPanel
              class="dashboard-map-panel"
              :geo-json="geoJson"
              :city-geo-json="cityGeoJson"
              :province-geo-json="provinceGeoJson"
              :current-task-number="currentTaskNumber"
              :is-geo-json-loading="isGeoJsonLoading"
              :geo-json-error="geoJsonError"
              :selected-measure="selectedMeasure"
              :selected-measure-label="selectedMapMeasure"
              :selected-map-timeframe="selectedMapTimeframe"
              :map-legend-items="mapLegendItems"
              :map-series-data="mapSeriesData"
              :selected-county-names="selectedChartMeasures"
              :county-names="chartMeasures"
              @toggle-county="toggleCountySelection"
            />
          </section>
        </section>
      </main>
    </template>

    <div v-if="isRecordDialogVisible" class="record-dialog-mask">
      <form class="record-dialog" @submit.prevent="submitRecordingMeta">
        <h2 class="record-dialog-title">记录实验信息</h2>

        <label class="record-dialog-label" for="participant-id-input">participant_id</label>
        <input
          id="participant-id-input"
          ref="participantIdInputRef"
          v-model.trim="recordParticipantId"
          class="record-dialog-input"
          type="text"
          placeholder="例如：P000123 或 123"
          autocomplete="off"
        />

        <label class="record-dialog-label" for="recording-id-input">recording_id</label>
        <input
          id="recording-id-input"
          v-model.trim="recordingId"
          class="record-dialog-input"
          type="text"
          placeholder="例如：1、2、3"
          autocomplete="off"
        />

        <p v-if="recordDialogError" class="record-dialog-error">{{ recordDialogError }}</p>

        <div class="record-dialog-actions">
          <button
            type="button"
            class="record-dialog-cancel"
            :disabled="isStageExitInProgress"
            @click="closeRecordingDialog"
          >
            取消
          </button>
          <button type="submit" class="record-dialog-submit" :disabled="isStageExitInProgress">
            {{ isStageExitInProgress ? '保存中...' : '保存并结束' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import DashboardHeader from './components/dashboard/DashboardHeader.vue'
import FilterPanel from './components/dashboard/FilterPanel.vue'
import MapPanel from './components/dashboard/MapPanel.vue'
import TrendPanel from './components/dashboard/TrendPanel.vue'
import { useDashboardState } from './composables/useDashboardState'
import { useHunanGeoJson } from './composables/useHunanGeoJson'
import { useJiangxiGeoJson } from './composables/useJiangxiGeoJson'
import { useMouseTrajectory } from './composables/useMouseTrajectory'
import { useTaskRoute } from './composables/useTaskRoute'
import { MAP_SOURCE_TEXT } from './constants/dashboard'
import { ACTIVE_PROVINCE_KEY } from './constants/provinceDashboard'

const geoJsonLoader = ACTIVE_PROVINCE_KEY === 'hunan' ? useHunanGeoJson : useJiangxiGeoJson
const { geoJson, cityGeoJson, provinceGeoJson, isGeoJsonLoading, geoJsonError } = geoJsonLoader()
const {
  currentTask,
  currentProvinceKey,
  currentTaskFlow,
  currentTaskId,
  currentTaskNumber,
  taskCount,
  goToNextTask
} = useTaskRoute()
const isTaskTransitionVisible = ref(false)
const isStageEndVisible = ref(false)
const isStageExitInProgress = ref(false)
const isProgramEnded = ref(false)
const isRecordDialogVisible = ref(false)
const recordParticipantId = ref('')
const recordingId = ref('')
const recordDialogError = ref('')
const participantIdInputRef = ref(null)
const STAGE_END_ROUTE_KEYS = new Set(['last:1', 'next:15'])
const buildScreenHash = (screen) => `#/${currentProvinceKey.value}/${screen}`
const mouseTrajectory = useMouseTrajectory({
  contextProvider: () => ({
    flow: currentTaskFlow.value,
    task_id: currentTaskId.value,
    task_number: currentTaskNumber.value,
    task_content: currentTask.value?.content || ''
  })
})

const showTaskTransition = () => {
  mouseTrajectory.recordMarker('task_leave')

  const currentRouteKey = `${currentTaskFlow.value}:${currentTaskId.value}`
  if (STAGE_END_ROUTE_KEYS.has(currentRouteKey)) {
    mouseTrajectory.recordMarker('stage_end')
    isStageEndVisible.value = true
    window.history.pushState(
      { screen: 'stage-end' },
      '',
      `${window.location.pathname}${buildScreenHash('stage-end')}`
    )
    return
  }

  isTaskTransitionVisible.value = true
  window.history.pushState(
    { screen: 'transition' },
    '',
    `${window.location.pathname}${buildScreenHash('transition')}`
  )
}

const enterNextTask = () => {
  isTaskTransitionVisible.value = false
  goToNextTask()
  nextTick(() => {
    mouseTrajectory.recordMarker('task_enter')
  })
}

const exitStageEndScreen = () => {
  isStageEndVisible.value = false
  isTaskTransitionVisible.value = false
  isProgramEnded.value = true
  isRecordDialogVisible.value = false
  window.history.replaceState(
    { screen: 'ended' },
    '',
    `${window.location.pathname}${buildScreenHash('ended')}`
  )

  try {
    window.close()
  } catch {
    // Ignore browser restrictions and keep the ended screen.
  }
}

const openRecordingDialog = () => {
  if (isRecordDialogVisible.value) {
    return
  }

  recordDialogError.value = ''
  isRecordDialogVisible.value = true
  nextTick(() => {
    participantIdInputRef.value?.focus?.()
  })
}

const closeRecordingDialog = () => {
  if (isStageExitInProgress.value) {
    return
  }

  isRecordDialogVisible.value = false
  recordDialogError.value = ''
}

const validateRecordingMeta = () => {
  const participant = String(recordParticipantId.value || '').trim()
  const recording = String(recordingId.value || '').trim()

  if (!participant) {
    recordDialogError.value = 'participant_id 不能为空。'
    return null
  }

  if (!/^\d+$/.test(recording) || Number(recording) <= 0) {
    recordDialogError.value = 'recording_id 必须是正整数。'
    return null
  }

  recordDialogError.value = ''
  return {
    participantId: participant,
    recordingId: recording
  }
}

const submitRecordingMeta = async () => {
  if (isStageExitInProgress.value || !isStageEndVisible.value) {
    return
  }

  const meta = validateRecordingMeta()
  if (!meta) {
    return
  }

  isStageExitInProgress.value = true
  try {
    mouseTrajectory.recordMarker('stage_exit', {
      participant_id: meta.participantId,
      recording_id: meta.recordingId,
      session_no: meta.recordingId
    })
    const saved = await mouseTrajectory.flush('stage_exit', {
      participantId: meta.participantId,
      recordingId: meta.recordingId
    })
    if (!saved) {
      recordDialogError.value = '保存失败，请检查服务端后重试。'
      return
    }

    exitStageEndScreen()
  } finally {
    isStageExitInProgress.value = false
  }
}

const handleWindowKeydown = async (event) => {
  if (event.code !== 'Escape' || !isStageEndVisible.value || isStageExitInProgress.value) {
    return
  }

  event.preventDefault()
  openRecordingDialog()
}

const handleRouteScreensFromHash = () => {
  const hash = window.location.hash || ''
  const provincePrefix = `#/${currentProvinceKey.value}/`
  const isTransitionHash = hash === `${provincePrefix}transition`
  const isStageEndHash = hash === `${provincePrefix}stage-end`
  const isEndedHash = hash === `${provincePrefix}ended`

  isTaskTransitionVisible.value = isTransitionHash
  isStageEndVisible.value = isStageEndHash
  isProgramEnded.value = isEndedHash
}

onMounted(async () => {
  mouseTrajectory.startTracking()
  mouseTrajectory.recordMarker('task_enter')
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('popstate', handleRouteScreensFromHash)
  window.addEventListener('hashchange', handleRouteScreensFromHash)
  handleRouteScreensFromHash()
})

onUnmounted(() => {
  mouseTrajectory.stopTracking()
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('popstate', handleRouteScreensFromHash)
  window.removeEventListener('hashchange', handleRouteScreensFromHash)
})

const {
  mapMeasures,
  selectedMapMeasure,
  mapTimeframes,
  selectedMapTimeframe,
  chartMeasures,
  selectedChartMeasures,
  clearSelectedCounties,
  toggleCountySelection,
  minYear,
  maxYear,
  yearRange,
  yearMarks,
  startYear,
  endYear,
  selectedMeasure,
  mapLegendItems,
  mapSeriesData,
  trendYears,
  trendSeriesData
} = useDashboardState(geoJson, currentTask)
</script>

<style scoped>
.dashboard {
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dashboard-main {
  flex: 1;
  min-height: 0;
  padding: 8px;
  background-color: #e5e7eb;
  overflow: hidden;
}

.task-transition-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}

.task-transition-button {
  min-width: 420px;
  min-height: 88px;
  padding: 0 36px;
  font-size: 24px;
  font-weight: 600;
  color: #fffdf5;
  background: linear-gradient(135deg, #1d4ed8, #0f766e);
  border: none;
  border-radius: 16px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.task-transition-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.2);
}

.task-transition-text {
  font-size: 32px;
  font-weight: 600;
  color: #111827;
  text-align: center;
}

.record-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 20px;
}

.record-dialog {
  width: min(460px, 100%);
  padding: 24px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-dialog-title {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
  color: #0f172a;
}

.record-dialog-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.record-dialog-input {
  height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  color: #0f172a;
}

.record-dialog-input:focus {
  outline: 2px solid #1d4ed8;
  outline-offset: 1px;
}

.record-dialog-error {
  margin: 2px 0 0;
  font-size: 14px;
  color: #b91c1c;
}

.record-dialog-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.record-dialog-cancel,
.record-dialog-submit {
  min-width: 102px;
  height: 38px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.record-dialog-cancel {
  color: #0f172a;
  background: #e2e8f0;
}

.record-dialog-submit {
  color: #ffffff;
  background: #1d4ed8;
}

.record-dialog-cancel:disabled,
.record-dialog-submit:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.dashboard-layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(640px, 0.56fr) minmax(0, 1fr);
  gap: 10px;
}

.dashboard-left {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dashboard-filter-panel {
  flex: 0 0 auto;
}

.dashboard-trend-panel {
  flex: 1 1 auto;
  min-height: 0;
}

.dashboard-trend-panel :deep(.chart-container) {
  min-height: 240px;
}

.dashboard-map-area {
  min-width: 0;
  min-height: 0;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  overflow: hidden;
}

.dashboard-map-panel {
  height: 100%;
}

@media (max-width: 1180px) {
  .dashboard-main {
    overflow-y: auto;
  }

  .dashboard-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100%;
  }

  .dashboard-map-area {
    min-height: 520px;
  }

  .task-transition-button {
    min-width: 280px;
    min-height: 52px;
    font-size: 20px;
  }
}
</style>

