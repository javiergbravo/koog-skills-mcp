---
name: tools-overview
description: "Complete guide to Koog's tool system: built-in tools, annotation-based tools, class-based tools, and agents as tools"
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [tool, toolset, registry, built-in, annotation, class-based, agents-as-tools]
---

# Tools Overview

Tools extend AI agents with the ability to interact with external systems, perform calculations, and take actions. Koog 0.8.0 provides three tool definition patterns and a flexible registry system.

## Tool Types

| Type | Best For | Complexity |
|------|----------|------------|
| **Annotation-based** | Simple tools with basic parameters | Low |
| **Class-based** | Complex tools with custom schemas | Medium |
| **Agents as tools** | Hierarchical multi-agent systems | High |

## ToolRegistry

The `ToolRegistry` is the central container for all tools available to an agent:

```kotlin
import ai.koog.agents.core.tools.ToolRegistry

// Build a registry
val toolRegistry = ToolRegistry {
    tool(SearchTool())       // Class-based
    tool(calculatorFunction) // Annotation-based
    tool(agentTool)          // Agent as tool
}

// Merge registries with + operator
val combinedRegistry = searchTools + mathTools + utilityTools
```

### Creating a ToolRegistry

```kotlin
import ai.koog.agents.core.tools.ToolRegistry

// Empty registry
val emptyRegistry = ToolRegistry()

// Builder pattern
val registry = ToolRegistry {
    tool(SearchTool)
    tool(CalculatorTool)
    tool(webSearch)  // annotation-based function
}

// From a list of tools
val registry = ToolRegistry.fromList(listOf(SearchTool, CalculatorTool))
```

### Merging Registries

```kotlin
val searchTools = ToolRegistry {
    tool(WebSearchTool)
    tool(DatabaseSearchTool)
}

val mathTools = ToolRegistry {
    tool(CalculatorTool)
    tool(StatisticsTool)
}

// Combine with + operator
val allTools = searchTools + mathTools

// Or merge in place
searchTools.merge(mathTools)
```

## Tool Execution Nodes

Koog provides predefined strategy nodes for tool execution:

### nodeExecuteTool

Executes a single tool call from the LLM's response:

```kotlin
import ai.koog.agents.core.strategy.nodeExecuteTool

val strategy = strategy("my-workflow") {
    val llm by nodeLLMRequest()
    val execute by nodeExecuteTool()

    edge(nodeStart forwardTo llm)
    edge(llm forwardTo execute onToolCall { true })
    edge(execute forwardTo llm)  // Loop back
}
```

### nodeExecuteSingleTool

Executes exactly one tool call (fails if multiple are requested):

```kotlin
import ai.koog.agents.core.strategy.nodeExecuteSingleTool

val execute by nodeExecuteSingleTool()
```

### nodeExecuteMultipleTools

Executes multiple tool calls in parallel:

```kotlin
import ai.koog.agents.core.strategy.nodeExecuteMultipleTools

val executeParallel by nodeExecuteMultipleTools()
```

### nodeLLMSendToolResult

Sends the tool execution result back to the LLM:

```kotlin
import ai.koog.agents.core.strategy.nodeLLMSendToolResult

val sendResult by nodeLLMSendToolResult()
```

### nodeLLMSendMultipleToolResults

Sends multiple tool results back to the LLM:

```kotlin
import ai.koog.agents.core.strategy.nodeLLMSendMultipleToolResults

val sendResults by nodeLLMSendMultipleToolResults()
```

## Parallel Tool Calls

When the LLM requests multiple tools at once, use parallel execution:

```kotlin
import ai.koog.agents.core.strategy.toParallelToolCallsRaw

val strategy = strategy("parallel-tools") {
    val llm by nodeLLMRequest()
    val execute by nodeExecuteMultipleTools()
    val sendResults by nodeLLMSendMultipleToolResults()

    edge(nodeStart forwardTo llm)
    edge(llm forwardTo execute onToolCall { true })
    edge(execute forwardTo sendResults)
    edge(sendResults forwardTo llm)
}
```

### Converting Sequential to Parallel

```kotlin
// Sequential (one at a time)
val sequential by nodeExecuteTool()

// Parallel (all at once)
val parallel by nodeExecuteMultipleTools()

// Convert LLM response to parallel calls
val parallelCalls = llmResponse.toolCalls.toParallelToolCallsRaw()
```

