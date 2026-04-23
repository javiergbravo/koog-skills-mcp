---
name: creating-prompts
description: Create prompts using Koog's prompt builder DSL with system, user, and assistant messages
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [prompt, builder, dsl, system, user, assistant, message]
---

# Creating Prompts

Create prompts using Koog's type-safe DSL. Prompts are instances of the `Prompt` data class with an `id`, a list of `messages`, and optional `params` for LLM configuration.

## Prompt Structure

| Property | Type | Description |
|----------|------|-------------|
| `id` | `String` | Unique identifier for the prompt |
| `messages` | `List<Message>` | Messages representing the conversation with the LLM |
| `params` | `LLMParams?` | Optional LLM configuration (temperature, tool choice, etc.) |

## Kotlin DSL

The recommended way to create prompts:

```kotlin
import ai.koog.prompt.dsl.prompt

val myPrompt = prompt("hello-koog") {
    system("You are a helpful assistant.")
    user("What is Koog?")
}
```

### Message Types

```kotlin
val conversationPrompt = prompt("conversation") {
    system("You are a senior Kotlin developer.")

    // First exchange
    user("What is a sealed class?")
    assistant("A sealed class is a class that restricts inheritance...")

    // Follow-up
    user("Can you give me an example?")
}
```

### Tool Calls and Results

```kotlin
val toolPrompt = prompt("with-tools") {
    system("You are a helpful assistant with access to tools.")
    user("What's the weather in Madrid?")

    // Tool call from the LLM
    toolCall(
        id = "call_123",
        name = "get_weather",
        arguments = """{"city": "Madrid"}"""
    )

    // Tool result
    toolResult(
        callId = "call_123",
        name = "get_weather",
        content = """{"temperature": 22, "condition": "sunny"}"""
    )
}
```

## Java Builder API

The Java equivalent uses a builder pattern:

```java
import ai.koog.prompt.dsl.Prompt;

var myPrompt = Prompt.builder("hello-koog")
    .system("You are a helpful assistant.")
    .user("What is Koog?")
    .build();
```

### Java Message Types

```java
var conversationPrompt = Prompt.builder("conversation")
    .system("You are a senior Kotlin developer.")
    .user("What is a sealed class?")
    .assistant("A sealed class is a class that restricts inheritance...")
    .user("Can you give me an example?")
    .build();
```

## Prompt Parameters

Configure LLM behavior with optional parameters:

```kotlin
val configuredPrompt = prompt("creative") {
    system("You are a creative writer.")
    user("Write a short story about a robot.")
    params {
        temperature = 0.9
        maxTokens = 500
    }
}
```

## Text-to-Prompt Auto-Conversion

Agents automatically convert plain text into a `Prompt` object. This is useful for basic agents that only need a single request:

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    systemPrompt = "You are a helpful assistant.",
    llmModel = OpenAIModels.Chat.GPT4o
)

// Plain text is auto-converted to a Prompt
val result = agent.run("What is Koog?")
```

## Prompt with Attachments (Multimodal)

```kotlin
import ai.koog.prompt.dsl.prompt

val imagePrompt = prompt("image-analysis") {
    system("You are an image analysis assistant.")
    user {
        text("What's in this image?")
        image(Path("/path/to/photo.jpg"))
    }
}
```

See [multimodal SKILL](../multimodal/SKILL.md) for full details on images, audio, video, and file attachments.

## Named Prompts for Reuse

```kotlin
object Prompts {
    fun codeReview(language: String) = prompt("code-review") {
        system("You are a senior $language developer. Review code for best practices.")
        user("Review this code:")
    }

    fun summarize(style: String) = prompt("summarize") {
        system("Summarize content in a $style style.")
    }

    fun translate(targetLanguage: String) = prompt("translate") {
        system("You are a professional translator.")
        user("Translate to $targetLanguage:")
    }
}

// Use named prompts
val reviewPrompt = Prompts.codeReview("Kotlin")
val summaryPrompt = Prompts.summarize("concise")
```

## Dynamic Prompt Construction

```kotlin
fun buildRAGPrompt(question: String, context: List<String>) = prompt("rag") {
    system("""
        Answer questions based on the provided context.
        If the context doesn't contain the answer, say so.
    """.trimIndent())

    user {
        text("Context:")
        context.forEach { doc ->
            text("- $doc")
        }
        text("\nQuestion: $question")
    }
}

// Use with vector search results
val context = vectorStore.search(question, limit = 5)
    .map { it.document.content }
val ragPrompt = buildRAGPrompt(question, context)
val answer = promptExecutor.execute(ragPrompt, model)
```

## System Prompt Best Practices

```kotlin
val agentPrompt = prompt("agent-prompt") {
    system("""
        You are a customer support agent for TechCorp.

        ## Rules
        - Always be polite and professional
        - Never share internal company information
        - Escalate complex issues to human support
        - Use the provided tools to look up information

        ## Response Format
        - Greet the customer
        - Address their concern
        - Provide a solution or next steps
        - Ask if they need anything else
    """.trimIndent())

    user("I need help with my order")
}
```

## Prompt Lifecycle in Agents

Agents maintain and manage prompts during their lifecycle in four stages:

1. **Initial Setup**: System message defines behavior; user message from `run()` forms the initial prompt
2. **Automatic Updates**: Predefined nodes (`nodeLLMRequest`, `nodeLLMSendToolResult`, `nodeAppendPrompt`) update the prompt during strategy execution
3. **Context Window Management**: History compression helps avoid exceeding the LLM context window
4. **Manual Management**: LLM sessions allow direct `Prompt` object manipulation via `llm.writeSession`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Empty response | Ensure the prompt has at least one `user` message |
| Context window exceeded | Use history compression or reduce prompt size |
| Tool calls not working | Ensure tools are registered in the `ToolRegistry` |
| Prompt not updating | Check that strategy nodes are properly connected |
