import jiangxiCountyMetrics from './data/jiangxiCountyMetrics.json'
import hunanCountyMetrics from './data/hunanCountyMetrics.json'
import { ACTIVE_PROVINCE_KEY } from './constants/provinceDashboard'

const activeCountyMetrics = ACTIVE_PROVINCE_KEY === 'hunan'
  ? hunanCountyMetrics
  : jiangxiCountyMetrics

export const YEAR_OPTIONS = activeCountyMetrics.years

const toHundredMillionYuan = (value) => (
  Number.isFinite(Number(value)) ? Number((Number(value) / 10000).toFixed(2)) : value
)

export const MEASURE_CONFIG = {
  ...activeCountyMetrics.measures,
  gdp: {
    ...activeCountyMetrics.measures.gdp,
    unit: '亿元',
    displayLabel: 'GDP (亿元)'
  }
}

export const COUNTIES = activeCountyMetrics.counties.map((county) => ({
  ...county,
  metrics: {
    ...county.metrics,
    gdp: Object.fromEntries(
      Object.entries(county.metrics.gdp || {}).map(([year, value]) => [
        year,
        toHundredMillionYuan(value)
      ])
    )
  }
}))
