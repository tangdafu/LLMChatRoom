import { defineStore } from 'pinia'
import { ref } from 'vue'
import { streamMessageWithFetch } from '../api/chat'

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

    // Call the streaming API with Fetch API
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
    addMessage,
    updateLastMessageContent,
    setSelectedModel,
    sendMessage,
    cancelStreaming
  }
})