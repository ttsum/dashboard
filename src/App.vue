<template>
  <div class="dashboard">
    <!-- 顶部 Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="logo-placeholder">
          <el-icon :size="32"><TrendCharts /></el-icon>
        </div>
        <div class="header-title">
          <span class="org-name">国家统计局</span>
          <span class="main-title">省级经济数据报告</span>
        </div>
      </div>
      <div class="header-right">
        <span class="date-text">{{ currentDate }}</span>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="dashboard-main">
      <!-- 任务面板 -->
      <div class="task-panel">
        <div class="task-item">
          <div class="task-number">任务一</div>
          <div class="task-content">找到2024年益阳县GDP数据</div>
        </div>
        <div class="task-item">
          <div class="task-number">任务二</div>
          <div class="task-content">找到2023年衡阳县人口数据</div>
        </div>
        <div class="task-item">
          <div class="task-number">任务三</div>
          <div class="task-content">找到2024年湖南省GDP数据</div>
        </div>
        <div class="task-item">
          <div class="task-number">任务四</div>
          <div class="task-content">找到2023年长沙市人口数据</div>
        </div>
        <div class="task-item">
          <div class="task-number">任务五</div>
          <div class="task-content">找到2024年全国GDP数据</div>
        </div>
      </div>

      <!-- 四列筛选器面板 -->
      <div class="filter-panel">
        <!-- Column 1: Map Measure -->
        <div class="filter-column">
          <div class="filter-header">地图指标</div>
          <el-radio-group v-model="selectedMapMeasure" class="filter-radio-group measure-radio-group">
            <el-radio
              v-for="item in mapMeasures"
              :key="item"
              :label="item"
              class="filter-radio"
            >
              {{ item }}
            </el-radio>
          </el-radio-group>
        </div>

        <!-- Column 2: Map Timeframe -->
        <div class="filter-column">
          <div class="filter-header">年份选择</div>
          <el-radio-group v-model="selectedMapTimeframe" class="filter-radio-group year-radio-group">
            <el-radio
              v-for="item in mapTimeframes"
              :key="item"
              :label="item"
              class="filter-radio"
            >
              {{ item }}
            </el-radio>
          </el-radio-group>
        </div>

        <!-- Column 3: Chart Measures -->
        <div class="filter-column">
          <div class="filter-header filter-header-row">
            <span>省份选择</span>
            <el-button
              type="primary"
              link
              size="small"
              class="clear-province-btn"
              :disabled="selectedChartMeasures.length === 0"
              @click="clearSelectedProvinces"
            >
              一键清除
            </el-button>
          </div>
          <el-checkbox-group v-model="selectedChartMeasures" class="filter-checkbox-group">
            <el-checkbox
              v-for="item in chartMeasures"
              :key="item"
              :label="item"
              class="filter-checkbox"
            >
              {{ item }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <!-- Column 4: Timeframe Slider -->
        <div class="filter-column">
          <div class="filter-header">时间范围</div>
          <div class="timeframe-inputs">
            <el-input-number
              v-model="startYear"
              :min="minYear"
              :max="maxYear"
              :controls="false"
              size="small"
              class="year-input"
            />
            <span class="year-separator">至</span>
            <el-input-number
              v-model="endYear"
              :min="minYear"
              :max="maxYear"
              :controls="false"
              size="small"
              class="year-input"
            />
          </div>
          <div class="slider-container">
            <el-slider
              v-model="yearRange"
              range
              :min="minYear"
              :max="maxYear"
              :marks="yearMarks"
            />
          </div>
        </div>
      </div>

      <!-- 第三步和第四步的可视化区域 -->
      <div class="visualization-area">
        <div class="viz-row">
          <!-- 左侧：地图区域 -->
          <div class="map-section">
            <div class="map-title">
              {{ selectedMapMeasure }}分布图 - {{ selectedMapTimeframe }}年
            </div>

            <div class="map-container">
              <div ref="mapChartRef" class="map-chart"></div>
              <!-- 颜色图例 - 放在地图左下角 -->
              <div class="map-legend">
                <div class="legend-title">{{ selectedMapMeasure }}</div>
                <div class="legend-scale">
                  <div
                    v-for="(item, index) in mapLegendItems"
                    :key="item.label"
                    class="legend-item"
                    :style="{ borderLeftColor: item.color }"
                  >
                    <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
                    <span class="legend-label">{{ item.label }}</span>
                  </div>
                  <div class="legend-item legend-item-no-data">
                    <div class="legend-color" style="background-color: #D1D5DB;"></div>
                    <span class="legend-label">暂无数据</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部说明 -->
            <div class="map-footer">
              数据来源：国家统计局（GDP分省年度数据、总人口分省年度数据、城镇人口平均工资分省年度数据）。
            </div>
          </div>

          <!-- 右侧：趋势图区域 -->
          <div class="chart-section">
            <div class="chart-title">
              {{ selectedMapMeasure }}趋势图 ({{ startYear }} - {{ endYear }})
            </div>
            <div ref="trendChartRef" class="chart-container"></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import chinaProvinceGeoJson from './data/china-provinces.json'
import { MEASURE_CONFIG, YEAR_OPTIONS, PROVINCES } from './data/provinceData'

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const measureByLabel = new Map(
  Object.values(MEASURE_CONFIG).map((item) => [item.label, item])
)
const mapMeasures = ref(Object.values(MEASURE_CONFIG).map((item) => item.label))
const selectedMapMeasure = ref('GDP (亿元)')
const minYear = Math.min(...YEAR_OPTIONS)
const maxYear = Math.max(...YEAR_OPTIONS)

const mapTimeframes = ref([...YEAR_OPTIONS].reverse().map((year) => String(year)))
const selectedMapTimeframe = ref(String(maxYear))

const chartMeasures = computed(() => PROVINCES.map((province) => province.name))
const selectedChartMeasures = ref(['广东省', '江苏省', '山东省', '浙江省', '河南省'])
const clearSelectedProvinces = () => {
  selectedChartMeasures.value = []
}

const yearRange = ref([minYear, maxYear])
const yearMarks = YEAR_OPTIONS.reduce((marks, year) => {
  marks[year] = String(year)
  return marks
}, {})

const startYear = computed({
  get: () => yearRange.value[0],
  set: (value) => {
    const nextStart = Math.min(value, yearRange.value[1])
    yearRange.value = [nextStart, yearRange.value[1]]
  }
})

const endYear = computed({
  get: () => yearRange.value[1],
  set: (value) => {
    const nextEnd = Math.max(value, yearRange.value[0])
    yearRange.value = [yearRange.value[0], nextEnd]
  }
})

const MAP_NAME = 'china-province-svg'

// 不同指标类型的颜色方案
const COLOR_SCHEMES = {
  // 人口指标 - 绿色系
  population: ['#A5D6A7', '#81C784', '#66BB6A', '#43A047', '#2E7D32'],
  // GDP指标 - 红色系
  gdp: ['#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#C62828'],
  // 收入指标 - 蓝色系
  income: ['#BBDEFB', '#90CAF9', '#64B5F6', '#2196F3', '#1565C0']
}

// 根据选中指标获取颜色方案
const mapColors = computed(() => COLOR_SCHEMES[selectedMeasure.value.key] || COLOR_SCHEMES.gdp)

const SERIES_COLORS = ['#E91E63', '#9C27B0', '#00BCD4', '#FF9800', '#4CAF50', '#2196F3', '#FF5722', '#3F51B5']
const TREND_GRID_LEFT = 56
const TREND_LEGEND_PANEL_WIDTH = 200
const TREND_LEGEND_LEFT_PADDING = 10

const mapChartRef = ref(null)
const trendChartRef = ref(null)
let mapChart = null
let trendChart = null

const provinceByName = new Map(PROVINCES.map((province) => [province.name, province]))
const mapGeoRegionNames = (chinaProvinceGeoJson.features || [])
  .map((feature) => feature?.properties?.name)
  .filter((name) => Boolean(name))
const nonStatRegionNames = mapGeoRegionNames.filter((name) => !provinceByName.has(name))
const seriesColorByName = new Map()

const selectedMeasure = computed(() => (
  measureByLabel.get(selectedMapMeasure.value) || MEASURE_CONFIG.gdp
))
const selectedYear = computed(() => Number(selectedMapTimeframe.value))
const trendYears = computed(() => YEAR_OPTIONS.filter((year) => (
  year >= startYear.value && year <= endYear.value
)))

const formatNumber = (value) => Number(value || 0).toLocaleString('zh-CN')

const getSeriesColor = (name) => {
  if (!seriesColorByName.has(name)) {
    const colorIndex = seriesColorByName.size % SERIES_COLORS.length
    seriesColorByName.set(name, SERIES_COLORS[colorIndex])
  }
  return seriesColorByName.get(name)
}

const getMapSnapshot = (selectedMeasureKey, selectedYearValue) => (
  Object.fromEntries(
    PROVINCES.map((province) => [
      province.adcode,
      Number.isFinite(province.metrics[selectedMeasureKey]?.[selectedYearValue])
        ? province.metrics[selectedMeasureKey][selectedYearValue]
        : null
    ])
  )
)

const mapSeriesData = computed(() => {
  const snapshot = getMapSnapshot(selectedMeasure.value.key, selectedYear.value)
  const provinceData = PROVINCES.map((province) => ({
    name: province.name,
    value: snapshot[province.adcode],
    adcode: province.adcode
  }))
  const noDataRegions = nonStatRegionNames.map((name) => ({
    name,
    value: null,
    isNoData: true,
    itemStyle: { areaColor: '#D1D5DB' }
  }))
  return [...provinceData, ...noDataRegions]
})

const buildLegendItems = (values, unit, colors) => {
  if (!values.length) {
    return []
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return [{ color: colors[2], min, max, label: `${formatNumber(min)} ${unit}` }]
  }
  const step = (max - min) / colors.length
  return colors.map((color, index) => {
    const lower = Math.round(min + step * index)
    const upper = Math.round(min + step * (index + 1))
    if (index === 0) {
      return {
        color,
        min,
        max: upper,
        label: `${formatNumber(min)} - ${formatNumber(upper)} ${unit}`
      }
    }
    if (index === colors.length - 1) {
      return {
        color,
        min: lower,
        max,
        label: `${formatNumber(lower)} - ${formatNumber(max)} ${unit}`
      }
    }
    return {
      color,
      min: lower,
      max: upper,
      label: `${formatNumber(lower)} - ${formatNumber(upper)} ${unit}`
    }
  })
}

const mapLegendItems = computed(() => (
  buildLegendItems(
    mapSeriesData.value
      .map((item) => item.value)
      .filter((value) => Number.isFinite(value)),
    selectedMeasure.value.unit,
    mapColors.value
  )
))

const trendSeriesData = computed(() => (
  selectedChartMeasures.value
    .map((name) => provinceByName.get(name))
    .filter(Boolean)
    .map((province) => ({
      name: province.name,
      color: getSeriesColor(province.name),
      data: trendYears.value.map((year) => {
        const value = province.metrics[selectedMeasure.value.key]?.[year]
        return Number.isFinite(value) ? value : null
      })
    }))
))

const syncMapSelection = () => {
  if (!mapChart) {
    return
  }
  const selectedNames = new Set(selectedChartMeasures.value)
  PROVINCES.forEach((province) => {
    mapChart.dispatchAction({
      type: selectedNames.has(province.name) ? 'select' : 'unselect',
      seriesIndex: 0,
      name: province.name
    })
  })
}

const updateMapChart = () => {
  if (!mapChart) {
    return
  }

  const visualPieces = mapLegendItems.value.map((item, index) => ({
    gte: index === 0 ? item.min : item.min,
    lte: index === mapLegendItems.value.length - 1 ? item.max : item.max,
    color: item.color
  }))

  mapChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const rawValue = params?.data?.value
        const hasValue = Number.isFinite(Number(rawValue))
        if (!hasValue) {
          return `${params.name}<br>暂无统计数据`
        }
        const value = formatNumber(rawValue)
        return `${params.name}<br>${selectedMeasure.value.label}: ${value} ${selectedMeasure.value.unit}`
      }
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      pieces: visualPieces,
      outOfRange: {
        color: '#D1D5DB'
      }
    },
    series: [{
      type: 'map',
      map: MAP_NAME,
      roam: true,
      zoom: 1.05,
      selectedMode: 'multiple',
      emphasis: {
        label: {
          show: true,
          fontSize: 11,
          color: '#111827'
        },
        itemStyle: {
          borderColor: '#002D56',
          borderWidth: 2
        }
      },
      select: {
        itemStyle: {
          borderColor: '#002D56',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 45, 86, 0.35)'
        }
      },
      itemStyle: {
        areaColor: '#E5E7EB',
        borderColor: '#FFFFFF',
        borderWidth: 1
      },
      data: mapSeriesData.value
    }]
  }, true)

  syncMapSelection()
}

