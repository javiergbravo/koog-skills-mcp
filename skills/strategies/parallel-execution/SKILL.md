---
name: parallel-execution
description: Execute nodes in parallel and transfer data between nodes in Koog strategy graphs
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [parallel, concurrent, data-transfer, nodes, execution]
---

# Parallel Node Execution

Execute multiple AI agent nodes concurrently within Koog strategy graphs. Supports processing input through different models simultaneously, performing independent operations in parallel, and implementing competitive evaluation patterns.

## Core Components

| Component | Description |
|-----------|-------------|
| `parallel()` | Executes multiple nodes concurrently and collects results |
| `ParallelResult` | Represents completed results from parallel execution |
| `NodeExecutionResult` | Contains output and context from a node execution |
| `AIAgentStorage` | Key-value storage for passing data between nodes |

## Basic Parallel Execution

Use `parallel<Input, Output>` with node references and a merge strategy:

```kotlin
val nodeName by parallel<Input, Output>(
    firstNode, secondNode, thirdNode
) {
    selectByMax { it.length }
}
```

## Merge Strategies

Four strategies for combining parallel results:

### 1. `selectBy` — Predicate-based Selection

Returns the first result matching a boolean condition:

```kotlin
val bestJoke by parallel<String, String>(
    nodeGPT4o, nodeSonnet, nodeOpus
) {
    selectBy { it.contains("programmer") }
}
```

### 2. `selectByMax` — Maximum Value Selection

Picks the result with the highest value from a comparison function:

```kotlin
val longestResult by parallel<String, Int>(
    nodeCalcTokens, nodeCalcSymbols, nodeCalcWords
) {
    selectByMax { it }
}
```

### 3. `selectByIndex` — Index-based Selection via External Evaluation

Delegates selection to a function that can invoke an LLM:

```kotlin
val bestJoke by parallel<String, String>(
    nodeGPT4o, nodeSonnet, nodeOpus
) {
    selectByIndex { jokes ->
        llm.writeSession {
            model = OpenAIModels.Chat.GPT4o
            appendPrompt {
                system("You are a comedy critic. Rate each joke.")
                user("Jokes:\n${jokes.joinToString("\n---\n")}")
            }
            val response = requestLLMStructured<JokeRating>()
            response.getOrNull()!!.data.bestJokeIndex
        }
    }
}
```

This enables using one model (e.g., GPT-4o) to judge outputs from multiple competing models.

### 4. `fold` — Aggregation

Combines all results into a single value:

```kotlin
val allJokes by parallel<String, String>(
    nodeGPT4o, nodeSonnet, nodeOpus
) {
    fold("Jokes:\n") { result, joke -> "$result\n$joke" }
}
```

## Complete Example: Best Joke Agent

Three joke-generating nodes run in parallel, with a GPT-4o session acting as comedy critic:

```kotlin
import ai.koog.agents.core.dsl.builder.strategy
import ai.koog.agents.core.dsl.builder.forwardTo
import ai.koog.agents.core.dsl.builder.parallel

@Serializable
data class JokeRating(val bestJokeIndex: Int, val reasoning: String)

val bestJokeStrategy = strategy<String, String>("best-joke") {
    val nodeGenerateBestJoke by parallel<String, String>(
        nodeGPT4oJoke, nodeSonnetJoke, nodeOpusJoke
    ) {
        selectByIndex { jokes ->
            llm.writeSession {
                model = OpenAIModels.Chat.GPT4o
                appendPrompt {
                    system("You are a comedy critic. Pick the funniest joke.")
                    user("Jokes:\n${jokes.mapIndexed { i, j -> "[$i] $j" }.joinToString("\n")}")
                }
                val response = requestLLMStructured<JokeRating>()
                response.getOrNull()!!.data.bestJokeIndex
            }
        }
    }

    edge(nodeStart forwardTo nodeGenerateBestJoke)
    edge(nodeGenerateBestJoke forwardTo nodeFinish)
}
```