## Annotation-Based Tools

The simplest way to create tools — see **[Annotation-Based Tools](../annotation-based/SKILL.md)**:

```kotlin
import ai.koog.agents.core.tools.annotations.Tool
import ai.koog.agents.core.tools.annotations.LLMDescription

@Tool
@LLMDescription("Search the web for information")
suspend fun webSearch(
    @LLMDescription("The search query") query: String,
    @LLMDescription("Number of results") maxResults: Int = 10
): String {
    return performSearch(query, maxResults)
}
```

## Class-Based Tools

For complex tools with custom schemas — see **[Class-Based Tools](../class-based/SKILL.md)**:

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor

object DatabaseQueryTool : SimpleTool<DatabaseQueryTool.Args>() {
    override val descriptor = ToolDescriptor(
        name = "database_query",
        description = "Execute a database query"
    )

    data class Args(
        val query: String,
        val database: String
    ) : Tool.Args

    override suspend fun execute(args: Args): String {
        return executeQuery(args.database, args.query)
    }
}
```

## Agents as Tools

Convert agents into tools for hierarchical architectures — see **[Agents as Tools](../agents-as-tools/SKILL.md)**:

```kotlin
import ai.koog.agents.core.agent.AIAgentService

val researchAgent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    systemPrompt = "You are a research specialist."
)

val researchTool = AIAgentService.createAgentTool(
    agent = researchAgent,
    agentName = "researcher",
    agentDescription = "Research specialist that finds and analyzes information",
    inputDescription = "The research question or topic",
    inputType = String::class
)

// Use in a coordinator agent
val coordinator = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    toolRegistry = ToolRegistry {
        tool(researchTool)
        tool(writerTool)
    }
)
```

## Tool Registration Patterns

### Single Tool

```kotlin
val registry = ToolRegistry {
    tool(MyTool())
}
```

### Multiple Tools

```kotlin
val registry = ToolRegistry {
    tool(SearchTool)
    tool(CalculatorTool)
    tool(EmailTool)
    tool(webSearch)  // annotation-based
}
```

### ToolSet Interface

Group related tools using `ToolSet`:

```kotlin
import ai.koog.agents.core.tools.ToolSet

class MathTools : ToolSet {
    override fun getTools(): List<Tool<*>> = listOf(
        AddTool,
        SubtractTool,
        MultiplyTool,
        DivideTool
    )
}

// Register all at once
val registry = ToolRegistry {
    toolSet(MathTools())
}
```

### Dynamic Tool Registration

```kotlin
val registry = ToolRegistry()

// Add tools dynamically
if (userHasSearchPermission) {
    registry.tool(SearchTool)
}
if (environment == "development") {
    registry.tool(DebugTool)
}
```

## Tool Result Types

Tools can return different result types:

```kotlin
@Tool
suspend fun getTextResult(): String {
    return "Plain text result"
}

@Tool
suspend fun getStructuredResult(): ToolResult {
    return ToolResult(
        content = "Structured data",
        metadata = mapOf("source" to "database")
    )
}

@Tool
suspend fun getJsonResult(): String {
    return """{"key": "value", "count": 42}"""
}
```

## Error Handling in Tools

```kotlin
@Tool
suspend fun riskyOperation(@LLMDescription("Input") input: String): String {
    return try {
        performOperation(input)
    } catch (e: Exception) {
        "Error: ${e.message}. Please try a different approach."
    }
}
```

## Tool Execution Flow

```
User Request
    ↓
LLM decides to call a tool
    ↓
nodeExecuteTool / nodeExecuteMultipleTools
    ↓
ToolRegistry finds the tool by name
    ↓
Tool.execute() is called with args
    ↓
Tool returns result (String)
    ↓
nodeLLMSendToolResult / nodeLLMSendMultipleToolResults
    ↓
LLM processes the result
    ↓
LLM responds or calls another tool
```

## Best Practices

1. **Name tools clearly** — Use descriptive names that the LLM can understand
2. **Write good descriptions** — `@LLMDescription` helps the LLM choose the right tool
3. **Validate inputs** — Check parameters before executing
4. **Return useful errors** — Help the LLM understand what went wrong
5. **Keep tools focused** — Each tool should do one thing well
6. **Use ToolSet** — Group related tools for better organization
7. **Set maxIterations** — Prevent runaway tool call loops
