---
name: chat-memory
description: Implement multi-turn conversation history with Koog's ChatMemory feature, ChatHistoryProvider, and preprocessors
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [chat-memory, conversation, history, session, window-size, filter, chat-history-provider]
---

# Chat Memory

Implement multi-turn conversation history in Koog agents using the `ChatMemory` feature. This enables agents to remember previous messages across interactions using session IDs.

## Dependency

Add the chat memory feature module to your build:

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-features-memory:0.8.0")
}
```

### Gradle (Groovy DSL)

```groovy
dependencies {
    implementation 'ai.koog:koog-agents:0.8.0'
    implementation 'ai.koog:agents-features-memory:0.8.0'
}
```

### Maven

```xml
<dependency>
    <groupId>ai.koog</groupId>
    <artifactId>agents-features-memory-jvm</artifactId>
    <version>0.8.0</version>
</dependency>
```

## Installation

Install `ChatMemory` inside the agent configuration block:

### Kotlin

```kotlin
import ai.koog.agents.memory.feature.ChatMemory

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a helpful assistant."
) {
    install(ChatMemory) {
        windowSize(20) // keep only the last 20 messages
    }
}
```

### Java

```java
AIAgent<String, String> agent = AIAgent.builder()
    .promptExecutor(simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")))
    .llmModel(OpenAIModels.Chat.GPT4o)
    .systemPrompt("You are a helpful assistant.")
    .install(ChatMemory.Feature, config -> {
        config.windowSize(20); // keep only the last 20 messages
    })
    .build();
```

## Session IDs

The second argument to `agent.run()` is the session ID that identifies and differentiates conversations:

```kotlin
val sessionId = "my-conversation"

// First interaction
val reply1 = agent.run("My name is Alice", sessionId)

// Second interaction — agent remembers the name
val reply2 = agent.run("What's my name?", sessionId)
// => "Your name is Alice!"
```

In production, assign unique session IDs per user or conversation to keep histories separate.

## Preprocessors

### Window Size

The `windowSize(n)` preprocessor limits the stored history to the `n` most recent messages. Without this, the prompt size can grow beyond the LLM context limit:

```kotlin
install(ChatMemory) {
    windowSize(20) // keep only the last 20 messages
}
```

### Filter Messages

Use `filterMessages` to selectively include or exclude messages from history:

```kotlin
install(ChatMemory) {
    filterMessages { messages ->
        messages.filter { it.role != Message.Role.System }
    }
}
```

### Custom ChatMemoryPreProcessor

Implement the `ChatMemoryPreProcessor` interface for full control over history preprocessing:

```kotlin
class SummarizingPreProcessor : ChatMemoryPreProcessor {
    override fun preprocess(messages: List<Message>): List<Message> {
        // Custom logic: summarize old messages, keep recent ones intact
        val recent = messages.takeLast(10)
        val older = messages.dropLast(10)
        val summary = summarizeMessages(older)
        return listOf(Message.System(summary)) + recent
    }
}

install(ChatMemory) {
    addPreProcessor(SummarizingPreProcessor())
}
```

## ChatHistoryProvider

By default, the agent uses an in-memory history provider. The history is lost when the application exits. For production, implement a custom `ChatHistoryProvider` to persist history in a database or file:

```kotlin
class DatabaseChatHistoryProvider(
    private val database: MyDatabase
) : ChatHistoryProvider {
    override suspend fun store(conversationId: String, messages: List<Message>) {
        database.saveMessages(conversationId, messages)
    }

    override suspend fun load(conversationId: String): List<Message> {
        return database.getMessages(conversationId)
    }
}

install(ChatMemory) {
    historyProvider = DatabaseChatHistoryProvider(myDatabase)
    windowSize(50)
}
```

## Full Interactive Example

### Kotlin

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.memory.feature.ChatMemory

suspend fun main() {
    val sessionId = "my-conversation"
    simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")).use { executor ->
        val agent = AIAgent(
            promptExecutor = executor,
            llmModel = OpenAIModels.Chat.GPT4o,
            systemPrompt = "You are a helpful assistant."
        ) {
            install(ChatMemory) {
                windowSize(20)
            }
        }
        while (true) {
            print("You: ")
            val input = readln().trim()
            if (input == "/bye") break
            if (input.isEmpty()) continue
            val reply = agent.run(input, sessionId)
            println("Assistant: $reply\n")
        }
    }
}
```

### Java

```java
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;
import ai.koog.agents.memory.feature.ChatMemory;

import java.util.Scanner;

public class ChatMemoryExample {
    public static void main(String[] args) {
        String sessionId = "my-conversation";
        try (var executor = SimpleOpenAIExecutorKt.simpleOpenAIExecutor(
                System.getenv("OPENAI_API_KEY"))) {
            AIAgent<String, String> agent = AIAgent.builder()
                .promptExecutor(executor)
                .llmModel(OpenAIModels.Chat.GPT4o)
                .systemPrompt("You are a helpful assistant.")
                .install(ChatMemory.Feature, config -> {
                    config.windowSize(20);
                })
                .build();
            Scanner scanner = new Scanner(System.in);
            while (true) {
                System.out.print("You: ");
                String input = scanner.nextLine().trim();
                if (input.equals("/bye")) break;
                if (input.isEmpty()) continue;
                String reply = agent.run(input, sessionId);
                System.out.println("Assistant: " + reply + "\n");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## How It Works

1. User provides input via `agent.run(input, sessionId)`
2. `ChatMemory` loads previous history for the given session ID
3. History messages are added to the prompt (preprocessed by window size / filters)
4. The LLM processes the enriched prompt
5. Before returning, the agent saves the full history under the session ID (limited by window size)

## ChatMemory vs AgentMemory vs LongTermMemory

| Feature | Scope | Data Type | Persistence | Use Case |
|---------|-------|-----------|-------------|----------|
| **ChatMemory** | Per-session conversation history | Messages | Session-scoped (in-memory or custom provider) | Multi-turn chat continuity |
| **AgentMemory** | Cross-conversation facts | Facts, Concepts, Subjects | File-based or custom provider | User preferences, personalization |
| **LongTermMemory** | Cross-session knowledge | Documents, records | Vector store | RAG, knowledge retrieval |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| History not persisting across app restarts | Implement a custom `ChatHistoryProvider` backed by a database |
| Context window exceeded | Reduce `windowSize()` or add a `filterMessages` preprocessor |
| Session leaking between users | Use unique session IDs per user/conversation |
| Old messages not forgotten | Ensure `windowSize()` is configured; otherwise all messages are kept |