---
name: graph-based-agents
description: Build custom agent workflows using Koog's graph-based strategy builder with nodes, edges, and conditional routing
compatibility: "Koog 1.0.0"
license: Apache-2.0
keywords: [graph, strategy, workflow, nodes, edges, state-machine, conditional]
---

# Graph-Based Agents

Koog's graph-based strategy system lets you define agent workflows as directed graphs. This gives you fine-grained control over the agent's decision-making process.

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Strategy** | A named workflow definition using `strategy{}` builder |
| **Node** | A processing step (LLM call, tool execution, custom logic) |
| **Edge** | A connection between nodes with optional conditions |
| **Start/Finish** | Special terminal nodes |

## Strategy Builder

```kotlin
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.core.strategy.nodeLLMRequest
import ai.koog.agents.core.strategy.nodeExecuteTools
import ai.koog.agents.core.strategy.nodeLLMSendToolResults
import ai.koog.agents.core.strategy.nodeStart
import ai.koog.agents.core.strategy.nodeFinish

val myStrategy = strategy("simple-tool-loop") {
    // Define nodes
    val llmRequest by nodeLLMRequest()
    val executeTools by nodeExecuteTools()
    val sendToolResults by nodeLLMSendToolResults()

    // Define edges
    edge(nodeStart forwardTo llmRequest)
    edge(llmRequest forwardTo executeTools onToolCall { true })
    edge(llmRequest forwardTo nodeFinish onAssistantMessage { true })
    edge(executeTools forwardTo sendToolResults)
    edge(sendToolResults forwardTo llmRequest)
}
```

## Predefined Nodes

### nodeLLMRequest

Sends the current conversation to the LLM and processes the response:

```kotlin
val llm by nodeLLMRequest()
```

The LLM may respond with:
- An assistant message → triggers `onAssistantMessage` edges
- A tool call → triggers `onToolCall` edges

### nodeExecuteTools

Executes one or more tool calls from the LLM's response:

```kotlin
val execute by nodeExecuteTools()
```

Takes the tool calls from the previous LLM response, executes them, and stores the results.

### nodeLLMSendToolResults

Sends the tool execution results back to the LLM:

```kotlin
val sendResults by nodeLLMSendToolResults()
```

This node sends the tool results as tool messages and gets the LLM's next response.

## Special Nodes

### nodeStart

The entry point of every strategy:

```kotlin
edge(nodeStart forwardTo firstNode)
```

### nodeFinish

The exit point — ends the agent run:

```kotlin
edge(someNode forwardTo nodeFinish)
```

## Edge Conditions

Use `onToolCall` and `onAssistantMessage` to route based on LLM response type:

### onToolCall

Triggered when the LLM requests a tool call:

```kotlin
// Always follow this edge on tool calls
edge(llm forwardTo executeTools onToolCall { true })

// Conditional: only for specific tools
edge(llm forwardTo calculatorNode onToolCall { toolCall ->
    toolCall.toolName == "calculator"
})
```

### onAssistantMessage

Triggered when the LLM responds with a text message (no tool call):

```kotlin
// Always finish on assistant message
edge(llm forwardTo nodeFinish onAssistantMessage { true })

// Conditional: check message content
edge(llm forwardTo validator onAssistantMessage { message ->
    message.content.contains("final answer")
})
```

## Edge Transforms

Transform the data flowing between nodes:

```kotlin
edge(llm forwardTo executeTools withTransform { context ->
    // Transform the tool call before execution
    context.copy(args = modifiedArgs)
})
```

## Custom Nodes

Create custom processing nodes:

```kotlin
import ai.koog.agents.core.strategy.node

val validator by node<String, Boolean> { input ->
    // Custom logic
    input.isNotBlank()
}

val formatter by node<String, String> { input ->
    "Formatted: $input"
}
```

## Complete Calculator Example (Kotlin)

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.core.strategy.nodeLLMRequest
import ai.koog.agents.core.strategy.nodeExecuteTools
import ai.koog.agents.core.strategy.nodeLLMSendToolResults
import ai.koog.agents.core.strategy.nodeStart
import ai.koog.agents.core.strategy.nodeFinish
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

// Define calculator tool
object CalculatorTool : SimpleTool<CalculatorTool.Args>() {
    override val descriptor = ToolDescriptor(
        name = "calculator",
        description = "Perform arithmetic calculations"
    )

    data class Args(val expression: String) : Tool.Args

    override suspend fun execute(args: Args): String {
        return try {
            evaluateExpression(args.expression).toString()
        } catch (e: Exception) {
            "Error: ${e.message}"
        }
    }
}

// Define the strategy
val calculatorStrategy = strategy("calculator-workflow") {
    val llmRequest by nodeLLMRequest()
    val executeTools by nodeExecuteTools()
    val sendToolResults by nodeLLMSendToolResults()

    // Start → LLM
    edge(nodeStart forwardTo llmRequest)

    // LLM → Tool execution (when tool is called)
    edge(llmRequest forwardTo executeTools onToolCall { true })

    // LLM → Finish (when no tool is called)
    edge(llmRequest forwardTo nodeFinish onAssistantMessage { true })

    // Tool execution → Send result back to LLM
    edge(executeTools forwardTo sendToolResults)

    // Send result → Loop back to LLM for next step
    edge(sendToolResults forwardTo llmRequest)
}

