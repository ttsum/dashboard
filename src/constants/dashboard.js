import { MEASURE_CONFIG, PROVINCES, YEAR_OPTIONS } from '../data/provinceData'

export { MEASURE_CONFIG, PROVINCES, YEAR_OPTIONS }

export const TASK_ITEMS = [
  { id: 'task-1', label: '任务一', content: '找到2024年益阳县GDP数据' },
  { id: 'task-2', label: '任务二', content: '找到2023年衡阳县人口数据' },
  { id: 'task-3', label: '任务三', content: '找到2024年湖南省GDP数据' },
  { id: 'task-4', label: '任务四', content: '找到2023年长沙市人口数据' },
  { id: 'task-5', label: '任务五', content: '找到2024年全国GDP数据' }
]

export const DEFAULT_MEASURE_LABEL = MEASURE_CONFIG.gdp.label
export const DEFAULT_SELECTED_PROVINCES = ['广东省', '江苏省', '山东省', '浙江省', '河南省']

export const MAP_NAME = 'china-province'
export const MAP_GEOJSON_URL = `${import.meta.env.BASE_URL}geo/china-provinces.json`
export const MAP_SOURCE_TEXT = '数据来源：国家统计局（GDP、总人口、城镇人口平均工资、财政收入、人均消费支出、城市绿地面积、道路长度等分省年度数据）。'
export const EMPTY_TREND_TEXT = '请至少选择一个省份'

export const COLOR_SCHEMES = {
  population: ['#A5D6A7', '#81C784', '#66BB6A', '#43A047', '#2E7D32'],
  gdp: ['#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#C62828'],
  income: ['#BBDEFB', '#90CAF9', '#64B5F6', '#2196F3', '#1565C0'],
  fiscalRevenue: ['#E1BEE7', '#CE93D8', '#BA68C8', '#9C27B0', '#6A1B9A'],
  consumption: ['#FFE0B2', '#FFCC80', '#FFB74D', '#FF9800', '#E65100'],
  greenArea: ['#B2DFDB', '#80CBC4', '#4DB6AC', '#009688', '#00695C'],
  roadLength: ['#C5CAE9', '#9FA8DA', '#7986CB', '#3F51B5', '#283593']
}

export const SERIES_COLORS = ['#E91E63', '#9C27B0', '#00BCD4', '#FF9800', '#4CAF50', '#2196F3', '#FF5722', '#3F51B5']

export const TREND_LAYOUT = {
  gridLeft: 56,
  legendPanelWidth: 200,
  legendLeftPadding: 10
}
