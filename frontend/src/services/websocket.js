import { Client } from '@stomp/stompjs'

/**
 * WebSocket 聊天服务
 * 管理 WebSocket 连接和消息通信
 */
class WebSocketChatService {
  constructor() {
    this.client = null
    this.sessionId = null
    this.connected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000 // 3 seconds
  }

  /**
   * 初始化并连接 WebSocket
   * @param {string} brokerURL - WebSocket 服务器地址
   * @returns {Promise<void>}
   */
  connect(brokerURL = 'ws://localhost:9090/ws-chat') {
    return new Promise((resolve, reject) => {
      // 生成唯一的会话 ID
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

      console.log('🔌 Attempting to connect to WebSocket:', brokerURL)
      console.log('📝 Session ID:', this.sessionId)

      if (this.client) {
        this.disconnect()
      }

      this.client = new Client({
        brokerURL: brokerURL,
        debug: (str) => {
          console.log('STOMP Debug:', str)
        },
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectionTimeout: 10000, // 10 seconds timeout
        onConnect: () => {
          console.log('✅ WebSocket connected successfully')
          console.log('📝 Session ID:', this.sessionId)
          this.connected = true
          this.reconnectAttempts = 0
          resolve()
        },
        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame)
          this.connected = false
          reject(new Error(frame.headers.message || 'Connection failed'))
        },
        onDisconnect: () => {
          console.log('🔌 WebSocket disconnected')
          this.connected = false
        },
        onClose: (evt) => {
          console.log('WebSocket connection closed:', evt.code, evt.reason)
          this.connected = false
          this.handleReconnect(brokerURL)
        },
        onWebSocketClose: (evt) => {
          console.warn('WebSocket closed:', evt)
        },
        onWebSocketError: (evt) => {
          console.error('WebSocket error:', evt)
          this.connected = false
          reject(new Error('WebSocket connection failed'))
        }
      })

      this.client.activate()
      
      // Timeout handling
      setTimeout(() => {
        if (!this.connected) {
          const error = new Error('WebSocket connection timeout')
          console.error('❌ Connection timeout after 5 seconds')
          reject(error)
        }
      }, 5000)
    })
  }

  /**
   * 处理重连逻辑
   */
  handleReconnect(brokerURL) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => {
        this.connect(brokerURL).catch(console.error)
      }, this.reconnectDelay)
    } else {
      console.error('达到最大重连次数，停止重连')
    }
  }

  /**
   * 订阅聊天响应
   * @param {function} onMessage - 接收消息回调
   * @param {function} onComplete - 完成回调
   * @param {function} onError - 错误回调
   */
  subscribeToResponse(onMessage, onComplete, onError) {
    if (!this.client || !this.client.connected) {
      console.error('❌ WebSocket not connected, cannot subscribe')
      return
    }

    console.log('📡 Setting up subscriptions for session:', this.sessionId)

    // 订阅流式响应消息
    const responseSubscription = this.client.subscribe(
      `/queue/chat.response.${this.sessionId}`,
      (message) => {
        console.log('📨 Received response chunk:', message.body)
        const text = message.body
        if (text && text !== '[DONE]') {
          onMessage(text)
        }
      }
    )
    console.log('✅ Subscribed to:', `/queue/chat.response.${this.sessionId}`)

    // 订阅完成消息
    const completeSubscription = this.client.subscribe(
      `/queue/chat.complete.${this.sessionId}`,
      () => {
        console.log('✅ Chat stream completed')
        if (onComplete) onComplete()
      }
    )
    console.log('✅ Subscribed to:', `/queue/chat.complete.${this.sessionId}`)

    // 订阅错误消息
    const errorSubscription = this.client.subscribe(
      `/queue/chat.error.${this.sessionId}`,
      (message) => {
        console.error('❌ Chat error:', message.body)
        if (onError) onError(message.body || 'Unknown error')
      }
    )
    console.log('✅ Subscribed to:', `/queue/chat.error.${this.sessionId}`)

    // 返回取消订阅的函数
    return () => {
      responseSubscription?.unsubscribe()
      completeSubscription?.unsubscribe()
      errorSubscription?.unsubscribe()
    }
  }

  /**
   * 发送聊天消息
   * @param {Array} messages - 消息数组
   * @param {string} model - 模型名称
   */
  sendMessage(messages, model = 'qwen:7b') {
    if (!this.client || !this.client.connected) {
      throw new Error('WebSocket not connected')
    }

    const requestPayload = {
      model: model,
      messages: messages,
      stream: true
    }

    const destination = `/app/chat/completions/${this.sessionId}`

    console.log('📤 Sending message to:', destination)
    console.log('📝 Payload:', JSON.stringify(requestPayload, null, 2))

    // 发送到 WebSocket 端点
    this.client.publish({
      destination: destination,
      body: JSON.stringify(requestPayload)
    })

    console.log('✅ Message sent via WebSocket')
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect() {
    if (this.client) {
      this.client.deactivate()
      this.client = null
      this.connected = false
      console.log('○ WebSocket disconnected manually')
    }
  }

  /**
   * 检查连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this.client?.connected ?? false
  }

  /**
   * 获取会话 ID
   * @returns {string|null}
   */
  getSessionId() {
    return this.sessionId
  }
}

// 创建单例实例
const webSocketChatService = new WebSocketChatService()

export default webSocketChatService
