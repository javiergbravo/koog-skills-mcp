---
name: history-compression
description: Optimize token usage with Koog's built-in history compression techniques for long-running conversations
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [history, compression, tokens, optimization, conversation, context-window]
---

# History Compression

Koog provides built-in history compression techniques to optimize token usage in long-running conversations. This ensures agents stay within context window limits while maintaining conversational coherence.

## Overview

History compression helps:

- **Reduce token costs** — Fewer tokens means lower API costs
- **Stay within context limits** — Prevent context window overflow
- **Maintain conversation quality** — Preserve important context while removing noise
- **Improve performance** — Shorter prompts lead to faster responses

## When to Use History Compression

Use history compression when:

- Conversations exceed 50+ messages
- Token usage approaches the model's context limit
- Running long-running agent tasks
- Cost optimization is a priority
- Agent responses become slower due to large context

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
}
```

## Compression Techniques

### Sliding Window

The simplest approach: keep only the last N messages.

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.history.SlidingWindowCompression
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    historyCompression = SlidingWindowCompression(
        windowSize = 20, // Keep last 20 messages
        keepSystemPrompt = true // Always keep the system prompt
    )
)
```

### Token-Aware Truncation

Truncate based on token count rather than message count.

```kotlin
import ai.koog.agents.core.history.TokenAwareCompression

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = TokenAwareCompression(
        maxTokens = 8000, // Maximum tokens for history
        reserveTokens = 2000, // Reserve tokens for response
        keepSystemPrompt = true
    )
)
```

### Summarization

Compress old messages into summaries using an LLM.

```kotlin
import ai.koog.agents.core.history.SummarizationCompression

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = SummarizationCompression(
        summarizer = executor, // Use the same or different LLM for summarization
        maxMessagesBeforeSummary = 30, // Summarize after 30 messages
        summaryMaxTokens = 500, // Limit summary size
        keepRecentMessages = 10 // Always keep last 10 messages
    )
)
```

### Hybrid Compression

Combine multiple techniques for optimal results.

```kotlin
import ai.koog.agents.core.history.HybridCompression

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = HybridCompression(
        strategies = listOf(
            TokenAwareCompression(maxTokens = 12000),
            SummarizationCompression(
                summarizer = executor,
                maxMessagesBeforeSummary = 50
            ),
            SlidingWindowCompression(windowSize = 30)
        ),
        applyOrder = listOf(
            CompressionStep.TOKEN_TRUNCATION,
            CompressionStep.SUMMARIZATION,
            CompressionStep.SLIDING_WINDOW
        )
    )
)
```

## Configuration

### Basic Configuration

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = SlidingWindowCompression(windowSize = 20)
)
```

### Advanced Configuration

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = TokenAwareCompression(
        maxTokens = 8000,
        reserveTokens = 2000,
        keepSystemPrompt = true,
        // Priority rules for keeping messages
        priorityRules = listOf(
            PriorityRule.KEEP_SYSTEM_PROMPT,
            PriorityRule.KEEP_RECENT(10),
            PriorityRule.KEEP_TOOL_RESULTS,
            PriorityRule.KEEP_USER_MESSAGES
        )
    )
)
```

### Per-Model Configuration

```kotlin
// Configure based on model context limits
val gpt4oCompression = TokenAwareCompression(
    maxTokens = 100000, // GPT-4o has 128k context
    reserveTokens = 4000
)

val gpt4oMiniCompression = TokenAwareCompression(
    maxTokens = 80000, // GPT-4o-mini has 128k context
    reserveTokens = 2000
)
```

## Token Optimization Strategies

### Strategy 1: Progressive Compression

```kotlin
import ai.koog.agents.core.history.ProgressiveCompression

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = ProgressiveCompression(
        stages = listOf(
            CompressionStage(
                trigger = TokenThreshold(5000),
                strategy = SlidingWindowCompression(windowSize = 30)
            ),
            CompressionStage(
                trigger = TokenThreshold(10000),
                strategy = SummarizationCompression(summarizer = executor)
            ),
            CompressionStage(
                trigger = TokenThreshold(15000),
                strategy = TokenAwareCompression(maxTokens = 8000)
            )
        )
    )
)
```

### Strategy 2: Importance-Based Retention

```kotlin
import ai.koog.agents.core.history.ImportanceCompression

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = ImportanceCompression(
        importanceScorer = { message ->
            when {
                message.role == MessageRole.SYSTEM -> 1.0
                message.content.contains("important") -> 0.9
                message.role == MessageRole.TOOL_RESULT -> 0.7
                message.role == MessageRole.USER -> 0.6
                else -> 0.5
            }
        },
        maxTokens = 10000,
        minImportance = 0.3 // Remove messages below this threshold
    )
)
```

### Strategy 3: Topic-Based Grouping

```kotlin
import ai.koog.agents.core.history.TopicCompression

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = TopicCompression(
        topicDetector = executor,
        keepCurrentTopic = true,
        summarizeOldTopics = true,
        maxTopics = 5
    )
)
```

## Maintaining Context While Reducing Size

### Keep Key Context

```kotlin
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    historyCompression = TokenAwareCompression(
        maxTokens = 8000,
        // Preserve critical context
        preserveRules = listOf(
            PreserveRule.SYSTEM_PROMPT,
            PreserveRule.FIRST_USER_MESSAGE,
            PreserveRule.TOOL_DEFINITIONS,
            PreserveRule.RECENT(5)
        )
    )
)
```

### Context Injection

```kotlin
// Inject compressed context into the system prompt
val compressedHistory = agent.compressHistory()

val enhancedSystemPrompt = """
$systemPrompt

Previous conversation summary:
${compressedHistory.summary}

Key points:
${compressedHistory.keyPoints.joinToString("\n") { "- $it" }}
"""

// Use enhanced prompt for new conversation
val newAgent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    systemPrompt = enhancedSystemPrompt
)
```

## Java API

```java
import ai.koog.agents.core.history.SlidingWindowCompression;
import ai.koog.agents.core.history.TokenAwareCompression;

var agent = AIAgent.builder(executor, model)
    .setHistoryCompression(new SlidingWindowCompression(20, true))
    .build();

// Or token-aware
var agent2 = AIAgent.builder(executor, model)
    .setHistoryCompression(new TokenAwareCompression(8000, 2000, true))
    .build();
```

## Monitoring Compression

```kotlin
import ai.koog.agents.core.history.CompressionMetrics

val metrics = agent.getCompressionMetrics()

println("Original size: ${metrics.originalTokenCount} tokens")
println("Compressed size: ${metrics.compressedTokenCount} tokens")
println("Compression ratio: ${metrics.compressionRatio}")
println("Messages removed: ${metrics.messagesRemoved}")
println("Summaries created: ${metrics.summariesCreated}")
```

## Best Practices

1. **Start with sliding window** — Simple and effective for most use cases
2. **Use token-aware for cost control** — Set explicit token limits for budget management
3. **Enable summarization for long conversations** — Preserve context while reducing size
4. **Monitor compression metrics** — Track how much you're saving
5. **Test with real conversations** — Ensure compression doesn't lose critical context
6. **Keep system prompt always** — The system prompt provides essential context
7. **Preserve tool results** — Tool call results often contain important information

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Context lost after compression | Increase `keepRecentMessages` or use importance-based retention |
| Agent forgetting instructions | Ensure `keepSystemPrompt = true` |
| High compression overhead | Reduce summarization frequency or use simpler compression |
| Poor quality responses | Increase token budget or reduce compression aggressiveness |
| Compression not triggering | Check token thresholds and trigger conditions |
