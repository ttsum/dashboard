import { computed, ref } from 'vue'
import {
  COLOR_SCHEMES,
  DEFAULT_MEASURE_LABEL,
  DEFAULT_SELECTED_PROVINCES,
  MEASURE_CONFIG,
  PROVINCES,
  SERIES_COLORS,
  YEAR_OPTIONS
} from '../constants/dashboard'
import { formatNumber } from '../utils/format'

export function useDashboardState(geoJson) {
  const getDisplayLabel = (item) => {
    if (item.key !== 'income') {
      return item.label
    }

    if (item.label.includes('人均')) {
      return item.label
    }

    if (item.label.includes('收入')) {
      return item.label.replace('收入', '人均收入')
    }

    return `人均收入 (${item.unit})`
  }

  const measureItems = Object.values(MEASURE_CONFIG).map((item) => ({
    ...item,
    displayLabel: getDisplayLabel(item)
  }))

  const measureByLabel = new Map(
    measureItems.map((item) => [item.displayLabel, item])
  )
  const provinceByName = new Map(PROVINCES.map((province) => [province.name, province]))
  const seriesColorByName = new Map()

  const mapMeasures = measureItems.map((item) => item.displayLabel)
  const selectedMapMeasure = ref(DEFAULT_MEASURE_LABEL)

  const minYear = Math.min(...YEAR_OPTIONS)
  const maxYear = Math.max(...YEAR_OPTIONS)
  const mapTimeframes = [...YEAR_OPTIONS].reverse().map((year) => String(year))
  const selectedMapTimeframe = ref(String(maxYear))

  const chartMeasures = computed(() => PROVINCES.map((province) => province.name))
  const selectedChartMeasures = ref([...DEFAULT_SELECTED_PROVINCES])

  const clearSelectedProvinces = () => {
    selectedChartMeasures.value = []
  }

  const toggleProvinceSelection = (name) => {
    if (!provinceByName.has(name)) {
      return
    }

    const selected = new Set(selectedChartMeasures.value)
    if (selected.has(name)) {
      selected.delete(name)
    } else {
      selected.add(name)
    }

    selectedChartMeasures.value = Array.from(selected)
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

  const selectedMeasure = computed(() => (
    measureByLabel.get(selectedMapMeasure.value) || MEASURE_CONFIG.gdp
  ))
  const selectedYear = computed(() => Number(selectedMapTimeframe.value))
  const trendYears = computed(() => YEAR_OPTIONS.filter((year) => (
    year >= startYear.value && year <= endYear.value
  )))
  const mapColors = computed(() => COLOR_SCHEMES[selectedMeasure.value.key] || COLOR_SCHEMES.gdp)

  const geoRegionNames = computed(() => (
    (geoJson.value?.features || [])
      .map((feature) => feature?.properties?.name)
      .filter(Boolean)
  ))
  const nonStatRegionNames = computed(() => (
    geoRegionNames.value.filter((name) => !provinceByName.has(name))
  ))

  const getSeriesColor = (name) => {
    if (!seriesColorByName.has(name)) {
      const colorIndex = seriesColorByName.size % SERIES_COLORS.length
      seriesColorByName.set(name, SERIES_COLORS[colorIndex])
    }
    return seriesColorByName.get(name)
  }

  const mapSeriesData = computed(() => {
    const provinceData = PROVINCES.map((province) => {
      const rawValue = province.metrics[selectedMeasure.value.key]?.[selectedYear.value]
      return {
        name: province.name,
        value: Number.isFinite(rawValue) ? rawValue : null,
        adcode: province.adcode
      }
    })

    const noDataRegions = nonStatRegionNames.value.map((name) => ({
      name,
      value: null,
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
      const rangeLabel = index === colors.length - 1
        ? `${formatNumber(lower)} - ${formatNumber(max)} ${unit}`
        : `${formatNumber(index === 0 ? min : lower)} - ${formatNumber(upper)} ${unit}`

      return {
        color,
        min: index === 0 ? min : lower,
        max: index === colors.length - 1 ? max : upper,
        label: rangeLabel
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

  return {
    mapMeasures,
    selectedMapMeasure,
    minYear,
    maxYear,
    mapTimeframes,
    selectedMapTimeframe,
    chartMeasures,
    selectedChartMeasures,
    clearSelectedProvinces,
    toggleProvinceSelection,
    yearRange,
    yearMarks,
    startYear,
    endYear,
    selectedMeasure,
    mapLegendItems,
    mapSeriesData,
    trendYears,
    trendSeriesData
  }
}
