<template>
  <section class="chart-section">
    <div class="chart-title">
      {{ selectedMeasureLabel }}趋势图 ({{ startYear }} - {{ endYear }})
    </div>

    <div
      ref="trendChartRef"
      class="chart-container"
    ></div>
  </section>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useTrendChart } from '../../composables/useTrendChart'

const props = defineProps({
  selectedMeasure: { type: Object, required: true },
  selectedMeasureLabel: { type: String, required: true },
  startYear: { type: Number, required: true },
  endYear: { type: Number, required: true },
  trendYears: { type: Array, required: true },
  trendSeriesData: { type: Array, required: true }
})

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
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  background-color: #fff;
  border-bottom: 2px solid #002d56;
  border-radius: 4px 4px 0 0;
}

.chart-container {
  flex: 1;
  min-height: 0;
  min-height: 360px;
  background-color: #fff;
  border-radius: 0 0 4px 4px;
}

@media (max-width: 768px) {
  .chart-container {
    min-height: 280px;
  }
}
</style>
