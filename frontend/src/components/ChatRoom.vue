<script setup>
import { ref, onMounted } from 'vue'
import MessageList from './MessageList.vue'
import ModelSelector from './ModelSelector.vue'
import ChatInput from './ChatInput.vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()
const loading = ref(false)

const sendMessage = async (content) => {
  if (!content.trim() || loading.value) return
  
  loading.value = true
  try {
    await chatStore.sendMessage(content)
  } catch (error) {
    console.error('Error sending message:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Add a welcome message
  chatStore.addMessage({
    id: Date.now(),
    role: 'assistant',
    content: '你好! 我是大模型助手，有什么能够帮助您的吗?',
    timestamp: new Date()
  })
})
</script>

<template>
  <div class="chat-room">
    <header class="chat-header">
      <h1>LLM Chat Room</h1>
      <ModelSelector />
    </header>
    
    <main class="chat-main">
      <MessageList :loading="loading" />
    </main>
    
    <footer class="chat-footer">
      <ChatInput 
        @send-message="sendMessage" 
        :disabled="loading"
      />
    </footer>
  </div>
</template>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.chat-main {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chat-footer {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>