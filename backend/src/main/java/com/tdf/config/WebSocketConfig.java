package com.tdf.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket 配置类
 * 启用 WebSocket 消息代理，支持 STOMP 协议
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 启用简单的内存消息代理，用于向客户端广播消息
        // /topic 前缀用于广播消息
        // /queue 前缀用于点对点消息
        config.enableSimpleBroker("/topic", "/queue");
        
        // 设置客户端发送消息的目标地址前缀
        // 客户端发送消息到 /app 开头的目的地会被路由到@MessageMapping 注解的方法
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 注册 WebSocket 端点，前端将连接到此端点
        // 允许跨域访问（可选）
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*");
    }
}
