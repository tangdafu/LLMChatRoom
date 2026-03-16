<script setup>
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const connecting = ref(false)
const connectionError = ref(null)

// Switch connection mode
const toggleConnectionMode = async () => {
  if (props.disabled || connecting.value) return
  
  const newMode = chatStore.connectionMode === 'http' ? 'websocket' : 'http'
  console.log('🔄 Switching connection mode from', chatStore.connectionMode, 'to', newMode)
  
  if (newMode === 'websocket') {
    // Switching to WebSocket mode
    connecting.value = true
    connectionError.value = null
    
    try {
      console.log('🔌 Initializing WebSocket connection...')
      chatStore.setConnectionMode('websocket')
      await chatStore.initWebSocket()
      console.log('✅ WebSocket connection established')
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error)
      connectionError.value = '无法连接到 WebSocket 服务器，请确保后端服务已启动 (端口 9090)'
      chatStore.setConnectionMode('http')
    } finally {
      connecting.value = false
    }
  } else {
    // Switching to HTTP mode
    console.log('🔴 Switching to HTTP mode')
    if (chatStore.wsConnected) {
      chatStore.disconnectWebSocket()
    }
    chatStore.setConnectionMode('http')
  }
}

// Watch for connection status changes
watch(() => chatStore.wsConnected, (connected) => {
  if (!connected && chatStore.connectionMode === 'websocket') {
    connectionError.value = 'WebSocket 连接已断开'
  } else {
    connectionError.value = null
  }
})
</script>

<template>
  <div class="connection-mode-selector">
    <button
      @click="toggleConnectionMode"
      :disabled="disabled || connecting"
      class="mode-toggle-btn"
      :class="{ 
        'websocket-mode': chatStore.connectionMode === 'websocket',
        'http-mode': chatStore.connectionMode === 'http',
        'connecting': connecting
      }"
    >
      <span class="mode-icon">
        <svg v-if="chatStore.connectionMode === 'websocket'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      </span>
      <span class="mode-text">
        {{ connecting ? '连接中...' : (chatStore.connectionMode === 'websocket' ? 'WebSocket' : 'HTTP') }}
      </span>
      <span v-if="chatStore.wsConnected" class="status-indicator connected"></span>
      <span v-else-if="chatStore.connectionMode === 'websocket'" class="status-indicator disconnected"></span>
    </button>
    
    <div v-if="connectionError" class="error-message">
      {{ connectionError }}
    </div>
  </div>
</template>

<style scoped>
.connection-mode-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mode-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.mode-toggle-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.mode-toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-toggle-btn.websocket-mode {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: rgba(102, 126, 234, 0.5);
}

.mode-toggle-btn.http-mode {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-color: rgba(245, 87, 108, 0.5);
}

.mode-toggle-btn.connecting {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.mode-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: auto;
}

.status-indicator.connected {
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
  animation: glow 2s ease-in-out infinite;
}

.status-indicator.disconnected {
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
}

@keyframes glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.error-message {
  font-size: 0.75rem;
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border-left: 2px solid #f87171;
}
</style>
