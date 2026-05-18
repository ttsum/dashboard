<template>
  <section class="filter-panel">
    <div class="filter-column measure-filter">
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

    <div class="filter-column map-year-filter">
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

    <div class="filter-column county-filter">
      <div class="filter-header filter-header-row">
        <span>区县选择</span>
        <div class="county-header-tools">
          <ElInput
            v-model="countySearchKeyword"
            clearable
            size="small"
            class="county-search-input"
            placeholder="搜索区县"
          />
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
      </div>

      <ElCheckboxGroup
        :model-value="selectedChartMeasures"
        class="filter-checkbox-group"
        @update:model-value="emit('update:selected-chart-measures', $event)"
      >
        <ElCheckbox
          v-for="item in filteredChartMeasures"
          :key="item"
          :label="item"
          class="filter-checkbox"
        >
          {{ item }}
        </ElCheckbox>
      </ElCheckboxGroup>
    </div>

  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElInput,
  ElRadio,
  ElRadioGroup
} from 'element-plus'

const props = defineProps({
  mapMeasures: { type: Array, required: true },
  selectedMapMeasure: { type: String, required: true },
  mapTimeframes: { type: Array, required: true },
  selectedMapTimeframe: { type: String, required: true },
  chartMeasures: { type: Array, required: true },
  selectedChartMeasures: { type: Array, required: true }
})

const emit = defineEmits([
  'update:selected-map-measure',
  'update:selected-map-timeframe',
  'update:selected-chart-measures',
  'clear-selected-counties'
])

const countySearchKeyword = ref('')
const filteredChartMeasures = computed(() => {
  const keyword = countySearchKeyword.value.trim().toLowerCase()

  if (!keyword) {
    return props.chartMeasures
  }

  return props.chartMeasures.filter((item) => (
    String(item).toLowerCase().includes(keyword)
  ))
})
</script>

<style scoped>
.filter-panel {
  --dashboard-font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --option-font-size: calc(13px * var(--ui-font-scale));
  --option-font-weight: 500;
  --option-line-height: 1.4;
  --option-color: #4b5563;
  --option-label-gap: 10px;
  --filter-height: 260px;
  --measure-filter-height: 286px;
  display: grid;
  grid-template-columns: max-content minmax(150px, 0.65fr) minmax(0, 1.75fr);
  grid-template-areas:
    "measure map-year county";
  align-items: start;
  gap: 8px;
  padding: 8px;
  font-family: var(--dashboard-font-family);
  background-color: #fff;
  border-radius: 4px;
}

.filter-column {
  min-height: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.measure-filter {
  grid-area: measure;
  height: var(--measure-filter-height);
}

.map-year-filter {
  grid-area: map-year;
  height: var(--measure-filter-height);
}

.county-filter {
  grid-area: county;
  height: var(--measure-filter-height);
}

.filter-header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.filter-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.county-header-tools {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.county-header-tools .clear-btn {
  margin-left: auto;
}

.clear-btn {
  padding: 0;
  font-size: calc(12px * var(--ui-font-scale));
  line-height: 1;
}

.filter-radio-group {
  display: grid;
  gap: 4px 6px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.measure-radio-group {
  grid-template-columns: 1fr;
  gap: 11px 6px;
  overflow: visible;
}

.year-radio-group {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 6px;
}

.filter-radio {
  min-width: 0;
  margin-right: 0 !important;
}

.filter-checkbox-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px 6px;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  overflow-y: auto;
  align-content: start;
}

.county-search-input {
  flex-shrink: 0;
  margin-bottom: 0;
}

.county-header-tools .county-search-input {
  width: 122px;
}

.county-search-input :deep(.el-input__wrapper) {
  min-height: 28px;
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
  white-space: nowrap;
}

.year-radio-group :deep(.el-radio__label),
.filter-checkbox-group :deep(.el-checkbox__label) {
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .filter-panel {
    grid-template-columns: minmax(150px, 0.7fr) minmax(150px, 0.7fr) minmax(0, 1.9fr);
  }
}

@media (max-width: 768px) {
  .filter-panel {
    grid-template-columns: 1fr;
    grid-template-areas:
      "measure"
      "map-year"
      "county";
  }

  .filter-column {
    height: auto;
    max-height: 148px;
  }

  .county-filter {
    max-height: 150px;
  }
}
</style>

