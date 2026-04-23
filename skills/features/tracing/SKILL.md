---
name: tracing
description: Enable detailed tracing of AI agent execution with Koog's Tracing feature for debugging and monitoring
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [tracing, debug, monitor, execution, trace, logging]
---

# Tracing

Koog's Tracing feature provides detailed execution traces for understanding agent behavior. It captures every step of agent execution including LLM calls, tool invocations, and decision points.

## Overview

Tracing enables:

- Step-by-step execution visibility
- Tool call logging with inputs and outputs
- LLM prompt and response capture
- Graph execution tracking
- Performance profiling
- Debugging complex agent workflows

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-features-trace:0.8.0")
}
```

## Basic Setup

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.features.trace.Tracing
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o
) {
    install(Tracing)
}

// Run the agent — execution traces are automatically captured
val result = agent.run("What is the weather in Paris?")
```

## Configuration

### Basic Configuration

```kotlin
install(Tracing) {
    // Enable/disable specific trace types
    traceToolCalls = true
    traceLLMRequests = true
    traceLLMResponses = true
    traceGraphExecution = true

    // Output format
    outputFormat = TraceOutputFormat.TEXT
}
```

### Output Formats

| Format | Description |
|--------|-------------|
| `TEXT` | Human-readable text output |
| `JSON` | Structured JSON for parsing |
| `MARKDOWN` | Markdown-formatted traces |

```kotlin
install(Tracing) {
    outputFormat = TraceOutputFormat.JSON
}
```

### File Output

```kotlin
install(Tracing) {
    outputTarget = TraceOutputTarget.File("traces/agent-trace.log")
}
```

### Console Output

```kotlin
install(Tracing) {
    outputTarget = TraceOutputTarget.Console
}
```

## Trace Output

### Sample Text Trace

```
[TRACE] Agent execution started
  ├─ [LLM] Sending prompt to GPT-4o
  │   └─ Prompt: "What is the weather in Paris?"
  ├─ [LLM] Response received (150ms)
  │   └─ Response: "I'll check the weather for you."
  ├─ [TOOL] Calling get_weather(city="Paris")
  │   └─ Arguments: {"city": "Paris"}
  ├─ [TOOL] Result received (200ms)
  │   └─ Result: "Sunny, 22°C"
  ├─ [LLM] Sending follow-up prompt
  │   └─ Prompt: "Weather data: Sunny, 22°C"
  ├─ [LLM] Response received (120ms)
  │   └─ Response: "The weather in Paris is currently sunny with a temperature of 22°C."
  └─ [DONE] Total execution: 470ms
```

### Sample JSON Trace

```json
{
  "traceId": "abc-123",
  "startTime": "2024-01-15T10:30:00Z",
  "endTime": "2024-01-15T10:30:00.470Z",
  "steps": [
    {
      "type": "llm_request",
      "model": "gpt-4o",
      "prompt": "What is the weather in Paris?",
      "durationMs": 150
    },
    {
      "type": "tool_call",
      "tool": "get_weather",
      "arguments": {"city": "Paris"},
      "result": "Sunny, 22°C",
      "durationMs": 200
    },
    {
      "type": "llm_request",
      "model": "gpt-4o",
      "prompt": "Weather data: Sunny, 22°C",
      "durationMs": 120
    }
  ],
  "totalDurationMs": 470
}
```

## Debugging Agent Execution

### Understanding Agent Decisions

```kotlin
install(Tracing) {
    traceToolCalls = true
    traceLLMRequests = true
    traceLLMResponses = true
    // This shows why the agent chose specific tools
    traceDecisionPoints = true
}
```

### Tracing Graph-Based Agents

