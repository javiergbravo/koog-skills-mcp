---
name: spring-boot-integration
description: Integrate Koog AI agents with Spring Boot using the koog-spring-boot-starter for auto-configuration
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [spring-boot, starter, auto-configuration, dependency-injection, enterprise]
---

# Spring Boot Integration

The `koog-spring-boot-starter` provides auto-configuration for integrating Koog AI agents into Spring Boot applications. It handles dependency injection, configuration, and lifecycle management automatically.

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:koog-spring-boot-starter:0.8.0")
    implementation("org.springframework.boot:spring-boot-starter-web:3.4.4")
}
```

## Auto-Configuration

The starter automatically configures:

- `AIAgent` bean with settings from `application.yml`
- `PromptExecutor` for the configured LLM provider
- `ToolRegistry` with all registered tools
- Health indicators for agent status

### application.yml

```yaml
koog:
  agent:
    model: gpt-4o
    provider: openai
    system-prompt: "You are a helpful assistant."
    max-retries: 3
  tools:
    enabled: true
    scan-packages:
      - com.example.tools
```

### application.properties

```properties
koog.agent.model=gpt-4o
koog.agent.provider=openai
koog.agent.system-prompt=You are a helpful assistant.
koog.agent.max-retries=3
koog.tools.enabled=true
koog.tools.scan-packages=com.example.tools
```

## Basic Usage

### Auto-Configured Agent

```kotlin
import ai.koog.agents.core.agent.AIAgent
import org.springframework.web.bind.annotation.*
import org.springframework.stereotype.Service

@Service
class ChatService(private val agent: AIAgent) {
    suspend fun chat(message: String): String {
        return agent.run(message)
    }
}

@RestController
@RequestMapping("/api/chat")
class ChatController(private val chatService: ChatService) {
    @PostMapping
    suspend fun chat(@RequestBody request: ChatRequest): ChatResponse {
        val reply = chatService.chat(request.message)
        return ChatResponse(reply)
    }
}

data class ChatRequest(val message: String)
data class ChatResponse(val reply: String)
```

### Custom Agent Configuration

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class AgentConfig {
    @Bean
    fun codeReviewAgent(): AIAgent {
        return AIAgent(
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
            llmModel = OpenAIModels.Chat.GPT4o,
            systemPrompt = "You are a senior code reviewer. Analyze code for bugs, security issues, and best practices."
        )
    }

    @Bean
    fun translationAgent(): AIAgent {
        return AIAgent(
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
            llmModel = OpenAIModels.Chat.GPT4oMini,
            systemPrompt = "You are a professional translator. Translate text accurately."
        )
    }
}
```

## Spring AI Integration Starters

Koog provides additional starters for Spring AI integration:

### Chat Memory

```kotlin
dependencies {
    implementation("ai.koog:koog-spring-ai-chat-memory:0.8.0")
}
```

```kotlin
import ai.koog.agents.spring.memory.ChatMemoryService

@Service
class PersistentChatService(
    private val agent: AIAgent,
    private val chatMemory: ChatMemoryService
) {
    suspend fun chat(conversationId: String, message: String): String {
        // Load conversation history
        val history = chatMemory.getHistory(conversationId)

        // Run agent with history context
        val response = agent.run(message, context = history)

        // Save to memory
        chatMemory.save(conversationId, message, response)

        return response
    }
}
```

### Model Chat

```kotlin
dependencies {
    implementation("ai.koog:koog-spring-ai-model-chat:0.8.0")
}
```

```kotlin
import ai.koog.agents.spring.chat.ModelChatService

@Service
class ChatService(private val modelChat: ModelChatService) {
    suspend fun chat(message: String): String {
        return modelChat.complete(message)
    }
}
```

### Model Embedding

```kotlin
dependencies {
    implementation("ai.koog:koog-spring-ai-model-embedding:0.8.0")
}
```

```kotlin
import ai.koog.agents.spring.embedding.EmbeddingService

@Service
class SemanticSearchService(private val embeddingService: EmbeddingService) {
    suspend fun search(query: String, documents: List<String>): List<String> {
        val queryEmbedding = embeddingService.embed(query)
        val docEmbeddings = documents.map { it to embeddingService.embed(it) }

        return docEmbeddings
            .sortedByDescending { cosineSimilarity(queryEmbedding, it.second) }
            .take(5)
            .map { it.first }
    }
}
```

