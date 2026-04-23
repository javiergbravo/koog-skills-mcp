---
name: key-features
description: "Overview of Koog's key features: multiplatform, reliability, memory, MCP, streaming, and enterprise integrations"
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [features, multiplatform, reliability, memory, mcp, streaming, observability]
---

# Key Features

Koog is a Kotlin-first AI agent framework designed for production use. Here are the core capabilities that make it stand out.

## Cross-Platform Support

Koog compiles and runs on all major platforms via Kotlin Multiplatform:

| Platform | Status | Notes |
|----------|--------|-------|
| JVM | Supported | Primary target, full feature set |
| JavaScript (Node/Browser) | Supported | Via Kotlin/JS |
| WebAssembly (WasmJS) | Supported | Via Kotlin/Wasm |
| Android | Supported | Full integration with Android ecosystem |
| iOS | Supported | Via Kotlin/Native |

This means you can write agent logic once and deploy it across server, mobile, and web.

## Reliability

Koog provides built-in resilience patterns for production environments:

- **Automatic retries** with configurable strategies (exponential backoff, fixed delay)
- **Persistence** — Agent state can be persisted and resumed across restarts
- **Error handling** — Structured error types and graceful degradation
- **Rate limiting** — Built-in support for provider rate limits

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    retryStrategy = RetryStrategy.exponential(maxRetries = 3)
)
```

## History Compression

Long conversations can exceed context windows. Koog provides automatic history compression:

- **Token-aware truncation** — Keeps the most relevant messages
- **Summarization** — Compresses old messages into summaries
- **Sliding window** — Configurable window size for message history

## Enterprise Integrations

### Ktor

Native Ktor integration for server-side agent hosting:

```kotlin
fun Application.agentModule() {
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o
    )

    routing {
        post("/chat") {
            val message = call.receiveText()
            val response = agent.run(message)
            call.respondText(response)
        }
    }
}
```

### Spring Boot

Seamless Spring Boot integration with auto-configuration and dependency injection support.

## Observability

Full observability stack for monitoring agent behavior:

| Tool | Integration |
|------|-------------|
| **OpenTelemetry** | Distributed tracing, metrics, and logging |
| **Langfuse** | LLM-specific observability and analytics |
| **Weave** | Experiment tracking and model evaluation |

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(OpenTelemetry) {
        endpoint = "http://localhost:4317"
    }
}
```

## LLM Flexibility

Switch between LLM providers at any point — even mid-conversation:

```kotlin
// Start with GPT-4o
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(openAiKey),
    llmModel = OpenAIModels.Chat.GPT4o
)

// Switch to Claude mid-conversation
agent.switchModel(simpleAnthropicExecutor(anthropicKey), AnthropicModels.Sonnet_4)
```

Supports 8 providers: OpenAI, Anthropic, Google AI, DeepSeek, OpenRouter, AWS Bedrock, Mistral AI, and Ollama.

## MCP (Model Context Protocol) Support

Koog has first-class support for the Model Context Protocol:

- **MCP clients** — Connect to external MCP servers
- **MCP servers** — Expose your tools via MCP
- **Dynamic tool discovery** — Automatically discover and register tools from MCP servers

```kotlin
val mcpClient = MCPClient("http://localhost:3000")
val tools = mcpClient.discoverTools()
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    toolRegistry = ToolRegistry { tools.forEach { tool(it) } }
)
```

## Knowledge Retrieval & Memory

Build agents with persistent knowledge and memory:

- **Vector stores** — Embed and retrieve documents semantically
- **RAG pipelines** — Retrieval-Augmented Generation out of the box
- **Conversation memory** — Long-term memory across sessions
- **Custom memory backends** — Pluggable storage for memory persistence

## Streaming API

Stream responses in real-time for better user experience:

```kotlin
agent.runStreaming("Tell me a story") { chunk ->
    print(chunk) // Process each token as it arrives
}
```

- Token-by-token streaming
- Structured event streaming (tool calls, reasoning steps)
- Cancellable streams

## Modular Feature System

Extend Koog with composable features:

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(Tracing)
    install(Persistence)
    install(RateLimiter) {
        maxRequestsPerMinute = 60
    }
}
```

Features are modular — include only what you need.

## Graph-Based Workflows

Define complex agent behaviors as directed graphs:

```kotlin
val strategy = strategy("my-workflow") {
    val start by nodeLLMRequest()
    val process by nodeExecuteTool()
    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo start)
    edge(start forwardTo process onToolCall { true })
    edge(process forwardTo respond onAssistantMessage { true })
    edge(respond forwardTo nodeFinish)
}
```

See **[Graph-Based Agents](../../agents/graph-based-agents/SKILL.md)** for details.

## Custom Tools

Create tools using annotations, classes, or compose agents as tools:

```kotlin
@Tool
@LLMDescription("Search the web for information")
suspend fun webSearch(@LLMDescription("The search query") query: String): String {
    // Implementation
    return "Search results for: $query"
}
```

See **[Tools Overview](../../tools/overview/SKILL.md)** for all tool patterns.

## Tracing & Debugging

Built-in tracing for understanding agent behavior:

- Step-by-step execution traces
- Tool call logging with inputs/outputs
- LLM prompt/response logging
- Visual graph execution tracking
