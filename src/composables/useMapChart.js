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
const countyBoundaryLineCache = new WeakMap()
const cityBoundaryLineCache = new WeakMap()
const labelDataCache = new WeakMap()
const MAP_FILL_OPACITY = 0.9
const INITIAL_MAP_ZOOM = 1.1
const COUNTY_LABEL_MIN_ZOOM = 2.35
const DEGREE_TO_RADIAN = Math.PI / 180
const RADIAN_TO_DEGREE = 180 / Math.PI
const MERCATOR_MAX_LATITUDE = 85.0511287798
const MAP_DOM_EVENT_OPTIONS = { capture: true, passive: true }
const ROAM_IDLE_DELAY = 90
const DENSE_COUNTY_LABEL_OFFSETS = {
  东湖区: [0, -34],
  西湖区: [-48, 18],
  青云谱区: [42, 28],
  青山湖区: [-34, -14],
  新建区: [46, -16],
  红谷滩区: [-58, 36],
  南昌县: [62, 30]
}

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

const buildCountyBoundaryLines = (countyGeoJson) => {
  if (!countyGeoJson) {
    return []
  }

  const cachedLines = countyBoundaryLineCache.get(countyGeoJson)
  if (cachedLines) {
    return cachedLines
  }

  const lines = (countyGeoJson?.features || [])
    .flatMap((feature) => getGeometryRings(feature.geometry))
    .filter((ring) => Array.isArray(ring) && ring.length > 1)
    .map((ring) => ({ coords: ring }))

  countyBoundaryLineCache.set(countyGeoJson, lines)
  return lines
}

const buildSelectedCountyBoundaryLines = (countyGeoJson, selectedCountyNames = []) => {
  const selectedNames = new Set(selectedCountyNames)

  if (!selectedNames.size) {
    return []
  }

  return (countyGeoJson?.features || [])
    .filter((feature) => selectedNames.has(feature?.properties?.name))
    .flatMap((feature) => getGeometryRings(feature.geometry))
    .filter((ring) => Array.isArray(ring) && ring.length > 1)
    .map((ring) => ({ coords: ring }))
}

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

const buildLabelData = (labelGeoJson, labelType = 'default') => {
  if (!labelGeoJson) {
    return []
  }

  const cachedLabelDataByType = labelDataCache.get(labelGeoJson)
  const cachedLabelData = cachedLabelDataByType?.get(labelType)
  if (cachedLabelData) {
    return cachedLabelData
  }

  const labelData = (labelGeoJson?.features || [])
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
        value: [lng, lat, name],
        label: labelType === 'county' && DENSE_COUNTY_LABEL_OFFSETS[name]
          ? { offset: DENSE_COUNTY_LABEL_OFFSETS[name] }
          : undefined
      }
    })
    .filter(Boolean)

  const nextLabelDataByType = cachedLabelDataByType || new Map()
  nextLabelDataByType.set(labelType, labelData)
  labelDataCache.set(labelGeoJson, nextLabelDataByType)
  return labelData
}

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

  return coloredMapData.map((item) => {
    const isSelected = selectedNames.has(item.name)

    return {
      name: item.name,
      itemStyle: {
        areaColor: item.color,
        opacity: isSelected ? 1 : MAP_FILL_OPACITY,
        borderColor: isSelected ? '#facc15' : 'rgba(0,0,0,0)',
        borderWidth: isSelected ? 2.5 : 0,
        shadowColor: isSelected ? 'rgba(250, 204, 21, 0.45)' : 'rgba(0,0,0,0)',
        shadowBlur: isSelected ? 14 : 0
      }
    }
  })
}

const buildTooltipMapData = (coloredMapData) => (
  coloredMapData.map((item) => ({
    name: item.name,
    value: item.value,
    tierLabel: item.tierLabel,
    color: item.color,
    itemStyle: {
      areaColor: 'rgba(255,255,255,0.01)',
      borderColor: 'rgba(0,0,0,0)',
      opacity: 1
    }
  }))
)

const escapeHtml = (value) => (
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
)

