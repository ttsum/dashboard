<template>
  <section class="map-section">
    <div class="map-title">
      {{ selectedMeasureLabel }}分布图 - {{ selectedMapTimeframe }}年
    </div>

    <div class="map-container">
      <div
        v-if="isGeoJsonLoading || geoJsonError"
        class="map-status"
      >
        {{ isGeoJsonLoading ? '地图加载中...' : geoJsonError }}
      </div>

      <div
        ref="mapChartRef"
        class="map-chart"
        :class="{ 'is-hidden': isGeoJsonLoading || geoJsonError }"
      ></div>

      <div class="map-legend">
        <div class="legend-title">{{ selectedMeasureLabel }}</div>
        <div class="legend-scale">
          <div
            v-for="item in mapLegendItems"
            :key="item.label"
            class="legend-item"
            :style="{ borderLeftColor: item.color }"
          >
            <div
              class="legend-color"
              :style="{ backgroundColor: item.color }"
            ></div>
            <span class="legend-label">{{ item.label }}</span>
          </div>

          <div class="legend-item legend-item-no-data">
            <div
              class="legend-color"
              style="background-color: #d1d5db;"
            ></div>
            <span class="legend-label">暂无数据</span>
          </div>
        </div>
      </div>
    </div>

    <div class="map-footer">{{ sourceText }}</div>
  </section>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useMapChart } from '../../composables/useMapChart'

const props = defineProps({
  geoJson: { type: Object, default: null },
  isGeoJsonLoading: { type: Boolean, required: true },
  geoJsonError: { type: String, default: '' },
  selectedMeasure: { type: Object, required: true },
  selectedMeasureLabel: { type: String, required: true },
  selectedMapTimeframe: { type: String, required: true },
  mapLegendItems: { type: Array, required: true },
  mapSeriesData: { type: Array, required: true },
  selectedProvinceNames: { type: Array, required: true },
  provinceNames: { type: Array, required: true },
  sourceText: { type: String, required: true }
})

const emit = defineEmits(['toggleProvince'])
const mapChartRef = ref(null)

useMapChart({
  chartRef: mapChartRef,
  geoJson: toRef(props, 'geoJson'),
  mapLegendItems: toRef(props, 'mapLegendItems'),
  mapSeriesData: toRef(props, 'mapSeriesData'),
  selectedMeasure: toRef(props, 'selectedMeasure'),
  selectedProvinceNames: toRef(props, 'selectedProvinceNames'),
  provinceNames: toRef(props, 'provinceNames'),
  onToggleProvince: (name) => emit('toggleProvince', name)
})
</script>

<style scoped>
.map-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.map-title {
  flex-shrink: 0;
  margin-bottom: 6px;
  padding-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 2px solid #002d56;
}

.map-container {
  position: relative;
  flex: 1;
  min-height: 0;
  min-height: 360px;
  padding: 4px;
  overflow: hidden;
  background-color: #f9fafb;
  border-radius: 4px;
}

.map-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.map-chart.is-hidden {
  visibility: hidden;
}

.map-status {
  position: absolute;
  inset: 0;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
  background: rgba(249, 250, 251, 0.85);
}

.map-legend {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 10;
  min-width: 110px;
  padding: 6px 8px;
  background-color: rgba(255, 255, 255, 0.92);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.legend-title {
  margin-bottom: 4px;
  padding-bottom: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
}

.legend-scale {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 1px 4px;
  background-color: #f9fafb;
  border-left: 3px solid transparent;
  border-radius: 3px;
}

.legend-color {
  width: 12px;
  height: 8px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 2px;
}

.legend-label {
  font-size: 8px;
  color: #374151;
  white-space: nowrap;
}

.map-footer {
  flex-shrink: 0;
  margin-top: 6px;
  padding: 5px 8px;
  font-size: 10px;
  font-style: italic;
  line-height: 1.25;
  color: #6b7280;
  background-color: #f3f4f6;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .map-container {
    min-height: 280px;
  }
}
</style>
