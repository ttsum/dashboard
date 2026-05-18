<template>
  <section class="chart-section">
    <div class="chart-title">
      {{ selectedMeasureLabel }}趋势图 ({{ startYear }} - {{ endYear }})
    </div>

    <div
      ref="trendChartRef"
      class="chart-container"
    ></div>

    <div class="trend-range-controls">
      <span class="range-label">时间范围</span>
      <div class="range-slider">
        <ElSlider
          :model-value="yearRange"
          range
          :min="minYear"
          :max="maxYear"
          :marks="yearMarks"
          @update:model-value="emit('update:year-range', $event)"
        />
      </div>
    </div>

    <div class="chart-footer">{{ sourceText }}</div>
  </section>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { ElSlider } from 'element-plus'
import { useTrendChart } from '../../composables/useTrendChart'

const props = defineProps({
  selectedMeasure: { type: Object, required: true },
  selectedMeasureLabel: { type: String, required: true },
  startYear: { type: Number, required: true },
  endYear: { type: Number, required: true },
  minYear: { type: Number, required: true },
  maxYear: { type: Number, required: true },
  yearRange: { type: Array, required: true },
  yearMarks: { type: Object, required: true },
  trendYears: { type: Array, required: true },
  trendSeriesData: { type: Array, required: true },
  sourceText: { type: String, required: true }
})

const emit = defineEmits([
  'update:start-year',
  'update:end-year',
  'update:year-range'
])

const trendChartRef = ref(null)

useTrendChart({
  chartRef: trendChartRef,
  selectedMeasure: toRef(props, 'selectedMeasure'),
  selectedMeasureLabel: toRef(props, 'selectedMeasureLabel'),
  trendYears: toRef(props, 'trendYears'),
  trendSeriesData: toRef(props, 'trendSeriesData')
})
</script>

<style scoped>
.chart-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: #f9fafb;
  border-radius: 4px;
}

.chart-title {
  flex-shrink: 0;
  margin-bottom: 6px;
  padding: 8px 8px 4px;
  font-size: calc(14px * var(--ui-font-scale));
  font-weight: 600;
  color: #1f2937;
  background-color: #fff;
  border-bottom: 2px solid #002d56;
  border-radius: 4px 4px 0 0;
}

.chart-container {
  flex: 1;
  align-self: stretch;
  min-height: 0;
  min-height: 360px;
  background-color: #fff;
  border-radius: 0;
}

.trend-range-controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-height: 56px;
  padding: 6px 12px 14px 58px;
  background-color: #fff;
}

.range-label {
  flex: 0 0 auto;
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 600;
  color: #374151;
}

.range-slider {
  flex: 0 1 380px;
  width: min(380px, 100%);
  min-width: 220px;
  padding: 0 12px;
}

.range-slider :deep(.el-slider) {
  --el-slider-height: 4px;
  --el-slider-button-size: 12px;
}

.range-slider :deep(.el-slider__marks-text) {
  font-size: calc(10px * var(--ui-font-scale));
  color: #9ca3af;
  white-space: nowrap;
}

.chart-footer {
  flex-shrink: 0;
  margin-top: 6px;
  padding: 5px 8px;
  font-size: calc(10px * var(--ui-font-scale));
  font-style: italic;
  line-height: 1.25;
  color: #6b7280;
  background-color: #f3f4f6;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .chart-container {
    min-height: 280px;
  }

  .trend-range-controls {
    flex-wrap: wrap;
    padding-left: 12px;
  }

  .range-slider {
    flex-basis: 100%;
  }
}
</style>

