---
name: streaming-api
description: Stream LLM responses in real-time with Koog's Flow-based streaming API and StreamFrame types
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [streaming, flow, stream-frame, text-delta, tool-call-delta, real-time, markdown-parser]
---

# Streaming API

Koog provides a Flow-based streaming API for real-time LLM response processing. This enables token-by-token output, structured event handling, and markdown parsing for rich streaming experiences.

## Overview

Streaming API features:

- **Flow-based streaming** — Kotlin `Flow<StreamFrame>` for reactive processing
- **Java interop** — `Flow.Publisher<StreamFrame>` for Java consumers
- **Typed frame types** — Text, tool calls, reasoning, and completion frames
- **Helper methods** — Filter, collect, and transform streams easily
- **Markdown parser** — Parse streaming markdown into structured elements
- **Event handler integration** — Combine with EventHandler for comprehensive monitoring

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
}
```

## Basic Streaming

### Kotlin

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.stream.StreamFrame
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

suspend fun main() {
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o
    )

    // Stream the response
    agent.runStreaming("Tell me a story about a robot").collect { frame ->
        when (frame) {
            is StreamFrame.TextDelta -> print(frame.text)
            is StreamFrame.TextComplete -> println("\n[Complete]")
            else -> {}
        }
    }
}
```

### Java

```java
import ai.koog.agents.core.stream.StreamFrame;
import org.reactivestreams.Flow;

var agent = AIAgent.builder(executor, model).build();

Flow.Publisher<StreamFrame> stream = agent.runStreamingPublisher("Tell me a story");

stream.subscribe(new Flow.Subscriber<>() {
    public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
    public void onNext(StreamFrame frame) {
        if (frame instanceof StreamFrame.TextDelta) {
            System.out.print(((StreamFrame.TextDelta) frame).getText());
        }
    }
    public void onError(Throwable t) { t.printStackTrace(); }
    public void onComplete() { System.out.println("\n[Complete]"); }
});
```

## StreamFrame Types

### TextDelta

Incremental text content:

```kotlin
is StreamFrame.TextDelta -> {
    val text: String = frame.text
    print(text) // Real-time text output
}
```

### ReasoningDelta

Incremental reasoning/thinking content:

```kotlin
is StreamFrame.ReasoningDelta -> {
    val reasoning: String = frame.text
    println("[Thinking] $reasoning")
}
```

### ToolCallDelta

Incremental tool call information:

```kotlin
is StreamFrame.ToolCallDelta -> {
    val name: String = frame.name
    val arguments: String = frame.arguments
    println("[Tool Call] $name: $arguments")
}
```

### TextComplete

Final complete text:

```kotlin
is StreamFrame.TextComplete -> {
    val fullText: String = frame.text
    println("\n[Text Complete] ${fullText.length} characters")
}
```

### ReasoningComplete

Final complete reasoning:

```kotlin
is StreamFrame.ReasoningComplete -> {
    val fullReasoning: String = frame.text
    println("\n[Reasoning Complete] $fullReasoning")
}
```

### ToolCallComplete

Completed tool call:

```kotlin
is StreamFrame.ToolCallComplete -> {
    val name: String = frame.name
    val arguments: String = frame.arguments
    val result: String? = frame.result
    println("[Tool Complete] $name -> $result")
}
```

### End

Stream termination signal:

```kotlin
is StreamFrame.End -> {
    println("[Stream End]")
}
```

## Helper Methods

### filterTextOnly

Filter to only text-related frames:

```kotlin
agent.runStreaming("Tell me a story")
    .filterTextOnly() // Only TextDelta and TextComplete
    .collect { frame ->
        when (frame) {
            is StreamFrame.TextDelta -> print(frame.text)
            is StreamFrame.TextComplete -> println("\n[Done]")
            else -> {}
        }
    }
```

### collectText

Collect all text into a single string:

```kotlin
val fullText = agent.runStreaming("Tell me a story")
    .collectText() // Returns String

println(fullText)
```

### toAssistantMessageOrNull

Convert stream to an assistant message:

```kotlin
val message = agent.runStreaming("Tell me a story")
    .toAssistantMessageOrNull()

if (message != null) {
    println("Role: ${message.role}")
    println("Content: ${message.content}")
}
```

### toToolCallMessages

Extract tool call messages from the stream:

```kotlin
val toolCalls = agent.runStreaming("Search for weather in Paris")
    .toToolCallMessages()

for (call in toolCalls) {
    println("Tool: ${call.name}")
    println("Args: ${call.arguments}")
    println("Result: ${call.result}")
}
```

## Markdown Streaming Parser

Parse streaming markdown into structured elements:

```kotlin
import ai.koog.agents.core.stream.markdown.MarkdownStructureDefinition
import ai.koog.agents.core.stream.markdown.markdownStreamingParser

val parser = markdownStreamingParser()

agent.runStreaming("Write a blog post about Kotlin")
    .collect { frame ->
        parser.processFrame(frame)
    }

// Get parsed markdown structure
val structure = parser.getStructure()

for (element in structure.elements) {
    when (element) {
        is MarkdownElement.Heading -> println("H${element.level}: ${element.text}")
        is MarkdownElement.Paragraph -> println("P: ${element.text}")
        is MarkdownElement.CodeBlock -> println("Code (${element.language}): ${element.code}")
        is MarkdownElement.List -> println("List: ${element.items}")
        is MarkdownElement.Table -> println("Table: ${element.rows}")
    }
}
```

