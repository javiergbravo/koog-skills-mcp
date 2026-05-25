---
name: functional-agents
description: Define custom agent logic as lambda functions in plain Kotlin or Java with Koog's functional agent API
compatibility: "Koog 1.0.0"
license: Apache-2.0
keywords: [functional, lambda, kotlin, java, custom-logic]
---

# Functional Agents

Koog supports defining agent logic as plain functions (lambdas). This is the simplest approach when you need custom control flow without the overhead of graph definitions.

## When to Use Functional Agents

| Use Functional Agents | Use Graph-Based Agents |
|----------------------|----------------------|
| Simple, linear workflows | Complex branching logic |
| Quick prototyping | Reusable, named strategies |
| One-off scripts | Visual workflow representation |
| Full Kotlin/Java control flow | Standardized ReAct loops |

## Kotlin Functional Agent

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    val toolRegistry = ToolRegistry {
        tool(searchWeb)
        tool(sendEmail)
    }

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a helpful research assistant.",
        toolRegistry = toolRegistry
    )

    // Run with custom logic
    val result = agent.run { context ->
        // Access the LLM directly
        val initialResponse = context.llm.chat("Find recent articles about Kotlin Multiplatform")

        // Process the response
        if (initialResponse.contains("search")) {
            // Manually invoke a tool
            val searchResult = context.tools.execute("searchWeb", mapOf("query" to "Kotlin Multiplatform 2024"))
            context.llm.chat("Summarize these results: $searchResult")
        } else {
            initialResponse
        }
    }

    println(result)
}
```

## Lambda-Based Approach

Define the agent's behavior as a suspend lambda:

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    toolRegistry = toolRegistry
)

// Simple lambda
val result = agent.run("What is 2 + 2?")

// Lambda with context
val result = agent.runWithContext { ctx ->
    val response1 = ctx.chat("What are the top 3 programming languages?")
    val response2 = ctx.chat("Now compare their concurrency models")
    "Summary: $response1\n\nComparison: $response2"
}
```

## Java Functional Agent

In Java, use the builder pattern with a lambda:

```java
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.core.tools.ToolRegistry;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;

public class FunctionalAgent {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("OPENAI_API_KEY");

        var toolRegistry = ToolRegistry.builder()
            .tool(new SearchTool())
            .tool(new SummaryTool())
            .build();

        var agent = AIAgent.builder(
                SimpleOpenAIExecutorKt.simpleOpenAIExecutor(apiKey),
                OpenAIModels.Chat.GPT4o
            )
            .systemPrompt("You are a research assistant.")
            .toolRegistry(toolRegistry)
            .build();

        // Simple run
        String result = agent.runBlocking("Search for articles about AI agents");
        System.out.println(result);

        // Functional run with context
        String result2 = agent.runWithContextBlocking(ctx -> {
            String search = ctx.chat("Find articles about Koog framework");
            String summary = ctx.chat("Summarize the key points");
            return "Search: " + search + "\n\nSummary: " + summary;
        });
        System.out.println(result2);
    }
}
```

## Multi-Step Functional Workflow

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    toolRegistry = toolRegistry,
    systemPrompt = "You are a data analyst."
)

val result = agent.runWithContext { ctx ->
    // Step 1: Gather data
    val rawData = ctx.tools.execute("fetchData", mapOf(
        "source" to "database",
        "query" to "SELECT * FROM sales WHERE date > '2024-01-01'"
    ))

    // Step 2: Analyze with LLM
    val analysis = ctx.chat("""
        Analyze this sales data and identify trends:
        $rawData
    """)

    // Step 3: Generate visualization config
    val chartConfig = ctx.chat("""
        Based on this analysis, suggest a chart configuration:
        $analysis
    """)

    // Step 4: Final summary
    ctx.chat("""
        Create a executive summary combining:
        - Analysis: $analysis
        - Visualization: $chartConfig
    """)
}
```

## Error Handling in Functional Agents

```kotlin
val result = agent.runWithContext { ctx ->
    try {
        val response = ctx.chat("Process this data")
        response
    } catch (e: Exception) {
        ctx.chat("The previous step failed with: ${e.message}. Please provide a fallback response.")
    }
}
```

## Combining with Strategies

Functional agents can use predefined strategies as a fallback:

```kotlin
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.core.strategy.nodeLLMRequest
import ai.koog.agents.core.strategy.nodeExecuteTool
import ai.koog.agents.core.strategy.nodeFinish

// Define a fallback strategy
val fallbackStrategy = strategy("fallback") {
    val llm by nodeLLMRequest()
    val tool by nodeExecuteTool()

    edge(nodeStart forwardTo llm)
    edge(llm forwardTo tool onToolCall { true })
    edge(llm forwardTo nodeFinish onAssistantMessage { true })
    edge(tool forwardTo llm)
}

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    toolRegistry = toolRegistry,
    strategy = fallbackStrategy
)

// Use functional approach for simple cases
val simpleResult = agent.run("Hello!")

// Strategy handles complex tool-using cases automatically
val complexResult = agent.run("Search for recent Kotlin news and summarize the top 3 articles")
```

## Comparison: Functional vs Graph-Based

```kotlin
// Functional: Full Kotlin control flow
val result = agent.runWithContext { ctx ->
    val answer = ctx.chat("Is this task complex? Answer yes or no.")
    if (answer.contains("yes")) {
        val details = ctx.chat("Break down the task into steps")
        ctx.chat("Execute step by step: $details")
    } else {
        ctx.chat("Just do it directly")
    }
}

// Graph-based: Declarative routing
val strategy = strategy("adaptive") {
    val classify by nodeLLMRequest()
    val complexPath by nodeExecuteTool()
    val simplePath by nodeLLMRequest()

    edge(nodeStart forwardTo classify)
    edge(classify forwardTo complexPath onToolCall { true })
    edge(classify forwardTo simplePath onAssistantMessage { msg ->
        !msg.content.contains("complex")
    })
    edge(complexPath forwardTo simplePath)
    edge(simplePath forwardTo nodeFinish)
}
```

## Best Practices

1. **Start simple** — Use `agent.run()` for single-turn interactions
2. **Use `runWithContext`** for multi-step workflows that need custom logic
3. **Prefer graph-based** when the workflow is reusable or needs visual representation
4. **Handle errors** — Wrap tool calls in try/catch for resilience
5. **Limit iterations** — Set `maxIterations` to prevent runaway loops