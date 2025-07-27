package com.tdf.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatCompletionRequest {
    private String model;
    private List<ChatMessage> messages;
    private boolean stream = false;
}