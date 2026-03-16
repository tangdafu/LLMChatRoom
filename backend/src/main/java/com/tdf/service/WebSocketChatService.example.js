/**
 * WebSocket 聊天服务示例
 * 用于演示如何连接到 WebSocket 并使用流式聊天 API
 */

import { Client, IMessage } from '@stomp/stompjs';

class WebSocketChatService {
    private client: Client | null = null;
    private sessionId: string = '';

    /**
     * 初始化并连接 WebSocket
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            // 生成唯一的会话 ID
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            this.client = new Client({
                brokerURL: 'ws://localhost:8080/ws-chat', // WebSocket 端点
                debug: (str) => {
                    console.log('STOMP Debug:', str);
                },
                reconnectDelay: 5000,
                onConnect: () => {
                    console.log('WebSocket connected successfully');
                    resolve();
                },
                onStompError: (frame) => {
                    console.error('STOMP error:', frame);
                    reject(new Error(frame.headers.message || 'Connection failed'));
                },
                onDisconnect: () => {
                    console.log('WebSocket disconnected');
                }
            });

            this.client.activate();
        });
    }

    /**
     * 订阅聊天响应
     */
    subscribeToResponse(onMessage: (text: string) => void, onComplete?: () => void, onError?: (error: string) => void): void {
        if (!this.client || !this.client.connected) {
            console.error('WebSocket not connected');
            return;
        }

        // 订阅流式响应消息
        this.client.subscribe(`/user/queue/chat.response.${this.sessionId}`, (message: IMessage) => {
            const text = message.body;
            if (text && text !== '[DONE]') {
                onMessage(text);
            }
        });

        // 订阅完成消息
        if (onComplete) {
            this.client.subscribe(`/user/queue/chat.complete.${this.sessionId}`, () => {
                console.log('Chat stream completed');
                onComplete();
            });
        }

        // 订阅错误消息
        if (onError) {
            this.client.subscribe(`/user/queue/chat.error.${this.sessionId}`, (message: IMessage) => {
                console.error('Chat error:', message.body);
                onError(message.body || 'Unknown error');
            });
        }
    }

    /**
     * 发送聊天消息（流式）
     */
    sendMessage(messages: Array<{ role: string; content: string }>): void {
        if (!this.client || !this.client.connected) {
            console.error('WebSocket not connected');
            return;
        }

        const requestPayload = {
            model: 'qwen:7b', // 或其他模型名称
            messages: messages,
            stream: true
        };

        // 发送到 WebSocket 端点
        this.client.publish({
            destination: `/app/chat/completions/${this.sessionId}`,
            body: JSON.stringify(requestPayload)
        });

        console.log('Message sent via WebSocket');
    }

    /**
     * 断开 WebSocket 连接
     */
    disconnect(): void {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            console.log('WebSocket disconnected manually');
        }
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return this.client?.connected ?? false;
    }
}

// 使用示例
export default WebSocketChatService;

/*
// 在 Vue/React 组件中使用示例：

const chatService = new WebSocketChatService();

// 连接 WebSocket
chatService.connect().then(() => {
    console.log('Connected to WebSocket');
    
    // 订阅响应
    chatService.subscribeToResponse(
        (text) => {
            // 处理接收到的文本片段（流式更新）
            console.log('Received chunk:', text);
            // 更新 UI...
        },
        () => {
            // 流完成回调
            console.log('Stream completed');
        },
        (error) => {
            // 错误处理
            console.error('Error:', error);
        }
    );
    
    // 发送消息
    chatService.sendMessage([
        { role: 'user', content: '你好，请介绍一下你自己' }
    ]);
});

// 组件卸载时断开连接
chatService.disconnect();
*/
