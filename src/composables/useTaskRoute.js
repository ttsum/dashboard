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

const DEFAULT_TASK_FLOW = 'next'
const TASK_FLOW_VALUES = new Set(['next', 'last'])

const normalizeTaskId = (taskId) => (
  TASKS_BY_ID.has(String(taskId)) ? String(taskId) : DEFAULT_TASK_ID
)

const normalizeTaskFlow = (taskFlow) => (
  TASK_FLOW_VALUES.has(String(taskFlow)) ? String(taskFlow) : DEFAULT_TASK_FLOW
)

const readTaskStateFromHash = () => {
  const hashMatch = window.location.hash.match(/^#\/(?:(next|last)\/)?task\/([^/?#]+)/)
  if (hashMatch) {
    return {
      taskFlow: normalizeTaskFlow(hashMatch[1]),
      taskId: normalizeTaskId(decodeURIComponent(hashMatch[2]))
    }
  }

  return null
}

const readTaskStateFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  const queryTaskId = params.get('taskId') || params.get('task')
  if (queryTaskId) {
    return {
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
    taskFlow: DEFAULT_TASK_FLOW,
    taskId: DEFAULT_TASK_ID
  }
}

const getAppRootPath = () => window.location.pathname

const buildTaskUrl = (taskFlow, taskId) => (
  `${getAppRootPath()}#/${encodeURIComponent(taskFlow)}/task/${encodeURIComponent(taskId)}`
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
  const currentTaskFlow = ref(initialTaskState.taskFlow)
  const currentTaskId = ref(initialTaskState.taskId)
  const currentTask = computed(() => getTaskById(currentTaskId.value))
  const currentTaskIndex = computed(() => getTaskIndexById(currentTaskId.value))
  const currentTaskNumber = computed(() => currentTaskIndex.value + 1)
  const taskCount = TASKS.length
  const currentTaskUrl = computed(() => buildTaskUrl(currentTaskFlow.value, currentTaskId.value))

  const syncTaskStateFromUrl = () => {
    const nextTaskState = readTaskStateFromHash() || readTaskStateFromQuery()
    if (!nextTaskState) {
      return
    }

    currentTaskFlow.value = nextTaskState.taskFlow
    currentTaskId.value = nextTaskState.taskId
  }

  const setTaskId = (taskId, { replace = false, taskFlow = currentTaskFlow.value } = {}) => {
    const nextTaskFlow = normalizeTaskFlow(taskFlow)
    const nextTaskId = normalizeTaskId(taskId)
    const nextUrl = buildTaskUrl(nextTaskFlow, nextTaskId)

    currentTaskFlow.value = nextTaskFlow
    currentTaskId.value = nextTaskId
    if (replace) {
      window.history.replaceState({ taskId: nextTaskId, taskFlow: nextTaskFlow }, '', nextUrl)
    } else {
      window.history.pushState({ taskId: nextTaskId, taskFlow: nextTaskFlow }, '', nextUrl)
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
    setTaskId(currentTaskId.value, { replace: true, taskFlow: currentTaskFlow.value })
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
