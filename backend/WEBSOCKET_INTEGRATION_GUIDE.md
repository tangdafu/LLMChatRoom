# Spring Boot WebSocket 集成指南

本文档基于实际项目经验，介绍如何在 Spring Boot 中集成 WebSocket 实现实时通信。

## 1. 添加依赖

在 `pom.xml` 中添加 WebSocket 依赖：

```xml
<dependencies>
    <!-- Spring Boot WebSocket -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
</dependencies>
```

## 2. WebSocket 配置

创建 WebSocket 配置类 `WebSocketConfig.java`：

```java
package com.tdf.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 启用简单的内存消息代理
        // /topic 前缀用于广播消息
        // /queue 前缀用于点对点消息
        config.enableSimpleBroker("/topic", "/queue");

        // 设置客户端发送消息的目标地址前缀
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 注册 WebSocket 端点
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*");  // 允许跨域
    }
}
```

**配置说明：**
- `/app` - 客户端发送消息的前缀
- `/topic` - 广播消息（一对多）
- `/queue` - 点对点消息（一对一）
- `/ws-chat` - WebSocket 连接端点

## 3. 创建 DTO 类

### ChatMessage.java
```java
package com.tdf.dto;

import lombok.Data;

@Data
public class ChatMessage {
    private String content;
    private String role;
}
```

### ChatCompletionRequest.java
```java
package com.tdf.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatCompletionRequest {
    private String model;
    private List<ChatMessage> messages;
    private boolean stream = false;
}
```

## 4. 创建 WebSocket 控制器

```java
package com.tdf.controller;

import com.tdf.dto.ChatCompletionRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import jakarta.annotation.Resource;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Controller
public class WebSocketChatController {

    @Resource
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 处理聊天请求
     * 客户端发送到: /app/chat/completions/{sessionId}
     *
     * @param request 聊天请求
     * @param sessionId 会话 ID
     */
    @MessageMapping("/chat/completions/{sessionId}")
    public void handleChatCompletion(
            @Payload ChatCompletionRequest request,
            @DestinationVariable("sessionId") String sessionId) {

        log.info("收到 WebSocket 消息，会话: {}", sessionId);

        // 异步处理，避免阻塞 WebSocket 线程
        CompletableFuture.runAsync(() -> {
            try {
                // 处理业务逻辑
                String response = processChat(request);

                // 发送响应到客户端
                messagingTemplate.convertAndSend(
                    "/queue/chat.response." + sessionId,
                    response
                );

                // 发送完成标记
                messagingTemplate.convertAndSend(
                    "/queue/chat.complete." + sessionId,
                    "[DONE]"
                );

            } catch (Exception e) {
                log.error("处理聊天请求失败", e);
                // 发送错误消息
                messagingTemplate.convertAndSend(
                    "/queue/chat.error." + sessionId,
                    "Error: " + e.getMessage()
                );
            }
        });
    }

    private String processChat(ChatCompletionRequest request) {
        // 实现你的业务逻辑
        return "响应内容";
    }
}
```

**重要提示：**
- `@DestinationVariable` 必须明确指定参数名称，如 `@DestinationVariable("sessionId")`
- 使用 `CompletableFuture.runAsync()` 异步处理，避免阻塞 WebSocket 线程
- 使用 `convertAndSend()` 而不是 `convertAndSendToUser()`（后者需要用户认证）

## 5. 前端集成（JavaScript）

### 安装依赖
```bash
npm install @stomp/stompjs
```

### 创建 WebSocket 服务

```javascript
import { Client } from '@stomp/stompjs'

class WebSocketService {
  constructor() {
    this.client = null
    this.sessionId = null
    this.connected = false
  }

  // 连接 WebSocket
  connect(brokerURL = 'ws://localhost:9090/ws-chat') {
    return new Promise((resolve, reject) => {
      // 生成唯一会话 ID
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

      this.client = new Client({
        brokerURL: brokerURL,
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('WebSocket 连接成功')
          this.connected = true
          resolve()
        },
        onStompError: (frame) => {
          console.error('STOMP 错误:', frame)
          reject(new Error('连接失败'))
        }
      })

      this.client.activate()
    })
  }

  // 订阅消息
  subscribeToResponse(onMessage, onComplete, onError) {
    if (!this.client || !this.client.connected) {
      console.error('WebSocket 未连接')
      return
    }

    // 订阅响应消息
    const responseSubscription = this.client.subscribe(
      `/queue/chat.response.${this.sessionId}`,
      (message) => {
        const text = message.body
        if (text && text !== '[DONE]') {
          onMessage(text)
        }
      }
    )

    // 订阅完成消息
    const completeSubscription = this.client.subscribe(
      `/queue/chat.complete.${this.sessionId}`,
      () => {
        if (onComplete) onComplete()
      }
    )

    // 订阅错误消息
    const errorSubscription = this.client.subscribe(
      `/queue/chat.error.${this.sessionId}`,
      (message) => {
        if (onError) onError(message.body)
      }
    )

    // 返回取消订阅函数
    return () => {
      responseSubscription?.unsubscribe()
      completeSubscription?.unsubscribe()
      errorSubscription?.unsubscribe()
    }
  }

  // 发送消息
  sendMessage(messages, model = 'default') {
    if (!this.client || !this.client.connected) {
      throw new Error('WebSocket 未连接')
    }

    const payload = {
      model: model,
      messages: messages,
      stream: true
    }

    this.client.publish({
      destination: `/app/chat/completions/${this.sessionId}`,
      body: JSON.stringify(payload)
    })
  }

  // 断开连接
  disconnect() {
    if (this.client) {
      this.client.deactivate()
      this.client = null
      this.connected = false
    }
  }
}

export default new WebSocketService()
```

