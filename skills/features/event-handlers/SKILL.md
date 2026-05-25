---
name: event-handlers
description: Handle agent events with Koog's EventHandler feature for tool calls, LLM streaming, and execution lifecycle
compatibility: "Koog 1.0.0"
license: Apache-2.0
keywords: [event, handler, tool-call, streaming, lifecycle, callback, handle-events]
---

# Event Handlers

Koog's `EventHandler` feature provides a comprehensive event system for monitoring and reacting to agent execution. You can intercept tool calls, LLM streaming, and lifecycle events using a declarative DSL.

## Overview

The EventHandler feature allows you to:

- Monitor tool calls (start, finish, errors, metadata contribution)
- Observe LLM streaming in real-time
- Track agent execution lifecycle including LLM call failures
- Implement custom logging, metrics, and debugging
- React to events without modifying agent logic

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:1.0.0")
}
```

## EventHandler.Feature

The `EventHandler` is installed as a feature on the agent:

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.feature.EventHandler
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o
) {
    install(EventHandler) {
        // Event handlers go here
    }
}
```

## handleEvents DSL

Use the `handleEvents` DSL to register event handlers:

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(EventHandler) {
        handleEvents {
            // Register handlers here
        }
    }
)
```

## Tool Call Events

### onToolCallStarting

Fired when a tool call begins:

```kotlin
install(EventHandler) {
    handleEvents {
        onToolCallStarting { context ->
            println("Tool call starting: ${context.toolName}")
            println("Arguments: ${context.arguments}")

            // Log for observability
            logger.info("Invoking tool: ${context.toolName}")
        }
    }
}
```

### onToolCallMetadataContributing

Fired before a tool call to contribute per-call metadata (e.g., trace span id):

```kotlin
install(EventHandler) {
    handleEvents {
        onToolCallMetadataContributing { context ->
            println("Contributing metadata for tool call: ${context.toolName}")
            context.metadata["traceId"] = generateTraceId()
        }
    }
}
```

### onToolCallFinished

Fired when a tool call completes:

```kotlin
install(EventHandler) {
    handleEvents {
        onToolCallFinished { context ->
            println("Tool call finished: ${context.toolName}")
            println("Result: ${context.result}")
            println("Duration: ${context.duration}ms")

            // Track metrics
            metrics.recordToolCall(context.toolName, context.duration)
        }
    }
}
```

### onToolCallFailed

Fired when a tool call fails:

```kotlin
install(EventHandler) {
    handleEvents {
        onToolCallFailed { context ->
            println("Tool call failed: ${context.toolName}")
            println("Error: ${context.error.message}")

            // Alert on critical tool failures
            if (context.toolName in criticalTools) {
                alerting.send("Critical tool failure: ${context.toolName}")
            }
        }
    }
}
```

### Complete Tool Call Monitoring

```kotlin
install(EventHandler) {
    handleEvents {
        onToolCallStarting { context ->
            println("[START] Tool: ${context.toolName}")
            println("  Arguments: ${context.arguments}")
        }

        onToolCallMetadataContributing { context ->
            println("[META] Tool: ${context.toolName} metadata: ${context.metadata}")
        }

        onToolCallFinished { context ->
            println("[DONE] Tool: ${context.toolName}")
            println("  Result: ${context.result}")
            println("  Duration: ${context.duration}ms")
        }

        onToolCallFailed { context ->
            println("[FAIL] Tool: ${context.toolName}")
            println("  Error: ${context.error.message}")
        }
    }
}
```

## LLM Call Events

### onLLMCallCompleted

Fired when an LLM call completes successfully:

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMCallCompleted { context ->
            println("LLM call completed in ${context.duration}ms")
            println("Response: ${context.response}")
        }
    }
}
```

### onLLMCallFailed