const updateTrendChart = () => {
  if (!trendChart) {
    return
  }
  const hasSeries = trendSeriesData.value.length > 0
  const chartWidth = trendChart.getWidth()
  const legendPanelLeft = Math.max(chartWidth - TREND_LEGEND_PANEL_WIDTH, 0)
  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: (value) => `${formatNumber(value)} ${selectedMeasure.value.unit}`
    },
    grid: {
      left: TREND_GRID_LEFT,
      right: TREND_LEGEND_PANEL_WIDTH,
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendYears.value.map((year) => String(year)),
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: selectedMapMeasure.value,
      nameLocation: 'end',
      nameGap: 18,
      nameTextStyle: {
        fontSize: 11
      }
    },
    legend: {
      orient: 'vertical',
      left: legendPanelLeft + TREND_LEGEND_LEFT_PADDING,
      top: 'center',
      width: TREND_LEGEND_PANEL_WIDTH - TREND_LEGEND_LEFT_PADDING - 8,
      align: 'left',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 11
      }
    },
    series: trendSeriesData.value.map((item) => ({
      name: item.name,
      type: 'line',
      smooth: true,
      data: item.data,
      itemStyle: { color: item.color },
      emphasis: {
        focus: 'series'
      }
    })),
    graphic: hasSeries ? [] : [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: '请至少选择一个省份',
        fill: '#9CA3AF',
        fontSize: 13
      }
    }]
  }, true)
}

