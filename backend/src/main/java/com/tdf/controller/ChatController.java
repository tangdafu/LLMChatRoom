package com.tdf.controller;

import com.tdf.dto.ChatCompletionRequest;
import com.tdf.dto.ChatMessage;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.Arrays;
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
            // 将所有消息转换为Spring AI的Message对象
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
            
            // 使用Prompt包装消息列表，然后传递给OllamaChatModel
            Prompt prompt = new Prompt(springAiMessages);

            // 调用 ChatClient 生成响应，并以 Flux<String>（响应流）形式返回
            Flux<String> response = ollamaChatModel.stream(prompt)
                    .map(ChatResponse::getResult)
                    .map(Generation::getOutput)
                    .map(AssistantMessage::getText);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing chat completion request", e);
            return ResponseEntity.badRequest().body(Flux.just("Error: " + e.getMessage()));
        }
    }
}