### Vector Store

```kotlin
dependencies {
    implementation("ai.koog:koog-spring-ai-vector-store:0.8.0")
}
```

```kotlin
import ai.koog.agents.spring.vector.VectorStoreService

@Service
class KnowledgeBaseService(private val vectorStore: VectorStoreService) {
    suspend fun indexDocument(id: String, content: String) {
        vectorStore.store(id, content)
    }

    suspend fun query(question: String, topK: Int = 5): List<String> {
        return vectorStore.search(question, topK)
    }
}
```

## Tool Registration

### Annotation-Based Tools

```kotlin
import ai.koog.agents.core.tools.annotation.Tool
import ai.koog.agents.core.tools.annotation.LLMDescription
import org.springframework.stereotype.Component

@Component
class WeatherTool {
    @Tool
    @LLMDescription("Get the current weather for a location")
    suspend fun getWeather(
        @LLMDescription("City name") city: String
    ): String {
        return "Sunny, 22°C in $city"
    }
}
```

### Class-Based Tools

```kotlin
import ai.koog.agents.core.tools.Tool
import ai.koog.agents.core.tools.ToolDescriptor
import org.springframework.stereotype.Component

@Component
class DatabaseQueryTool(private val jdbcTemplate: JdbcTemplate) : Tool<DatabaseQueryTool.Input, DatabaseQueryTool.Output> {
    data class Input(val query: String)
    data class Output(val results: List<Map<String, Any>>)

    override val descriptor = ToolDescriptor(
        name = "database_query",
        description = "Execute a read-only SQL query"
    )

    override suspend fun execute(input: Input): Output {
        val results = jdbcTemplate.queryForList(input.query)
        return Output(results)
    }
}
```

## WebFlux Support

```kotlin
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux

@RestController
@RequestMapping("/api/chat")
class StreamingChatController(private val agent: AIAgent) {
    @PostMapping("/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun chatStream(@RequestBody request: ChatRequest): Flux<String> {
        return Flux.create { sink ->
            kotlinx.coroutines.runBlocking {
                agent.runStreaming(request.message) { chunk ->
                    sink.next(chunk)
                }
                sink.complete()
            }
        }
    }
}
```

## Health Indicators

The starter provides health indicators:

```kotlin
import org.springframework.boot.actuate.health.Health
import org.springframework.boot.actuate.health.HealthIndicator
import org.springframework.stereotype.Component

@Component
class AgentHealthIndicator(private val agent: AIAgent) : HealthIndicator {
    override fun health(): Health {
        return try {
            // Check if agent is responsive
            Health.up()
                .withDetail("model", agent.llmModel.toString())
                .withDetail("status", "ready")
                .build()
        } catch (e: Exception) {
            Health.down()
                .withDetail("error", e.message)
                .build()
        }
    }
}
```

## Configuration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `koog.agent.model` | String | `gpt-4o` | LLM model to use |
| `koog.agent.provider` | String | `openai` | LLM provider |
| `koog.agent.system-prompt` | String | `null` | Default system prompt |
| `koog.agent.max-retries` | Int | `3` | Maximum retry attempts |
| `koog.agent.timeout-ms` | Long | `30000` | Request timeout in ms |
| `koog.tools.enabled` | Boolean | `true` | Enable tool scanning |
| `koog.tools.scan-packages` | List | `[]` | Packages to scan for tools |

## Best Practices

1. **Use profiles** — Configure different agents for dev/staging/production
2. **Inject dependencies** — Use Spring DI for API keys and configuration
3. **Scope beans appropriately** — Use `@RequestScope` for per-request agents if needed
4. **Add monitoring** — Use Spring Actuator with Koog health indicators
5. **Handle errors globally** — Use `@ControllerAdvice` for agent error handling
6. **Test with mocks** — Use Spring Boot test slices with mocked agents

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `No qualifying bean` | Ensure `koog-spring-boot-starter` dependency is added |
| `API key not found` | Set environment variable or add to `application.yml` |
| `Tool not discovered` | Check `koog.tools.scan-packages` includes your package |
| `Bean creation failed` | Verify API key is valid and model is available |
| `Circular dependency` | Use `@Lazy` injection or restructure bean dependencies |
