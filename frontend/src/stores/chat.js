import { defineStore } from 'pinia'
import { ref } from 'vue'
import { streamMessageWithFetch } from '../api/chat'
import webSocketChatService from '../services/websocket'

export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const selectedModel = ref('gpt-3.5-turbo')
  const models = ref([
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'claude-2', name: 'Claude 2' },
    { id: 'llama-2', name: 'Llama 2' },
    { id: 'palm-2', name: 'PaLM 2' }
  ])
  
  // To track the current streaming request
  let currentStream = null
  
  // WebSocket related state
  const connectionMode = ref('http') // 'http' or 'websocket'
  const wsConnected = ref(false)
  let wsUnsubscribe = null

  const addMessage = (message) => {
    messages.value.push(message)
  }

  const updateLastMessageContent = (content) => {
    if (messages.value.length > 0) {
      var lastMessage = messages.value[messages.value.length - 1]
      if( lastMessage.role !== 'assistant') {
        // Add placeholder for assistant message
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        }
        addMessage(assistantMessage)
      }
      lastMessage = messages.value[messages.value.length - 1]
      lastMessage.content += content.replace('data:', '');
    }
  }
  
  const finishLastMessage = () => {
    if (messages.value.length > 0) {
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage.role === 'assistant') {
        lastMessage.isStreaming = false
      }
    }
  }

  const setSelectedModel = (modelId) => {
    selectedModel.value = modelId
  }
  
  const setConnectionMode = (mode) => {
    connectionMode.value = mode
  }
  
  const setWsConnected = (connected) => {
    wsConnected.value = connected
  }
  
  /**
   * Initialize WebSocket connection
   */
  const initWebSocket = async () => {
    if (connectionMode.value !== 'websocket') return
    
    console.log('🔌 Chat Store: Initializing WebSocket...')
    
    try {
      await webSocketChatService.connect()
      console.log('✅ Chat Store: WebSocket connected, setting up subscriptions')
      setWsConnected(true)
      
      // Subscribe to responses
      wsUnsubscribe = webSocketChatService.subscribeToResponse(
        (text) => {
          console.log('📨 Received message chunk:', text)
          updateLastMessageContent(text)
        },
        () => {
          console.log('✅ Chat stream completed')
          finishLastMessage()
        },
        (error) => {
          console.error('❌ WebSocket error in subscription:', error)
          finishLastMessage()
        }
      )
      console.log('✅ Chat Store: Subscriptions active')
    } catch (error) {
      console.error('❌ Chat Store: Failed to connect WebSocket:', error)
      setWsConnected(false)
      throw error
    }
  }
  
  /**
   * Disconnect WebSocket
   */
  const disconnectWebSocket = () => {
    if (wsUnsubscribe) {
      wsUnsubscribe()
      wsUnsubscribe = null
    }
    webSocketChatService.disconnect()
    setWsConnected(false)
  }
  
  /**
   * Check if WebSocket is available and connected
   */
  const isWebSocketReady = () => {
    return connectionMode.value === 'websocket' && wsConnected.value
  }

  const sendMessage = async (content) => {
    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content,
      timestamp: new Date()
    }
    addMessage(userMessage)

    // Cancel any existing stream
    if (currentStream) {
      currentStream()
    }

    // Prepare messages in OpenAI format
    const openAiMessages = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Use WebSocket or HTTP based on connection mode
    if (connectionMode.value === 'websocket' && wsConnected.value) {
      // Send via WebSocket
      return new Promise((resolve, reject) => {
        try {
          webSocketChatService.sendMessage(openAiMessages, selectedModel.value)
          resolve()
        } catch (error) {
          console.error('WebSocket send error:', error)
          finishLastMessage()
          reject(error)
        }
      })
    } else {
      // Send via HTTP SSE
      return new Promise((resolve, reject) => {
        currentStream = streamMessageWithFetch(
          openAiMessages,
          selectedModel.value,
          (chunk) => {
            // Handle each chunk of data
            updateLastMessageContent(chunk)
          },
          () => {
            // Stream complete
            finishLastMessage()
            currentStream = null
            resolve()
          },
          (error) => {
            // Handle error
            console.error('Streaming error:', error)
            finishLastMessage()
            currentStream = null
            reject(error)
          }
        )
      })
    }
  }
  
  const cancelStreaming = () => {
    if (currentStream) {
      currentStream()
      currentStream = null
      finishLastMessage()
    }
  }

  return {
    messages,
    selectedModel,
    models,
    connectionMode,
    wsConnected,
    addMessage,
    updateLastMessageContent,
    setSelectedModel,
    setConnectionMode,
    setWsConnected,
    initWebSocket,
    disconnectWebSocket,
    isWebSocketReady,
    sendMessage,
    cancelStreaming
  }
})