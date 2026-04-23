---
name: planner-agents
description: Create planner agents that iteratively build and execute plans using LLM-based planners or GOAP in Koog
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [planner, plan, goap, iterative, planning, goal]
---

# Planner Agents

Koog supports planner-based agents that can break down complex goals into executable plans. Two approaches are available: LLM-based planners and GOAP (Goal-Oriented Action Planning).

## LLM-Based Planners

LLM planners use the language model to generate step-by-step plans, then execute each step iteratively.

### Basic LLM Planner

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.core.strategy.nodeLLMRequest
import ai.koog.agents.core.strategy.nodeExecuteTool
import ai.koog.agents.core.strategy.nodeStart
import ai.koog.agents.core.strategy.nodeFinish
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

// Define a planning strategy
val plannerStrategy = strategy("planner") {
    // Step 1: Generate plan
    val planNode by nodeLLMRequest()

    // Step 2: Execute next step
    val executeStep by nodeExecuteTool()

    // Step 3: Evaluate progress
    val evaluate by nodeLLMRequest()

    // Step 4: Final summary
    val summarize by nodeLLMRequest()

    edge(nodeStart forwardTo planNode)

    // Plan → Execute
    edge(planNode forwardTo executeStep onToolCall { true })

    // Execute → Evaluate
    edge(executeStep forwardTo evaluate)

    // Evaluate → Execute more (if tool call)
    edge(evaluate forwardTo executeStep onToolCall { true })

    // Evaluate → Summarize (when done)
    edge(evaluate forwardTo summarize onAssistantMessage { true })

    // Summarize → Finish
    edge(summarize forwardTo nodeFinish)
}

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = """
            You are a planning agent. When given a goal:
            1. Break it down into clear, actionable steps
            2. Execute each step using available tools
            3. Track progress and adjust the plan if needed
            4. Provide a final summary when complete

            Always think step by step before acting.
        """.trimIndent(),
        toolRegistry = toolRegistry,
        strategy = plannerStrategy
    )

    val result = agent.run("""
        Goal: Research the top 3 Kotlin Multiplatform libraries in 2024
        and create a comparison table with pros and cons.
    """.trimIndent())
    println(result)
}
```

### Planner with Step Tracking

```kotlin
// Custom node that tracks plan execution
val trackStep by node<String, String> { step ->
    println("Executing step: $step")
    step
}

val plannerWithTracking = strategy("tracked-planner") {
    val plan by nodeLLMRequest()
    val track by trackStep
    val execute by nodeExecuteTool()
    val evaluate by nodeLLMRequest()
    val complete by nodeLLMRequest()

    edge(nodeStart forwardTo plan)
    edge(plan forwardTo execute onToolCall { true })
    edge(execute forwardTo track)
    edge(track forwardTo evaluate)
    edge(evaluate forwardTo execute onToolCall { true })
    edge(evaluate forwardTo complete onAssistantMessage { true })
    edge(complete forwardTo nodeFinish)
}
```

## GOAP (Goal-Oriented Action Planning)

GOAP is a planning algorithm that finds the optimal sequence of actions to reach a goal state. It's particularly useful for agents that need to reason about preconditions and effects.

### GOAP Concepts

| Concept | Description |
|---------|-------------|
| **Goal** | The desired end state |
| **Action** | An operation with preconditions and effects |
| **State** | The current world state (key-value pairs) |
| **Plan** | A sequence of actions that transforms the current state into the goal state |

### Basic GOAP Agent

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.goap.GOAPPlanner
import ai.koog.agents.core.goap.GOAPAction
import ai.koog.agents.core.goap.GOAPState
import ai.koog.agents.core.goap.GOAPGoal

// Define actions with preconditions and effects
val searchAction = GOAPAction(
    name = "search",
    preconditions = mapOf("hasQuery" to true),
    effects = mapOf("hasResults" to true),
    cost = 1.0
) { state, args ->
    val query = args["query"] as String
    // Perform search
    val results = performSearch(query)
    state.copy(
        data = state.data + ("searchResults" to results)
    )
}

val analyzeAction = GOAPAction(
    name = "analyze",
    preconditions = mapOf("hasResults" to true),
    effects = mapOf("hasAnalysis" to true),
    cost = 2.0
) { state, args ->
    val results = state.data["searchResults"]
    // Perform analysis
    val analysis = performAnalysis(results)
    state.copy(
        data = state.data + ("analysis" to analysis)
    )
}

val summarizeAction = GOAPAction(
    name = "summarize",
    preconditions = mapOf("hasAnalysis" to true),
    effects = mapOf("hasSummary" to true),
    cost = 1.0
) { state, args ->
    val analysis = state.data["analysis"]
    val summary = performSummarization(analysis)
    state.copy(
        data = state.data + ("summary" to summary)
    )
}

// Define the goal
val goal = GOAPGoal(
    name = "produce-summary",
    conditions = mapOf("hasSummary" to true)
)

// Create the planner
val planner = GOAPPlanner(
    actions = listOf(searchAction, analyzeAction, summarizeAction),
    goal = goal
)

// Initial state
val initialState = GOAPState(
    data = mapOf("hasQuery" to true)
)

// Generate plan
val plan = planner.plan(initialState)
// plan = [search, analyze, summarize]

// Execute plan
val finalState = planner.execute(plan, initialState)
val summary = finalState.data["summary"]
```

