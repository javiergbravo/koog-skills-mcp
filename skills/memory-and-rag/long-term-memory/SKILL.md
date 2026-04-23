---
name: long-term-memory
description: Enable persistent long-term memory for AI agents with Koog's LongTermMemory feature for cross-session knowledge retention
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [long-term-memory, persistent, cross-session, storage, retrieval, knowledge]
---

# Long-Term Memory

Enable persistent memory for Koog AI agents with the `LongTermMemory` feature. This experimental feature provides two core capabilities: **retrieval** (augmenting LLM prompts with relevant context) and **ingestion** (persisting conversation messages for future retrieval).

## Dependency

```kotlin
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-features-longterm-memory:0.8.0")
}
```

### Maven

```xml
<dependency>
    <groupId>ai.koog</groupId>
    <artifactId>agents-features-longterm-memory-jvm</artifactId>
    <version>0.8.0</version>
</dependency>
```

## Opt-In Requirement

`LongTermMemory` is experimental. Annotate usage with `@OptIn`:

```kotlin
@OptIn(ExperimentalAgentsApi::class)
fun setupAgent() { ... }
```

Or use a file-level opt-in:

```kotlin
@file:OptIn(ExperimentalAgentsApi::class)
```

## Installation

Install `LongTermMemory` inside the agent configuration block with retrieval and/or ingestion settings:

```kotlin
import ai.koog.agents.features.memory.LongTermMemory

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a helpful assistant.",
    toolRegistry = ToolRegistry.EMPTY
) {
    install(LongTermMemory) {
        retrieval {
            storage = myStorage
            searchStrategy = SimilaritySearchStrategy(topK = 5)
        }
    }
}
```

### Java

```java
AIAgent agent = AIAgent.builder()
    .promptExecutor(executor)
    .llmModel(OpenAIModels.Chat.GPT4o)
    .systemPrompt("You are a helpful assistant.")
    .install(LongTermMemory.Feature, config -> {
        config.retrieval(
            new LongTermMemory.RetrievalSettingsBuilder()
                .withStorage(myStorage)
                .withSearchStrategy(
                    SearchStrategy.builder().similarity().withTopK(5).build()
                )
                .build()
        );
    })
    .build();
```

## Retrieval Configuration (RAG)

Used when you have a pre-populated knowledge base. The retrieval system augments LLM prompts with relevant context from storage.

### Prompt Augmenters

Control how retrieved context is injected into the prompt:

| Augmenter | Behavior |
|-----------|----------|
| `SystemPromptAugmenter()` | Inserts context as a system message at prompt start |
| `UserPromptAugmenter()` | Inserts context as a separate user message before the last user message |
| `PromptAugmenter { prompt, context -> ... }` | Custom augmentation via lambda |

```kotlin
install(LongTermMemory) {
    retrieval {
        storage = myStorage
        promptAugmenter = SystemPromptAugmenter()
        searchStrategy = SimilaritySearchStrategy(topK = 5)
    }
}
```

### Query Extractors

Control how the search query is derived from the prompt:

| Extractor | Behavior |
|-----------|----------|
| `LastUserMessageQueryExtractor()` | Uses last user message content (**default**) |
| `QueryExtractor { prompt -> ... }` | Custom extraction via lambda |

```kotlin
install(LongTermMemory) {
    retrieval {
        storage = myStorage
        queryExtractor = QueryExtractor { prompt ->
            prompt.messages
                .filter { it.role == Message.Role.User }
                .takeLast(2)
                .joinToString(" ") { it.content }
                .ifEmpty { null }
        }
    }
}
```

### Search Strategies

| Strategy | Behavior |
|----------|----------|
| `SimilaritySearchStrategy(topK, threshold)` | Vector similarity semantic search (**default, recommended**) |
| `SearchStrategy { query -> ... }` | Custom search via lambda |

```kotlin
install(LongTermMemory) {
    retrieval {
        storage = myStorage
        searchStrategy = SimilaritySearchStrategy(
            topK = 5,
            similarityThreshold = 0.7
        )
        namespace = "my-knowledge-base"
    }
}
```

## Ingestion Configuration

Used to build up a memory storage over time by persisting conversation messages.

### Extraction Strategies

Control which message roles are extracted:

```kotlin
install(LongTermMemory) {
    ingestion {
        storage = myStorage
        extractionStrategy = FilteringExtractionStrategy(
            messageRolesToExtract = setOf(Message.Role.User, Message.Role.Assistant)
        )
    }
}
```

### Ingestion Timing

| Timing | Behavior |
|--------|----------|
| `ON_LLM_CALL` | Messages ingested before each LLM call; assistant output ingested after completion. Enables intra-session RAG. |
| `ON_AGENT_COMPLETION` | Final accumulated session history ingested once at agent completion. |

```kotlin
install(LongTermMemory) {
    ingestion {
        storage = myStorage
        timing = IngestionTiming.ON_LLM_CALL
    }
}
```

### Custom Extraction Strategy

Implement `ExtractionStrategy` for full control over message-to-record transformation:

```kotlin
val summarizingExtractor = ExtractionStrategy { messages ->
    messages
        .filter { it.role == Message.Role.Assistant }
        .map { MemoryRecord(content = summarize(it.content)) }
}

install(LongTermMemory) {
    ingestion {
        storage = myStorage
        extractionStrategy = summarizingExtractor
    }
}
```

## Disabling Automatic Behavior

By default, retrieval and ingestion run automatically. Both can be disabled for manual control:

```kotlin
install(LongTermMemory) {
    retrieval {
        storage = myStorage
        enableAutomaticRetrieval = false // disable auto-augmentation
    }
    ingestion {
        storage = myStorage
        enableAutomaticIngestion = false // disable auto-persistence
    }
}
```

### Operating Modes

| Mode | Retrieval | Ingestion | Use Case |
|------|-----------|-----------|----------|
| **Full automatic** (default) | Auto | Auto | Just configure storage |
| **Manual only** | Manual | Manual | Full control in strategy nodes |
| **Hybrid** | Manual | Auto | Build memory over time, retrieve on demand |

## Accessing from Strategy Nodes

Use `withLongTermMemory { }` inside a node for direct search and add operations:

```kotlin
val searchNode by node<String, String> { input ->
    withLongTermMemory {
        val record = MemoryRecord(content = "important fact")
        ingestionStorage?.add(listOf(record), namespace = "my-namespace")

        val request = SimilaritySearchRequest(queryText = input, limit = 5)
        val results = retrievalStorage?.search(request, namespace = "my-namespace")
        results?.joinToString("\n") { it.content } ?: "No results found"
    }
}
```

Or use `longTermMemory()` to get the feature instance directly:

```kotlin
val node by node<String, Unit> { input ->
    val ltm = longTermMemory()
    val storage = ltm.ingestionStorage
    // ... use storage directly
}
```

## Custom Storage Implementation

Implement `SearchStorage` and/or `WriteStorage` interfaces to connect to any vector database:

```kotlin
class MyVectorDbStorage(
    private val client: MyVectorDbClient
) : SearchStorage<TextDocument, SimilaritySearchRequest>,
    WriteStorage<TextDocument> {

    override suspend fun search(
        request: SimilaritySearchRequest,
        namespace: String?
    ): List<SearchResult<TextDocument>> {
        val embedding = client.embed(request.queryText)
        val results = client.search(embedding, request.limit, namespace)
        return results.map { SearchResult(it.document, it.score) }
    }

    override suspend fun add(
        records: List<TextDocument>,
        namespace: String?
    ) {
        for (record in records) {
            val embedding = client.embed(record.content)
            client.upsert(record, embedding, namespace)
        }
    }
}
```

### Built-in Testing Storage

`InMemoryRecordStorage` keeps records in memory for testing:

```kotlin
import ai.koog.agents.features.memory.storage.InMemoryRecordStorage

val storage = InMemoryRecordStorage()

install(LongTermMemory) {
    retrieval {
        storage = storage
        searchStrategy = SimilaritySearchStrategy(topK = 5)
    }
    ingestion {
        storage = storage
    }
}
```

> **Note**: `InMemoryRecordStorage` implements both `KeywordSearchRequest` and `SimilaritySearchRequest` as simple case-insensitive substring matching (no vector embeddings).

## Complete Example

```kotlin
@OptIn(ExperimentalAgentsApi::class)
suspend fun main() {
    val storage = InMemoryRecordStorage()

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a helpful assistant with long-term memory."
    ) {
        install(LongTermMemory) {
            retrieval {
                storage = storage
                promptAugmenter = SystemPromptAugmenter()
                searchStrategy = SimilaritySearchStrategy(topK = 5)
            }
            ingestion {
                storage = storage
                extractionStrategy = FilteringExtractionStrategy(
                    messageRolesToExtract = setOf(Message.Role.User, Message.Role.Assistant)
                )
                timing = IngestionTiming.ON_AGENT_COMPLETION
            }
        }
    }

    // First session
    agent.run("My favorite programming language is Kotlin")

    // Second session — agent can retrieve previous context
    agent.run("What programming language do I prefer?")
}
```

## ChatMemory vs AgentMemory vs LongTermMemory

| Feature | Scope | Data Type | Persistence | Use Case |
|---------|-------|-----------|-------------|----------|
| **ChatMemory** | Per-session conversation history | Messages | Session-scoped | Multi-turn chat continuity |
| **AgentMemory** | Cross-conversation facts | Facts, Concepts, Subjects | File-based or custom | User preferences, personalization |
| **LongTermMemory** | Cross-session knowledge | Documents, records | Vector store | RAG, knowledge retrieval |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ExperimentalAgentsApi` error | Add `@OptIn(ExperimentalAgentsApi::class)` annotation |
| No context retrieved | Ensure storage has documents; check `similarityThreshold` |
| Ingestion not working | Verify `enableAutomaticIngestion` is `true` (default) |
| Storage not persisting | Use a persistent storage backend (not `InMemoryRecordStorage`) |
| Performance issues | Reduce `topK`; use a faster embedding model |
