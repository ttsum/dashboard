<template>
  <header class="dashboard-header">
    <div class="header-left">
      <div class="logo-placeholder">
        <ElIcon :size="32">
          <TrendCharts />
        </ElIcon>
      </div>

      <div class="header-title">
        <span class="org-name">国家统计局</span>
        <span class="main-title">省级经济数据报告</span>
      </div>
    </div>

    <div class="header-right">
      <span class="date-text">{{ currentDate }}</span>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { ElIcon } from 'element-plus'
import { TrendCharts } from '@element-plus/icons-vue'

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
  justify-content: space-between;
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

.org-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.date-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 8px 12px;
  }

  .header-title {
    display: none;
  }
}
</style>
