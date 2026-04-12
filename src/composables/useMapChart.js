import { onMounted, onUnmounted, watch } from 'vue'
import { MAP_NAME } from '../constants/dashboard'
import { echarts } from '../lib/echarts'
import { formatNumber } from '../utils/format'

const getGeometryRings = (geometry) => {
  if (!geometry || !geometry.coordinates) {
    return []
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat()
  }

  return []
}

const EDGE_PRECISION = 6
const cityBoundaryLineCache = new WeakMap()
const MAP_FILL_OPACITY = 0.9
const INITIAL_MAP_ZOOM = 1.1
const COUNTY_LABEL_MIN_ZOOM = 2.35
const DEGREE_TO_RADIAN = Math.PI / 180
const RADIAN_TO_DEGREE = 180 / Math.PI
const MERCATOR_MAX_LATITUDE = 85.0511287798

const clampMercatorLatitude = (latitude) => (
  Math.max(-MERCATOR_MAX_LATITUDE, Math.min(MERCATOR_MAX_LATITUDE, Number(latitude)))
)

const MERCATOR_PROJECTION = {
  project: (point) => {
    const longitude = Number(point[0])
    const latitude = clampMercatorLatitude(point[1])
    const mercatorY = Math.log(Math.tan((Math.PI / 4) + (latitude * DEGREE_TO_RADIAN / 2)))

    return [
      longitude,
      -mercatorY * RADIAN_TO_DEGREE
    ]
  },
  unproject: (point) => {
    const longitude = Number(point[0])
    const mercatorY = -Number(point[1]) * DEGREE_TO_RADIAN
    const latitude = (2 * Math.atan(Math.exp(mercatorY)) - (Math.PI / 2)) * RADIAN_TO_DEGREE

    return [longitude, latitude]
  }
}

const toPointKey = (point) => (
  `${Number(point[0]).toFixed(EDGE_PRECISION)},${Number(point[1]).toFixed(EDGE_PRECISION)}`
)

