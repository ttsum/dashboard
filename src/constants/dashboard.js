import { COUNTIES, MEASURE_CONFIG, YEAR_OPTIONS } from '../dashboardData'

export { COUNTIES, MEASURE_CONFIG, YEAR_OPTIONS }

export const DEFAULT_MEASURE_LABEL = MEASURE_CONFIG.population.displayLabel
export const DEFAULT_SELECTED_COUNTIES = ['东湖区']

export const MAP_NAME = 'jiangxi-counties'
export const MAP_SOURCE_TEXT = '数据来源：中国县域统计数据 与江西省行政区划边界数据'
export const EMPTY_TREND_TEXT = '请选择至少一个区县'

export const COLOR_SCHEMES = {
  population: ['#DDEAF7', '#B8D4F0', '#93BEE8', '#5A99D4', '#2D6FAE'],
  gdp: ['#FCE1DA', '#F9C2B4', '#F39A86', '#E56B52', '#BD3E28'],
  oilYield: ['#FDEBC7', '#FAD48D', '#F5B757', '#E6942F', '#C46E14'],
  avgWage: ['#E3E2FA', '#C8C5F4', '#A8A3EC', '#7F79E0', '#5A52BF'],
  industrialEnterpriseCount: ['#DDF4E4', '#B6E9C8', '#8DDDAA', '#54C584', '#2B9960'],
  primaryTeacherCount: ['#E5F4F1', '#C0E7E0', '#92D6CA', '#5CBBAA', '#358F7E']
}

export const SERIES_COLORS = ['#E91E63', '#9C27B0', '#00BCD4', '#FF9800', '#4CAF50', '#2196F3', '#FF5722', '#3F51B5']

export const TREND_LAYOUT = {
  gridLeft: 74,
  legendPanelWidth: 260,
  legendLeftPadding: 14
}
