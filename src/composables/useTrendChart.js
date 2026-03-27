import { onMounted, onUnmounted, watch } from 'vue'
import { EMPTY_TREND_TEXT, TREND_LAYOUT } from '../constants/dashboard'
import { echarts } from '../lib/echarts'
import { formatNumber } from '../utils/format'

export function useTrendChart({
  chartRef,
  selectedMeasure,
  selectedMeasureLabel,
  trendYears,
  trendSeriesData
}) {
  let trendChart = null

  const updateTrendChart = () => {
    if (!trendChart) {
      return
    }

    const hasSeries = trendSeriesData.value.length > 0
    const chartWidth = trendChart.getWidth()
    const legendPanelLeft = Math.max(chartWidth - TREND_LAYOUT.legendPanelWidth, 0)

    trendChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        valueFormatter: (value) => (
          value == null ? '暂无统计数据' : `${formatNumber(value)} ${selectedMeasure.value.unit}`
        )
      },
      grid: {
        left: TREND_LAYOUT.gridLeft,
        right: TREND_LAYOUT.legendPanelWidth,
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
        name: selectedMeasureLabel.value,
        nameLocation: 'end',
        nameGap: 18,
        nameTextStyle: {
          fontSize: 11
        }
      },
      legend: {
        orient: 'vertical',
        left: legendPanelLeft + TREND_LAYOUT.legendLeftPadding,
        top: 'center',
        width: TREND_LAYOUT.legendPanelWidth - TREND_LAYOUT.legendLeftPadding - 8,
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
          text: EMPTY_TREND_TEXT,
          fill: '#9CA3AF',
          fontSize: 13
        }
      }]
    }, true)
  }

  const initTrendChart = () => {
    if (!chartRef.value) {
      return
    }

    if (trendChart) {
      return
    }

    trendChart = echarts.init(chartRef.value)
    requestAnimationFrame(() => {
      trendChart?.resize()
      updateTrendChart()
    })
  }

  const handleResize = () => {
    trendChart?.resize()
    updateTrendChart()
  }

  watch(
    [selectedMeasure, selectedMeasureLabel, trendYears, trendSeriesData],
    updateTrendChart,
    { deep: true, immediate: true }
  )

  onMounted(() => {
    initTrendChart()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    trendChart?.dispose()
  })
}
