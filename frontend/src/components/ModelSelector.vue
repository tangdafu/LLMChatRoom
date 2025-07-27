<script setup>
import { computed } from 'vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

const selectedModel = computed({
  get: () => chatStore.selectedModel,
  set: (value) => chatStore.setSelectedModel(value)
})

const models = computed(() => chatStore.models)
</script>

<template>
  <div class="model-selector">
    <label for="model-select">Model:</label>
    <select id="model-select" v-model="selectedModel">
      <option v-for="model in models" :key="model.id" :value="model.id">
        {{ model.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.model-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
}

#model-select {
  background: transparent;
  border: none;
  color: white;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  border-radius: 0.25rem;
  outline: none;
  cursor: pointer;
}

#model-select:focus {
  outline: 1px solid rgba(255, 255, 255, 0.3);
}

#model-select option {
  background: #1a1a2e;
  color: white;
}
</style>