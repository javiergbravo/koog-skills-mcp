---
name: persistence
description: Save and restore AI agent state with Koog's snapshot feature for checkpoint-based recovery
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [persistence, snapshot, checkpoint, restore, state, recovery]
---

# Persistence (Snapshots)

Koog's snapshot feature enables saving and restoring agent state for checkpoint-based recovery. This allows agents to survive crashes, resume long-running tasks, and maintain state across restarts.

## Overview

The persistence feature provides:

- **Checkpoint creation** — Save agent state after each graph node execution
- **State restoration** — Resume execution from the last checkpoint
- **Crash recovery** — Automatically recover from unexpected failures
- **Long-running task support** — Continue tasks across process restarts
- **Pluggable storage** — Use any storage backend (file, database, cloud)

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-features-snapshot:0.8.0")
}
```

## Basic Setup

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.features.snapshot.Snapshot
import ai.koog.agents.features.snapshot.SnapshotConfig
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o
) {
    install(Snapshot) {
        // Configure snapshot storage
        storage = FileSnapshotStorage("snapshots/")

        // Enable automatic checkpoints
        autoCheckpoint = true

        // Checkpoint after each node execution
        checkpointAfterEachNode = true
    }
}
```

## Snapshot Storage

### File-Based Storage

```kotlin
install(Snapshot) {
    storage = FileSnapshotStorage(
        directory = "snapshots/",
        // Optional: compress snapshots
        compress = true
    )
}
```

### In-Memory Storage

```kotlin
install(Snapshot) {
    storage = InMemorySnapshotStorage()
}
```

### Custom Storage

```kotlin
import ai.koog.agents.features.snapshot.SnapshotStorage

class DatabaseSnapshotStorage(
    private val database: Database
) : SnapshotStorage {
    override suspend fun save(agentId: String, snapshot: AgentSnapshot) {
        database.snapshots.upsert {
            it[id] = agentId
            it[data] = snapshot.serialize()
            it[timestamp] = Clock.System.now()
        }
    }

    override suspend fun load(agentId: String): AgentSnapshot? {
        return database.snapshots
            .select { it.id eq agentId }
            .firstOrNull()
            ?.let { AgentSnapshot.deserialize(it[data]) }
    }

    override suspend fun delete(agentId: String) {
        database.snapshots.deleteWhere { it.id eq agentId }
    }
}

install(Snapshot) {
    storage = DatabaseSnapshotStorage(database)
}
```

## Checkpoint Creation

### Automatic Checkpoints

```kotlin
install(Snapshot) {
    // Checkpoint after each graph node completes
    checkpointAfterEachNode = true

    // Checkpoint after tool calls
    checkpointAfterToolCall = true

    // Checkpoint after LLM responses
    checkpointAfterLLMResponse = true
}
```

### Manual Checkpoints

```kotlin
// Create a checkpoint manually
agent.createCheckpoint("before-expensive-operation")

// Perform operation
val result = agent.run("Complex task...")

// If something goes wrong, restore from checkpoint
agent.restoreFromCheckpoint("before-expensive-operation")
```

### Checkpoint with Metadata

```kotlin
agent.createCheckpoint(
    name = "user-input-received",
    metadata = mapOf(
        "userId" to "123",
        "taskId" to "task-456",
        "step" to "initial"
    )
)
```

## State Restoration

### Restore from Last Checkpoint

```kotlin
// Restore the agent to its last checkpoint
agent.restoreFromLastCheckpoint()
```

### Restore from Named Checkpoint

```kotlin
// Restore from a specific checkpoint
agent.restoreFromCheckpoint("before-expensive-operation")
```

### Restore with State Override

```kotlin
// Restore and override specific state
agent.restoreFromCheckpoint(
    name = "user-input-received",
    stateOverrides = mapOf(
        "retryCount" to 0,
        "lastError" to null
    )
)
```

## Crash Recovery

### Automatic Recovery

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.features.snapshot.Snapshot
import ai.koog.agents.features.snapshot.RecoveryStrategy

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(Snapshot) {
        storage = FileSnapshotStorage("snapshots/")

        // Enable automatic crash recovery
        recoveryStrategy = RecoveryStrategy.AUTOMATIC

        // Recovery options
        maxRecoveryAttempts = 3
        recoveryDelayMs = 1000
    }
}

// If the agent crashes, it will automatically:
// 1. Detect the crash on next startup
// 2. Load the last checkpoint
// 3. Resume execution from where it left off
val result = agent.run("Long-running task...")
```

### Manual Recovery

```kotlin
import ai.koog.agents.features.snapshot.RecoveryStrategy

install(Snapshot) {
    storage = FileSnapshotStorage("snapshots/")
    recoveryStrategy = RecoveryStrategy.MANUAL
}

