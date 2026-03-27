import { onMounted, onUnmounted, watch } from 'vue'
import { MAP_NAME } from '../constants/dashboard'
import { echarts } from '../lib/echarts'
import { formatNumber } from '../utils/format'

export function useMapChart({
  chartRef,
  geoJson,
  mapLegendItems,
  mapSeriesData,
  selectedMeasure,
  selectedProvinceNames,
  provinceNames,
  onToggleProvince
}) {
  let mapChart = null

  const syncMapSelection = () => {
    if (!mapChart) {
      return
    }

    const selectedNames = new Set(selectedProvinceNames.value)
    provinceNames.value.forEach((provinceName) => {
      mapChart.dispatchAction({
        type: selectedNames.has(provinceName) ? 'select' : 'unselect',
        seriesIndex: 0,
        name: provinceName
      })
    })
  }

  const updateMapChart = () => {
    if (!mapChart || !geoJson.value) {
      return
    }

    const visualPieces = mapLegendItems.value.map((item) => ({
      gte: item.min,
      lte: item.max,
      color: item.color
    }))

    mapChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const rawValue = params?.data?.value
          if (!Number.isFinite(Number(rawValue))) {
            return `${params.name}<br>暂无统计数据`
          }

          return `${params.name}<br>${selectedMeasure.value.label}: ${formatNumber(rawValue)} ${selectedMeasure.value.unit}`
        }
      },
      visualMap: {
        type: 'piecewise',
        show: false,
        pieces: visualPieces,
        outOfRange: { color: '#D1D5DB' }
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

  const initMapChart = () => {
    if (!chartRef.value || !geoJson.value) {
      return
    }

    if (!mapChart) {
      echarts.registerMap(MAP_NAME, geoJson.value)
      mapChart = echarts.init(chartRef.value)
      mapChart.on('click', (params) => {
        if (params?.name) {
          onToggleProvince(params.name)
        }
      })
      requestAnimationFrame(() => {
        mapChart?.resize()
        updateMapChart()
      })
    }

    updateMapChart()
  }

  const handleResize = () => {
    mapChart?.resize()
  }

  watch(
    [geoJson, mapLegendItems, mapSeriesData, selectedMeasure],
    () => {
      initMapChart()
      updateMapChart()
    },
    { deep: true, immediate: true }
  )

  watch(selectedProvinceNames, syncMapSelection, { deep: true })

  onMounted(() => {
    initMapChart()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    mapChart?.dispose()
  })
}
