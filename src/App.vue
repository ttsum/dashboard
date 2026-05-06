<template>
  <div class="dashboard">
    <main v-if="isStageEndVisible" class="task-transition-screen">
      <div class="task-transition-text">此阶段任务结束，请按ESC退出。</div>
    </main>

    <main v-else-if="isTaskTransitionVisible" class="task-transition-screen">
      <button type="button" class="task-transition-button" @click="enterNextTask">眼睛看着这里，鼠标点击此处</button>
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
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import DashboardHeader from './components/dashboard/DashboardHeader.vue'
import FilterPanel from './components/dashboard/FilterPanel.vue'
import MapPanel from './components/dashboard/MapPanel.vue'
import TrendPanel from './components/dashboard/TrendPanel.vue'
import { useDashboardState } from './composables/useDashboardState'
import { useJiangxiGeoJson } from './composables/useJiangxiGeoJson'
import { useTaskRoute } from './composables/useTaskRoute'
import { MAP_SOURCE_TEXT } from './constants/dashboard'

const { geoJson, cityGeoJson, provinceGeoJson, isGeoJsonLoading, geoJsonError } = useJiangxiGeoJson()
const { currentTask, currentTaskFlow, currentTaskId, currentTaskNumber, taskCount, goToNextTask } = useTaskRoute()
const isTaskTransitionVisible = ref(false)
const isStageEndVisible = ref(false)
const STAGE_END_ROUTE_KEYS = new Set(['last:1', 'last:6', 'last:11', 'next:5', 'next:10', 'next:15'])

const showTaskTransition = () => {
  const currentRouteKey = `${currentTaskFlow.value}:${currentTaskId.value}`
  if (STAGE_END_ROUTE_KEYS.has(currentRouteKey)) {
    isStageEndVisible.value = true
    return
  }

  isTaskTransitionVisible.value = true
}

const enterNextTask = () => {
  isTaskTransitionVisible.value = false
  goToNextTask()
}

const exitStageEndScreen = () => {
  isStageEndVisible.value = false

  try {
    window.close()
  } catch {
    // Ignore browser restrictions and fall back below.
  }

  if (!window.closed && window.history.length > 1) {
    window.history.back()
  }
}

const handleWindowKeydown = (event) => {
  if (event.code === 'Escape' && isStageEndVisible.value) {
    event.preventDefault()
    exitStageEndScreen()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
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
