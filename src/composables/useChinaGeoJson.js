import { markRaw, onMounted, shallowRef } from 'vue'
import chinaGeoJsonUrl from '../assets/geo/china-provinces.json?url'

let cachedGeoJson = null
let geoJsonPromise = null

export function useChinaGeoJson() {
  const geoJson = shallowRef(cachedGeoJson)
  const isGeoJsonLoading = shallowRef(!cachedGeoJson)
  const geoJsonError = shallowRef('')

  const loadChinaGeoJson = async () => {
    if (cachedGeoJson) {
      geoJson.value = cachedGeoJson
      isGeoJsonLoading.value = false
      return
    }

    isGeoJsonLoading.value = true
    geoJsonError.value = ''

    try {
      if (!geoJsonPromise) {
        geoJsonPromise = fetch(chinaGeoJsonUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
            return response.json()
          })
          .then((json) => markRaw(json))
      }

      cachedGeoJson = await geoJsonPromise
      geoJson.value = cachedGeoJson
    } catch (error) {
      geoJsonError.value = `地图数据加载失败：${error.message}`
      geoJsonPromise = null
    } finally {
      isGeoJsonLoading.value = false
    }
  }

  onMounted(loadChinaGeoJson)

  return {
    geoJson,
    isGeoJsonLoading,
    geoJsonError,
    loadChinaGeoJson
  }
}