### MarkdownStructureDefinition

Define custom markdown structures:

```kotlin
import ai.koog.agents.core.stream.markdown.MarkdownStructureDefinition

val customStructure = MarkdownStructureDefinition(
    headings = true,
    codeBlocks = true,
    lists = true,
    tables = true,
    links = true,
    images = true,
    blockquotes = true
)

val parser = markdownStreamingParser(customStructure)
```

## Event Handler Integration

### onLLMStreamingFrameReceived

```kotlin
import ai.koog.agents.core.feature.EventHandler

install(EventHandler) {
    handleEvents {
        onLLMStreamingFrameReceived { frame ->
            when (frame) {
                is StreamFrame.TextDelta -> {
                    // Real-time text processing
                    ui.appendText(frame.text)
                }
                is StreamFrame.ToolCallDelta -> {
                    ui.showToolCall(frame.name, frame.arguments)
                }
                is StreamFrame.ReasoningDelta -> {
                    ui.showReasoning(frame.text)
                }
                else -> {}
            }
        }
    }
}
```

### onLLMStreamingCompleted

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMStreamingCompleted { context ->
            println("Streaming completed")
            println("Total frames: ${context.frameCount}")
            println("Duration: ${context.duration}ms")
        }
    }
}
```

### onLLMStreamingFailed

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMStreamingFailed { context ->
            println("Streaming failed: ${context.error.message}")
            // Implement fallback
            fallbackToNonStreaming()
        }
    }
}
```

## Complete Streaming Example

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.stream.StreamFrame
import ai.koog.agents.core.stream.collectText
import ai.koog.agents.core.stream.filterTextOnly
import ai.koog.agents.core.stream.markdown.markdownStreamingParser
import ai.koog.agents.core.feature.EventHandler
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

suspend fun main() {
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
        llmModel = OpenAIModels.Chat.GPT4o
    ) {
        install(EventHandler) {
            handleEvents {
                onLLMStreamingFrameReceived { frame ->
                    when (frame) {
                        is StreamFrame.TextDelta -> print(frame.text)
                        is StreamFrame.ReasoningDelta -> print("[THINK] ${frame.text}")
                        is StreamFrame.ToolCallDelta -> print("[TOOL] ${frame.name}")
                        else -> {}
                    }
                }
                onLLMStreamingCompleted { ctx ->
                    println("\n[Done in ${ctx.duration}ms]")
                }
                onLLMStreamingFailed { ctx ->
                    println("\n[Error: ${ctx.error.message}]")
                }
            }
        }
    }

    // Simple text streaming
    println("=== Text Streaming ===")
    val text = agent.runStreaming("Explain quantum computing in simple terms")
        .collectText()
    println("\nFull text: ${text.length} characters")

    // Markdown streaming
    println("\n=== Markdown Streaming ===")
    val parser = markdownStreamingParser()
    agent.runStreaming("Write a tutorial on Kotlin coroutines")
        .collect { frame ->
            parser.processFrame(frame)
        }

    val structure = parser.getStructure()
    println("Parsed ${structure.elements.size} markdown elements")

    // Filtered streaming
    println("\n=== Filtered Streaming ===")
    agent.runStreaming("List 5 benefits of exercise")
        .filterTextOnly()
        .collect { frame ->
            when (frame) {
                is StreamFrame.TextDelta -> print(frame.text)
                is StreamFrame.TextComplete -> println("\n[Complete]")
                else -> {}
            }
        }
}
```

## Java API

```java
import ai.koog.agents.core.stream.StreamFrame;
import ai.koog.agents.core.stream.StreamHelpersKt;

// Collect text
String text = StreamHelpersKt.collectText(agent.runStreamingPublisher("Hello"));

// Filter text only
agent.runStreamingPublisher("Hello")
    .filter(f -> f instanceof StreamFrame.TextDelta || f instanceof StreamFrame.TextComplete)
    .subscribe(frame -> {
        if (frame instanceof StreamFrame.TextDelta) {
            System.out.print(((StreamFrame.TextDelta) frame).getText());
        }
    });
```

## Best Practices

1. **Use `collectText` for simple cases** — When you only need the final text
2. **Use `filterTextOnly` for UI** — Filter out tool calls and reasoning for clean output
3. **Handle `End` frame** — Always handle the `End` frame for proper cleanup
4. **Buffer for UI** — Buffer small deltas before updating UI to reduce redraws
5. **Combine with EventHandler** — Use EventHandler for monitoring, Flow for processing
6. **Test error cases** — Ensure your streaming code handles failures gracefully

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No frames received | Ensure the model supports streaming (most do) |
| Frames out of order | Frames are ordered; check your processing logic |
| Missing text | Use `collectText()` to aggregate all text frames |
| Tool call incomplete | Wait for `ToolCallComplete` frame before processing |
| Stream never ends | Check for `End` frame; add timeout as safety measure |
