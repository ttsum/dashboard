import { createReadStream } from 'node:fs'
import { access, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '..')
const distDir = resolve(projectRoot, 'dist')
const trajectoryDir = resolve(
  process.env.TRAJECTORY_DIR || join(projectRoot, 'trajectories')
)
const port = Number(process.env.PORT || 8080)
const maxBodyBytes = Number(process.env.MAX_TRAJECTORY_BODY_BYTES || 5 * 1024 * 1024)
const trajectoryApiPath = '/api/experiment/trajectory'
const participantApiPath = '/api/experiment/participant'
const healthApiPath = '/api/experiment/health'
const filesApiPath = '/api/experiment/files'
const adminToken = String(process.env.EXPERIMENT_ADMIN_TOKEN || '').trim()
const csvHeaders = [
  'payload_session_id',
  'participant_id',
  'experiment',
  'reason',
  'page_url',
  'user_agent',
  'payload_created_at',
  'payload_created_at_iso',
  'record_index',
  'flow',
  'task_id',
  'task_number',
  'task_content',
  'track_session_id',
  'type',
  'mouse_button',
  'x',
  'y',
  'x_ratio',
  'y_ratio',
  'page_x',
  'page_y',
  'win_w',
  'win_h',
  'screen_w',
  'screen_h',
  'scroll_x',
  'scroll_y',
  'delta_x',
  'delta_y',
  'delta_mode',
  't',
  'timestamp',
  'timestamp_iso'
]

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
}

const allowedCorsOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const resolveCorsOrigin = (requestOrigin) => {
  if (!allowedCorsOrigins.length || allowedCorsOrigins.includes('*')) {
    return '*'
  }

  if (requestOrigin && allowedCorsOrigins.includes(requestOrigin)) {
    return requestOrigin
  }

  return allowedCorsOrigins[0]
}

const corsHeadersFor = (request) => {
  const requestOrigin = String(request?.headers?.origin || '').trim()
  const allowOrigin = resolveCorsOrigin(requestOrigin)
  const headers = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  }
  if (allowOrigin !== '*') {
    headers.Vary = 'Origin'
  }
  return headers
}

const sendJson = (request, response, statusCode, payload) => {
  response.writeHead(statusCode, {
    ...corsHeadersFor(request),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  response.end(JSON.stringify(payload))
}

const normalizeToken = (value) => String(value || '').trim()

const isAuthorized = (request, url) => {
  if (!adminToken) {
    return true
  }

  const queryToken = normalizeToken(url.searchParams.get('token'))
  const headerToken = normalizeToken(request.headers['x-admin-token'])
  const authHeader = normalizeToken(request.headers.authorization).replace(/^Bearer\s+/i, '')
  return queryToken === adminToken || headerToken === adminToken || authHeader === adminToken
}

const requireAuthorization = (request, response, url) => {
  if (isAuthorized(request, url)) {
    return true
  }

  sendJson(request, response, 401, {
    ok: false,
    error: 'Unauthorized'
  })
  return false
}

const readRequestBody = (request) => new Promise((resolveBody, rejectBody) => {
  const chunks = []
  let totalBytes = 0

  request.on('data', (chunk) => {
    totalBytes += chunk.length
    if (totalBytes > maxBodyBytes) {
      rejectBody(new Error('Request body is too large'))
      request.destroy()
      return
    }

    chunks.push(chunk)
  })

  request.on('end', () => {
    resolveBody(Buffer.concat(chunks).toString('utf8'))
  })

  request.on('error', rejectBody)
})

const safeFilePart = (value) => String(value || '')
  .replace(/[^a-zA-Z0-9_-]/g, '_')
  .slice(0, 80)

const padNumber = (value, size) => String(value).padStart(size, '0')

const toPositiveInteger = (value, fallback = 1) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback
}

const formatDateCode = (timestamp) => {
  const date = Number.isFinite(Number(timestamp)) ? new Date(Number(timestamp)) : new Date()
  return [
    date.getUTCFullYear(),
    padNumber(date.getUTCMonth() + 1, 2),
    padNumber(date.getUTCDate(), 2)
  ].join('')
}

const createUniqueFilename = async (baseFilename) => {
  const extension = '.csv'
  const bareName = baseFilename.endsWith(extension)
    ? baseFilename.slice(0, -extension.length)
    : baseFilename
  let candidate = `${bareName}${extension}`
  let duplicateIndex = 2

  while (true) {
    try {
      await access(join(trajectoryDir, candidate))
      candidate = `${bareName}_R${padNumber(duplicateIndex, 2)}${extension}`
      duplicateIndex += 1
    } catch (error) {
      if (error.code === 'ENOENT') {
        return candidate
      }

      throw error
    }
  }
}

const toIsoString = (timestamp) => {
  if (!Number.isFinite(Number(timestamp))) {
    return ''
  }

  return new Date(Number(timestamp)).toISOString()
}

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return ''
  }

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