```kotlin
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.core.strategy.nodeLLMRequest
import ai.koog.agents.core.strategy.nodeExecuteTool
import ai.koog.agents.core.strategy.nodeStart
import ai.koog.agents.core.strategy.nodeFinish

val strategy = strategy("my-workflow") {
    val start by nodeLLMRequest()
    val process by nodeExecuteTool()
    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo start)
    edge(start forwardTo process onToolCall { true })
    edge(process forwardTo respond onAssistantMessage { true })
    edge(respond forwardTo nodeFinish)
}

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    strategy = strategy
) {
    install(Tracing) {
        traceGraphExecution = true // Shows node transitions
    }
}
```

Trace output for graph execution:

```
[TRACE] Graph execution started
  ├─ [NODE] nodeStart → start (LLMRequest)
  ├─ [NODE] start → process (ToolCall detected)
  ├─ [NODE] process → respond (Assistant message)
  ├─ [NODE] respond → nodeFinish
  └─ [DONE] Graph execution completed
```

## Performance Profiling

### Identifying Slow Steps

```kotlin
install(Tracing) {
    // Enable timing for all operations
    traceTimings = true

    // Set threshold for slow operation warnings
    slowOperationThresholdMs = 5000 // 5 seconds
}
```

### Trace Analysis

```kotlin
// After running the agent, analyze the trace
val trace = agent.getLastTrace()

println("Total duration: ${trace.totalDurationMs}ms")
println("LLM calls: ${trace.llmCallCount}")
println("Tool calls: ${trace.toolCallCount}")
println("Slowest step: ${trace.slowestStep}")
```

## Custom Trace Handlers

```kotlin
install(Tracing) {
    onTrace { trace ->
        // Custom processing
        when (trace.type) {
            TraceType.LLM_REQUEST -> {
                analytics.track("llm_request", mapOf(
                    "model" to trace.model,
                    "duration" to trace.durationMs
                ))
            }
            TraceType.TOOL_CALL -> {
                analytics.track("tool_call", mapOf(
                    "tool" to trace.toolName,
                    "duration" to trace.durationMs
                ))
            }
            else -> {}
        }
    }
}
```

## Integration with Logging

### Using with AppLogger

```kotlin
install(Tracing) {
    onTrace { trace ->
        when (trace.type) {
            TraceType.LLM_REQUEST -> {
                AppLogger.d<AgentTracer>("LLM request: ${trace.model} (${trace.durationMs}ms)")
            }
            TraceType.TOOL_CALL -> {
                AppLogger.d<AgentTracer>("Tool call: ${trace.toolName} (${trace.durationMs}ms)")
            }
            TraceType.ERROR -> {
                AppLogger.e<AgentTracer>("Error in trace", trace.error)
            }
            else -> {}
        }
    }
}
```

### Using with SLF4J

```kotlin
import org.slf4j.LoggerFactory

val logger = LoggerFactory.getLogger("AgentTracing")

install(Tracing) {
    onTrace { trace ->
        logger.info("Trace: type={}, duration={}ms", trace.type, trace.durationMs)
    }
}
```

## Java API

```java
import ai.koog.agents.features.trace.Tracing;

var agent = AIAgent.builder(executor, model)
    .withFeature(Tracing.INSTANCE, config -> {
        config.setTraceToolCalls(true);
        config.setTraceLLMRequests(true);
        config.setOutputFormat(TraceOutputFormat.TEXT);
        return null;
    })
    .build();
```

## Best Practices

1. **Disable in production** — Tracing adds overhead; disable or use minimal tracing in production
2. **Use file output** — Write traces to files for post-mortem analysis
3. **Set thresholds** — Use slow operation thresholds to identify performance bottlenecks
4. **Combine with EventHandler** — Use Tracing for high-level overview, EventHandler for specific events
5. **Rotate trace files** — Implement log rotation for long-running agents
6. **Redact sensitive data** — Filter out API keys and sensitive information from traces

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No trace output | Ensure `install(Tracing)` is inside the `features` block |
| Traces too verbose | Disable specific trace types (e.g., `traceLLMResponses = false`) |
| Performance impact | Reduce trace verbosity or use async trace processing |
| File output not working | Check file permissions and path validity |
| Missing tool traces | Ensure `traceToolCalls = true` in configuration |