### 使用示例

```javascript
import webSocketService from './websocket-service'

// 1. 连接 WebSocket
await webSocketService.connect()

// 2. 订阅消息
const unsubscribe = webSocketService.subscribeToResponse(
  (text) => {
    console.log('收到消息:', text)
    // 更新 UI
  },
  () => {
    console.log('消息接收完成')
  },
  (error) => {
    console.error('错误:', error)
  }
)

// 3. 发送消息
webSocketService.sendMessage([
  { role: 'user', content: '你好' }
], 'gpt-3.5-turbo')

// 4. 断开连接（组件卸载时）
webSocketService.disconnect()
```

## 6. 消息流程

```
客户端                                    服务端
  |                                        |
  |-- 连接 ws://localhost:9090/ws-chat -->|
  |<------------- 连接成功 ----------------|
  |                                        |
  |-- 订阅 /queue/chat.response.{id} ---->|
  |-- 订阅 /queue/chat.complete.{id} ---->|
  |-- 订阅 /queue/chat.error.{id} ------->|
  |                                        |
  |-- 发送 /app/chat/completions/{id} --->|
  |                                        |
  |                                        |-- 处理请求
  |<-- /queue/chat.response.{id} ---------|-- 发送响应块
  |<-- /queue/chat.response.{id} ---------|-- 发送响应块
  |<-- /queue/chat.complete.{id} ---------|-- 发送完成标记
  |                                        |
```

## 7. 常见问题

### 7.1 连接失败

**问题：** 前端无法连接到 WebSocket

**解决方案：**
1. 检查后端服务是否启动
2. 确认端口号正确（默认 9090）
3. 检查防火墙设置
4. 确认 WebSocket 配置中的跨域设置

### 7.2 参数解析失败

**错误信息：**
```
java.lang.IllegalArgumentException: Name for argument of type [java.lang.String] not specified
```

**解决方案：**
在 `@DestinationVariable` 中明确指定参数名：
```java
@DestinationVariable("sessionId") String sessionId
```

### 7.3 消息发送失败

**问题：** 后端收到消息但前端收不到响应

**排查步骤：**
1. 检查订阅路径是否与发送路径匹配
2. 确认 sessionId 一致
3. 查看后端日志是否有异常
4. 使用 `convertAndSend()` 而不是 `convertAndSendToUser()`

### 7.4 SockJS 兼容性问题

**问题：** 使用 SockJS 时连接失败

**解决方案：**

后端配置：
```java
registry.addEndpoint("/ws-chat")
        .setAllowedOriginPatterns("*")
        .withSockJS();  // 启用 SockJS
```

前端需要安装 SockJS 客户端：
```bash
npm install sockjs-client
```

如果不需要 SockJS 降级支持，建议移除 `.withSockJS()`，使用原生 WebSocket。

## 8. 性能优化建议

1. **使用异步处理**：避免阻塞 WebSocket 线程
   ```java
   CompletableFuture.runAsync(() -> {
       // 处理业务逻辑
   });
   ```

2. **添加心跳检测**：保持连接活跃
   ```javascript
   heartbeatIncoming: 10000,
   heartbeatOutgoing: 10000
   ```

3. **合理设置重连策略**：
   ```javascript
   reconnectDelay: 3000,
   maxReconnectAttempts: 5
   ```

4. **使用消息队列**：处理高并发场景，考虑使用 RabbitMQ 或 Redis 作为消息代理

## 9. 安全建议

1. **添加认证**：使用 Spring Security 保护 WebSocket 端点
2. **限制跨域**：生产环境中不要使用 `*`，指定具体域名
3. **消息验证**：验证客户端发送的消息格式和内容
4. **速率限制**：防止客户端滥用 WebSocket 连接

## 10. 调试技巧

### 启用详细日志

在 `application.yml` 中添加：
```yaml
logging:
  level:
    org.springframework.messaging: DEBUG
    org.springframework.web.socket: DEBUG
```

### 前端调试

在浏览器控制台查看 STOMP 调试信息：
```javascript
debug: (str) => {
  console.log('STOMP Debug:', str)
}
```

### 后端添加日志

```java
log.info("收到消息，会话: {}", sessionId);
log.info("发送响应到: /queue/chat.response.{}", sessionId);
```

## 总结

本文档涵盖了 Spring Boot WebSocket 集成的完整流程，从依赖配置到前后端实现，以及常见问题的解决方案。关键要点：

1. 使用 `@EnableWebSocketMessageBroker` 启用 WebSocket
2. 配置消息代理和端点
3. 在 `@DestinationVariable` 中明确指定参数名
4. 使用异步处理避免阻塞
5. 前端使用 STOMP 客户端连接和订阅消息

参考项目结构：
```
backend/
├── src/main/java/com/tdf/
│   ├── config/
│   │   └── WebSocketConfig.java
│   ├── controller/
│   │   └── WebSocketChatController.java
│   └── dto/
│       ├── ChatMessage.java
│       └── ChatCompletionRequest.java
frontend/
└── src/services/
    └── websocket.js
```