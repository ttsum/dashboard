<template>
  <header class="dashboard-header">
    <div class="header-left">
      <div class="logo-placeholder">
        <ElIcon :size="28">
          <TrendCharts />
        </ElIcon>
      </div>

      <div class="header-title">
        <span class="org-name">{{ monitoringTitle }}</span>
        <span class="main-title">地图仪表盘</span>
      </div>
    </div>

    <div class="header-center">
      <div class="task-panel">
        <span class="task-label">判断题</span>
        <div class="task-copy">
          <span class="task-text">{{ currentTask.content }}</span>
        </div>
        <span class="task-meta">{{ currentTaskNumber }}/{{ taskCount }}</span>
      </div>
    </div>

    <div class="header-right">
      <div class="verdict-panel" aria-label="判断结果">
        <span class="verdict-title">判断结果</span>
        <button
          v-for="item in verdictOptions"
          :key="item.value"
          type="button"
          class="verdict-button"
          :class="[`is-${item.value}`, { 'is-active': selectedVerdict === item.value }]"
          @click="toggleVerdict(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <button
        type="button"
        class="next-task-button"
        :disabled="!selectedVerdict"
        @click="handleNextTask"
      >下一题</button>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElIcon } from 'element-plus'
import { TrendCharts } from '@element-plus/icons-vue'
import { getProvinceMetaByKey, resolveProvinceKeyFromLocation } from '../../constants/provinceDashboard'

const emit = defineEmits(['next-task'])

const props = defineProps({
  currentTask: {
    type: Object,
    required: true
  },
  currentTaskNumber: {
    type: Number,
    required: true
  },
  taskCount: {
    type: Number,
    required: true
  }
})

const monitoringTitle = computed(() => (
  getProvinceMetaByKey(resolveProvinceKeyFromLocation(window.location)).monitoringTitle
))

const verdictOptions = [
  { label: '正确', value: 'correct' },
  { label: '错误', value: 'incorrect' },
  { label: '不知道', value: 'unknown' }
]

const selectedVerdict = ref('')

const toggleVerdict = (value) => {
  selectedVerdict.value = selectedVerdict.value === value ? '' : value
}

const handleNextTask = () => {
  if (!selectedVerdict.value) {
    return
  }

  emit('next-task')
}

watch(
  () => props.currentTaskNumber,
  () => {
    selectedVerdict.value = ''
  }
)
</script>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 8px 20px;
  color: #fff;
  background-color: #002d56;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-placeholder {
  width: 44px;
  height: 44px;
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

.org-name {
  font-size: calc(12px * var(--ui-font-scale));
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.3px;
}

.main-title {
  font-size: calc(18px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 0;
}

.header-center {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
}

.task-panel {
  position: relative;
  width: min(860px, 100%);
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 22px;
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
  padding: 5px 11px;
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 700;
  color: #78350f;
  background: #fde68a;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.22);
}

.task-copy {
  flex: 1;
  min-width: 0;
}

.task-text {
  overflow: hidden;
  font-size: calc(15px * var(--ui-font-scale));
  font-weight: 700;
  color: #fffdf5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  flex-shrink: 0;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 600;
  color: rgba(226, 232, 240, 0.82);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.verdict-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 14px;
  background: linear-gradient(135deg, rgba(255, 214, 102, 0.14), rgba(255, 255, 255, 0.08));
  border: 1px solid rgba(255, 214, 102, 0.32);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.verdict-title {
  flex-shrink: 0;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 236, 179, 0.92);
  text-transform: uppercase;
}

.verdict-button {
  min-width: 64px;
  min-height: 36px;
  padding: 0 14px;
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(5, 31, 60, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.verdict-button:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 214, 102, 0.42);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
}

.verdict-button.is-active.is-correct {
  color: #ecfdf5;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.48), rgba(21, 128, 61, 0.72));
  border-color: rgba(187, 247, 208, 0.9);
}

.verdict-button.is-active.is-incorrect {
  color: #fef2f2;
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.5), rgba(185, 28, 28, 0.76));
  border-color: rgba(254, 202, 202, 0.88);
}

.verdict-button.is-active.is-unknown {
  color: #eff6ff;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.5), rgba(29, 78, 216, 0.78));
  border-color: rgba(191, 219, 254, 0.88);
}

.next-task-button {
  min-width: 92px;
  min-height: 40px;
  padding: 0 16px;
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 700;
  color: #fff8e6;
  background: linear-gradient(135deg, rgba(255, 214, 102, 0.88), rgba(245, 158, 11, 0.92));
  border: 1px solid rgba(255, 236, 179, 0.72);
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.next-task-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.next-task-button:disabled {
  color: rgba(255, 248, 230, 0.62);
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.7), rgba(100, 116, 139, 0.78));
  border-color: rgba(226, 232, 240, 0.28);
  box-shadow: none;
  cursor: not-allowed;
  filter: grayscale(0.1);
}

.next-task-button:disabled:hover {
  transform: none;
  filter: grayscale(0.1);
  box-shadow: none;
}

@media (max-width: 980px) {
  .dashboard-header {
    gap: 10px;
    padding: 8px 12px;
  }

  .header-title {
    display: none;
  }

  .task-panel {
    padding: 8px 12px 8px 18px;
    gap: 8px;
    border-radius: 10px;
  }

  .task-text {
    font-size: calc(13px * var(--ui-font-scale));
  }

  .task-meta {
    font-size: calc(10px * var(--ui-font-scale));
  }

  .header-right {
    gap: 6px;
  }

  .verdict-panel {
    gap: 4px;
    padding: 5px 6px 5px 10px;
  }

  .verdict-title {
    font-size: calc(10px * var(--ui-font-scale));
    letter-spacing: 0.08em;
  }

  .verdict-button {
    min-width: 56px;
    min-height: 30px;
    padding: 0 8px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .next-task-button {
    min-width: 78px;
    min-height: 34px;
    padding: 0 12px;
    font-size: calc(12px * var(--ui-font-scale));
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .header-center {
    order: 3;
    width: 100%;
  }

  .header-right {
    flex: 1;
    align-items: flex-end;
  }

  .task-panel {
    flex-wrap: wrap;
  }

  .task-copy {
    width: 100%;
  }

  .task-meta {
    margin-left: auto;
  }

  .verdict-title {
    display: none;
  }
}
</style>