const buildTrajectoryCsv = (payload, tracks) => {
  const rows = tracks.map((track, index) => ({
    payload_session_id: payload.session_id || '',
    participant_id: payload.participant_id || track.participant_id || '',
    experiment: payload.experiment || '',
    reason: payload.reason || '',
    page_url: track.page_url || payload.page_url || '',
    user_agent: payload.user_agent || '',
    payload_created_at: payload.created_at || '',
    payload_created_at_iso: toIsoString(payload.created_at),
    record_index: index,
    flow: track.flow || '',
    task_id: track.task_id || '',
    task_number: track.task_number || '',
    task_content: track.task_content || '',
    track_session_id: track.session_id || '',
    type: track.type || '',
    mouse_button: track.mouse_button ?? '',
    x: track.x ?? '',
    y: track.y ?? '',
    x_ratio: track.x_ratio ?? '',
    y_ratio: track.y_ratio ?? '',
    page_x: track.page_x ?? '',
    page_y: track.page_y ?? '',
    win_w: track.win_w ?? '',
    win_h: track.win_h ?? '',
    screen_w: track.screen_w ?? '',
    screen_h: track.screen_h ?? '',
    scroll_x: track.scroll_x ?? '',
    scroll_y: track.scroll_y ?? '',
    delta_x: track.delta_x ?? '',
    delta_y: track.delta_y ?? '',
    delta_mode: track.delta_mode ?? '',
    t: track.t ?? '',
    timestamp: track.timestamp ?? '',
    timestamp_iso: toIsoString(track.timestamp)
  }))

  const lines = [
    csvHeaders.join(','),
    ...rows.map((row) => csvHeaders.map((header) => escapeCsvValue(row[header])).join(','))
  ]

  return `\ufeff${lines.join('\n')}\n`
}

const handleParticipantRequest = async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeadersFor(request))
    response.end()
    return
  }

  if (request.method !== 'POST') {
    response.writeHead(405, {
      ...corsHeadersFor(request),
      Allow: 'POST',
      'Content-Type': 'text/plain; charset=utf-8'
    })
    response.end('Method Not Allowed')
    return
  }

  sendJson(request, response, 200, { ok: true })
}

const saveTrajectoryPayload = async (payload) => {
  const tracks = Array.isArray(payload?.tracks) ? payload.tracks : []
  if (!payload || typeof payload !== 'object' || !tracks.length) {
    const error = new Error('Payload must include a non-empty tracks array')
    error.statusCode = 400
    throw error
  }

  await mkdir(trajectoryDir, { recursive: true })

  const rawParticipant = String(payload.participant_id || tracks[0]?.participant_id || '').trim()
  const rawRecordingId = String(
    payload.recording_id || payload.session_no || tracks[0]?.recording_id || tracks[0]?.session_no || ''
  ).trim()
  if (!rawParticipant || !rawRecordingId) {
    const error = new Error('participant_id and recording_id are required')
    error.statusCode = 400
    throw error
  }

  payload.participant_id = rawParticipant
  payload.session_no = rawRecordingId
  payload.recording_id = rawRecordingId
  for (const track of tracks) {
    track.participant_id = rawParticipant
    track.session_no = rawRecordingId
    track.recording_id = rawRecordingId
  }

  const createdAt = Number(payload.created_at)
  const participantCode = safeFilePart(rawParticipant)
  const recordingCode = safeFilePart(rawRecordingId)
  const dateCode = formatDateCode(createdAt)
  const baseFilename = `${dateCode}_${participantCode}_${recordingCode}.csv`
  const filename = await createUniqueFilename(baseFilename)
  const filepath = join(trajectoryDir, filename)
  const csv = buildTrajectoryCsv(payload, tracks)

  await writeFile(filepath, csv, 'utf8')

  return {
    filename,
    format: 'csv',
    record_count: tracks.length
  }
}

const handleTrajectoryRequest = async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeadersFor(request))
    response.end()
    return
  }

  if (request.method !== 'POST') {
    response.writeHead(405, {
      ...corsHeadersFor(request),
      Allow: 'POST',
      'Content-Type': 'text/plain; charset=utf-8'
    })
    response.end('Method Not Allowed')
    return
  }

  try {
    const rawBody = await readRequestBody(request)
    const payload = JSON.parse(rawBody)
    const result = await saveTrajectoryPayload(payload)
    sendJson(request, response, 200, {
      ok: true,
      ...result
    })
  } catch (error) {
    const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500)
    sendJson(request, response, statusCode, {
      ok: false,
      error: statusCode === 500 ? 'Failed to save trajectory data' : error.message
    })

    if (statusCode === 500) {
      console.error('[trajectory] save failed', error)
    }
  }
}

