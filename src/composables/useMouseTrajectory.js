const DEFAULT_ENDPOINT = '/api/experiment/trajectory'
const DEFAULT_PARTICIPANT_ENDPOINT = '/api/experiment/participant'
const DEFAULT_SAMPLE_INTERVAL = 30

const createSessionId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const getSessionId = () => createSessionId()

const getViewportSnapshot = () => ({
  win_w: window.innerWidth,
  win_h: window.innerHeight,
  screen_w: window.screen?.width || null,
  screen_h: window.screen?.height || null,
  scroll_x: window.scrollX,
  scroll_y: window.scrollY
})

const toFixedRatio = (value, base) => (
  base > 0 ? Number((value / base).toFixed(4)) : null
)

export function useMouseTrajectory({
  endpoint = import.meta.env.VITE_TRAJECTORY_ENDPOINT || DEFAULT_ENDPOINT,
  participantEndpoint = import.meta.env.VITE_PARTICIPANT_ENDPOINT || DEFAULT_PARTICIPANT_ENDPOINT,
  sampleInterval = DEFAULT_SAMPLE_INTERVAL,
  contextProvider = () => ({})
} = {}) {
  const sessionId = getSessionId()
  let participantId = ''
  let sessionNo = 1
  const tracks = []
  let isTracking = false
  let trackingStartTime = 0
  let lastMoveRecordTime = 0

  const ensureParticipantId = async () => {
    if (participantId) {
      return participantId
    }

    try {
      const response = await fetch(participantEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId }),
        keepalive: true
      })

      if (!response.ok) {
        throw new Error(`Participant id request failed with ${response.status}`)
      }

      const payload = await response.json()
      participantId = String(payload.participant_id || '')
      sessionNo = Number(payload.session_no) || 1
    } catch (error) {
      console.warn('[trajectory] participant id request failed', error)
    }

    return participantId
  }

  const getBaseRecord = (event, type) => {
    const now = Date.now()
    const viewport = getViewportSnapshot()
    const x = event?.clientX ?? null
    const y = event?.clientY ?? null

    return {
      ...contextProvider(),
      session_id: sessionId,
      participant_id: participantId,
      session_no: sessionNo,
      page_url: window.location.href,
      type,
      x,
      y,
      x_ratio: Number.isFinite(x) ? toFixedRatio(x, viewport.win_w) : null,
      y_ratio: Number.isFinite(y) ? toFixedRatio(y, viewport.win_h) : null,
      page_x: event?.pageX ?? null,
      page_y: event?.pageY ?? null,
      ...viewport,
      t: now - trackingStartTime,
      timestamp: now
    }
  }

  const pushRecord = (record) => {
    tracks.push(record)
  }

  const recordMove = (event) => {
    if (!isTracking) {
      return
    }

    const now = Date.now()
    if (now - lastMoveRecordTime < sampleInterval) {
      return
    }

    pushRecord(getBaseRecord(event, 'move'))
    lastMoveRecordTime = now
  }

  const recordClick = (event) => {
    if (!isTracking) {
      return
    }

    pushRecord(getBaseRecord(event, 'click'))
  }

  const recordMarker = (type, extra = {}) => {
    if (!isTracking) {
      return
    }

    pushRecord({
      ...getBaseRecord(null, type),
      ...extra
    })
  }

  const buildPayload = (reason, pendingTracks) => ({
    session_id: sessionId,
    participant_id: participantId,
    session_no: sessionNo,
    experiment: 'jiangxi_dashboard',
    reason,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    created_at: Date.now(),
    tracks: pendingTracks
  })

  const flush = async (reason = 'manual', { beacon = false } = {}) => {
    if (!tracks.length) {
      return true
    }

    const pendingTracks = tracks.splice(0, tracks.length)
    const payload = buildPayload(reason, pendingTracks)

    if (beacon && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const accepted = navigator.sendBeacon(endpoint, blob)
      if (!accepted) {
        tracks.unshift(...pendingTracks)
      }
      return accepted
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: pendingTracks.length < 100
      })

      if (!response.ok) {
        throw new Error(`Trajectory upload failed with ${response.status}`)
      }

      return true
    } catch (error) {
      tracks.unshift(...pendingTracks)
      console.warn('[trajectory] upload failed; records kept in memory', error)
      return false
    }
  }

  const startTracking = () => {
    if (isTracking) {
      return
    }

    isTracking = true
    trackingStartTime = Date.now()
    lastMoveRecordTime = 0
    void ensureParticipantId()
    recordMarker('tracking_start')
    window.addEventListener('mousemove', recordMove, { passive: true })
    window.addEventListener('mousedown', recordClick, { passive: true })
  }

  const stopTracking = () => {
    if (!isTracking) {
      return
    }

    recordMarker('tracking_stop')
    isTracking = false
    window.removeEventListener('mousemove', recordMove)
    window.removeEventListener('mousedown', recordClick)
  }

  return {
    sessionId,
    ensureParticipantId,
    startTracking,
    stopTracking,
    recordMarker,
    flush
  }
}