Fired when an LLM call fails:

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMCallFailed { context ->
            println("LLM call failed: ${context.error.message}")

            // Implement retry or fallback
            if (context.error is TimeoutException) {
                alerting.send("LLM call timeout")
            }
        }
    }
}
```

## LLM Streaming Events

### onLLMStreamingFrameReceived

Fired for each streaming frame from the LLM:

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMStreamingFrameReceived { frame ->
            when (frame) {
                is StreamFrame.TextDelta -> {
                    print(frame.text) // Real-time text output
                }
                is StreamFrame.ToolCallDelta -> {
                    println("Tool call delta: ${frame.name}")
                }
                is StreamFrame.ReasoningDelta -> {
                    println("Reasoning: ${frame.text}")
                }
                else -> {}
            }
        }
    }
}
```

### onLLMStreamingCompleted

Fired when streaming finishes successfully:

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMStreamingCompleted { context ->
            println("Streaming completed")
            println("Total frames: ${context.frameCount}")
            println("Total duration: ${context.duration}ms")
        }
    }
}
```

### onLLMStreamingFailed

Fired when streaming encounters an error:

```kotlin
install(EventHandler) {
    handleEvents {
        onLLMStreamingFailed { context ->
            println("Streaming failed: ${context.error.message}")

            // Implement fallback strategy
            if (context.error is TimeoutException) {
                alerting.send("LLM streaming timeout")
            }
        }
    }
}
```

### Complete Streaming Monitoring

```kotlin
install(EventHandler) {
    handleEvents {
        var frameCount = 0

        onLLMStreamingFrameReceived { frame ->
            frameCount++
            when (frame) {
                is StreamFrame.TextDelta -> print(frame.text)
                is StreamFrame.ToolCallDelta -> println("[TOOL] ${frame.name}")
                is StreamFrame.ReasoningDelta -> println("[THINK] ${frame.text}")
                is StreamFrame.TextComplete -> println("\n[TEXT DONE]")
                is StreamFrame.ToolCallComplete -> println("[TOOL DONE] ${frame.name}")
                is StreamFrame.ReasoningComplete -> println("[THINK DONE]")
                is StreamFrame.End -> println("[STREAM END]")
            }
        }

        onLLMStreamingCompleted { context ->
            println("\nStreaming complete: $frameCount frames in ${context.duration}ms")
        }

        onLLMStreamingFailed { context ->
            println("Streaming error: ${context.error.message}")
        }
    }
}
```

## Event Context

Each event handler receives a context object with relevant information:

### ToolCallContext

```kotlin
data class ToolCallContext(
    val toolName: String,                // Name of the tool
    val arguments: String,               // JSON arguments
    val result: String?,                 // Result (null if starting)
    val error: Throwable?,               // Error (null if successful)
    val duration: Long,                  // Duration in ms
    val metadata: MutableMap<String, Any> // Metadata map for per-call contributions
)
```

### LLMCallContext

```kotlin
data class LLMCallContext(
    val response: String?,               // LLM response (null if failed)
    val error: Throwable?,               // Error (null if successful)
    val duration: Long                   // Duration in ms
)
```

### StreamingContext

```kotlin
data class StreamingContext(
    val frameCount: Int,                 // Number of frames received
    val duration: Long,                  // Total duration in ms
    val error: Throwable?                // Error (null if successful)
)
```

## Practical Examples

### Logging Handler

```kotlin
import ai.koog.agents.core.feature.EventHandler

class AgentLogger {
    fun install(agent: AIAgent): AIAgent {
        return agent.withFeature(EventHandler) {
            handleEvents {
                onToolCallStarting { ctx ->
                    log.info("Tool starting: ${ctx.toolName} with ${ctx.arguments}")
                }
                onToolCallMetadataContributing { ctx ->
                    log.debug("Tool metadata: ${ctx.metadata}")
                }
                onToolCallFinished { ctx ->
                    log.info("Tool finished: ${ctx.toolName} in ${ctx.duration}ms")
                }
                onToolCallFailed { ctx ->
                    log.error("Tool failed: ${ctx.toolName}", ctx.error)
                }
                onLLMCallCompleted { ctx ->
                    log.info("LLM call completed in ${ctx.duration}ms")
                }
                onLLMCallFailed { ctx ->
                    log.error("LLM call failed", ctx.error)
                }
                onLLMStreamingFrameReceived { frame ->
                    if (frame is StreamFrame.TextDelta) {
                        log.debug("LLM output: ${frame.text}")
                    }
                }
            }
        }
    }
}
```

### Metrics Handler

```kotlin
import io.micrometer.core.instrument.Metrics

