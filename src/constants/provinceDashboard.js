const PROVINCE_KEYS = ['jiangxi', 'hunan']
const DEFAULT_PROVINCE_KEY = 'jiangxi'

const PROVINCE_META = {
  jiangxi: {
    key: 'jiangxi',
    name: '江西省',
    mapName: 'jiangxi-counties',
    title: '江西省县域统计看板'
  },
  hunan: {
    key: 'hunan',
    name: '湖南省',
    mapName: 'hunan-counties',
    title: '湖南省县域统计看板'
  }
}

const getPathSegments = (pathname = '') => (
  String(pathname || '')
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)
)

const getHashProvinceKey = (hashValue = '') => {
  const match = String(hashValue || '').toLowerCase().match(/^#\/(jiangxi|hunan)(?:\/|$)/)
  return match ? match[1] : ''
}

export const resolveProvinceKeyFromLocation = (locationLike) => {
  const hashProvinceKey = getHashProvinceKey(locationLike?.hash)
  if (hashProvinceKey) {
    return hashProvinceKey
  }

  const pathname = String(locationLike?.pathname || '')
  const segments = getPathSegments(pathname)
  const firstMatchedKey = segments.find((segment) => PROVINCE_KEYS.includes(segment))
  if (firstMatchedKey) {
    return firstMatchedKey
  }

  const searchParams = new URLSearchParams(String(locationLike?.search || ''))
  const queryProvinceKey = String(searchParams.get('province') || '').toLowerCase()
  return PROVINCE_KEYS.includes(queryProvinceKey) ? queryProvinceKey : DEFAULT_PROVINCE_KEY
}

const runtimeLocation = typeof window === 'undefined' ? null : window.location
export const ACTIVE_PROVINCE_KEY = resolveProvinceKeyFromLocation(runtimeLocation)
export const ACTIVE_PROVINCE = PROVINCE_META[ACTIVE_PROVINCE_KEY]
export const DEFAULT_PROVINCE = PROVINCE_META[DEFAULT_PROVINCE_KEY]

export const getProvinceMetaByKey = (provinceKey) => (
  PROVINCE_META[String(provinceKey || '').toLowerCase()] || DEFAULT_PROVINCE
)