## Data Transfer Between Nodes

### Storage Key System

Koog uses `AIAgentStorage`, a type-safe key-value storage for passing data between nodes:

```kotlin
// Define a data class
class UserData(val name: String, val age: Int)

// Create a typed storage key
val userDataKey = createStorageKey<UserData>("user-data")

// Store data in a node
val nodeSaveData by node<Unit, Unit> {
    storage.set(userDataKey, UserData("John", 26))
}

// Retrieve data in another node
val nodeRetrieveData by node<String, Unit> { message ->
    storage.get(userDataKey)?.let { user ->
        println("Hello $user, message: $message")
    }
}
```

### Storage Key Properties

| Property | Detail |
|----------|--------|
| Type safety | Generic type `T` specifies the data type |
| Uniqueness | Each key instance is unique (name is for debugging only) |
| Thread safety | `AIAgentStorage` uses a Mutex for concurrent access |
| Operations | `set`, `get`, `getValue`, `remove`, `clear`, `putAll`, `toMap` |

### Java Pattern

```java
// Define key
AIAgentStorageKey<UserData> userDataKey = AIAgentStorage.createStorageKey("user-data");

// Store
var nodeSaveData = AIAgentNode.builder("nodeSaveData")
    .withInput(String.class)
    .withOutput(String.class)
    .withAction((input, ctx) -> {
        ctx.getStorage().set(userDataKey, new UserData("John", 26));
        return "";
    })
    .build();

// Retrieve
var nodeRetrieveData = AIAgentNode.builder("nodeRetrieveData")
    .withInput(String.class)
    .withOutput(String.class)
    .withAction((message, ctx) -> {
        var userData = ctx.getStorage().get(userDataKey);
        System.out.println("Hello " + userData + ", message: " + message);
        return "";
    })
    .build();
```

## Parallel Tool Calls

Execute multiple tool calls simultaneously:

```kotlin
val executeMultipleTools by nodeExecuteMultipleTools()
val processMultipleResults by nodeLLMSendMultipleToolResults()

edge(someNode forwardTo executeMultipleTools)
edge(executeMultipleTools forwardTo processMultipleResults)
```

## Concurrent Agent Execution

Run multiple agents concurrently using coroutines:

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

suspend fun runParallelAgents(query: String): Map<String, String> = coroutineScope {
    val researchDeferred = async { researchAgent.run("Research: $query") }
    val analysisDeferred = async { analysisAgent.run("Analyze: $query") }
    val summaryDeferred = async { summaryAgent.run("Summarize: $query") }

    mapOf(
        "research" to researchDeferred.await(),
        "analysis" to analysisDeferred.await(),
        "summary" to summaryDeferred.await()
    )
}
```

## Best Practices

1. **Independence**: Only parallelize nodes that don't depend on each other
2. **Resource awareness**: Multiple simultaneous LLM API calls can be costly
3. **Context management**: Each parallel execution forks its context; merging requires deciding which context to preserve
4. **Strategy selection**: Match merge strategy to use case:
   - Competitive evaluation → `selectByIndex`
   - Filtering → `selectBy`
   - Maximum value → `selectByMax`
   - Aggregation → `fold`
5. **Error handling**: Handle failures in individual parallel branches
6. **Timeout**: Set appropriate timeouts for parallel operations

## Performance Considerations

- Each parallel node spawns a new coroutine
- Context forking/merging introduces computational overhead
- Resource contention increases with more parallel executions

Ideal candidates for parallelization are operations that are:
- Independent of each other
- Have significant execution time
- Don't share mutable state

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Deadlocks in parallel execution | Ensure no circular dependencies between nodes |
| Memory issues | Limit parallel node count; use `selectBy` to discard unneeded results |
| Inconsistent results | Check that parallel nodes don't mutate shared state |
| Slow parallel execution | Bottleneck may be in merge strategy (e.g., LLM call in `selectByIndex`) |
