<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send-message'])

const message = ref('')

const handleSubmit = () => {
  if (message.value.trim() && !props.disabled) {
    emit('send-message', message.value)
    message.value = ''
  }
}

const handleKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="chat-input">
    <textarea
      v-model="message"
      :disabled="disabled"
      placeholder="Type your message here... (Press Enter to send)"
      @keydown="handleKeydown"
    ></textarea>
    <button 
      @click="handleSubmit" 
      :disabled="!message.trim() || disabled"
      class="send-button"
    >
      Send
    </button>
  </div>
</template>

<style scoped>
.chat-input {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 0.5rem;
}

textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  resize: none;
  min-height: 60px;
  max-height: 200px;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
}

textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

textarea:disabled {
  opacity: 0.6;
}

.send-button {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 1rem;
  padding: 0 1.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-button:hover:not(:disabled) {
  opacity: 0.9;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>