### GOAP with AIAgent Integration

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    toolRegistry = toolRegistry,
    systemPrompt = "You are a planning agent that uses GOAP to solve complex tasks."
)

// Use GOAP to generate a plan, then let the agent execute it
val plan = planner.plan(initialState)

val result = agent.run("""
    Execute this plan step by step:
    ${plan.joinToString("\n") { "- ${it.name}" }}

    Current state: $initialState
    Goal: ${goal.name}
""")
```

### Dynamic GOAP Planning

```kotlin
val dynamicPlanner = GOAPPlanner(
    actions = listOf(
        searchAction,
        analyzeAction,
        summarizeAction,
        // Add more actions as needed
        GOAPAction(
            name = "refine-search",
            preconditions = mapOf("hasResults" to true, "resultsInsufficient" to true),
            effects = mapOf("hasRefinedResults" to true),
            cost = 1.5
        ) { state, _ ->
            // Refine search based on insufficient results
            state.copy(data = state.data + ("hasRefinedResults" to true))
        }
    ),
    goal = goal
)

// Replan when conditions change
val initialPlan = planner.plan(initialState)

// If results are insufficient, replan with new state
val updatedState = initialState.copy(
    data = initialState.data + ("resultsInsufficient" to true)
)
val revisedPlan = planner.plan(updatedState)
// revisedPlan may include: [search, refine-search, analyze, summarize]
```

## Planner Strategy Patterns

### Replan on Failure

```kotlin
val replanStrategy = strategy("replan-on-failure") {
    val plan by nodeLLMRequest()
    val execute by nodeExecuteTool()
    val evaluate by nodeLLMRequest()
    val replan by nodeLLMRequest()
    val finalResponse by nodeLLMRequest()

    edge(nodeStart forwardTo plan)
    edge(plan forwardTo execute onToolCall { true })
    edge(execute forwardTo evaluate)

    // Success → continue or finish
    edge(evaluate forwardTo execute onToolCall { true })
    edge(evaluate forwardTo finalResponse onAssistantMessage { msg ->
        msg.content.contains("complete") || msg.content.contains("done")
    })

    // Failure → replan
    edge(evaluate forwardTo replan onAssistantMessage { msg ->
        msg.content.contains("failed") || msg.content.contains("error")
    })
    edge(replan forwardTo execute onToolCall { true })

    edge(finalResponse forwardTo nodeFinish)
}
```

### Hierarchical Planning

```kotlin
val hierarchicalStrategy = strategy("hierarchical-planner") {
    // High-level planning
    val decompose by nodeLLMRequest()

    // Sub-task execution
    val executeSubtask by nodeExecuteTool()
    val evaluateSubtask by nodeLLMRequest()

    // Integration
    val integrate by nodeLLMRequest()

    edge(nodeStart forwardTo decompose)
    edge(decompose forwardTo executeSubtask onToolCall { true })
    edge(executeSubtask forwardTo evaluateSubtask)
    edge(evaluateSubtask forwardTo executeSubtask onToolCall { true })
    edge(evaluateSubtask forwardTo integrate onAssistantMessage { true })
    edge(integrate forwardTo nodeFinish)
}
```

## Comparison: LLM Planner vs GOAP

| Aspect | LLM Planner | GOAP |
|--------|-------------|------|
| **Planning** | LLM generates plan text | Algorithm finds optimal action sequence |
| **Adaptability** | Replanning via new LLM call | Automatic replanning on state change |
| **Cost** | Each plan = 1+ LLM calls | No LLM calls for planning |
| **Flexibility** | Handles open-ended goals | Best for well-defined state spaces |
| **Determinism** | Non-deterministic | Deterministic (given same state/actions) |
| **Use Case** | Creative tasks, research | Game AI, workflow automation |

## Best Practices

1. **Set clear goals** — Whether LLM or GOAP, define what "done" looks like
2. **Limit plan depth** — Set `maxIterations` to prevent infinite planning loops
3. **Track state** — Use GOAPState or conversation history to track progress
4. **Handle replanning** — Plans often change; build in replan triggers
5. **Validate steps** — Check preconditions before executing each step
6. **Provide feedback** — Let the agent know when steps succeed or fail
