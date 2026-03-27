<template>
  <section class="task-panel">
    <article
      v-for="task in tasks"
      :key="task.id"
      class="task-item"
    >
      <div class="task-number">{{ task.label }}</div>
      <div class="task-content">{{ task.content }}</div>
    </article>
  </section>
</template>

<script setup>
defineProps({
  tasks: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.task-panel {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
}

.task-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  text-align: center;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.task-number {
  margin-bottom: 3px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #002d56;
  background-color: rgba(0, 45, 86, 0.1);
  border-radius: 9px;
}

.task-content {
  font-size: 10px;
  line-height: 1.25;
  color: #4b5563;
}

@media (max-width: 1200px) {
  .task-panel {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .task-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .task-panel {
    grid-template-columns: 1fr;
  }
}
</style>