// After a crash, manually recover
val recovered = agent.checkForRecovery()
if (recovered) {
    println("Agent recovered from crash")
    agent.resumeFromLastCheckpoint()
} else {
    println("No recovery needed, starting fresh")
    agent.run("New task...")
}
```

## Long-Running Tasks

### Task with Checkpoints

```kotlin
suspend fun processLargeDataset(items: List<Item>) {
    val agent = AIAgent(
        promptExecutor = executor,
        llmModel = model
    ) {
        install(Snapshot) {
            storage = FileSnapshotStorage("snapshots/")
            checkpointAfterEachNode = true
        }
    }

    // Process items with checkpoints
    for ((index, item) in items.withIndex()) {
        // Create checkpoint before each item
        agent.createCheckpoint(
            name = "item-$index",
            metadata = mapOf("totalItems" to items.size, "currentIndex" to index)
        )

        // Process item
        val result = agent.run("Process item: ${item.name}")
        println("Processed: ${item.name} -> $result")
    }
}
```

### Resumable Pipeline

```kotlin
suspend fun resumablePipeline(input: String): String {
    val agent = AIAgent(
        promptExecutor = executor,
        llmModel = model
    ) {
        install(Snapshot) {
            storage = FileSnapshotStorage("snapshots/")
            checkpointAfterEachNode = true
        }
    }

    // Check if we can resume from a previous run
    val lastCheckpoint = agent.getLastCheckpoint()
    if (lastCheckpoint != null) {
        println("Resuming from checkpoint: ${lastCheckpoint.name}")
        agent.restoreFromCheckpoint(lastCheckpoint.name)
        return agent.resume()
    }

    // Start fresh
    return agent.run(input)
}
```

## Agent Snapshot Structure

```kotlin
data class AgentSnapshot(
    val agentId: String,                    // Unique agent identifier
    val checkpointName: String,             // Checkpoint name
    val timestamp: Instant,                 // When checkpoint was created
    val executionState: ExecutionState,     // Current execution state
    val conversationHistory: List<Message>, // Full conversation history
    val toolCallHistory: List<ToolCall>,    // Tool call history
    val metadata: Map<String, Any>,         // Custom metadata
    val graphState: GraphState?             // Graph execution state (if using graphs)
)
```

> **Security:** `conversationHistory` and `toolCallHistory` may contain sensitive data including
> user inputs, PII, credentials passed as tool arguments, and confidential business information.
> Treat snapshot files with the same care as any sensitive data store.

## Securing Snapshots

### Encrypt Snapshot Files

Use an encrypted storage backend for snapshots that contain sensitive data. Combine with
AES-256-GCM encryption (see [Memory Encryption](../../memory-and-rag/memory-encryption/SKILL.md)):

```kotlin
class EncryptedFileSnapshotStorage(
    private val directory: String,
    private val encryptor: Aes256GCMEncryptor
) : SnapshotStorage {
    override suspend fun save(agentId: String, snapshot: AgentSnapshot) {
        val json = Json.encodeToString(snapshot)
        val encrypted = encryptor.encrypt(json.toByteArray())
        File(directory, "$agentId.snap").writeBytes(encrypted)
    }

    override suspend fun load(agentId: String): AgentSnapshot? {
        val file = File(directory, "$agentId.snap")
        if (!file.exists()) return null
        val decrypted = encryptor.decrypt(file.readBytes())
        return Json.decodeFromString(String(decrypted))
    }

    override suspend fun delete(agentId: String) {
        File(directory, "$agentId.snap").delete()
    }
}

install(Snapshot) {
    storage = EncryptedFileSnapshotStorage(
        directory = "snapshots/",
        encryptor = Aes256GCMEncryptor(secretKey = System.getenv("SNAPSHOT_ENCRYPTION_KEY")
            ?: error("SNAPSHOT_ENCRYPTION_KEY not set"))
    )
}
```

### File System Permissions

Restrict access to the snapshot directory to the process user only:

```bash
# Unix/Linux — restrict to owner only
chmod 700 snapshots/
chmod 600 snapshots/*.snap
```

### Retention Policy

Snapshots accumulate over time and consume disk space. Implement a retention policy:

```kotlin
// Delete snapshots older than 7 days
val retentionDays = 7L
File("snapshots/").listFiles()
    ?.filter { it.lastModified() < System.currentTimeMillis() - retentionDays * 86_400_000 }
    ?.forEach { it.delete() }
```

## Java API

```java
import ai.koog.agents.features.snapshot.Snapshot;
import ai.koog.agents.features.snapshot.SnapshotConfig;
import ai.koog.agents.features.snapshot.FileSnapshotStorage;

var agent = AIAgent.builder(executor, model)
    .withFeature(Snapshot.INSTANCE, config -> {
        config.setStorage(new FileSnapshotStorage("snapshots/"));
        config.setAutoCheckpoint(true);
        config.setCheckpointAfterEachNode(true);
        return null;
    })
    .build();

// Create checkpoint
agent.createCheckpoint("before-operation");

// Restore from checkpoint
agent.restoreFromCheckpoint("before-operation");
```

## Best Practices

1. **Use meaningful checkpoint names** — Name checkpoints descriptively for easy identification
2. **Include metadata** — Add relevant metadata to checkpoints for debugging
3. **Clean up old checkpoints** — Implement retention policies to prevent storage bloat
4. **Test recovery** — Regularly test crash recovery to ensure it works correctly
5. **Use appropriate storage** — Choose storage based on durability requirements
6. **Handle storage failures** — Implement fallback strategies for storage errors
7. **Encrypt sensitive snapshots** — Use `EncryptedFileSnapshotStorage` when agents handle PII or confidential data
8. **Restrict file permissions** — Set `chmod 700` on the snapshots directory
9. **Rotate encryption keys** — Implement key rotation and re-encrypt old snapshots periodically

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Checkpoint not created | Verify `autoCheckpoint = true` or call `createCheckpoint()` explicitly |
| Cannot restore | Ensure the checkpoint exists and storage is accessible |
| Recovery not working | Check `recoveryStrategy` is set to `AUTOMATIC` or `MANUAL` |
| Storage errors | Verify storage permissions and connectivity |
| State mismatch | Ensure the agent configuration matches the checkpoint's configuration |
