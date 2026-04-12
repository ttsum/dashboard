const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const EXCEL_PATH = path.resolve(__dirname, 'data/中国县域统计数据.xlsx')
const RAW_COUNTY_GEO_PATH = path.resolve(__dirname, 'src/assets/geo/jiangxi-counties.raw.geo.json')
const RAW_PROVINCE_GEO_PATH = path.resolve(__dirname, 'src/assets/geo/jiangxi-province.raw.geo.json')
const OUTPUT_METRICS_PATH = path.resolve(__dirname, 'src/data/jiangxiCountyMetrics.json')
const OUTPUT_MAP_PATH = path.resolve(__dirname, 'src/assets/geo/jiangxi-counties.json')
const DATA_SHEET_NAME = 'ARIMA'

const PROVINCE_NAME = '江西省'
const PROVINCE_ADCODE = '360000'
const YEAR_START = 2015
const YEAR_END = 2023
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i)

const NAME_ALIASES = {
  红谷滩区: '湾里区',
  龙南市: '龙南县'
}

const METRIC_DEFINITIONS = [
  { key: 'population', source: '年末总人口_万人', label: '人口', unit: '万人' },
  { key: 'gdp', source: '地区生产总值_万元', label: 'GDP', unit: '万元' },
  { key: 'oilYield', source: '油料产量_吨', label: '油料产量', unit: '吨' },
  { key: 'avgWage', source: '城镇单位在岗职工平均工资_元', label: '平均工资', unit: '元' },
  { key: 'industrialEnterpriseCount', source: '规模以上工业企业数_个', label: '工业企业数量', unit: '个' },
  { key: 'primaryTeacherCount', source: '普通小学专任教师数_人\n—来自【马 克 数 据 网】', label: '小学教师人数', unit: '人' }
]

const normalizeName = (name) => {
  const trimmed = String(name || '').trim()
  return NAME_ALIASES[trimmed] || trimmed
}

const parseNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const numeric = Number(trimmed.replace(/,/g, ''))
    return Number.isFinite(numeric) ? numeric : null
  }

  return null
}

const loadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'))

const roundCoordinates = (coordinates, precision = 5) => {
  if (typeof coordinates[0] === 'number') {
    return [
      Number(coordinates[0].toFixed(precision)),
      Number(coordinates[1].toFixed(precision))
    ]
  }
  return coordinates.map((item) => roundCoordinates(item, precision))
}

const normalizeGeometry = (geometry) => ({
  type: geometry.type,
  coordinates: roundCoordinates(geometry.coordinates)
})

const buildCountyMapFeatures = (countyGeoJson) => (
  countyGeoJson.features.map((feature) => ({
    type: 'Feature',
    properties: {
      name: String(feature?.properties?.name || '').trim(),
      adcode: String(feature?.properties?.adcode || ''),
      level: 'county'
    },
    geometry: normalizeGeometry(feature.geometry)
  }))
)

const buildProvinceOutlineFeature = (provinceGeoJson) => {
  const provinceFeature = provinceGeoJson.features?.[0]
  if (!provinceFeature) {
    throw new Error('Missing province boundary feature in jiangxi-province.raw.geo.json')
  }

  return {
    type: 'Feature',
    properties: {
      name: '江西省边界',
      adcode: PROVINCE_ADCODE,
      level: 'province-outline'
    },
    geometry: normalizeGeometry(provinceFeature.geometry)
  }
}

const buildMeasureMeta = () => Object.fromEntries(
  METRIC_DEFINITIONS.map((metric) => [
    metric.key,
    {
      key: metric.key,
      label: metric.label,
      unit: metric.unit,
      displayLabel: `${metric.label} (${metric.unit})`
    }
  ])
)

const createJiangxiCountyDataset = () => {
  const countyGeoJson = loadJson(RAW_COUNTY_GEO_PATH)
  const provinceGeoJson = loadJson(RAW_PROVINCE_GEO_PATH)
  const countyFeatures = buildCountyMapFeatures(countyGeoJson)
  const provinceOutlineFeature = buildProvinceOutlineFeature(provinceGeoJson)

  const workbook = XLSX.readFile(EXCEL_PATH)
  const dataSheet = workbook.Sheets[DATA_SHEET_NAME]
  if (!dataSheet) {
    throw new Error(`Cannot find worksheet "${DATA_SHEET_NAME}" in 中国县域统计数据.xlsx`)
  }

  const rows = XLSX.utils.sheet_to_json(dataSheet, { defval: null })
  const filteredRows = rows.filter((row) => (
    row['省份'] === PROVINCE_NAME
    && Number(row['年份']) >= YEAR_START
    && Number(row['年份']) <= YEAR_END
    && row['区县']
  ))

  const rowByCountyAndYear = new Map()
  filteredRows.forEach((row) => {
    const normalizedName = normalizeName(row['区县'])
    const year = Number(row['年份'])
    rowByCountyAndYear.set(`${normalizedName}::${year}`, row)
  })

  const missingCountyNames = new Set()
  const counties = countyFeatures.map((feature) => {
    const sourceCountyName = normalizeName(feature.properties.name)
    const metrics = {}

    METRIC_DEFINITIONS.forEach((metric) => {
      metrics[metric.key] = Object.fromEntries(
        YEARS.map((year) => {
          const row = rowByCountyAndYear.get(`${sourceCountyName}::${year}`)
          const value = parseNumber(row?.[metric.source])
          if (!row) {
            missingCountyNames.add(feature.properties.name)
          }
          return [year, value]
        })
      )
    })

    return {
      adcode: feature.properties.adcode,
      name: feature.properties.name,
      sourceName: sourceCountyName,
      metrics
    }
  })

  const metricsOutput = {
    years: YEARS,
    province: PROVINCE_NAME,
    aliases: NAME_ALIASES,
    measures: buildMeasureMeta(),
    counties
  }

  const mapOutput = {
    type: 'FeatureCollection',
    features: [...countyFeatures, provinceOutlineFeature]
  }

  fs.writeFileSync(OUTPUT_METRICS_PATH, `${JSON.stringify(metricsOutput)}\n`, 'utf-8')
  fs.writeFileSync(OUTPUT_MAP_PATH, `${JSON.stringify(mapOutput)}\n`, 'utf-8')

  console.log(`Generated metrics: ${OUTPUT_METRICS_PATH}`)
  console.log(`Generated map: ${OUTPUT_MAP_PATH}`)
  console.log(`Counties: ${counties.length}, Years: ${YEARS[0]}-${YEARS[YEARS.length - 1]}`)
  if (missingCountyNames.size) {
    console.log(`Counties without source rows: ${Array.from(missingCountyNames).join(', ')}`)
  }
}

createJiangxiCountyDataset()
