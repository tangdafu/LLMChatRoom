<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const isUser = computed(() => props.message.role === 'user')
const isStreaming = computed(() => props.message.isStreaming)
</script>

<template>
  <div :class="['message', { 'user-message': isUser, 'assistant-message': !isUser }]">
    <div class="message-content">
      <div class="avatar">
        <span v-if="isUser">U</span>
        <span v-else>A</span>
      </div>
      <div class="content">
        <p>{{ message.content }}<span v-if="isStreaming" class="cursor">|</span></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  width: 100%;
}

.user-message {
  justify-content: flex-end;
}

.assistant-message {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  gap: 0.75rem;
  max-width: 80%;
}

.user-message .message-content {
  flex-direction: row-reverse;
}

.avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: bold;
}

.user-message .avatar {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
}

.content {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 1rem;
  border-bottom-right-radius: 0;
}

.user-message .content {
  background: rgba(37, 117, 252, 0.3);
  border-bottom-right-radius: 1rem;
  border-bottom-left-radius: 0;
}

.content p {
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  width: 1px;
  height: 1rem;
  background: #fff;
  margin-left: 2px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>