export function useMapChart({
  chartRef,
  geoJson,
  cityGeoJson,
  provinceGeoJson,
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
  let mouseMoveFrame = null
  let pendingMouseMoveEvent = null
  let roamIdleTimer = null
  let isMapRoaming = false
  let areCountyLabelsVisible = null
  let manualTooltipEl = null
  let projectedCountyGeometries = null
  let interactionOverlayEl = null

  const getCountyTooltipData = (name) => (
    buildColoredMapData(mapSeriesData.value, mapLegendItems.value)
      .find((item) => item.name === name)
  )

  const buildCountyTooltip = (name, data = getCountyTooltipData(name)) => {
    const rawValue = data?.value
    const measureLine = Number.isFinite(Number(rawValue))
      ? `${selectedMapTimeframe.value}年${escapeHtml(selectedMeasure.value.label)}: ${formatNumber(rawValue)} ${escapeHtml(selectedMeasure.value.unit)}`
      : `${selectedMapTimeframe.value}年${selectedMeasure.value.label}: 暂无统计数据`

    return [
      `<strong>${escapeHtml(name)}</strong>`,
      measureLine
    ].join('<br>')
  }

  const ensureManualTooltip = () => {
    if (manualTooltipEl || !chartRef.value) {
      return manualTooltipEl
    }

    manualTooltipEl = document.createElement('div')
    manualTooltipEl.style.position = 'absolute'
    manualTooltipEl.style.zIndex = '30'
    manualTooltipEl.style.maxWidth = '280px'
    manualTooltipEl.style.padding = '9px 11px'
    manualTooltipEl.style.borderRadius = '4px'
    manualTooltipEl.style.background = 'rgba(255, 255, 255, 0.96)'
    manualTooltipEl.style.color = '#111827'
    manualTooltipEl.style.fontSize = '12px'
    manualTooltipEl.style.lineHeight = '1.55'
    manualTooltipEl.style.pointerEvents = 'none'
    manualTooltipEl.style.border = '1px solid rgba(209, 213, 219, 0.95)'
    manualTooltipEl.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.18)'
    manualTooltipEl.style.display = 'none'

    chartRef.value.appendChild(manualTooltipEl)
    return manualTooltipEl
  }

  const getEventPixel = (event) => {
    const nativeEvent = event?.event || event
    const offsetX = Number(event?.offsetX ?? nativeEvent?.offsetX)
    const offsetY = Number(event?.offsetY ?? nativeEvent?.offsetY)

    if (Number.isFinite(offsetX) && Number.isFinite(offsetY)) {
      return [offsetX, offsetY]
    }

    if (!chartRef.value || !nativeEvent) {
      return null
    }

    const rect = chartRef.value.getBoundingClientRect()
    const clientX = Number(nativeEvent.clientX)
    const clientY = Number(nativeEvent.clientY)

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null
    }

    return [clientX - rect.left, clientY - rect.top]
  }

  const positionManualTooltip = (event) => {
    if (!manualTooltipEl || !chartRef.value) {
      return
    }

    const pixel = getEventPixel(event)
    if (!pixel) {
      return
    }

    const chartWidth = chartRef.value.clientWidth
    const chartHeight = chartRef.value.clientHeight
    const tooltipWidth = manualTooltipEl.offsetWidth || 260
    const tooltipHeight = manualTooltipEl.offsetHeight || 120
    const left = Math.min(pixel[0] + 14, Math.max(8, chartWidth - tooltipWidth - 8))
    const top = Math.min(pixel[1] + 14, Math.max(8, chartHeight - tooltipHeight - 8))

    manualTooltipEl.style.left = `${left}px`
    manualTooltipEl.style.top = `${top}px`
  }

  const showManualTooltip = (name, event) => {
    const tooltipEl = ensureManualTooltip()
    if (!tooltipEl) {
      return
    }

    tooltipEl.innerHTML = buildCountyTooltip(name)
    tooltipEl.style.display = 'block'
    positionManualTooltip(event)
  }

  const hideManualTooltip = () => {
    if (manualTooltipEl) {
      manualTooltipEl.style.display = 'none'
    }
  }

  const ensureInteractionOverlay = () => {
    if (interactionOverlayEl || !chartRef.value) {
      return interactionOverlayEl
    }

    interactionOverlayEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    interactionOverlayEl.setAttribute('aria-hidden', 'true')
    interactionOverlayEl.style.position = 'absolute'
    interactionOverlayEl.style.inset = '0'
    interactionOverlayEl.style.zIndex = '25'
    interactionOverlayEl.style.width = '100%'
    interactionOverlayEl.style.height = '100%'
    interactionOverlayEl.style.pointerEvents = 'none'
    interactionOverlayEl.style.overflow = 'visible'
    interactionOverlayEl.addEventListener('mouseleave', handleCanvasMouseOut)
    chartRef.value.appendChild(interactionOverlayEl)

    return interactionOverlayEl
  }

  const invalidateProjectedCountyGeometries = () => {
    projectedCountyGeometries = null
  }

  const syncMapSelection = () => {
    if (!mapChart || !geoJson.value) {
      return
    }

    const coloredMapData = buildColoredMapData(mapSeriesData.value, mapLegendItems.value)
    mapChart.setOption({
      geo: {
        regions: buildGeoRegions(coloredMapData, selectedCountyNames.value)
      },
      series: [
        {
          id: 'selected-county-outline',
          data: buildSelectedCountyBoundaryLines(geoJson.value, selectedCountyNames.value)
        }
      ]
    }, false, true)
  }

  const showCountyTip = (name, event) => {
    if (!mapChart || !name) {
      return
    }

    showManualTooltip(name, event)
  }

  const setMapCursor = (cursor = 'default') => {
    mapChart?.getZr()?.setCursorStyle(cursor)
  }

  const hideCountyTip = () => {
    if (!mapChart) {
      return
    }

    hoveredCountyName = ''
    setMapCursor()
    hideManualTooltip()
  }

  const handleCountyClick = (countyName, event) => {
    if (!countyName || !countyNames.value.includes(countyName)) {
      return
    }

    onToggleCounty(countyName)
    showCountyTip(countyName, event)
  }

  const findFeatureNameByCoord = (coord, sourceGeoJson) => {
    if (!sourceGeoJson || !isLngLat(coord)) {
      return null
    }

    const feature = (sourceGeoJson.features || []).find((item) => (
      isPointInPolygonGeometry(coord, item.geometry)
    ))

    return feature?.properties?.name || null
  }

  const findCountyNameByCoord = (coord) => (
    findFeatureNameByCoord(coord, geoJson.value)
  )

  const getGeometryPolygons = (geometry) => {
    if (!geometry?.coordinates) {
      return []
    }

    if (geometry.type === 'Polygon') {
      return [geometry.coordinates]
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates
    }

    return []
  }

  const projectPointToPixel = (point) => {
    if (!mapChart || !isLngLat(point)) {
      return null
    }

    const pixel = mapChart.convertToPixel({ geoIndex: 0 }, [
      Number(point[0]),
      Number(point[1])
    ])

    if (!Array.isArray(pixel) || pixel.length < 2) {
      return null
    }

    const x = Number(pixel[0])
    const y = Number(pixel[1])
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null
  }

  const getProjectedCountyGeometries = () => {
    if (projectedCountyGeometries) {
      return projectedCountyGeometries
    }

    if (!mapChart || !geoJson.value) {
      return []
    }

    const nextGeometries = (geoJson.value.features || [])
      .map((feature) => {
        const name = feature?.properties?.name
        const polygons = getGeometryPolygons(feature.geometry)
          .map((polygon) => (
            polygon
              .map((ring) => (
                (ring || [])
                  .map(projectPointToPixel)
                  .filter(Boolean)
              ))
              .filter((ring) => ring.length >= 3)
          ))
          .filter((polygon) => polygon.length)

        return name && polygons.length ? { name, polygons } : null
      })
      .filter(Boolean)

    if (!nextGeometries.length) {
      return []
    }

    projectedCountyGeometries = nextGeometries
    return projectedCountyGeometries
  }

  const buildSvgPathData = (polygons) => (
    polygons
      .flatMap((polygon) => (
        polygon.map((ring) => (
          ring.map(([x, y], index) => (
            `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
          )).join(' ') + ' Z'
        ))
      ))
      .join(' ')
  )

  const renderInteractionOverlay = () => {
    const overlayEl = ensureInteractionOverlay()
    if (!overlayEl || !chartRef.value) {
      return
    }

    overlayEl.setAttribute('viewBox', `0 0 ${chartRef.value.clientWidth} ${chartRef.value.clientHeight}`)
    overlayEl.replaceChildren()

    getProjectedCountyGeometries().forEach(({ name, polygons }) => {
      const pathData = buildSvgPathData(polygons)
      if (!pathData) {
        return
      }

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', pathData)
      pathEl.setAttribute('fill', 'rgba(255,255,255,0.01)')
      pathEl.setAttribute('stroke', 'none')
      pathEl.style.pointerEvents = 'none'

      overlayEl.appendChild(pathEl)
    })
  }

  const findCountyNameByProjectedPixel = (pixel) => {
    if (!Array.isArray(pixel) || pixel.length < 2) {
      return null
    }

    const [x, y] = pixel.map(Number)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null
    }

    const point = [x, y]
    const matchedCounty = getProjectedCountyGeometries().find(({ polygons }) => (
      polygons.some((polygon) => {
        const [outerRing, ...holes] = polygon
        return isPointInRing(point, outerRing)
          && !holes.some((ring) => isPointInRing(point, ring))
      })
    ))

    return matchedCounty?.name || null
  }

  const getMapCoordByPixel = (pixel) => {
    if (!mapChart) {
      return null
    }

    const finders = [{ geoIndex: 0 }, { seriesIndex: 0 }]
    for (const finder of finders) {
      if (!mapChart.containPixel(finder, pixel)) {
        continue
      }

      const coord = mapChart.convertFromPixel(finder, pixel)
      if (isLngLat(coord)) {
        return coord
      }
    }

    return null
  }

  const findCountyNameByPixel = (pixel) => {
    const projectedCountyName = findCountyNameByProjectedPixel(pixel)
    if (projectedCountyName) {
      return projectedCountyName
    }

    const coord = getMapCoordByPixel(pixel)
    return coord
      ? findCountyNameByCoord(coord)
      || findCountyNameByCoord(MERCATOR_PROJECTION.unproject(coord))
      : null
  }

  const handleCanvasClick = (event) => {
    if (!mapChart) {
      return
    }

    const pixel = getEventPixel(event)
    if (!pixel) {
      return
    }

    const countyName = findCountyNameByPixel(pixel)
    if (!countyName) {
      hideCountyTip()
      return
    }

    handleCountyClick(countyName, event)
  }

  const processCanvasMouseMove = (event) => {
    if (!mapChart) {
      return
    }

    if (isMapRoaming) {
      if (hoveredCountyName) {
        hideCountyTip()
      }
      return
    }

    const pixel = getEventPixel(event)
    if (!pixel) {
      if (hoveredCountyName) {
        hideCountyTip()
      }
      return
    }

    const countyName = findCountyNameByPixel(pixel)
    if (!countyName) {
      if (hoveredCountyName) {
        hideCountyTip()
      }
      return
    }

    if (hoveredCountyName === countyName) {
      positionManualTooltip(event)
      return
    }

    hoveredCountyName = countyName
    setMapCursor('pointer')
    showCountyTip(countyName, event)
  }

  const handleCanvasMouseMove = (event) => {
    pendingMouseMoveEvent = event

    if (mouseMoveFrame) {
      return
    }

    mouseMoveFrame = requestAnimationFrame(() => {
      const nextEvent = pendingMouseMoveEvent
      pendingMouseMoveEvent = null
      mouseMoveFrame = null

      if (nextEvent) {
        processCanvasMouseMove(nextEvent)
      }
    })
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
    if (areCountyLabelsVisible === showCountyLabels) {
      return
    }

    areCountyLabelsVisible = showCountyLabels

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
    }, false, true)
  }

  const scheduleLabelVisibilityUpdate = () => {
    isMapRoaming = true
    invalidateProjectedCountyGeometries()
    if (roamIdleTimer) {
      window.clearTimeout(roamIdleTimer)
    }
    roamIdleTimer = window.setTimeout(() => {
      isMapRoaming = false
      roamIdleTimer = null
    }, ROAM_IDLE_DELAY)

    if (labelVisibilityFrame) {
      return
    }

    labelVisibilityFrame = requestAnimationFrame(() => {
      labelVisibilityFrame = null
      applyLabelVisibility()
    })
  }

  const updateMapChart = () => {
    if (!mapChart || !geoJson.value || !cityGeoJson.value || !provinceGeoJson.value) {
      console.log('updateMapChart skipped:', {
        mapChart: !!mapChart,
        geoJson: !!geoJson.value,
        cityGeoJson: !!cityGeoJson.value,
        provinceGeoJson: !!provinceGeoJson.value
      })
      return
    }

    const countyBoundaryLines = buildCountyBoundaryLines(geoJson.value)
    const cityBoundaryLines = buildCityBoundaryLines(geoJson.value)
    const provinceBoundaryLines = buildCountyBoundaryLines(provinceGeoJson.value)
    const cityLabelData = buildLabelData(cityGeoJson.value, 'city')
    const countyLabelData = buildLabelData(geoJson.value, 'county')
    const coloredMapData = buildColoredMapData(mapSeriesData.value, mapLegendItems.value)
    const tooltipMapData = buildTooltipMapData(coloredMapData)
    const selectedCountyBoundaryLines = buildSelectedCountyBoundaryLines(
      geoJson.value,
      selectedCountyNames.value
    )

    areCountyLabelsVisible = null
    mapChart.setOption({
      animation: false,
      animationDuration: 0,
      animationDurationUpdate: 0,
      tooltip: {
        trigger: 'item',
        triggerOn: 'none',
        alwaysShowContent: false,
        confine: true,
        appendToBody: true,
        enterable: false,
        showDelay: 0,
        hideDelay: 80,
        textStyle: {
          fontSize: 12
        },
        formatter: (params) => {
          if (['city-label-overlay', 'county-label-overlay'].includes(params?.seriesName)) {
            return null
          }

          if (params?.name && countyNames.value.includes(params.name)) {
            return buildCountyTooltip(params.name, params.data)
          }

          return params?.name ? `${params.name}<br>暂无统计数据` : ''
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
          silent: true,
          itemStyle: {
            areaColor: 'rgba(255,255,255,0.01)',
            borderColor: 'rgba(0,0,0,0)',
            opacity: 1,
            borderWidth: 0
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: 'rgba(255,255,255,0.01)',
              borderColor: 'rgba(0,0,0,0)',
              opacity: 1,
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
            hideOverlap: true,
            moveOverlap: 'shiftY'
          },
          label: {
            show: true,
            position: 'inside',
            color: '#1f2937',
            fontSize: 13,
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
            hideOverlap: true,
            moveOverlap: 'shiftY'
          },
          label: {
            show: false,
            position: 'inside',
            color: '#111827',
            fontSize: 10,
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
        },
        {
          id: 'selected-county-outline',
          name: 'selected-county-outline',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          tooltip: { show: false },
          z: 35,
          lineStyle: {
            color: '#facc15',
            width: 3,
            opacity: 1,
            shadowColor: 'rgba(250, 204, 21, 0.55)',
            shadowBlur: 8
          },
          data: selectedCountyBoundaryLines
        },
        {
          name: 'jiangxi-province-outline',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          tooltip: { show: false },
          z: 55,
          lineStyle: {
            color: '#111827',
            width: 2.4,
            opacity: 0.95
          },
          data: provinceBoundaryLines
        }
      ]
    }, true)

    invalidateProjectedCountyGeometries()
    syncMapSelection()
    applyLabelVisibility(INITIAL_MAP_ZOOM)
  }

  const initMapChart = () => {
    if (!chartRef.value || !geoJson.value || !cityGeoJson.value || !provinceGeoJson.value) {
      return
    }

    if (!mapChart) {
      echarts.registerMap(MAP_NAME, geoJson.value)
      mapChart = echarts.init(chartRef.value)
      mapChart.on('georoam', scheduleLabelVisibilityUpdate)
      mapChart.getZr().on('globalout', handleCanvasMouseOut)
      chartRef.value.addEventListener('click', handleCanvasClick, MAP_DOM_EVENT_OPTIONS)
      chartRef.value.addEventListener('mousemove', handleCanvasMouseMove, MAP_DOM_EVENT_OPTIONS)
      chartRef.value.addEventListener('mouseleave', handleCanvasMouseOut, MAP_DOM_EVENT_OPTIONS)
      requestAnimationFrame(() => {
        mapChart?.resize()
      })
    }

    updateMapChart()
  }

  const handleResize = () => {
    invalidateProjectedCountyGeometries()
    mapChart?.resize()
  }

  const resetMapView = () => {
    if (!mapChart || !geoJson.value || !cityGeoJson.value || !provinceGeoJson.value) {
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
    [geoJson, cityGeoJson, provinceGeoJson, mapLegendItems, mapSeriesData, selectedMeasure],
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
    mapChart?.getZr().off('globalout', handleCanvasMouseOut)
    chartRef.value?.removeEventListener('click', handleCanvasClick, MAP_DOM_EVENT_OPTIONS)
    chartRef.value?.removeEventListener('mousemove', handleCanvasMouseMove, MAP_DOM_EVENT_OPTIONS)
    chartRef.value?.removeEventListener('mouseleave', handleCanvasMouseOut, MAP_DOM_EVENT_OPTIONS)
    mapChart?.off('georoam', scheduleLabelVisibilityUpdate)
    if (labelVisibilityFrame) {
      cancelAnimationFrame(labelVisibilityFrame)
    }
    if (mouseMoveFrame) {
      cancelAnimationFrame(mouseMoveFrame)
    }
    if (roamIdleTimer) {
      window.clearTimeout(roamIdleTimer)
    }
    interactionOverlayEl?.removeEventListener('mouseleave', handleCanvasMouseOut)
    interactionOverlayEl?.remove()
    interactionOverlayEl = null
    manualTooltipEl?.remove()
    manualTooltipEl = null
    mapChart?.dispose()
  })

  return {
    resetMapView
  }
}
