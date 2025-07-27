package com.tdf.controller;

import com.tdf.dto.ChatCompletionRequest;
import com.tdf.dto.ChatMessage;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.ollama.OllamaChatModel;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api")
public class ChatController {

    @Resource
    private OllamaChatModel ollamaChatModel;


    @PostMapping(path = "/chat/completions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<Flux<String>> chatComplete(@RequestBody ChatCompletionRequest request){
        try {
            // 获取消息列表中的最后一条用户消息
            List<ChatMessage> messages = request.getMessages();
            String latestUserMessage = messages.stream()
                    .filter(msg -> "user".equals(msg.getRole()))
                    .reduce((first, second) -> second)
                    .orElse(new ChatMessage())
                    .getContent();
            // 调用 ChatClient 生成响应，并以 Flux<String>（响应流）形式返回
            Flux<String> response = ollamaChatModel.stream(new UserMessage(latestUserMessage));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing chat completion request", e);
            return ResponseEntity.badRequest().body(Flux.just("Error: " + e.getMessage()));
        }
    }
}