const initMapChart = () => {
  if (!mapChartRef.value) {
    return
  }
  echarts.registerMap(MAP_NAME, chinaProvinceGeoJson)
  mapChart = echarts.init(mapChartRef.value)
  mapChart.on('click', (params) => {
    if (!params.name || !provinceByName.has(params.name)) {
      return
    }
    const selected = new Set(selectedChartMeasures.value)
    if (selected.has(params.name)) {
      selected.delete(params.name)
    } else {
      selected.add(params.name)
    }
    selectedChartMeasures.value = Array.from(selected)
  })
  updateMapChart()
}

const initTrendChart = () => {
  if (!trendChartRef.value) {
    return
  }
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

// 监听窗口大小变化
const handleResize = () => {
  mapChart?.resize()
  trendChart?.resize()
  updateTrendChart()
}

watch([selectedMapMeasure, selectedMapTimeframe], () => {
  updateMapChart()
})

watch([selectedChartMeasures, yearRange, selectedMapMeasure], () => {
  updateTrendChart()
  syncMapSelection()
}, { deep: true })

onMounted(() => {
  initMapChart()
  initTrendChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  mapChart?.dispose()
  trendChart?.dispose()
})
</script>

<style scoped>
/* 整体容器 */
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', Arial, sans-serif;
  overflow: hidden;
}