install(EventHandler) {
    handleEvents {
        onToolCallStarting { ctx ->
            Metrics.counter("agent.tool.calls", "tool", ctx.toolName).increment()
        }
        onToolCallFinished { ctx ->
            Metrics.timer("agent.tool.duration", "tool", ctx.toolName)
                .record(ctx.duration, TimeUnit.MILLISECONDS)
        }
        onToolCallFailed { ctx ->
            Metrics.counter("agent.tool.errors", "tool", ctx.toolName).increment()
        }
        onLLMStreamingCompleted { ctx ->
            Metrics.timer("agent.llm.streaming.duration")
                .record(ctx.duration, TimeUnit.MILLISECONDS)
            Metrics.counter("agent.llm.streaming.frames")
                .increment(ctx.frameCount.toDouble())
        }
    }
}
```

### Debug Handler

```kotlin
install(EventHandler) {
    handleEvents {
        onToolCallStarting { ctx ->
            println("┌─ Tool Call ─────────────────────")
            println("│ Tool: ${ctx.toolName}")
            println("│ Args: ${ctx.arguments}")
        }
        onToolCallMetadataContributing { ctx ->
            println("│ Metadata: ${ctx.metadata}")
        }
        onToolCallFinished { ctx ->
            println("│ Result: ${ctx.result}")
            println("│ Duration: ${ctx.duration}ms")
            println("└─────────────────────────────────")
        }
        onToolCallFailed { ctx ->
            println("│ ERROR: ${ctx.error.message}")
            println("└─────────────────────────────────")
        }
    }
}
```

## Multiple Event Handlers

Install multiple event handlers for different concerns:

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(EventHandler) {
        handleEvents {
            onToolCallStarting { ctx -> logger.info("Tool: ${ctx.toolName}") }
        }
    }
    install(EventHandler) {
        handleEvents {
            onToolCallStarting { ctx -> metrics.increment(ctx.toolName) }
        }
    }
    install(EventHandler) {
        handleEvents {
            onToolCallStarting { ctx -> debugger.onToolCall(ctx) }
        }
    }
}
```

## Java API

```java
import ai.koog.agents.core.feature.EventHandler;

var agent = AIAgent.builder(executor, model)
    .withFeature(EventHandler.INSTANCE, handler -> {
        handler.handleEvents(events -> {
            events.onToolCallStarting(ctx -> {
                System.out.println("Tool starting: " + ctx.getToolName());
            });
            events.onToolCallMetadataContributing(ctx -> {
                System.out.println("Contributing metadata for tool: " + ctx.getToolName());
                ctx.getMetadata().put("traceId", generateTraceId());
            });
            events.onToolCallFinished(ctx -> {
                System.out.println("Tool finished: " + ctx.getToolName());
            });
            events.onToolCallFailed(ctx -> {
                System.out.println("Tool failed: " + ctx.getToolName());
            });
            events.onLLMCallFailed(ctx -> {
                System.out.println("LLM call failed: " + ctx.getError().getMessage());
            });
            return null;
        });
        return null;
    })
    .build();
```

## Best Practices

1. **Keep handlers lightweight** — Event handlers run synchronously; avoid blocking operations
2. **Use async for heavy work** — Launch coroutines for logging, metrics, or network calls
3. **Handle errors in handlers** — Wrap handler logic in try-catch to prevent agent disruption
4. **Combine with tracing** — Use EventHandler alongside Tracing for comprehensive observability
5. **Filter events** — Only handle events you need to avoid unnecessary processing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not firing | Ensure `install(EventHandler)` is inside the `features` block |
| Handler not called | Verify the event name matches (e.g., `onToolCallStarting` not `onToolCallStart`) |
| Performance impact | Reduce handler complexity or use async processing |
| Missing context | Check the event type; different events provide different context fields |