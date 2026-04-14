import { markRaw, onMounted, shallowRef } from 'vue'
import jiangxiCountyGeoJsonUrl from '../assets/geo/jiangxi-counties.raw.geo.json?url'
import jiangxiCityGeoJsonUrl from '../assets/geo/jiangxi-cities.raw.geo.json?url'
import jiangxiProvinceGeoJsonUrl from '../assets/geo/jiangxi-province.raw.geo.json?url'

let cachedCountyGeoJson = null
let cachedCityGeoJson = null
let cachedProvinceGeoJson = null
let geoJsonPromise = null

const toCountyGeoJson = (geoJson) => markRaw({
  type: 'FeatureCollection',
  features: (geoJson.features || [])
    .filter((feature) => feature?.properties?.level === 'district')
    .map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        name: String(feature?.properties?.name || '').trim(),
        adcode: String(feature?.properties?.adcode || ''),
        cityAdcode: String(feature?.properties?.parent?.adcode || ''),
        level: 'county'
      }
    }))
})

const toCityGeoJson = (geoJson) => markRaw({
  type: 'FeatureCollection',
  features: (geoJson.features || []).filter(
    (feature) => feature?.properties?.level === 'city'
  )
})

const toProvinceGeoJson = (geoJson) => markRaw({
  type: 'FeatureCollection',
  features: (geoJson.features || []).filter(
    (feature) => feature?.properties?.level === 'province'
  )
})

export function useJiangxiGeoJson() {
  const geoJson = shallowRef(cachedCountyGeoJson)
  const cityGeoJson = shallowRef(cachedCityGeoJson)
  const provinceGeoJson = shallowRef(cachedProvinceGeoJson)
  const isGeoJsonLoading = shallowRef(!cachedCountyGeoJson || !cachedCityGeoJson || !cachedProvinceGeoJson)
  const geoJsonError = shallowRef('')

  const loadJiangxiGeoJson = async () => {
    if (cachedCountyGeoJson && cachedCityGeoJson && cachedProvinceGeoJson) {
      geoJson.value = cachedCountyGeoJson
      cityGeoJson.value = cachedCityGeoJson
      provinceGeoJson.value = cachedProvinceGeoJson
      isGeoJsonLoading.value = false
      return
    }

    isGeoJsonLoading.value = true
    geoJsonError.value = ''

    try {
      if (!geoJsonPromise) {
        geoJsonPromise = Promise.all([
          fetch(jiangxiCountyGeoJsonUrl).then((response) => {
            if (!response.ok) {
              throw new Error(`County HTTP ${response.status}`)
            }
            return response.json()
          }),
          fetch(jiangxiCityGeoJsonUrl).then((response) => {
            if (!response.ok) {
              throw new Error(`City HTTP ${response.status}`)
            }
            return response.json()
          }),
          fetch(jiangxiProvinceGeoJsonUrl).then((response) => {
            if (!response.ok) {
              throw new Error(`Province HTTP ${response.status}`)
            }
            return response.json()
          })
        ])
      }

      const [countyRaw, cityRaw, provinceRaw] = await geoJsonPromise
      cachedCountyGeoJson = toCountyGeoJson(countyRaw)
      cachedCityGeoJson = toCityGeoJson(cityRaw)
      cachedProvinceGeoJson = toProvinceGeoJson(provinceRaw)
      geoJson.value = cachedCountyGeoJson
      cityGeoJson.value = cachedCityGeoJson
      provinceGeoJson.value = cachedProvinceGeoJson
    } catch (error) {
      geoJsonError.value = `地图数据加载失败: ${error.message}`
      geoJsonPromise = null
    } finally {
      isGeoJsonLoading.value = false
    }
  }

  onMounted(loadJiangxiGeoJson)

  return {
    geoJson,
    cityGeoJson,
    provinceGeoJson,
    isGeoJsonLoading,
    geoJsonError,
    loadJiangxiGeoJson
  }
}