const toEdgeKey = (start, end) => {
  const startKey = toPointKey(start)
  const endKey = toPointKey(end)
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`
}

const buildMergedBoundaryLines = (boundaryEdges) => {
  const nodePoints = new Map()
  const adjacency = new Map()
  const visitedEdgeIds = new Set()

  const ensureNode = (key, point) => {
    if (!nodePoints.has(key)) {
      nodePoints.set(key, point)
    }
    if (!adjacency.has(key)) {
      adjacency.set(key, [])
    }
  }

  boundaryEdges.forEach((edge, edgeId) => {
    ensureNode(edge.startKey, edge.start)
    ensureNode(edge.endKey, edge.end)
    adjacency.get(edge.startKey).push({ edgeId, nextKey: edge.endKey })
    adjacency.get(edge.endKey).push({ edgeId, nextKey: edge.startKey })
  })

  const tracePolyline = (startKey, startConnection) => {
    const polyline = [nodePoints.get(startKey)]
    let currentKey = startKey
    let currentConnection = startConnection

    while (currentConnection) {
      visitedEdgeIds.add(currentConnection.edgeId)
      currentKey = currentConnection.nextKey
      polyline.push(nodePoints.get(currentKey))

      const connections = adjacency.get(currentKey) || []
      const unvisitedConnections = connections.filter(
        (connection) => !visitedEdgeIds.has(connection.edgeId)
      )

      if (!unvisitedConnections.length || connections.length !== 2) {
        break
      }

      currentConnection = unvisitedConnections[0]
    }

    if (polyline.length > 1) {
      return { coords: polyline }
    }

    return null
  }

  const mergedLines = []

  adjacency.forEach((connections, nodeKey) => {
    if (connections.length === 2) {
      return
    }

    connections.forEach((connection) => {
      if (visitedEdgeIds.has(connection.edgeId)) {
        return
      }

      const polyline = tracePolyline(nodeKey, connection)
      if (polyline) {
        mergedLines.push(polyline)
      }
    })
  })

  boundaryEdges.forEach((edge, edgeId) => {
    if (visitedEdgeIds.has(edgeId)) {
      return
    }

    const polyline = tracePolyline(edge.startKey, {
      edgeId,
      nextKey: edge.endKey
    })

    if (polyline) {
      mergedLines.push(polyline)
    }
  })

  return mergedLines
}

const buildCityBoundaryLines = (countyGeoJson) => {
  if (!countyGeoJson) {
    return []
  }

  const cachedLines = cityBoundaryLineCache.get(countyGeoJson)
  if (cachedLines) {
    return cachedLines
  }

  const edgeMap = new Map()

  ;(countyGeoJson?.features || []).forEach((feature) => {
    const cityAdcode = String(feature?.properties?.cityAdcode || '')
    const rings = getGeometryRings(feature.geometry)

    rings.forEach((ring) => {
      if (!Array.isArray(ring) || ring.length < 2) {
        return
      }

      const lastIndex = ring.length - 1
      for (let index = 0; index < lastIndex; index += 1) {
        const start = ring[index]
        const end = ring[index + 1]

        if (!isLngLat(start) || !isLngLat(end)) {
          continue
        }

        const edgeKey = toEdgeKey(start, end)
        const edgeEntry = edgeMap.get(edgeKey) || {
          startKey: toPointKey(start),
          endKey: toPointKey(end),
          start,
          end,
          cityAdcodes: new Set(),
          count: 0
        }

        edgeEntry.cityAdcodes.add(cityAdcode)
        edgeEntry.count += 1
        edgeMap.set(edgeKey, edgeEntry)
      }
    })
  })

  const mergedLines = buildMergedBoundaryLines(
    Array.from(edgeMap.values())
    .filter((edge) => edge.count === 1 || edge.cityAdcodes.size > 1)
  )

  cityBoundaryLineCache.set(countyGeoJson, mergedLines)
  return mergedLines
}

const buildCountyBoundaryLines = (countyGeoJson) => (
  (countyGeoJson?.features || [])
    .flatMap((feature) => getGeometryRings(feature.geometry))
    .filter((ring) => Array.isArray(ring) && ring.length > 1)
    .map((ring) => ({ coords: ring }))
)

const isLngLat = (point) => (
  Array.isArray(point)
  && point.length >= 2
  && Number.isFinite(Number(point[0]))
  && Number.isFinite(Number(point[1]))
)

const isPointOnSegment = (point, start, end, epsilon = 1e-9) => {
  const [px, py] = point
  const [x1, y1] = start
  const [x2, y2] = end
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1)

  if (Math.abs(cross) > epsilon) {
    return false
  }

  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2)
  return dot <= epsilon
}

const isPointInRing = (point, ring) => {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const start = ring[i]
    const end = ring[j]

    if (!isLngLat(start) || !isLngLat(end)) {
      continue
    }

    if (isPointOnSegment(point, start, end)) {
      return true
    }

    const xi = Number(start[0])
    const yi = Number(start[1])
    const xj = Number(end[0])
    const yj = Number(end[1])
    const intersects = ((yi > point[1]) !== (yj > point[1]))
      && (point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi)

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

const isPointInPolygonGeometry = (point, geometry) => {
  if (!geometry?.coordinates) {
    return false
  }

  if (geometry.type === 'Polygon') {
    const [outerRing, ...holes] = geometry.coordinates
    return isPointInRing(point, outerRing) && !holes.some((ring) => isPointInRing(point, ring))
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => {
      const [outerRing, ...holes] = polygon
      return isPointInRing(point, outerRing) && !holes.some((ring) => isPointInRing(point, ring))
    })
  }

  return false
}

const buildLabelData = (labelGeoJson) => (
  (labelGeoJson?.features || [])
    .map((feature) => {
      const name = feature?.properties?.name
      const cp = feature?.properties?.centroid
        || feature?.properties?.center

      if (!name || !isLngLat(cp)) {
        return null
      }

      const lng = Number(cp[0])
      const lat = Number(cp[1])

      return {
        name,
        value: [lng, lat, name]
      }
    })
    .filter(Boolean)
)

const getLegendItemForValue = (value, legendItems) => (
  legendItems.find(
    (legendItem) => Number.isFinite(value)
      && value >= legendItem.min
      && value <= legendItem.max
  )
)

const buildColoredMapData = (seriesData, legendItems) => (
  seriesData.map((item) => ({
    name: item.name,
    value: item.value,
    tierLabel: getLegendItemForValue(item.value, legendItems)?.label || '暂无数据',
    color: getLegendItemForValue(item.value, legendItems)?.color || '#d1d5db'
  }))
)

const buildGeoRegions = (coloredMapData, selectedCountyNames = []) => {
  const selectedNames = new Set(selectedCountyNames)

  return coloredMapData.map((item) => ({
    name: item.name,
    itemStyle: {
      areaColor: item.color,
      opacity: MAP_FILL_OPACITY,
      borderColor: selectedNames.has(item.name) ? '#002d56' : 'rgba(0,0,0,0)',
      borderWidth: selectedNames.has(item.name) ? 1.5 : 0,
      shadowColor: selectedNames.has(item.name) ? 'rgba(0, 45, 86, 0.22)' : 'rgba(0,0,0,0)',
      shadowBlur: selectedNames.has(item.name) ? 10 : 0
    }
  }))
}

const buildTooltipMapData = (coloredMapData) => (
  coloredMapData.map((item) => ({
    name: item.name,
    value: item.value,
    tierLabel: item.tierLabel,
    itemStyle: {
      areaColor: 'rgba(0,0,0,0)',
      borderColor: 'rgba(0,0,0,0)',
      opacity: 0
    }
  }))
)

export function useMapChart({
  chartRef,
  geoJson,
  cityGeoJson,
  mapLegendItems,
  mapSeriesData,
  selectedMeasure,
  selectedMapTimeframe,
  selectedCountyNames,
  countyNames,
  onToggleCounty
}) {
  let mapChart = null
  let hoveredCountyName = ''
  let labelVisibilityFrame = null

  const getCountyDataIndex = (name) => (
    mapSeriesData.value.findIndex((item) => item.name === name)
  )

  const syncMapSelection = () => {
    if (!mapChart || !geoJson.value) {
      return
    }

    const coloredMapData = buildColoredMapData(mapSeriesData.value, mapLegendItems.value)
    mapChart.setOption({
      geo: {
        regions: buildGeoRegions(coloredMapData, selectedCountyNames.value)
      }
    })
  }

  const showCountyTip = (name) => {
    if (!mapChart || !name) {
      return
    }

    const dataIndex = getCountyDataIndex(name)
    if (dataIndex < 0) {
      return
    }

    mapChart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex
    })
  }

  const hideCountyTip = () => {
    if (!mapChart) {
      return
    }

    hoveredCountyName = ''
    mapChart.dispatchAction({
      type: 'hideTip'
    })
  }

  const handleCountyClick = (countyName) => {
    if (!countyName || !countyNames.value.includes(countyName)) {
      return
    }

    onToggleCounty(countyName)
    showCountyTip(countyName)
  }

  const findCountyNameByCoord = (coord) => {
    if (!geoJson.value || !isLngLat(coord)) {
      return null
    }

    const feature = (geoJson.value.features || []).find((item) => (
      isPointInPolygonGeometry(coord, item.geometry)
    ))

    return feature?.properties?.name || null
  }

  const handleCanvasClick = (event) => {
    if (!mapChart) {
      return
    }

    const pixel = [event.offsetX, event.offsetY]
    if (!mapChart.containPixel({ geoIndex: 0 }, pixel)) {
      return
    }

    const coord = mapChart.convertFromPixel({ geoIndex: 0 }, pixel)
    if (!isLngLat(coord)) {
      return
    }

    const countyName = findCountyNameByCoord(coord)
    if (!countyName) {
      hideCountyTip()
      return
    }

    handleCountyClick(countyName)
  }

  const handleCanvasMouseMove = (event) => {
    if (!mapChart) {
      return
    }

    const pixel = [event.offsetX, event.offsetY]
    if (!mapChart.containPixel({ geoIndex: 0 }, pixel)) {
      if (hoveredCountyName) {
        hideCountyTip()
      }
      return
    }

    const coord = mapChart.convertFromPixel({ geoIndex: 0 }, pixel)
    if (!isLngLat(coord)) {
      if (hoveredCountyName) {
        hideCountyTip()
      }
      return
    }

    const countyName = findCountyNameByCoord(coord)
    if (!countyName) {
      if (hoveredCountyName) {
        hideCountyTip()
      }
      return
    }

    if (hoveredCountyName === countyName) {
      return
    }

    hoveredCountyName = countyName
    showCountyTip(countyName)
  }

  const handleCanvasMouseOut = () => {
    if (hoveredCountyName) {
      hideCountyTip()
    }
  }

  const getCurrentGeoZoom = () => {
    const option = mapChart?.getOption()
    const zoom = Number(option?.geo?.[0]?.zoom)
    return Number.isFinite(zoom) ? zoom : INITIAL_MAP_ZOOM
  }

  const applyLabelVisibility = (zoom = getCurrentGeoZoom()) => {
    if (!mapChart) {
      return
    }

    const showCountyLabels = zoom >= COUNTY_LABEL_MIN_ZOOM

    mapChart.setOption({
      series: [
        {},
        {},
        {},
        {
          label: {
            show: !showCountyLabels
          }
        },
        {
          label: {
            show: showCountyLabels
          }
        }
      ]
    })
  }

  const scheduleLabelVisibilityUpdate = () => {
    if (labelVisibilityFrame) {
      return
    }

    labelVisibilityFrame = requestAnimationFrame(() => {
      labelVisibilityFrame = null
      applyLabelVisibility()
    })
  }

  const updateMapChart = () => {
    if (!mapChart || !geoJson.value || !cityGeoJson.value) {
      console.log('updateMapChart skipped:', { mapChart: !!mapChart, geoJson: !!geoJson.value, cityGeoJson: !!cityGeoJson.value })
      return
    }

    const countyBoundaryLines = buildCountyBoundaryLines(geoJson.value)
    const cityBoundaryLines = buildCityBoundaryLines(geoJson.value)
    const cityLabelData = buildLabelData(cityGeoJson.value)
    const countyLabelData = buildLabelData(geoJson.value)
    const coloredMapData = buildColoredMapData(mapSeriesData.value, mapLegendItems.value)
    const tooltipMapData = buildTooltipMapData(coloredMapData)

    console.log('countyBoundaryLines count:', countyBoundaryLines.length)
    console.log('cityBoundaryLines count:', cityBoundaryLines.length)
    console.log('cityLabelData:', cityLabelData)
    console.log('coloredMapData sample:', coloredMapData.slice(0, 3))

    mapChart.setOption({
      animation: false,
      animationDuration: 0,
      animationDurationUpdate: 0,
      tooltip: {
        trigger: 'item',
        triggerOn: 'none',
        alwaysShowContent: false,
        confine: true,
        textStyle: {
          fontSize: 16
        },
        formatter: (params) => {
          // 甯傜骇鏍囩涓嶆樉绀簍ooltip
          if (params?.seriesName === 'city-label-overlay') {
            return null
          }

          const rawValue = params?.data?.value
          const measureLine = Number.isFinite(Number(rawValue))
            ? `${selectedMapTimeframe.value}年${selectedMeasure.value.label}: ${formatNumber(rawValue)} ${selectedMeasure.value.unit}`
            : `${selectedMapTimeframe.value}年${selectedMeasure.value.label}: 暂无统计数据`
          if (params?.name && countyNames.value.includes(params.name)) {
            return `${params.name}<br>${measureLine}`
          }

          if (!Number.isFinite(Number(rawValue))) {
            return `${params.name}<br>暂无统计数据`
          }

          return `${params.name}<br>${measureLine}`
        }
      },
      geo: {
        map: MAP_NAME,
        projection: MERCATOR_PROJECTION,
        roam: true,
        zoom: INITIAL_MAP_ZOOM,
        regions: buildGeoRegions(coloredMapData, selectedCountyNames.value),
        scaleLimit: {
          min: 1,
          max: 8
        },
        itemStyle: {
          areaColor: '#d1d5db',
          opacity: MAP_FILL_OPACITY,
          borderColor: 'rgba(0,0,0,0)',
          borderWidth: 0
        },
        emphasis: {
          disabled: true
        },
        silent: true
      },
      series: [
        {
          name: 'county-main',
          type: 'map',
          map: MAP_NAME,
          projection: MERCATOR_PROJECTION,
          geoIndex: 0,
          z: 1,
          animation: false,
          silent: false,
          itemStyle: {
            areaColor: 'rgba(0,0,0,0)',
            borderColor: 'rgba(0,0,0,0)',
            opacity: 0,
            borderWidth: 0
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: 'rgba(0,0,0,0)',
              borderColor: 'rgba(0,0,0,0)',
              opacity: 0,
              borderWidth: 0,
              shadowBlur: 0
            }
          },
          data: tooltipMapData
        },
        {
          name: 'county-boundary-overlay',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          tooltip: { show: false },
          z: 12,
          lineStyle: {
            color: 'rgba(100, 116, 139, 0.72)',
            width: 0.9,
            opacity: 1
          },
          data: countyBoundaryLines
        },
        {
          name: 'city-boundary-overlay',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          tooltip: { show: false },
          z: 20,
          lineStyle: {
            color: '#374151',
            width: 2,
            opacity: 0.9
          },
          data: cityBoundaryLines
        },
        {
          name: 'city-label-overlay',
          type: 'scatter',
          coordinateSystem: 'geo',
          silent: true,
          tooltip: { show: false },
          z: 40,
          symbolSize: 0,
          labelLayout: {
            hideOverlap: true
          },
          label: {
            show: true,
            color: '#1f2937',
            fontSize: 17,
            fontWeight: 600,
            fontStyle: 'italic',
            padding: [4, 8],
            backgroundColor: 'rgba(249, 250, 251, 0.96)',
            borderRadius: 4,
            textBorderColor: 'rgba(249, 250, 251, 1)',
            textBorderWidth: 5,
            shadowColor: 'rgba(255, 255, 255, 0.7)',
            shadowBlur: 2,
            formatter: (params) => params.data?.name || ''
          },
          emphasis: {
            disabled: true
          },
          data: cityLabelData
        },
        {
          name: 'county-label-overlay',
          type: 'scatter',
          coordinateSystem: 'geo',
          silent: true,
          tooltip: { show: false },
          z: 45,
          symbolSize: 0,
          labelLayout: {
            hideOverlap: true
          },
          label: {
            show: false,
            color: '#111827',
            fontSize: 13,
            fontWeight: 600,
            padding: [2, 5],
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 4,
            textBorderColor: 'rgba(255, 255, 255, 1)',
            textBorderWidth: 3,
            shadowColor: 'rgba(255, 255, 255, 0.6)',
            shadowBlur: 2,
            formatter: (params) => params.data?.name || ''
          },
          emphasis: {
            disabled: true
          },
          data: countyLabelData
        }
      ]
    }, true)

    syncMapSelection()
    applyLabelVisibility(INITIAL_MAP_ZOOM)
  }

  const initMapChart = () => {
    if (!chartRef.value || !geoJson.value || !cityGeoJson.value) {
      return
    }

    if (!mapChart) {
      echarts.registerMap(MAP_NAME, geoJson.value)
      mapChart = echarts.init(chartRef.value)
      mapChart.on('georoam', scheduleLabelVisibilityUpdate)
      mapChart.getZr().on('click', handleCanvasClick)
      mapChart.getZr().on('mousemove', handleCanvasMouseMove)
      mapChart.getZr().on('globalout', handleCanvasMouseOut)
      requestAnimationFrame(() => {
        mapChart?.resize()
        updateMapChart()
      })
    }

    updateMapChart()
  }

  const handleResize = () => {
    mapChart?.resize()
  }

  const resetMapView = () => {
    if (!mapChart || !geoJson.value || !cityGeoJson.value) {
      return
    }

    hideCountyTip()
    updateMapChart()
    requestAnimationFrame(() => {
      mapChart?.resize()
      syncMapSelection()
    })
  }

  watch(
    [geoJson, cityGeoJson, mapLegendItems, mapSeriesData, selectedMeasure],
    () => {
      initMapChart()
      updateMapChart()
    },
    { deep: true, immediate: true }
  )

  watch(selectedCountyNames, syncMapSelection, { deep: true })

  onMounted(() => {
    initMapChart()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    mapChart?.getZr().off('click', handleCanvasClick)
    mapChart?.getZr().off('mousemove', handleCanvasMouseMove)
    mapChart?.getZr().off('globalout', handleCanvasMouseOut)
    mapChart?.off('georoam', scheduleLabelVisibilityUpdate)
    if (labelVisibilityFrame) {
      cancelAnimationFrame(labelVisibilityFrame)
    }
    mapChart?.dispose()
  })

  return {
    resetMapView
  }
}