/* 顶部 Header */
.dashboard-header {
  flex-shrink: 0;
  background-color: #002D56;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  color: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-placeholder {
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.header-title {
  display: flex;
  flex-direction: column;
}

.org-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
}

.date-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

/* 主内容区域 */
.dashboard-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #E5E7EB;
  padding: 8px;
  overflow: hidden;
}

/* 任务面板 */
.task-panel {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  background-color: #fff;
  padding: 8px;
  border-radius: 4px;
}

.task-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background-color: #F9FAFB;
  border-radius: 4px;
  border: 1px solid #E5E7EB;
  text-align: center;
}

.task-number {
  font-size: 11px;
  font-weight: 600;
  color: #002D56;
  margin-bottom: 3px;
  padding: 1px 8px;
  background-color: rgba(0, 45, 86, 0.1);
  border-radius: 9px;
}

.task-content {
  font-size: 10px;
  color: #4B5563;
  line-height: 1.25;
}

/* 筛选器面板 */
.filter-panel {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background-color: #fff;
  padding: 8px;
  border-radius: 4px;
}

.filter-column {
  padding: 6px;
  background-color: #F9FAFB;
  border-radius: 4px;
  border: 1px solid #E5E7EB;
  min-height: 0;
}

.filter-header {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #E5E7EB;
}

