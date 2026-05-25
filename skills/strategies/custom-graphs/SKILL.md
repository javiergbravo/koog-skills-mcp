---
name: custom-graphs
description: Build advanced custom strategy graphs with Koog's strategy builder, custom nodes, and complex workflows
compatibility: "Koog 1.0.0"
license: Apache-2.0
keywords: [custom-graph, strategy-builder, advanced, workflow, custom-node, complex]
---

# Custom Strategy Graphs

Build advanced agent workflows as directed graphs using Koog's `strategy` builder. Custom graphs give you full control over node execution, edge conditions, and data flow.

## Strategy Builder

### Kotlin

```kotlin
import ai.koog.agents.core.dsl.builder.strategy
import ai.koog.agents.core.dsl.builder.forwardTo
import ai.koog.agents.core.dsl.extension.onTextMessage
import ai.koog.agents.core.dsl.extension.onToolCalls

val myStrategy = strategy<String, String>("my-workflow") {
    // Define nodes
    val nodeProcessInput by nodeLLMRequest()
    val nodeExecuteTools by nodeExecuteTools()
    val nodeSendResult by nodeLLMSendToolResults()

    // Define edges
    edge(nodeStart forwardTo nodeProcessInput)
    edge(nodeProcessInput forwardTo nodeFinish onTextMessage { true })
    edge(nodeProcessInput forwardTo nodeExecuteTools onToolCalls { true })
    edge(nodeExecuteTools forwardTo nodeSendResult)
    edge(nodeSendResult forwardTo nodeFinish onTextMessage { true })
    edge(nodeSendResult forwardTo nodeExecuteTools onToolCalls { true })
}
```

### Java

```java
var graph = AIAgentGraphStrategy.builder("single_run")
    .withInput(String.class)
    .withOutput(String.class);
// ... define nodes and edges, then call graph.build()
```

## Predefined Nodes

| Node | Input → Output | Purpose |
|------|---------------|---------|
| `nodeLLMRequest()` | `String → Message` | Send input to LLM, get response |
| `nodeExecuteTools()` | `List<ToolCall> → ReceivedToolResults` | Execute multiple tools concurrently |
| `nodeLLMSendToolResults()` | `ReceivedToolResults → Message` | Send multiple tool results to LLM |
| `nodeLLMCompressHistory<T>()` | `T → T` | Compress conversation history |
| `nodeLLMRequestStructured<T>()` | `String → T` | Request structured output from LLM |

## Custom Nodes

Create custom nodes using the `node` function:

```kotlin
// Simple transform node
val nodeTransform by node<String, String> { input ->
    input.uppercase()
}

// Async node with side effects
val nodeSaveResult by node<String, String> { input ->
    database.save(input)
    "Saved: $input"
}

// Node that calls the LLM with custom session
val nodeCustomLLM by node<String, String> { input ->
    llm.writeSession {
        model = OpenAIModels.Chat.GPT4o
        appendPrompt {
            system("You are a tone analyzer.")
            user(input)
        }
        requestLLM().content
    }
}
```

## Edges and Conditions

Edges define transitions between nodes. Use the `edge` function with `forwardTo`:

### Condition Types

| Condition | Behavior |
|-----------|----------|
| `onTextMessage { true }` | Matches when the LLM responds with a message |
| `onToolCalls { true }` | Matches when the LLM calls one or more tools |
| `onToolNotCalled { true }` | Matches when the LLM does not call a tool |
| `onCondition { input -> ... }` | General-purpose boolean condition |

### Output Transformation

Transform data before passing to the next node:

```kotlin
edge(sourceNode forwardTo targetNode
    onCondition { input -> input.length > 10 }
    transformed { input -> input.uppercase() }
)
```

### Conditional Branching

Route to different nodes based on input:

```kotlin
edge((nodeAnalyze forwardTo branchA) onCondition { it == "quick" })
edge((nodeAnalyze forwardTo branchB) onCondition { it == "deep" })
```

## History Compression

Add conditional compression when the conversation grows too long:

```kotlin
val nodeCompressHistory by nodeLLMCompressHistory<ReceivedToolResults>()

edge(
    (nodeExecuteTools forwardTo nodeCompressHistory)
        onCondition { _ -> llm.readSession { prompt.messages.size > 100 } }
)
edge(
    (nodeExecuteTools forwardTo nodeSendResult)
        onCondition { _ -> llm.readSession { prompt.messages.size <= 100 } }
)
edge(nodeCompressHistory forwardTo nodeSendResult)
```

## Subgraphs

Organize sections of a graph with their own tool subsets:

### Kotlin

```kotlin
val firstSubgraph by subgraph<FirstInput, FirstOutput>(
    name = "first",
    tools = listOf(someTool)
) {
    val nodeProcess by nodeLLMRequest()
    val nodeExecuteTools by nodeExecuteTools()
    val nodeSendResult by nodeLLMSendToolResults()

    edge(nodeStart forwardTo nodeProcess)
    edge(nodeProcess forwardTo nodeFinish onTextMessage { true })
    edge(nodeProcess forwardTo nodeExecuteTools onToolCalls { true })
    edge(nodeExecuteTools forwardTo nodeSendResult)
    edge(nodeSendResult forwardTo nodeFinish onTextMessage { true })
}
```

### Java

```java
var subgraph = AIAgentSubgraph.builder("first")
    .withInput(FirstInput.class)
    .withOutput(FirstOutput.class)
    .limitedTools(someTool)
    .build();
```

## Complete Tone Analysis Example

```kotlin
fun toneStrategy(name: String, toolRegistry: ToolRegistry): AIAgentGraphStrategy<String, String> {
    return strategy(name) {
        val nodeSendInput by nodeLLMRequest()
        val nodeExecuteTools by nodeExecuteTools()
        val nodeSendToolResults by nodeLLMSendToolResults()
        val nodeCompressHistory by nodeLLMCompressHistory<ReceivedToolResults>()

        edge(nodeStart forwardTo nodeSendInput)
        edge((nodeSendInput forwardTo nodeFinish) onTextMessage { true })
        edge((nodeSendInput forwardTo nodeExecuteTools) onToolCalls { true })
        edge((nodeExecuteTools forwardTo nodeCompressHistory)
            onCondition { _ -> llm.readSession { prompt.messages.size > 100 } })
        edge(nodeCompressHistory forwardTo nodeSendToolResults)
        edge((nodeExecuteTools forwardTo nodeSendToolResults)
            onCondition { _ -> llm.readSession { prompt.messages.size <= 100 } })
        edge((nodeSendToolResults forwardTo nodeExecuteTools) onToolCalls { true })
        edge((nodeSendToolResults forwardTo nodeFinish) onTextMessage { true })
    }
}
```

## Visualization

On JVM, generate a Mermaid state diagram of your strategy:

```kotlin
val mermaidDiagram: String = myStrategy.asMermaidDiagram()
```

### Java

```java
String diagram = MermaidDiagramGenerator.INSTANCE.generate(myStrategy);
```

## Using the Strategy

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    strategy = myStrategy,
    toolRegistry = toolRegistry,
    systemPrompt = "You are a research assistant."
)

val result = agent.run("Research the latest Kotlin coroutines features")
```

## Best Practices

1. **Start simple**: Begin with a basic LLM ↔ Tool loop, then add complexity
2. **Name your nodes**: Use descriptive `by` delegation names for tracing
3. **Keep nodes focused**: Each node should do one thing well
4. **Handle all paths**: Ensure every node has a path to `nodeFinish`
5. **Avoid infinite loops**: Ensure conditions eventually lead to `nodeFinish`
6. **Use subgraphs**: Organize complex workflows into logical sections
7. **Apply history compression**: For long-running conversations
8. **Test incrementally**: Build graphs step by step, testing each addition

## Troubleshooting

| Issue | Likely Cause |
|-------|-------------|
| Graph never reaches `nodeFinish` | Missing paths, overly restrictive conditions, or infinite cycles |
| Tools not executing | Tools not registered, or edge missing `onToolCalls` condition |
| History too large | Needs compression node or more aggressive compression strategy |
| Unexpected branches | Condition ordering issues or overly general conditions |
| Performance problems | Unnecessary nodes, missing parallelism, or uncompressed history |