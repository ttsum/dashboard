<template>
  <div class="dashboard">
    <DashboardHeader />

    <main class="dashboard-main">
      <FilterPanel
        :map-measures="mapMeasures"
        :selected-map-measure="selectedMapMeasure"
        :map-timeframes="mapTimeframes"
        :selected-map-timeframe="selectedMapTimeframe"
        :chart-measures="chartMeasures"
        :selected-chart-measures="selectedChartMeasures"
        :min-year="minYear"
        :max-year="maxYear"
        :start-year="startYear"
        :end-year="endYear"
        :year-range="yearRange"
        :year-marks="yearMarks"
        @update:selected-map-measure="selectedMapMeasure = $event"
        @update:selected-map-timeframe="selectedMapTimeframe = $event"
        @update:selected-chart-measures="selectedChartMeasures = $event"
        @update:start-year="startYear = $event"
        @update:end-year="endYear = $event"
        @update:year-range="yearRange = $event"
        @clear-selected-counties="clearSelectedCounties"
      />

      <section class="visualization-area">
        <div class="viz-row">
          <MapPanel
            :geo-json="geoJson"
            :city-geo-json="cityGeoJson"
            :province-geo-json="provinceGeoJson"
            :is-geo-json-loading="isGeoJsonLoading"
            :geo-json-error="geoJsonError"
            :selected-measure="selectedMeasure"
            :selected-measure-label="selectedMapMeasure"
            :selected-map-timeframe="selectedMapTimeframe"
            :map-legend-items="mapLegendItems"
            :map-series-data="mapSeriesData"
            :selected-county-names="selectedChartMeasures"
            :county-names="chartMeasures"
            :source-text="MAP_SOURCE_TEXT"
            @toggle-county="toggleCountySelection"
          />

          <TrendPanel
            :selected-measure="selectedMeasure"
            :selected-measure-label="selectedMapMeasure"
            :start-year="startYear"
            :end-year="endYear"
            :trend-years="trendYears"
            :trend-series-data="trendSeriesData"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import DashboardHeader from './components/dashboard/DashboardHeader.vue'
import FilterPanel from './components/dashboard/FilterPanel.vue'
import MapPanel from './components/dashboard/MapPanel.vue'
import TrendPanel from './components/dashboard/TrendPanel.vue'
import { useDashboardState } from './composables/useDashboardState'
import { useJiangxiGeoJson } from './composables/useJiangxiGeoJson'
import { MAP_SOURCE_TEXT } from './constants/dashboard'

const { geoJson, cityGeoJson, provinceGeoJson, isGeoJsonLoading, geoJsonError } = useJiangxiGeoJson()

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
} = useDashboardState(geoJson)
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background-color: #e5e7eb;
  overflow: hidden;
}

.visualization-area {
  flex: 1;
  min-height: 0;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  overflow: hidden;
}

.viz-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

@media (max-width: 1200px) {
  .dashboard-main {
    overflow-y: auto;
  }

  .viz-row {
    grid-template-columns: 1fr;
  }
}
</style>
