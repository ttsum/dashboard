const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const RAW_DATA_DIR = path.resolve(__dirname, '../data/raw')
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/provinceMetrics.json')

const PROVINCE_LIST = [
  { name: '北京市', adcode: '110000' },
  { name: '天津市', adcode: '120000' },
  { name: '河北省', adcode: '130000' },
  { name: '山西省', adcode: '140000' },
  { name: '内蒙古自治区', adcode: '150000' },
  { name: '辽宁省', adcode: '210000' },
  { name: '吉林省', adcode: '220000' },
  { name: '黑龙江省', adcode: '230000' },
  { name: '上海市', adcode: '310000' },
  { name: '江苏省', adcode: '320000' },
  { name: '浙江省', adcode: '330000' },
  { name: '安徽省', adcode: '340000' },
  { name: '福建省', adcode: '350000' },
  { name: '江西省', adcode: '360000' },
  { name: '山东省', adcode: '370000' },
  { name: '河南省', adcode: '410000' },
  { name: '湖北省', adcode: '420000' },
  { name: '湖南省', adcode: '430000' },
  { name: '广东省', adcode: '440000' },
  { name: '广西壮族自治区', adcode: '450000' },
  { name: '海南省', adcode: '460000' },
  { name: '重庆市', adcode: '500000' },
  { name: '四川省', adcode: '510000' },
  { name: '贵州省', adcode: '520000' },
  { name: '云南省', adcode: '530000' },
  { name: '西藏自治区', adcode: '540000' },
  { name: '陕西省', adcode: '610000' },
  { name: '甘肃省', adcode: '620000' },
  { name: '青海省', adcode: '630000' },
  { name: '宁夏回族自治区', adcode: '640000' },
  { name: '新疆维吾尔自治区', adcode: '650000' }
]

const PROVINCE_NAME_SET = new Set(PROVINCE_LIST.map((item) => item.name))

const DATA_FILES = {
  gdp: {
    file: 'GDP分省年度数据.xls',
    label: 'GDP (亿元)',
    unit: '亿元'
  },
  population: {
    file: '总人口分省年度数据.xls',
    label: '人口 (万人)',
    unit: '万人'
  },
  income: {
    file: '城镇人口平均工资分省年度数据.xls',
    label: '收入 (元)',
    unit: '元'
  },
  fiscalRevenue: {
    file: '财政收入分省年度数据.xls',
    label: '财政收入 (亿元)',
    unit: '亿元'
  },
  consumption: {
    file: '人均消费支出分省年度数据.xls',
    label: '人均消费支出 (元)',
    unit: '元'
  },
  greenArea: {
    file: '城市绿地面积分省年度数据.xls',
    label: '城市绿地面积 (万公顷)',
    unit: '万公顷'
  },
  roadLength: {
    file: '道路长度分省年度数据.xls',
    label: '道路长度 (万公里)',
    unit: '万公里'
  }
}

const parseYear = (value) => {
  const match = String(value || '').match(/\d{4}/)
  return match ? Number(match[0]) : null
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

const parseMetricTable = (filePath) => {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const headerIndex = rows.findIndex((row) => row[0] === '地区')
  if (headerIndex === -1) {
    throw new Error(`Cannot find header row "地区" in ${filePath}`)
  }

  const years = rows[headerIndex].slice(1).map(parseYear).filter((year) => year !== null)
  const valuesByProvince = {}

  rows.slice(headerIndex + 1).forEach((row) => {
    const name = String(row[0] || '').trim()
    if (!PROVINCE_NAME_SET.has(name)) {
      return
    }
    const metricValues = {}
    years.forEach((year, idx) => {
      metricValues[year] = parseNumber(row[idx + 1])
    })
    valuesByProvince[name] = metricValues
  })

  return { years, valuesByProvince }
}

const metrics = {}
for (const [metricKey, meta] of Object.entries(DATA_FILES)) {
  const table = parseMetricTable(path.join(RAW_DATA_DIR, meta.file))
  const validYears = table.years.filter((year) => (
    Object.values(table.valuesByProvince).some((provinceValues) => (
      Number.isFinite(provinceValues[year])
    ))
  ))

  metrics[metricKey] = {
    ...meta,
    years: validYears,
    valuesByProvince: table.valuesByProvince
  }
}

const metricKeys = Object.keys(DATA_FILES)
const commonYears = metrics[metricKeys[0]].years.filter((year) => (
  metricKeys.every((metricKey) => metrics[metricKey].years.includes(year))
))

const provinces = PROVINCE_LIST.map((province) => ({
  adcode: province.adcode,
  name: province.name,
  metrics: Object.fromEntries(
    metricKeys.map((metricKey) => [
      metricKey,
      Object.fromEntries(
        commonYears.map((year) => [
          year,
          metrics[metricKey].valuesByProvince[province.name]?.[year] ?? null
        ])
      )
    ])
  )
}))

const output = {
  years: commonYears.sort((a, b) => a - b),
  measures: Object.fromEntries(
    Object.entries(DATA_FILES).map(([key, item]) => [
      key,
      { key, label: item.label, unit: item.unit }
    ])
  ),
  provinces
}

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')
console.log(`Generated ${OUTPUT_PATH}`)