const handleFilesListRequest = async (request, response, url) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeadersFor(request))
    response.end()
    return
  }

  if (request.method !== 'GET') {
    response.writeHead(405, {
      ...corsHeadersFor(request),
      Allow: 'GET, OPTIONS',
      'Content-Type': 'text/plain; charset=utf-8'
    })
    response.end('Method Not Allowed')
    return
  }

  if (!requireAuthorization(request, response, url)) {
    return
  }

  try {
    await mkdir(trajectoryDir, { recursive: true })
    const allNames = await readdir(trajectoryDir)
    const csvNames = allNames
      .filter((name) => name.toLowerCase().endsWith('.csv'))
      .sort((a, b) => b.localeCompare(a))

    const files = []
    for (const name of csvNames) {
      const filePath = join(trajectoryDir, name)
      const info = await stat(filePath)
      files.push({
        name,
        size_bytes: info.size,
        updated_at: info.mtime.toISOString()
      })
    }

    sendJson(request, response, 200, {
      ok: true,
      count: files.length,
      files
    })
  } catch (error) {
    console.error('[files] list failed', error)
    sendJson(request, response, 500, {
      ok: false,
      error: 'Failed to list trajectory files'
    })
  }
}

const handleFileDownloadRequest = async (request, response, url, filename) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeadersFor(request))
    response.end()
    return
  }

  if (request.method !== 'GET') {
    response.writeHead(405, {
      ...corsHeadersFor(request),
      Allow: 'GET, OPTIONS',
      'Content-Type': 'text/plain; charset=utf-8'
    })
    response.end('Method Not Allowed')
    return
  }

  if (!requireAuthorization(request, response, url)) {
    return
  }

  const safeName = String(filename || '').replace(/[^a-zA-Z0-9._-]/g, '')
  if (!safeName || !safeName.toLowerCase().endsWith('.csv')) {
    sendJson(request, response, 400, {
      ok: false,
      error: 'Invalid filename'
    })
    return
  }

  const filePath = resolve(trajectoryDir, safeName)
  const isInsideTrajectoryDir = filePath === trajectoryDir
    || filePath.startsWith(`${trajectoryDir}/`)
    || filePath.startsWith(`${trajectoryDir}\\`)
  if (!isInsideTrajectoryDir) {
    sendJson(request, response, 400, {
      ok: false,
      error: 'Invalid filename'
    })
    return
  }

  try {
    await access(filePath)
  } catch {
    sendJson(request, response, 404, {
      ok: false,
      error: 'File not found'
    })
    return
  }

  const stream = createReadStream(filePath)
  stream.on('open', () => {
    response.writeHead(200, {
      ...corsHeadersFor(request),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store'
    })
    stream.pipe(response)
  })

  stream.on('error', (error) => {
    console.error('[files] download failed', error)
    sendJson(request, response, 500, {
      ok: false,
      error: 'Failed to read file'
    })
  })
}

const serveStaticFile = (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  const decodedPath = decodeURIComponent(url.pathname)
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '')
  const absolutePath = resolve(distDir, `.${normalizedPath}`)
  const isDistPath = absolutePath === distDir || absolutePath.startsWith(`${distDir}\\`) || absolutePath.startsWith(`${distDir}/`)
  const staticPath = isDistPath ? absolutePath : join(distDir, 'index.html')
  const fallbackPath = join(distDir, 'index.html')
  const stream = createReadStream(staticPath)

  stream.on('open', () => {
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(staticPath)] || 'application/octet-stream',
      'Cache-Control': staticPath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable'
    })
    stream.pipe(response)
  })

  stream.on('error', () => {
    if (staticPath === fallbackPath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not Found')
      return
    }

    const fallbackStream = createReadStream(fallbackPath)
    fallbackStream.on('open', () => {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      })
      fallbackStream.pipe(response)
    })
    fallbackStream.on('error', () => {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Build output not found. Run npm run build first.')
    })
  })
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (url.pathname === healthApiPath) {
    sendJson(request, response, 200, { ok: true, service: 'experiment-server' })
    return
  }

  if (url.pathname === filesApiPath) {
    void handleFilesListRequest(request, response, url)
    return
  }

  if (url.pathname.startsWith(`${filesApiPath}/`)) {
    const filename = decodeURIComponent(url.pathname.slice(filesApiPath.length + 1))
    void handleFileDownloadRequest(request, response, url, filename)
    return
  }

  if (url.pathname === participantApiPath) {
    void handleParticipantRequest(request, response)
    return
  }

  if (url.pathname === trajectoryApiPath) {
    void handleTrajectoryRequest(request, response)
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {
      Allow: 'GET, HEAD, POST',
      'Content-Type': 'text/plain; charset=utf-8'
    })
    response.end('Method Not Allowed')
    return
  }

  serveStaticFile(request, response)
})

server.listen(port, () => {
  console.log(`Experiment server running at http://localhost:${port}`)
  console.log(`Saving trajectory data to ${trajectoryDir}`)
})
