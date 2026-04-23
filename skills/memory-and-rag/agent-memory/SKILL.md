---
name: agent-memory
description: Store and retrieve facts across conversations with Koog's AgentMemory, Facts, Concepts, Subjects, and memory nodes
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [agent-memory, facts, concepts, subjects, scope, memory-provider, encrypted, single-fact, multiple-facts]
---

# Agent Memory

Store, retrieve, and use arbitrary data across conversations with Koog's `AgentMemory` feature. Unlike `ChatMemory` (which stores message history), `AgentMemory` manages structured facts organized by concepts, subjects, and scopes.

## Dependency

```kotlin
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-features-memory:0.8.0")
}
```

## Data Model

### Facts

Facts are individual pieces of information stored in memory. Two types exist:

| Type | Description | Example |
|------|-------------|---------|
| `SingleFact` | One value per concept | User's preferred IDE theme: `"dark"` |
| `MultipleFacts` | Multiple values per concept | Programming languages: `["Kotlin", "Python", "Rust"]` |

Both types carry a `concept`, a `value`/`values`, and a `timestamp` (epoch milliseconds).

### Concepts

Concepts categorize information and carry metadata:

```kotlin
val ideTheme = Concept(
    keyword = "ide-theme",
    description = "User's preferred IDE color theme",
    factType = FactType.SINGLE
)

val programmingLanguages = Concept(
    keyword = "programming-languages",
    description = "Programming languages the user knows",
    factType = FactType.MULTIPLE
)
```

| Property | Type | Description |
|----------|------|-------------|
| `keyword` | `String` | Unique identifier for the concept |
| `description` | `String` | Explanation of what the concept represents |
| `factType` | `FactType` | Either `FactType.SINGLE` or `FactType.MULTIPLE` |

### Subjects

Subjects are entities that facts associate with. Extend `MemorySubject` to define custom subjects:

```kotlin
object User : MemorySubject() {
    override val name = "user"
    override val promptDescription = "Personal preferences, contact info, and history"
    override val priorityLevel = 10
}

object Machine : MemorySubject() {
    override val name = "machine"
    override val promptDescription = "Installed tools, SDKs, and OS configuration"
    override val priorityLevel = 5
}
```

A predefined `MemorySubject.Everything` serves as a default catch-all subject.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `String` | Unique identifier for the subject |
| `promptDescription` | `String` | Description shown to the LLM |
| `priorityLevel` | `Int` | Higher values = more specific; used for precedence when loading facts |

### Memory Scopes

Scopes define the context in which facts are relevant:

| Scope | Description | Parameters |
|-------|-------------|------------|
| `MemoryScope.Agent` | Specific to an agent | — |
| `MemoryScope.Feature` | Specific to a feature | — |
| `MemoryScope.Product` | Specific to a product | `productName: String` |
| `MemoryScope.CrossProduct` | Relevant across multiple products | — |

## Installation

Install `AgentMemory` inside the agent configuration block:

```kotlin
import ai.koog.agents.memory.feature.AgentMemory

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a helpful assistant."
) {
    install(AgentMemory) {
        memoryProvider = localFileMemoryProvider
        agentName = "my-agent"
        featureName = "chat-feature"
        organizationName = "my-org"
        productName = "my-product"
    }
}
```

## Memory Providers

### NoMemory (Default)

The default provider that does not persist anything. Useful for testing:

```kotlin
install(AgentMemory) {
    memoryProvider = NoMemory
}
```

### LocalFileMemoryProvider

Persists facts to the local filesystem:

```kotlin
import ai.koog.agents.memory.providers.LocalFileMemoryProvider
import ai.koog.agents.memory.config.LocalMemoryConfig
import ai.koog.agents.memory.storage.SimpleStorage
import ai.koog.agents.storage.filesystem.JVMFileSystemProvider

val localFileMemoryProvider = LocalFileMemoryProvider(
    config = LocalMemoryConfig(),
    storage = SimpleStorage(),
    fsProvider = JVMFileSystemProvider.ReadWrite,
    root = Path("/path/to/memory/storage")
)

install(AgentMemory) {
    memoryProvider = localFileMemoryProvider
}
```

### Custom AgentMemoryProvider

Implement the `AgentMemoryProvider` interface for custom storage backends (databases, cloud storage, etc.):

```kotlin
import ai.koog.agents.memory.providers.AgentMemoryProvider

class DatabaseMemoryProvider(
    private val database: MyDatabase
) : AgentMemoryProvider {
    override suspend fun save(fact: Fact, subject: MemorySubject, scope: MemoryScope) {
        database.saveFact(fact, subject, scope)
    }

    override suspend fun load(
        concept: Concept,
        subject: MemorySubject,
        scope: MemoryScope
    ): List<Fact> {
        return database.getFacts(concept, subject, scope)
    }

    override suspend fun loadAll(
        subject: MemorySubject,
        scope: MemoryScope
    ): List<Fact> {
        return database.getAllFacts(subject, scope)
    }

    override suspend fun loadByDescription(
        description: String,
        subject: MemorySubject,
        scope: MemoryScope
    ): List<Fact> {
        return database.getFactsByDescription(description, subject, scope)
    }
}
```

## Memory Nodes

Koog provides four predefined nodes for use in agent strategies:

### nodeLoadAllFactsFromMemory

