---
name: prompt-cache
description: "Cache LLM prompt responses with Koog's prompt-cache modules: in-memory, file-based, and Redis caching"
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [prompt-cache, cache, redis, file-cache, memory-cache, optimization, token-saving]
---

# Prompt Cache

Cache LLM prompt responses to optimize performance and reduce costs for repeated requests. Koog provides a decorator-based caching system through `CachedPromptExecutor`.

## Architecture

```
CachedPromptExecutor
├── cache: PromptCache implementation (File, Memory, Redis)
└── nested: PromptExecutor (actual LLM client)
```

The `CachedPromptExecutor` acts as a decorator — it intercepts `execute()` calls, checks the cache first, and only delegates to the nested executor when no cached result is found.

## Modules

| Module | Purpose |
|--------|---------|
| `prompt-cache-model` | Core `PromptCache` interface and in-memory implementation |
| `prompt-cache-files` | File-system based cache storage |
| `prompt-cache-redis` | Redis-based cache storage |

## Dependencies

```kotlin
// Core + File-based cache
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:prompt-cache-model:0.8.0")
    implementation("ai.koog:prompt-cache-files:0.8.0")
}

// Or with Redis
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:prompt-cache-model:0.8.0")
    implementation("ai.koog:prompt-cache-redis:0.8.0")
}
```

## CachedPromptExecutor

Wraps a `PromptExecutor` with caching functionality:

### Kotlin

```kotlin
import ai.koog.agents.core.prompt.cache.CachedPromptExecutor
import ai.koog.agents.core.prompt.cache.files.FilePromptCache
import ai.koog.clients.openai.OpenAILLMClient
import ai.koog.agents.ext.prompt.executor.MultiLLMPromptExecutor

val client = OpenAILLMClient(System.getenv("OPENAI_API_KEY"))
val promptExecutor = MultiLLMPromptExecutor(client)

val cachedExecutor = CachedPromptExecutor(
    cache = FilePromptCache(Path("path/to/cache/directory")),
    nested = promptExecutor
)

// First run — hits the LLM
val firstResponse = cachedExecutor.execute(prompt, OpenAIModels.Chat.GPT4o)

// Second run — served from cache (much faster)
val secondResponse = cachedExecutor.execute(prompt, OpenAIModels.Chat.GPT4o)
```

### Java

```java
import ai.koog.agents.core.prompt.cache.CachedPromptExecutor;
import ai.koog.agents.core.prompt.cache.files.FilePromptCache;
import ai.koog.clients.openai.OpenAILLMClient;
import ai.koog.agents.ext.prompt.executor.MultiLLMPromptExecutor;

OpenAILLMClient client = new OpenAILLMClient(System.getenv("OPENAI_API_KEY"));
MultiLLMPromptExecutor promptExecutor = new MultiLLMPromptExecutor(client);

FilePromptCache cache = new FilePromptCache(
    Path.of("path/to/cache/directory"), null
);
CachedPromptExecutor cachedExecutor = new CachedPromptExecutor(
    cache, promptExecutor, Clock.System.INSTANCE
);

// First run — hits the LLM
List<Message.Response> firstResponse = cachedExecutor.execute(prompt, model);

// Second run — served from cache
List<Message.Response> secondResponse = cachedExecutor.execute(prompt, model);
```

> **Note**: In Java, the `CachedPromptExecutor` constructor takes an additional `Clock` parameter (`Clock.System.INSTANCE`).

## Cache Implementations

### FilePromptCache (File-System Based)

Stores cached responses as files on disk:

```kotlin
import ai.koog.agents.core.prompt.cache.files.FilePromptCache

val cache = FilePromptCache(Path("/path/to/cache/directory"))
```

### In-Memory Cache

The `prompt-cache-model` module includes an in-memory implementation:

```kotlin
import ai.koog.agents.core.prompt.cache.memory.InMemoryPromptCache

val cache = InMemoryPromptCache()
```

### Redis Cache

For distributed caching across multiple instances:

```kotlin
import ai.koog.agents.core.prompt.cache.redis.RedisPromptCache

val cache = RedisPromptCache(
    host = "localhost",
    port = 6379,
    password = "optional-password",
    database = 0
)
```

## When to Use Each Implementation

| Implementation | Best For | Limitations |
|----------------|----------|-------------|
| `InMemoryPromptCache` | Testing, single-process apps | Lost on restart, no sharing |
| `FilePromptCache` | Development, single-machine production | No sharing across machines |
| `RedisPromptCache` | Distributed systems, multi-instance | Requires Redis infrastructure |

## Performance

Caching provides significant speedup for repeated requests:

| Execution | Time |
|-----------|------|
| First run (LLM call) | ~48ms |
| Second run (cache hit) | ~1ms |

## Limitations and Caveats

| Behavior | Details |
|----------|---------|
| **Streaming (`executeStreaming()`)** | Produces response as a single chunk rather than true streaming |
| **Content moderation (`moderate()`)** | Forwards to nested executor; does not use the cache |
| **Multiple choices (`executeMultipleChoices()`)** | Not supported in either Kotlin or Java |

## Complete Example

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.prompt.cache.CachedPromptExecutor
import ai.koog.agents.core.prompt.cache.files.FilePromptCache
import ai.koog.clients.openai.OpenAILLMClient
import ai.koog.agents.ext.prompt.executor.MultiLLMPromptExecutor
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.prompt.dsl.prompt

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    val client = OpenAILLMClient(apiKey)
    val promptExecutor = MultiLLMPromptExecutor(client)

    val cachedExecutor = CachedPromptExecutor(
        cache = FilePromptCache(Path("./llm-cache")),
        nested = promptExecutor
    )

    val agent = AIAgent(
        promptExecutor = cachedExecutor,
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a helpful assistant."
    )

    // Repeated similar queries will be served from cache
    val result1 = agent.run("What is Kotlin?")
    val result2 = agent.run("What is Kotlin?") // Cache hit
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cache not working | Verify `CachedPromptExecutor` is used (not the raw executor) |
| Stale responses | Clear cache directory (file) or flush Redis |
| Disk space issues | Implement cache eviction or use Redis with TTL |
| Streaming issues | Streaming produces single chunks; this is expected behavior |
| `executeMultipleChoices` error | Multiple choice caching is not supported |
