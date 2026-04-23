---
name: ktor-integration
description: Integrate Koog AI agents with Ktor server using the koog-ktor plugin
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [ktor, server, plugin, http, web, backend]
---

# Ktor Integration

The `koog-ktor` module provides a native Ktor plugin for hosting Koog AI agents as HTTP services. This enables you to expose agent capabilities through REST endpoints, WebSocket connections, and other Ktor features.

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:koog-ktor:0.8.0")
    implementation("io.ktor:ktor-server-core:3.1.1")
    implementation("io.ktor:ktor-server-netty:3.1.1")
    implementation("io.ktor:ktor-server-content-negotiation:3.1.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.1")
}
```

## Plugin Installation

Install the Koog Ktor plugin in your application module:

```kotlin
import ai.koog.agents.ktor.installKoog
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*

fun main() {
    embeddedServer(Netty, port = 8080) {
        installKoog {
            // Configure the default agent
            agent {
                promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))
                llmModel = OpenAIModels.Chat.GPT4o
            }
        }
    }.start(wait = true)
}
```

## Server-Side Agent Integration

### Basic Chat Endpoint

```kotlin
import ai.koog.agents.ktor.installKoog
import ai.koog.agents.ktor.routing.agentRouting
import io.ktor.server.application.*
import io.ktor.server.routing.*

fun Application.agentModule() {
    installKoog {
        agent {
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))
            llmModel = OpenAIModels.Chat.GPT4o
        }
    }

    routing {
        agentRouting {
            // Exposes POST /chat endpoint
            post("/chat") { agent ->
                val message = call.receiveText()
                val response = agent.run(message)
                call.respondText(response)
            }
        }
    }
}
```

### JSON API Endpoint

```kotlin
import io.ktor.server.request.*
import io.ktor.server.response.*
import kotlinx.serialization.Serializable

@Serializable
data class ChatRequest(val message: String, val conversationId: String? = null)

@Serializable
data class ChatResponse(val reply: String, val conversationId: String)

fun Application.agentModule() {
    installKoog {
        agent {
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))
            llmModel = OpenAIModels.Chat.GPT4o
        }
    }

    routing {
        agentRouting {
            post("/api/chat") { agent ->
                val request = call.receive<ChatRequest>()
                val reply = agent.run(request.message)
                call.respond(ChatResponse(
                    reply = reply,
                    conversationId = request.conversationId ?: generateId()
                ))
            }
        }
    }
}
```

### Multiple Agent Endpoints

```kotlin
fun Application.agentModule() {
    val openAiKey = System.getenv("OPENAI_API_KEY")

    routing {
        // General-purpose chat agent
        agentRouting("/api/chat") {
            agent {
                promptExecutor = simpleOpenAIExecutor(openAiKey)
                llmModel = OpenAIModels.Chat.GPT4o
            }
        }

        // Code review agent with different system prompt
        agentRouting("/api/code-review") {
            agent {
                promptExecutor = simpleOpenAIExecutor(openAiKey)
                llmModel = OpenAIModels.Chat.GPT4o
                systemPrompt = "You are a senior software engineer. Review code for bugs, performance, and best practices."
            }
        }

        // Translation agent
        agentRouting("/api/translate") {
            agent {
                promptExecutor = simpleOpenAIExecutor(openAiKey)
                llmModel = OpenAIModels.Chat.GPT4oMini
                systemPrompt = "You are a professional translator. Translate text accurately while preserving tone and context."
            }
        }
    }
}
```

### Streaming Responses

```kotlin
import io.ktor.server.response.*
import io.ktor.http.*

fun Application.agentModule() {
    installKoog {
        agent {
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))
            llmModel = OpenAIModels.Chat.GPT4o
        }
    }

    routing {
        agentRouting {
            post("/api/chat/stream") { agent ->
                val message = call.receiveText()
                call.respondTextWriter(ContentType.Text.Plain) {
                    agent.runStreaming(message) { chunk ->
                        write(chunk)
                        flush()
                    }
                }
            }
        }
    }
}
```

### Tool-Enabled Agent

```kotlin
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.tools.annotation.Tool
import ai.koog.agents.core.tools.annotation.LLMDescription

@Tool
@LLMDescription("Get the current weather for a location")
suspend fun getWeather(
    @LLMDescription("City name") city: String
): String {
    // Weather API implementation
    return "Sunny, 22°C in $city"
}

fun Application.agentModule() {
    installKoog {
        agent {
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))
            llmModel = OpenAIModels.Chat.GPT4o
            toolRegistry = ToolRegistry {
                tool(::getWeather)
            }
        }
    }

    routing {
        agentRouting {
            post("/api/chat") { agent ->
                val message = call.receiveText()
                val response = agent.run(message)
                call.respondText(response)
            }
        }
    }
}
```

## Configuration

### Agent Configuration

```kotlin
installKoog {
    agent {
        promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))
        llmModel = OpenAIModels.Chat.GPT4o

        // System prompt
        systemPrompt = "You are a helpful assistant."

        // Retry configuration
        retryStrategy = RetryStrategy.exponential(maxRetries = 3)

        // Features
        features {
            install(Tracing)
            install(Persistence)
        }
    }
}
```

### Request-Level Configuration

```kotlin
routing {
    agentRouting {
        post("/api/chat") { agent ->
            // Override model per request if needed
            val model = call.request.queryParameters["model"]
                ?.let { resolveModel(it) }
                ?: OpenAIModels.Chat.GPT4o

            val message = call.receiveText()
            val response = agent.run(message)
            call.respondText(response)
        }
    }
}
```

## Health Checks

```kotlin
routing {
    get("/health") {
        call.respond(mapOf(
            "status" to "ok",
            "agent" to "ready",
            "timestamp" to Clock.System.now().toString()
        ))
    }
}
```

## Error Handling

```kotlin
import io.ktor.server.plugins.statuspages.*
import io.ktor.http.*

fun Application.agentModule() {
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            when (cause) {
                is IllegalArgumentException -> {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to cause.message))
                }
                else -> {
                    call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Internal server error"))
                }
            }
        }
    }
}
```

## Best Practices

1. **Use dependency injection** — Inject API keys and configuration rather than hardcoding
2. **Implement rate limiting** — Use Ktor's rate-limiting plugins to protect your agent endpoints
3. **Add authentication** — Secure agent endpoints with Ktor's authentication plugins
4. **Log requests** — Use Ktor's logging or Koog's tracing for observability
5. **Handle timeouts** — Configure appropriate timeouts for LLM calls
6. **Graceful shutdown** — Ensure agent resources are cleaned up on server shutdown

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Plugin not installed` | Ensure `installKoog { }` is called before `routing { }` |
| `Agent not responding` | Check API key is set and valid |
| `Timeout errors` | Increase Ktor request timeout or LLM timeout settings |
| `Serialization errors` | Ensure `ktor-serialization-kotlinx-json` dependency is added |
