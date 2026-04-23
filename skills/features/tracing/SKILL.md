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

## Security Considerations

### Sensitive Data in Traces

`traceLLMRequests = true` and `traceLLMResponses = true` capture **full prompts and completions**.
These may include:

- User-provided inputs containing PII (names, emails, medical data, etc.)
- Credentials or API keys passed inadvertently in prompts
- Confidential business logic embedded in system prompts

> **Recommendation:** In production, either disable LLM request/response tracing entirely or
> implement a sanitizer that redacts sensitive fields before writing trace output.

### Sanitizing Traces

```kotlin
install(Tracing) {
    traceLLMRequests = true
    traceLLMResponses = true
    onTrace { trace ->
        val sanitized = sanitizeTrace(trace)
        writeToSecureStore(sanitized)
    }
}

fun sanitizeTrace(trace: AgentTrace): AgentTrace {
    // Redact common PII patterns and secrets
    val piiPatterns = listOf(
        Regex("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z]{2,}\\b", RegexOption.IGNORE_CASE), // email
        Regex("\\b\\d{3}-\\d{2}-\\d{4}\\b"),                                                   // SSN-like
        Regex("(?i)(api[_-]?key|secret|password|token)\\s*[=:]\\s*\\S+")                       // key=value
    )
    var content = trace.content
    for (pattern in piiPatterns) {
        content = content.replace(pattern, "[REDACTED]")
    }
    return trace.copy(content = content)
}
```

### Securing Trace Files

Trace files written to disk can be as sensitive as log files. Apply the same protections:

```bash
# Restrict access to the owning process user
chmod 700 traces/
chmod 600 traces/*.log
```

Avoid shipping trace files to external systems (e.g., object storage, third-party observability
platforms) without reviewing them for sensitive content first.

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

1. **Disable LLM tracing in production** — `traceLLMRequests` and `traceLLMResponses` capture full prompts which may contain PII; disable or sanitize them in production
2. **Use file output** — Write traces to files for post-mortem analysis
3. **Set thresholds** — Use slow operation thresholds to identify performance bottlenecks
4. **Combine with EventHandler** — Use Tracing for high-level overview, EventHandler for specific events
5. **Rotate trace files** — Implement log rotation for long-running agents
6. **Redact sensitive data** — Apply a sanitizer before exporting traces to any external system
7. **Restrict trace file permissions** — Set `chmod 700` on the traces directory

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No trace output | Ensure `install(Tracing)` is inside the `features` block |
| Traces too verbose | Disable specific trace types (e.g., `traceLLMResponses = false`) |
| Performance impact | Reduce trace verbosity or use async trace processing |
| File output not working | Check file permissions and path validity |
| Missing tool traces | Ensure `traceToolCalls = true` in configuration |
