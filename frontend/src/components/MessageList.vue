<script setup>
import { computed } from 'vue'
import { useChatStore } from '../stores/chat'
import MessageItem from './MessageItem.vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const chatStore = useChatStore()

const sortedMessages = computed(() => {
  return [...chatStore.messages].sort((a, b) => a.timestamp - b.timestamp)
})
</script>

<template>
  <div class="message-list">
    <div v-if="sortedMessages.length === 0" class="empty-state">
      <p>No messages yet. Start a conversation!</p>
    </div>
    
    <MessageItem
      v-for="message in sortedMessages"
      :key="message.id"
      :message="message"
    />
    
    <div v-if="loading" class="loading-indicator">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #aaa;
}

.loading-indicator {
  display: flex;
  align-items: center;
  padding: 1rem;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  border-bottom-left-radius: 0;
}

.typing-indicator span {
  width: 0.5rem;
  height: 0.5rem;
  background: #fff;
  border-radius: 50%;
  display: inline-block;
  animation: bounce 1.5s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>