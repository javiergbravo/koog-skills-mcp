---
name: subgraphs
description: Compose complex agent workflows with Koog's subgraph system for modular strategy design
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [subgraph, modular, composition, nested, strategy, reusable]
---

# Subgraphs

Koog's subgraph system enables composing complex agent workflows from modular, reusable components. Subgraphs allow you to nest strategies, create reusable workflow patterns, and build sophisticated agent behaviors.

## Overview

Subgraphs provide:

- **Modular design** — Break complex workflows into manageable pieces
- **Reusability** — Share common patterns across different agents
- **Composition** — Combine simple strategies into complex behaviors
- **Encapsulation** — Isolate concerns within subgraphs
- **Nesting** — Subgraphs can contain other subgraphs

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
}
```

## Custom Subgraphs

### Basic Subgraph

```kotlin
import ai.koog.agents.core.strategy.Strategy
import ai.koog.agents.core.strategy.strategy
import ai.koog.agents.core.strategy.nodeLLMRequest
import ai.koog.agents.core.strategy.nodeExecuteTool
import ai.koog.agents.core.strategy.nodeStart
import ai.koog.agents.core.strategy.nodeFinish

fun researchSubgraph(): Strategy = strategy("research") {
    val search by nodeExecuteTool()
    val analyze by nodeLLMRequest()
    val summarize by nodeLLMRequest()

    edge(nodeStart forwardTo search)
    edge(search forwardTo analyze onAssistantMessage { true })
    edge(analyze forwardTo summarize onAssistantMessage { true })
    edge(summarize forwardTo nodeFinish)
}

fun analysisSubgraph(): Strategy = strategy("analysis") {
    val validate by nodeLLMRequest()
    val process by nodeExecuteTool()
    val report by nodeLLMRequest()

    edge(nodeStart forwardTo validate)
    edge(validate forwardTo process onToolCall { true })
    edge(process forwardTo report onAssistantMessage { true })
    edge(report forwardTo nodeFinish)
}
```

### Subgraph with Parameters

```kotlin
fun searchSubgraph(
    searchToolName: String = "web_search",
    maxResults: Int = 5
): Strategy = strategy("search") {
    val search by nodeExecuteTool()
    val filter by nodeLLMRequest()
    val format by nodeLLMRequest()

    edge(nodeStart forwardTo search)
    edge(search forwardTo filter onAssistantMessage { true })
    edge(filter forwardTo format onAssistantMessage { true })
    edge(format forwardTo nodeFinish)
}
```

## Composing Strategies

### Sequential Composition

```kotlin
fun mainStrategy(): Strategy = strategy("main") {
    val research by subgraph(researchSubgraph())
    val analysis by subgraph(analysisSubgraph())
    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo research)
    edge(research forwardTo analysis onAssistantMessage { true })
    edge(analysis forwardTo respond onAssistantMessage { true })
    edge(respond forwardTo nodeFinish)
}
```

### Conditional Composition

```kotlin
fun adaptiveStrategy(): Strategy = strategy("adaptive") {
    val classify by nodeLLMRequest()
    val research by subgraph(researchSubgraph())
    val analysis by subgraph(analysisSubgraph())
    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo classify)
    edge(classify forwardTo research onCondition { output ->
        output.contains("research needed")
    })
    edge(classify forwardTo analysis onCondition { output ->
        output.contains("analysis needed")
    })
    edge(research forwardTo respond onAssistantMessage { true })
    edge(analysis forwardTo respond onAssistantMessage { true })
    edge(respond forwardTo nodeFinish)
}
```

### Parallel Composition

```kotlin
fun parallelStrategy(): Strategy = strategy("parallel") {
    val gather by nodeLLMRequest()
    val research by subgraph(researchSubgraph())
    val analysis by subgraph(analysisSubgraph())
    val synthesize by nodeLLMRequest()

    edge(nodeStart forwardTo gather)
    edge(gather forwardTo research onAssistantMessage { true })
    edge(gather forwardTo analysis onAssistantMessage { true })
    edge(research forwardTo synthesize onAssistantMessage { true })
    edge(analysis forwardTo synthesize onAssistantMessage { true })
    edge(synthesize forwardTo nodeFinish)
}
```

## Modular Workflow Design

### Reusable Patterns

```kotlin
// Pattern: Search → Process → Respond
fun searchProcessRespondPattern(
    searchTool: String,
    processPrompt: String
): Strategy = strategy("search-process-respond") {
    val search by nodeExecuteTool()
    val process by nodeLLMRequest()
    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo search)
    edge(search forwardTo process onAssistantMessage { true })
    edge(process forwardTo respond onAssistantMessage { true })
    edge(respond forwardTo nodeFinish)
}

// Pattern: Validate → Execute → Verify
fun validateExecuteVerifyPattern(): Strategy = strategy("validate-execute-verify") {
    val validate by nodeLLMRequest()
    val execute by nodeExecuteTool()
    val verify by nodeLLMRequest()

    edge(nodeStart forwardTo validate)
    edge(validate forwardTo execute onToolCall { true })
    edge(execute forwardTo verify onAssistantMessage { true })
    edge(verify forwardTo nodeFinish)
}
```

### Workflow Library

```kotlin
object WorkflowLibrary {
    fun researchWorkflow() = strategy("research") {
        val search by nodeExecuteTool()
        val analyze by nodeLLMRequest()
        val summarize by nodeLLMRequest()

        edge(nodeStart forwardTo search)
        edge(search forwardTo analyze onAssistantMessage { true })
        edge(analyze forwardTo summarize onAssistantMessage { true })
        edge(summarize forwardTo nodeFinish)
    }

