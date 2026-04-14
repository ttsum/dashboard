<template>
  <section class="filter-panel">
    <div class="filter-column">
      <div class="filter-header">地图指标</div>
      <ElRadioGroup
        :model-value="selectedMapMeasure"
        class="filter-radio-group measure-radio-group"
        @update:model-value="emit('update:selected-map-measure', $event)"
      >
        <ElRadio
          v-for="item in mapMeasures"
          :key="item"
          :label="item"
          class="filter-radio"
        >
          {{ item }}
        </ElRadio>
      </ElRadioGroup>
    </div>

    <div class="filter-column">
      <div class="filter-header">年份选择</div>
      <ElRadioGroup
        :model-value="selectedMapTimeframe"
        class="filter-radio-group year-radio-group"
        @update:model-value="emit('update:selected-map-timeframe', $event)"
      >
        <ElRadio
          v-for="item in mapTimeframes"
          :key="item"
          :label="item"
          class="filter-radio"
        >
          {{ item }}
        </ElRadio>
      </ElRadioGroup>
    </div>

    <div class="filter-column">
      <div class="filter-header filter-header-row">
        <span>区县选择</span>
        <ElButton
          type="primary"
          link
          size="small"
          class="clear-btn"
          :disabled="selectedChartMeasures.length === 0"
          @click="emit('clear-selected-counties')"
        >
          一键清空
        </ElButton>
      </div>

      <ElCheckboxGroup
        :model-value="selectedChartMeasures"
        class="filter-checkbox-group"
        @update:model-value="emit('update:selected-chart-measures', $event)"
      >
        <ElCheckbox
          v-for="item in chartMeasures"
          :key="item"
          :label="item"
          class="filter-checkbox"
        >
          {{ item }}
        </ElCheckbox>
      </ElCheckboxGroup>
    </div>

    <div class="filter-column">
      <div class="filter-header">时间范围</div>

      <div class="timeframe-inputs">
        <ElInputNumber
          :model-value="startYear"
          :min="minYear"
          :max="maxYear"
          :controls="false"
          size="small"
          class="year-input"
          @update:model-value="emit('update:start-year', $event)"
        />
        <span class="year-separator">至</span>
        <ElInputNumber
          :model-value="endYear"
          :min="minYear"
          :max="maxYear"
          :controls="false"
          size="small"
          class="year-input"
          @update:model-value="emit('update:end-year', $event)"
        />
      </div>

      <div class="slider-container">
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
  </section>
</template>

<script setup>
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElInputNumber,
  ElRadio,
  ElRadioGroup,
  ElSlider
} from 'element-plus'

defineProps({
  mapMeasures: { type: Array, required: true },
  selectedMapMeasure: { type: String, required: true },
  mapTimeframes: { type: Array, required: true },
  selectedMapTimeframe: { type: String, required: true },
  chartMeasures: { type: Array, required: true },
  selectedChartMeasures: { type: Array, required: true },
  minYear: { type: Number, required: true },
  maxYear: { type: Number, required: true },
  startYear: { type: Number, required: true },
  endYear: { type: Number, required: true },
  yearRange: { type: Array, required: true },
  yearMarks: { type: Object, required: true }
})

const emit = defineEmits([
  'update:selected-map-measure',
  'update:selected-map-timeframe',
  'update:selected-chart-measures',
  'update:start-year',
  'update:end-year',
  'update:year-range',
  'clear-selected-counties'
])
</script>

<style scoped>
.filter-panel {
  --dashboard-font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --option-font-size: 13px;
  --option-font-weight: 500;
  --option-line-height: 1.4;
  --option-color: #4b5563;
  --option-label-gap: 10px;
  --filter-column-height: 152px;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.7fr 1.1fr;
  align-items: start;
  gap: 8px;
  padding: 8px;
  font-family: var(--dashboard-font-family);
  background-color: #fff;
  border-radius: 4px;
}

.filter-column {
  height: var(--filter-column-height);
  min-height: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.filter-header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.filter-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.clear-btn {
  padding: 0;
  font-size: 12px;
  line-height: 1;
}

.filter-radio-group {
  display: grid;
  gap: 4px 6px;
  min-height: 0;
  overflow: auto;
}

.measure-radio-group {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.year-radio-group {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.filter-radio {
  margin-right: 0 !important;
}

.filter-checkbox-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px 6px;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  overflow-y: auto;
  align-content: start;
}

.filter-checkbox {
  margin-right: 0 !important;
}

.filter-checkbox :deep(.el-checkbox__label),
.filter-radio :deep(.el-radio__label) {
  display: block;
  min-width: 0;
  padding-left: var(--option-label-gap);
  font-family: var(--dashboard-font-family);
  font-size: var(--option-font-size);
  font-weight: var(--option-font-weight);
  line-height: var(--option-line-height);
  color: var(--option-color);
}

.measure-radio-group :deep(.el-radio__label) {
  white-space: normal;
}

.year-radio-group :deep(.el-radio__label),
.filter-checkbox-group :deep(.el-checkbox__label) {
  white-space: nowrap;
}

.timeframe-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.year-input {
  width: 96px !important;
}

.year-input :deep(.el-input__wrapper) {
  min-height: 36px;
}

.year-input :deep(.el-input__inner) {
  height: 36px;
  padding: 0 8px;
  font-size: 13px;
  line-height: 36px;
  text-align: center;
}

.year-separator {
  font-size: 13px;
  color: #6b7280;
}

.slider-container {
  flex: 1;
  min-height: 0;
  padding: 0 20px 6px;
}

.slider-container :deep(.el-slider) {
  --el-slider-height: 4px;
  --el-slider-button-size: 12px;
}

.slider-container :deep(.el-slider__marks-text) {
  font-size: 11px;
  color: #9ca3af;
}

@media (max-width: 1280px) {
  .filter-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .filter-panel {
    grid-template-columns: 1fr;
    --filter-column-height: auto;
  }

  .filter-column {
    height: auto;
    max-height: 148px;
  }
}
</style>
