import { onMounted, onUnmounted, watch } from 'vue'
import { EMPTY_TREND_TEXT, TREND_LAYOUT } from '../constants/dashboard'
import { echarts } from '../lib/echarts'
import { formatNumber } from '../utils/format'

const UI_FONT_SCALE = 1.2
const scaleFont = (size) => Math.max(9, Math.round(size * UI_FONT_SCALE))

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
        textStyle: {
          fontSize: scaleFont(13)
        },
        valueFormatter: (value) => (
          value == null ? '暂无统计数据' : `${formatNumber(value)} ${selectedMeasure.value.unit}`
        )
      },
      grid: {
        top: 68,
        left: TREND_LAYOUT.gridLeft,
        right: TREND_LAYOUT.legendPanelWidth,
        bottom: 16,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendYears.value.map((year) => String(year)),
        axisLabel: {
          rotate: 0,
          fontSize: scaleFont(11),
          hideOverlap: false
        }
      },
      yAxis: {
        type: 'value',
        name: selectedMeasureLabel.value,
        nameLocation: 'end',
        nameGap: 24,
        nameTextStyle: {
          fontSize: scaleFont(12)
        },
        axisLabel: {
          fontSize: scaleFont(11)
        }
      },
      legend: {
        orient: 'vertical',
        left: legendPanelLeft + TREND_LAYOUT.legendLeftPadding,
        top: 'center',
        width: TREND_LAYOUT.legendPanelWidth - TREND_LAYOUT.legendLeftPadding - 12,
        align: 'left',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: {
          fontSize: scaleFont(12),
          overflow: 'break',
          width: TREND_LAYOUT.legendPanelWidth - TREND_LAYOUT.legendLeftPadding - 34
        }
      },
      series: trendSeriesData.value.map((item) => ({
        name: item.name,
        type: 'line',
        smooth: true,
        data: item.data,
        symbolSize: 6,
        lineStyle: {
          width: 2.5
        },
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
          fontSize: scaleFont(15)
        }
      }]
    }, true)
  }

  const initTrendChart = () => {
    if (!chartRef.value || trendChart) {
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