    fun codingWorkflow() = strategy("coding") {
        val understand by nodeLLMRequest()
        val plan by nodeLLMRequest()
        val implement by nodeExecuteTool()
        val test by nodeExecuteTool()
        val review by nodeLLMRequest()

        edge(nodeStart forwardTo understand)
        edge(understand forwardTo plan onAssistantMessage { true })
        edge(plan forwardTo implement onToolCall { true })
        edge(implement forwardTo test onToolCall { true })
        edge(test forwardTo review onAssistantMessage { true })
        edge(review forwardTo nodeFinish)
    }

    fun customerSupportWorkflow() = strategy("customer-support") {
        val understand by nodeLLMRequest()
        val search by nodeExecuteTool()
        val resolve by nodeLLMRequest()
        val confirm by nodeLLMRequest()

        edge(nodeStart forwardTo understand)
        edge(understand forwardTo search onToolCall { true })
        edge(search forwardTo resolve onAssistantMessage { true })
        edge(resolve forwardTo confirm onAssistantMessage { true })
        edge(confirm forwardTo nodeFinish)
    }
}
```

## Reuse Patterns

### Strategy Composition

```kotlin
fun complexWorkflow(): Strategy = strategy("complex") {
    // Reuse existing strategies as subgraphs
    val research by subgraph(WorkflowLibrary.researchWorkflow())
    val coding by subgraph(WorkflowLibrary.codingWorkflow())
    val review by nodeLLMRequest()

    edge(nodeStart forwardTo research)
    edge(research forwardTo coding onAssistantMessage { true })
    edge(coding forwardTo review onAssistantMessage { true })
    edge(review forwardTo nodeFinish)
}
```

### Conditional Reuse

```kotlin
fun adaptiveWorkflow(taskType: String): Strategy = strategy("adaptive") {
    val classify by nodeLLMRequest()

    val research by subgraph(WorkflowLibrary.researchWorkflow())
    val coding by subgraph(WorkflowLibrary.codingWorkflow())
    val support by subgraph(WorkflowLibrary.customerSupportWorkflow())

    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo classify)
    edge(classify forwardTo research onCondition { it.contains("research") })
    edge(classify forwardTo coding onCondition { it.contains("code") })
    edge(classify forwardTo support onCondition { it.contains("support") })

    edge(research forwardTo respond onAssistantMessage { true })
    edge(coding forwardTo respond onAssistantMessage { true })
    edge(support forwardTo respond onAssistantMessage { true })

    edge(respond forwardTo nodeFinish)
}
```

### Shared Subgraph Instances

```kotlin
class AgentFactory {
    // Shared subgraph instances
    private val searchSubgraph = searchProcessRespondPattern("web_search", "Analyze results")
    private val validationSubgraph = validateExecuteVerifyPattern()

    fun createResearchAgent(): AIAgent {
        val strategy = strategy("research-agent") {
            val search by subgraph(searchSubgraph)
            val respond by nodeLLMRequest()

            edge(nodeStart forwardTo search)
            edge(search forwardTo respond onAssistantMessage { true })
            edge(respond forwardTo nodeFinish)
        }

        return AIAgent(
            promptExecutor = executor,
            llmModel = model,
            strategy = strategy
        )
    }

    fun createCodingAgent(): AIAgent {
        val strategy = strategy("coding-agent") {
            val validate by subgraph(validationSubgraph)
            val code by nodeExecuteTool()
            val review by nodeLLMRequest()

            edge(nodeStart forwardTo validate)
            edge(validate forwardTo code onToolCall { true })
            edge(code forwardTo review onAssistantMessage { true })
            edge(review forwardTo nodeFinish)
        }

        return AIAgent(
            promptExecutor = executor,
            llmModel = model,
            strategy = strategy
        )
    }
}
```

## Nested Subgraphs

```kotlin
fun level1Subgraph(): Strategy = strategy("level1") {
    val step1 by nodeLLMRequest()
    val step2 by nodeExecuteTool()

    edge(nodeStart forwardTo step1)
    edge(step1 forwardTo step2 onToolCall { true })
    edge(step2 forwardTo nodeFinish)
}

fun level2Subgraph(): Strategy = strategy("level2") {
    val inner by subgraph(level1Subgraph())
    val outer by nodeLLMRequest()

    edge(nodeStart forwardTo inner)
    edge(inner forwardTo outer onAssistantMessage { true })
    edge(outer forwardTo nodeFinish)
}

fun level3Subgraph(): Strategy = strategy("level3") {
    val nested by subgraph(level2Subgraph())
    val final by nodeLLMRequest()

    edge(nodeStart forwardTo nested)
    edge(nested forwardTo final onAssistantMessage { true })
    edge(final forwardTo nodeFinish)
}
```

## Best Practices

1. **Keep subgraphs focused** — Each subgraph should have a single responsibility
2. **Name subgraphs clearly** — Use descriptive names for debugging and tracing
3. **Document interfaces** — Clearly define what each subgraph expects and returns
4. **Test subgraphs independently** — Unit test subgraphs before composing them
5. **Avoid deep nesting** — Limit nesting to 3-4 levels for maintainability
6. **Share common patterns** — Extract reusable patterns into a workflow library
7. **Use conditional edges** — Route dynamically based on subgraph output

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Subgraph not executing | Check edge conditions and forward rules |
| Infinite loops | Verify all paths lead to `nodeFinish` |
| Data not passing | Ensure edges pass context between subgraphs |
| Performance issues | Reduce nesting depth or simplify subgraphs |
| Debugging difficulty | Use tracing to visualize subgraph execution |
