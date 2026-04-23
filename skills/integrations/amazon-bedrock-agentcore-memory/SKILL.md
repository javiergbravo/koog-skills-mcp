---
title: Amazon Bedrock AgentCore Memory Integration
description: Integrate and manage conversation state using Amazon Bedrock AgentCore Memory within the Koog framework.
tags: [amazon, bedrock, agentcore, memory, integration]
koog_version: "0.8.0"
difficulty: Intermediate
category: Integrations
---

## Overview

The Amazon Bedrock AgentCore Memory integration allows developers to manage conversation state effectively using the `ChatHistoryProvider`. This feature provides a robust mechanism for persisting and retrieving chat history, enabling seamless interactions in applications powered by the Koog framework.

## Code Examples

### Setting Up the ChatHistoryProvider

To use the Amazon Bedrock AgentCore Memory, you first need to set up the `ChatHistoryProvider`. Below is an example of how to initialize it in your application:

```kotlin
import ai.koog.memory.ChatHistoryProvider
import ai.koog.memory.bedrock.BedrockChatHistoryProvider

fun main() {
    val chatHistoryProvider: ChatHistoryProvider = BedrockChatHistoryProvider()
    
    // Example of saving a chat message
    chatHistoryProvider.saveMessage("user123", "Hello, how can I help you?")
    
    // Example of retrieving chat history
    val history = chatHistoryProvider.getHistory("user123")
    println(history)
}
```

### Using the ChatHistoryProvider in an Agent

You can integrate the `ChatHistoryProvider` into your AI agent to maintain conversation context:

```kotlin
import ai.koog.agent.AIAgent
import ai.koog.memory.ChatHistoryProvider

class MyChatAgent(private val chatHistoryProvider: ChatHistoryProvider) : AIAgent() {
    
    fun respondToUser(userId: String, userMessage: String): String {
        // Save the user's message
        chatHistoryProvider.saveMessage(userId, userMessage)
        
        // Generate a response (this is a placeholder for actual LLM logic)
        val response = "This is a response to: $userMessage"
        
        // Save the agent's response
        chatHistoryProvider.saveMessage(userId, response)
        
        return response
    }
}

// Usage
val agent = MyChatAgent(BedrockChatHistoryProvider())
val response = agent.respondToUser("user123", "What is the weather today?")
println(response)
```

## Key Concepts

- **ChatHistoryProvider**: An interface for managing chat history. The Amazon Bedrock implementation allows for efficient storage and retrieval of conversation states.
- **Persistence**: The integration ensures that conversation history is preserved across sessions, enabling a more coherent user experience.
- **Seamless Integration**: The Amazon Bedrock AgentCore Memory can be easily integrated into existing Koog applications, enhancing their capabilities without significant overhead.