.filter-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.clear-province-btn {
  font-size: 10px;
  line-height: 1;
  padding: 0;
}

.filter-radio-group {
  display: grid;
  gap: 2px 6px;
}

.measure-radio-group {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.year-radio-group {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.filter-radio {
  margin-right: 0 !important;
  font-size: 10px !important;
  color: #4B5563;
}

.filter-checkbox-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  max-height: 82px;
  overflow-y: auto;
  padding-right: 4px;
  align-content: start;
}

.filter-checkbox {
  margin-right: 0 !important;
  font-size: 10px !important;
  color: #4B5563;
  width: 100%;
}

.filter-checkbox :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.15;
}

/* Timeframe 滑块区域 */
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
  text-align: center;
  font-size: 11px;
  padding: 0 4px;
  height: 24px;
  line-height: 24px;
}

.year-separator {
  font-size: 11px;
  color: #6B7280;
}

.slider-container {
  padding: 0 4px;
}

.slider-container :deep(.el-slider__marks-text) {
  font-size: 9px;
  color: #9CA3AF;
}

.visualization-area {
  flex: 1;
  min-height: 0;
  background-color: #fff;
  border-radius: 4px;
  padding: 8px;
  overflow: hidden;
}

.viz-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

/* 地图区域 */
.map-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.map-title {
  font-size: 12px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid #002D56;
  flex-shrink: 0;
}

.map-container {
  flex: 1;
  min-height: 0;
  background-color: #F9FAFB;
  border-radius: 4px;
  padding: 4px;
  position: relative;
  overflow: hidden;
}

.map-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.map-chart :deep(svg) {
  overflow: visible;
}

/* 地图图例 - 左下角定位 */
.map-legend {
  position: absolute;
  left: 8px;
  bottom: 8px;
  background-color: rgba(255, 255, 255, 0.92);
  border-radius: 4px;
  padding: 6px 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  z-index: 10;
  min-width: 110px;
}

.legend-title {
  font-size: 10px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 4px;
  padding-bottom: 3px;
  border-bottom: 1px solid #E5E7EB;
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
  background-color: #F9FAFB;
  border-radius: 3px;
  border-left: 3px solid transparent;
}

.legend-color {
  width: 12px;
  height: 8px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.legend-label {
  font-size: 8px;
  color: #374151;
  white-space: nowrap;
}

/* 地图底部说明 */
.map-footer {
  margin-top: 6px;
  padding: 5px 8px;
  background-color: #F3F4F6;
  border-radius: 4px;
  font-size: 10px;
  color: #6B7280;
  font-style: italic;
  line-height: 1.25;
  flex-shrink: 0;
}

/* 趋势图区域 */
.chart-section {
  display: flex;
  flex-direction: column;
  background-color: #F9FAFB;
  border-radius: 4px;
  min-height: 0;
}

.chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 6px;
  padding: 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid #002D56;
  background-color: #fff;
  border-radius: 4px 4px 0 0;
  flex-shrink: 0;
}

.chart-container {
  flex: 1;
  min-height: 0;
  background-color: #fff;
  border-radius: 0 0 4px 4px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .task-panel {
    grid-template-columns: repeat(3, 1fr);
  }

  .filter-panel {
    grid-template-columns: repeat(2, 1fr);
  }

  .viz-row {
    grid-template-columns: 1fr;
  }

  .dashboard-main {
    overflow-y: auto;
  }
}

@media (max-width: 768px) {
  .task-panel {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-panel {
    grid-template-columns: 1fr;
  }

  .header-title {
    display: none;
  }

  .main-title {
    font-size: 16px;
  }

  .dashboard-header {
    padding: 8px 12px;
  }

  .dashboard-main {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .task-panel {
    grid-template-columns: 1fr;
  }
}
</style>
