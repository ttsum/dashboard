<template>
  <header class="dashboard-header">
    <div class="header-left">
      <div class="logo-placeholder">
        <ElIcon :size="32">
          <TrendCharts />
        </ElIcon>
      </div>

      <div class="header-title">
        <span class="org-name">江西省县域统计监测</span>
        <span class="main-title">区县经济与民生指标看板</span>
      </div>
    </div>

    <div class="header-center">
      <div class="task-panel">
        <span class="task-label">任务内容</span>
        <span class="task-text">{{ currentTask }}</span>
        <button
          class="next-task-btn"
          type="button"
          @click="showNextTask"
        >
          下一个
        </button>
      </div>
    </div>

    <div class="header-right">
      <span class="date-text">{{ currentDate }}</span>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElIcon } from 'element-plus'
import { TrendCharts } from '@element-plus/icons-vue'

const TASKS = [
  '找到2020年南昌市东湖区的GDP数量',
  '比较宜春市宜丰县和上饶市弋阳县哪个GDP高'
]

const currentTaskIndex = ref(0)
const currentTask = computed(() => TASKS[currentTaskIndex.value])

const showNextTask = () => {
  currentTaskIndex.value = (currentTaskIndex.value + 1) % TASKS.length
}

const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 24px;
  color: #fff;
  background-color: #002d56;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-placeholder {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.header-title {
  display: flex;
  flex-direction: column;
}

.header-center {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
}

.task-panel {
  position: relative;
  width: min(900px, 100%);
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 12px 24px;
  background: linear-gradient(135deg, rgba(255, 214, 102, 0.24), rgba(59, 130, 246, 0.16));
  border: 2px solid rgba(255, 214, 102, 0.55);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  overflow: hidden;
}

.task-panel::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(180deg, #fde68a, #f59e0b);
}

.task-label {
  flex-shrink: 0;
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 700;
  color: #78350f;
  letter-spacing: 0.5px;
  background: #fde68a;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.22);
}

.task-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  color: #fffdf5;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.next-task-btn {
  flex-shrink: 0;
  min-height: 34px;
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 700;
  color: #002d56;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
}

.next-task-btn:hover {
  background: #f8fafc;
}

.next-task-btn:active {
  transform: translateY(1px);
}

.org-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

.main-title {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 1px;
}

.date-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .dashboard-header {
    gap: 10px;
    padding: 8px 12px;
  }

  .header-title {
    display: none;
  }

  .task-panel {
    padding: 8px 12px;
    gap: 8px;
    border-radius: 10px;
  }

  .task-label {
    padding: 3px 8px;
    font-size: 11px;
  }

  .task-text {
    font-size: 12px;
  }

  .next-task-btn {
    min-height: 30px;
    padding: 4px 9px;
    font-size: 11px;
  }
}
</style>
