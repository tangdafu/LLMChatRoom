package com.tdf.controller;

import com.tdf.dto.ChatCompletionRequest;
import com.tdf.dto.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import jakarta.annotation.Resource;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * WebSocket 聊天控制器
 * 处理通过 WebSocket 发送的聊天消息
 */
@Slf4j
@Controller
public class WebSocketChatController {

    @Resource
    private OllamaChatModel ollamaChatModel;
    
    @Resource
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 处理聊天完成请求（流式响应）
     * 
     * @param request 聊天完成请求
     * @param sessionId 会话 ID，用于将响应发送回特定客户端
     */
    @MessageMapping("/chat/completions/{sessionId}")
    public void handleChatCompletion(
            @Payload ChatCompletionRequest request,
            @DestinationVariable("sessionId") String sessionId) {

        log.info("📨 Received WebSocket message for session: {}", sessionId);
        log.info("📝 Request: model={}, messages count={}", request.getModel(), request.getMessages().size());

        // 异步处理请求，避免阻塞 WebSocket 线程
        CompletableFuture.runAsync(() -> {
            try {
                log.info("🔄 Starting to process chat completion for session: {}", sessionId);
                // 将所有消息转换为 Spring AI 的 Message 对象
                List<Message> springAiMessages = new ArrayList<>();
                for (ChatMessage chatMessage : request.getMessages()) {
                    switch (chatMessage.getRole()) {
                        case "system":
                            springAiMessages.add(new SystemMessage(chatMessage.getContent()));
                            break;
                        case "user":
                            springAiMessages.add(new UserMessage(chatMessage.getContent()));
                            break;
                        case "assistant":
                            springAiMessages.add(new AssistantMessage(chatMessage.getContent()));
                            break;
                    }
                }
                
                // 使用 Prompt 包装消息列表
                Prompt prompt = new Prompt(springAiMessages);

                log.info("📤 Calling Ollama model stream...");

                // 流式处理响应并实时发送给客户端
                ollamaChatModel.stream(prompt)
                        .doOnSubscribe(subscription -> {
                            log.info("✅ Stream subscribed for session: {}", sessionId);
                        })
                        .map(ChatResponse::getResult)
                        .map(Generation::getOutput)
                        .map(AssistantMessage::getText)
                        .doOnNext(text -> {
                            log.info("📨 Sending chunk to client, length: {}", text.length());
                            // 将每个文本片段发送到客户端
                            messagingTemplate.convertAndSend(
                                    "/queue/chat.response." + sessionId,
                                    text
                            );
                            log.info("✅ Chunk sent to: /queue/chat.response.{}", sessionId);
                        })
                        .doOnComplete(() -> {
                            log.info("✅ Stream completed for session: {}", sessionId);
                            // 流完成时发送结束标记
                            messagingTemplate.convertAndSend(
                                    "/queue/chat.complete." + sessionId,
                                    "[DONE]"
                            );
                            log.info("✅ Completion message sent");
                        })
                        .doOnError(error -> {
                            log.error("❌ Stream error for session: {}", sessionId, error);
                            // 发生错误时发送错误消息
                            messagingTemplate.convertAndSend(
                                    "/queue/chat.error." + sessionId,
                                    "Error: " + error.getMessage()
                            );
                        })
                        .subscribe();
                        
            } catch (Exception e) {
                log.error("Error processing chat completion request", e);
                // 发送错误消息到客户端
                messagingTemplate.convertAndSend(
                        "/queue/chat.error." + sessionId,
                        "Error: " + e.getMessage()
                );
            }
        });
    }

    /**
     * 处理简单的聊天请求（非流式）
     */
    @MessageMapping("/chat/send")
    public void handleSimpleChat(@Payload ChatMessage message) {
        log.info("Received simple chat message: {}", message);
        // 可以在这里添加简单的聊天逻辑
    }
}