// Create the agent
suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    val toolRegistry = ToolRegistry {
        tool(CalculatorTool)
    }

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = """
            You are a calculator assistant.
            Use the calculator tool to perform arithmetic.
            Always show your work step by step.
        """.trimIndent(),
        toolRegistry = toolRegistry,
        strategy = calculatorStrategy
    )

    val result = agent.run("What is (15 * 23) + (47 - 12)?")
    println(result)
}
```

## Complete Calculator Example (Java)

```java
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.core.tools.ToolRegistry;
import ai.koog.agents.core.strategy.StrategyBuilder;
import ai.koog.agents.core.strategy.StrategyKt;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;

public class CalculatorAgent {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("OPENAI_API_KEY");

        // Define strategy
        var strategy = StrategyKt.strategy("calculator-workflow", builder -> {
            var llmRequest = builder.nodeLLMRequest();
            var executeTools = builder.nodeExecuteTools();
            var sendToolResults = builder.nodeLLMSendToolResults();

            builder.edge(builder.nodeStart(), llmRequest);
            builder.edge(llmRequest, executeTools, builder.onToolCall(t -> true));
            builder.edge(llmRequest, builder.nodeFinish(), builder.onAssistantMessage(m -> true));
            builder.edge(executeTools, sendToolResults);
            builder.edge(sendToolResults, llmRequest);

            return null;
        });

        // Build agent
        var toolRegistry = ToolRegistry.builder()
            .tool(new CalculatorTool())
            .build();

        var agent = AIAgent.builder(
                SimpleOpenAIExecutorKt.simpleOpenAIExecutor(apiKey),
                OpenAIModels.Chat.GPT4o
            )
            .systemPrompt("You are a calculator assistant. Use tools to compute.")
            .toolRegistry(toolRegistry)
            .strategy(strategy)
            .build();

        String result = agent.run("What is 42 * 17?");
        System.out.println(result);
    }
}
```

## Common Patterns

### ReAct Loop (Reasoning + Acting)

The most common pattern — alternate between LLM reasoning and tool execution:

```kotlin
val reactStrategy = strategy("react") {
    val think by nodeLLMRequest()
    val act by nodeExecuteTools()
    val observe by nodeLLMSendToolResults()

    edge(nodeStart forwardTo think)
    edge(think forwardTo act onToolCall { true })
    edge(think forwardTo nodeFinish onAssistantMessage { true })
    edge(act forwardTo observe)
    edge(observe forwardTo think)  // Loop back
}
```

### Multi-Step Pipeline

Sequential processing with different nodes:

```kotlin
val pipelineStrategy = strategy("pipeline") {
    val analyze by nodeLLMRequest()
    val research by nodeExecuteTools()
    val synthesize by nodeLLMRequest()
    val format by nodeLLMRequest()

    edge(nodeStart forwardTo analyze)
    edge(analyze forwardTo research onToolCall { true })
    edge(research forwardTo synthesize)
    edge(synthesize forwardTo format onAssistantMessage { true })
    edge(format forwardTo nodeFinish)
}
```

### Conditional Branching

Route to different nodes based on conditions:

```kotlin
val branchStrategy = strategy("branching") {
    val classify by nodeLLMRequest()
    val simpleHandler by nodeLLMRequest()
    val complexHandler by nodeExecuteTools()
    val finalResponse by nodeLLMRequest()

    edge(nodeStart forwardTo classify)

    // Simple questions → direct answer
    edge(classify forwardTo simpleHandler onAssistantMessage { msg ->
        !msg.content.contains("calculate")
    })

    // Complex questions → use tools
    edge(classify forwardTo complexHandler onToolCall { true })

    edge(simpleHandler forwardTo nodeFinish)
    edge(complexHandler forwardTo finalResponse)
    edge(finalResponse forwardTo nodeFinish)
}
```

## Strategy Configuration Reference

| Builder Method | Description |
|----------------|-------------|
| `strategy(name) { }` | Create a named strategy |
| `nodeLLMRequest()` | LLM call node |
| `nodeExecuteTools()` | Tool execution node (handles multiple tools) |
| `nodeLLMSendToolResults()` | Send tool results to LLM |
| `nodeStart` | Entry point (built-in) |
| `nodeFinish` | Exit point (built-in) |
| `node<I, O> { }` | Custom node with input/output types |
| `edge(from forwardTo to)` | Unconditional edge |
| `edge(from forwardTo to onToolCall { })` | Edge on tool call |
| `edge(from forwardTo to onAssistantMessage { })` | Edge on assistant message |
| `edge(from forwardTo to withTransform { })` | Edge with data transform |