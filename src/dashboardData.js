import jiangxiCountyMetrics from './data/jiangxiCountyMetrics.json'

export const YEAR_OPTIONS = jiangxiCountyMetrics.years

const toHundredMillionYuan = (value) => (
  Number.isFinite(Number(value)) ? Number((Number(value) / 10000).toFixed(2)) : value
)

export const MEASURE_CONFIG = {
  ...jiangxiCountyMetrics.measures,
  gdp: {
    ...jiangxiCountyMetrics.measures.gdp,
    unit: '亿元',
    displayLabel: 'GDP (亿元)'
  }
}

export const COUNTIES = jiangxiCountyMetrics.counties.map((county) => ({
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