Loads all facts about a subject from memory for a given concept:

```kotlin
val loadFacts by nodeLoadAllFactsFromMemory<Unit>(
    concept = Concept("user-preference", "User's preferences", FactType.SINGLE),
    subjects = listOf(MemorySubjects.User)
)
```

### nodeLoadFromMemory

Loads specific facts for a given concept:

```kotlin
val loadSpecific by nodeLoadFromMemory<Unit>(
    concept = Concept("programming-languages", "Languages the user knows", FactType.MULTIPLE),
    subjects = listOf(MemorySubjects.User)
)
```

### nodeSaveToMemory

Saves a fact to memory:

```kotlin
val saveFact by nodeSaveToMemory<Unit>(
    concept = Concept("ide-theme", "Preferred IDE theme", FactType.SINGLE),
    subjects = listOf(MemorySubjects.User)
)
```

### nodeSaveToMemoryAutoDetectFacts

Uses the LLM to automatically detect and extract facts from chat history:

```kotlin
val detectFacts by nodeSaveToMemoryAutoDetectFacts<Unit>(
    subjects = listOf(MemorySubjects.User, MemorySubjects.Machine)
)
```

## Using Memory in Strategy Nodes

Inside any node, `withMemory { ... }` provides access to memory operations:

### Load Facts to Agent Context

```kotlin
val loadPreferences by node<Unit, Unit> {
    withMemory {
        loadFactsToAgent(
            llm = llm,
            concept = Concept("user-preference", "User's preferred settings", FactType.SINGLE),
            subjects = listOf(MemorySubjects.User)
        )
    }
}
```

### Save Facts from History

```kotlin
val saveFromHistory by node<Unit, Unit> {
    withMemory {
        saveFactsFromHistory(
            llm = llm,
            concept = Concept("user-topics", "Topics discussed", FactType.MULTIPLE),
            subjects = listOf(MemorySubjects.User)
        )
    }
}
```

## Complete Strategy Example

```kotlin
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.memory.feature.AgentMemory
import ai.koog.agents.memory.feature.nodes.*
import ai.koog.agents.memory.model.Concept
import ai.koog.agents.memory.model.FactType

val memoryStrategy = strategy<String, String>("memory-agent") {
    val detectFacts by nodeSaveToMemoryAutoDetectFacts<Unit>(
        subjects = listOf(MemorySubjects.User, MemorySubjects.Machine)
    )

    val loadPreferences by node<Unit, Unit> {
        withMemory {
            loadFactsToAgent(
                llm = llm,
                concept = Concept(
                    "user-preference",
                    "User's preferred settings and configurations",
                    FactType.SINGLE
                ),
                subjects = listOf(MemorySubjects.User)
            )
        }
    }

    val nodeCallLLM by nodeLLMRequest()
    val nodeExecuteTool by nodeExecuteTool()
    val nodeSendToolResult by nodeLLMSendToolResult()

    edge(nodeStart forwardTo detectFacts)
    edge(detectFacts forwardTo loadPreferences)
    edge(loadPreferences forwardTo nodeCallLLM)
    edge(nodeCallLLM forwardTo nodeFinish onAssistantMessage { true })
    edge(nodeCallLLM forwardTo nodeExecuteTool onToolCall { true })
    edge(nodeExecuteTool forwardTo nodeSendToolResult)
    edge(nodeSendToolResult forwardTo nodeFinish onAssistantMessage { true })
    edge(nodeSendToolResult forwardTo nodeExecuteTool onToolCall { true })
}
```

## Encrypted Storage

For sensitive data, wrap the filesystem provider with `EncryptedStorage` using AES-256-GCM encryption:

```kotlin
import ai.koog.agents.memory.storage.EncryptedStorage
import ai.koog.agents.memory.storage.Aes256GCMEncryptor

val encryptor = Aes256GCMEncryptor(secretKey = "your-secret-key")
val encryptedFs = EncryptedStorage(
    fsProvider = JVMFileSystemProvider.ReadWrite,
    encryptor = encryptor
)

val localFileMemoryProvider = LocalFileMemoryProvider(
    config = LocalMemoryConfig(),
    storage = SimpleStorage(),
    fsProvider = encryptedFs,
    root = Path("/path/to/encrypted/memory")
)
```

## API Packages

| Package | Contents |
|---------|----------|
| `ai.koog.agents.memory.feature` | Core `AgentMemory` class |
| `ai.koog.agents.memory.feature.nodes` | Predefined memory nodes |
| `ai.koog.agents.memory.config` | Memory scope definitions |
| `ai.koog.agents.memory.model` | Core data structures (Fact, Concept, FactType) |
| `ai.koog.agents.memory.feature.history` | History compression for memory retrieval |
| `ai.koog.agents.memory.providers` | `AgentMemoryProvider` interface and implementations |
| `ai.koog.agents.memory.storage` | File operation interfaces and platform-specific implementations |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Facts not persisting | Ensure a real `memoryProvider` is configured (not `NoMemory`) |
| Facts not loading | Check that `subject` and `scope` match between save and load |
| Priority conflicts | Higher `priorityLevel` subjects take precedence; adjust levels |
| Encrypted storage errors | Verify the secret key is consistent across reads and writes |
| LLM not using facts | Ensure `loadFactsToAgent` is called before the LLM request node |
