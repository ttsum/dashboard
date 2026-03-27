<template>
  <section class="filter-panel">
    <div class="filter-column">
      <div class="filter-header">地图指标</div>
      <ElRadioGroup
        :model-value="selectedMapMeasure"
        class="filter-radio-group measure-radio-group"
        @update:model-value="emit('update:selected-map-measure', $event)"
      >
        <div class="measure-row measure-row-1">
          <ElRadio
            v-for="item in mapMeasures.slice(0, 3)"
            :key="`m1-${item}`"
            :label="item"
            class="filter-radio"
          >
            {{ item }}
          </ElRadio>
        </div>
        <div class="measure-row measure-row-2">
          <ElRadio
            v-for="item in mapMeasures.slice(3, 5)"
            :key="`m2-${item}`"
            :label="item"
            class="filter-radio"
          >
            {{ item }}
          </ElRadio>
        </div>
        <div class="measure-row measure-row-3">
          <ElRadio
            v-for="item in mapMeasures.slice(5, 7)"
            :key="`m3-${item}`"
            :label="item"
            class="filter-radio"
          >
            {{ item }}
          </ElRadio>
        </div>
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
        <span>省份选择</span>
        <ElButton
          type="primary"
          link
          size="small"
          class="clear-province-btn"
          :disabled="selectedChartMeasures.length === 0"
          @click="emit('clear-selected-provinces')"
        >
          一键清除
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
  'clear-selected-provinces'
])
</script>

<style scoped>
.filter-panel {
  --dashboard-font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --el-font-family: var(--dashboard-font-family);
  --province-option-font-size: 14px;
  --province-option-font-weight: 500;
  --province-option-line-height: 1.3;
  --province-option-color: #4b5563;
  --province-option-label-gap: 8px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px;
  font-family: var(--dashboard-font-family);
  background-color: #fff;
  border-radius: 4px;
}

.filter-column {
  min-height: 0;
  padding: 6px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  container-type: inline-size;
}

.filter-header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  font-family: var(--dashboard-font-family);
  font-size: 11px;
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

.clear-province-btn {
  padding: 0;
  font-family: var(--dashboard-font-family);
  font-size: 12px;
  line-height: 1;
}

.filter-radio-group {
  display: grid;
  gap: 3px 6px;
}

.measure-radio-group {
  display: flex;
  flex-direction: column;
  align-items: start;
}

.measure-row {
  display: grid;
  align-items: start;
}

.measure-row-1 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 10px;
}

.measure-row-2,
.measure-row-3 {
  grid-template-columns: repeat(2, minmax(0, max-content));
  column-gap: 20px;
  justify-content: start;
}

.measure-row :deep(.filter-radio) {
  min-width: 0;
}

.measure-row :deep(.filter-radio .el-radio__label) {
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
}

.measure-radio-group :deep(.el-radio),
.year-radio-group :deep(.el-radio) {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  margin-right: 0;
}

.filter-checkbox :deep(.el-checkbox__label),
.filter-radio :deep(.el-radio__label) {
  display: block;
  min-width: 0;
  padding-left: var(--province-option-label-gap);
  font-family: var(--dashboard-font-family);
  font-size: var(--province-option-font-size);
  font-weight: var(--province-option-font-weight);
  font-style: normal;
  line-height: var(--province-option-line-height);
  letter-spacing: 0;
  color: var(--province-option-color);
  white-space: normal;
  word-break: break-word;
}

.filter-checkbox :deep(.el-checkbox__input.is-checked + .el-checkbox__label),
.filter-radio :deep(.el-radio__input.is-checked + .el-radio__label) {
  font-family: var(--dashboard-font-family);
  font-size: var(--province-option-font-size);
  font-weight: var(--province-option-font-weight);
  font-style: normal;
  line-height: var(--province-option-line-height);
  letter-spacing: 0;
  color: var(--province-option-color);
}

.year-radio-group {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.filter-radio {
  margin-right: 0 !important;
  font-family: var(--dashboard-font-family) !important;
}

.filter-checkbox-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  max-height: 120px;
  padding-right: 4px;
  overflow-y: auto;
  align-content: start;
}

.filter-checkbox {
  width: 100%;
  margin-right: 0 !important;
  font-family: var(--dashboard-font-family) !important;
}

.filter-radio :deep(.el-radio__input),
.filter-checkbox :deep(.el-checkbox__input) {
  flex-shrink: 0;
  margin-top: 1px;
}

.timeframe-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.year-input {
  width: 62px !important;
}

.year-input :deep(.el-input__inner) {
  height: 24px;
  padding: 0 4px;
  font-family: var(--dashboard-font-family);
  font-size: 11px;
  line-height: 24px;
  text-align: center;
}

.year-separator {
  font-family: var(--dashboard-font-family);
  font-size: 11px;
  color: #6b7280;
}

.slider-container {
  padding: 0 4px;
}

.slider-container :deep(.el-slider__marks-text) {
  font-size: 9px;
  color: #9ca3af;
}

@container (max-width: 300px) {
  .measure-row-1,
  .measure-row-2,
  .measure-row-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 10px;
  }

  .measure-row :deep(.filter-radio .el-radio__label) {
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

}

@media (max-width: 1200px) {
  .filter-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .filter-panel {
    grid-template-columns: 1fr;
  }
}
</style>
