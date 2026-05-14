import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  DEFAULT_TASK_ID,
  TASKS,
  TASKS_BY_ID,
  getNextTask,
  getPreviousTask,
  getTaskById,
  getTaskIndexById
} from '../constants/tasks'
import { ACTIVE_PROVINCE_KEY } from '../constants/provinceDashboard'

const DEFAULT_TASK_FLOW = 'next'
const TASK_FLOW_VALUES = new Set(['next', 'last'])

const normalizeProvinceKey = (provinceKey) => (
  ['hunan', 'jiangxi'].includes(String(provinceKey || '').toLowerCase())
    ? String(provinceKey).toLowerCase()
    : ACTIVE_PROVINCE_KEY
)

const readProvinceKeyFromHash = () => {
  const hashMatch = window.location.hash.match(/^#\/(hunan|jiangxi)(?:\/|$)/)
  return normalizeProvinceKey(hashMatch?.[1])
}

const normalizeTaskId = (taskId) => (
  TASKS_BY_ID.has(String(taskId)) ? String(taskId) : DEFAULT_TASK_ID
)

const normalizeTaskFlow = (taskFlow) => (
  TASK_FLOW_VALUES.has(String(taskFlow)) ? String(taskFlow) : DEFAULT_TASK_FLOW
)

const readTaskStateFromHash = () => {
  const hashMatch = window.location.hash.match(
    /^#\/(?:(hunan|jiangxi)\/)?(?:(next|last)\/)?task\/([^/?#]+)/
  )
  if (hashMatch) {
    return {
      provinceKey: normalizeProvinceKey(hashMatch[1]),
      taskFlow: normalizeTaskFlow(hashMatch[2]),
      taskId: normalizeTaskId(decodeURIComponent(hashMatch[3]))
    }
  }

  return null
}

const readTaskStateFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  const queryTaskId = params.get('taskId') || params.get('task')
  if (queryTaskId) {
    return {
      provinceKey: normalizeProvinceKey(params.get('province')),
      taskFlow: normalizeTaskFlow(params.get('flow')),
      taskId: normalizeTaskId(queryTaskId)
    }
  }

  return null
}

const readTaskStateFromUrl = () => {
  const hashTaskState = readTaskStateFromHash()
  if (hashTaskState) {
    return hashTaskState
  }

  const queryTaskState = readTaskStateFromQuery()
  if (queryTaskState) {
    return queryTaskState
  }

  return {
    provinceKey: readProvinceKeyFromHash(),
    taskFlow: DEFAULT_TASK_FLOW,
    taskId: DEFAULT_TASK_ID
  }
}

const getAppRootPath = () => window.location.pathname

const buildTaskUrl = (provinceKey, taskFlow, taskId) => (
  `${getAppRootPath()}#/${encodeURIComponent(provinceKey)}/${encodeURIComponent(taskFlow)}/task/${encodeURIComponent(taskId)}`
)

const isInteractiveTarget = (target) => (
  target?.isContentEditable
  || Boolean(target?.closest?.([
    'input',
    'textarea',
    'select',
    'button',
    '[role="button"]',
    '[role="slider"]',
    '.el-checkbox',
    '.el-radio',
    '.el-slider'
  ].join(',')))
)

export function useTaskRoute({ enableKeyboard = false } = {}) {
  const initialTaskState = readTaskStateFromUrl()
  const currentProvinceKey = ref(initialTaskState.provinceKey)
  const currentTaskFlow = ref(initialTaskState.taskFlow)
  const currentTaskId = ref(initialTaskState.taskId)
  const currentTask = computed(() => getTaskById(currentTaskId.value))
  const currentTaskIndex = computed(() => getTaskIndexById(currentTaskId.value))
  const currentTaskNumber = computed(() => currentTaskIndex.value + 1)
  const taskCount = TASKS.length
  const currentTaskUrl = computed(() => (
    buildTaskUrl(currentProvinceKey.value, currentTaskFlow.value, currentTaskId.value)
  ))

  const syncTaskStateFromUrl = () => {
    const nextTaskState = readTaskStateFromHash() || readTaskStateFromQuery()
    if (!nextTaskState) {
      return
    }

    // Province-specific datasets/maps are initialized at app bootstrap.
    // If province segment changes in hash, refresh once to reload the correct dataset bundle.
    if (nextTaskState.provinceKey !== ACTIVE_PROVINCE_KEY) {
      window.location.reload()
      return
    }

    currentProvinceKey.value = nextTaskState.provinceKey
    currentTaskFlow.value = nextTaskState.taskFlow
    currentTaskId.value = nextTaskState.taskId
  }

  const setTaskId = (
    taskId,
    {
      replace = false,
      taskFlow = currentTaskFlow.value,
      provinceKey = currentProvinceKey.value
    } = {}
  ) => {
    const nextProvinceKey = normalizeProvinceKey(provinceKey)
    const nextTaskFlow = normalizeTaskFlow(taskFlow)
    const nextTaskId = normalizeTaskId(taskId)
    const nextUrl = buildTaskUrl(nextProvinceKey, nextTaskFlow, nextTaskId)

    currentProvinceKey.value = nextProvinceKey
    currentTaskFlow.value = nextTaskFlow
    currentTaskId.value = nextTaskId
    if (replace) {
      window.history.replaceState(
        { provinceKey: nextProvinceKey, taskId: nextTaskId, taskFlow: nextTaskFlow },
        '',
        nextUrl
      )
    } else {
      window.history.pushState(
        { provinceKey: nextProvinceKey, taskId: nextTaskId, taskFlow: nextTaskFlow },
        '',
        nextUrl
      )
    }
  }

  const goToNextTask = () => {
    const nextTask = currentTaskFlow.value === 'last'
      ? getPreviousTask(currentTaskId.value)
      : getNextTask(currentTaskId.value)
    setTaskId(nextTask.id)
  }

  const handleKeydown = (event) => {
    if (
      event.code !== 'Space'
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || isInteractiveTarget(event.target)
    ) {
      return
    }

    event.preventDefault()
    goToNextTask()
  }

  onMounted(() => {
    setTaskId(currentTaskId.value, {
      replace: true,
      provinceKey: currentProvinceKey.value,
      taskFlow: currentTaskFlow.value
    })
    window.addEventListener('popstate', syncTaskStateFromUrl)
    window.addEventListener('hashchange', syncTaskStateFromUrl)
    if (enableKeyboard) {
      window.addEventListener('keydown', handleKeydown)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', syncTaskStateFromUrl)
    window.removeEventListener('hashchange', syncTaskStateFromUrl)
    if (enableKeyboard) {
      window.removeEventListener('keydown', handleKeydown)
    }
  })

  return {
    tasks: TASKS,
    currentProvinceKey,
    currentTaskFlow,
    currentTaskId,
    currentTask,
    currentTaskIndex,
    currentTaskNumber,
    taskCount,
    currentTaskUrl,
    setTaskId,
    goToNextTask
  }
}
