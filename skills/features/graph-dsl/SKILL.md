---
title: "Finalized Node Naming and Usage in Koog's Graph DSL"
description: "Learn about the finalized node names and usage patterns in Koog's graph DSL introduced in version 1.0.0, including how to work with LLM request nodes and tool execution nodes."
tags:
  - graph-dsl
  - koog
  - kotlin
  - ai-agent
  - llm
koog_version: "1.0.0"
difficulty: "Intermediate"
category: "Graph DSL"
---

# Overview

Koog 1.0.0 introduces finalized naming conventions and usage patterns for nodes in its graph DSL. This update stabilizes the API surface for production use by preserving the original names for `String`-input LLM request nodes and introducing a new `nodeLLMSendMessage*` prefix for `Message.User`-input variants. Additionally, the `nodeExecuteTools` node now returns `ReceivedToolResults` directly, simplifying graph connections and improving clarity.

This skill covers how to use these finalized nodes effectively in your AI agent graphs.

# Key Concepts

- **Node Naming Stability**: The original `String`-input nodes retain their names, ensuring backward compatibility.
- **Message-Based Nodes**: Nodes that accept `Message.User` inputs now use the `nodeLLMSendMessage*` prefix.
- **Tool Execution Node**: `nodeExecuteTools` returns `ReceivedToolResults` directly, allowing direct connection to message-sending nodes.
- **Graph Connectivity**: Understanding how to connect nodes with updated return types for streamlined graph workflows.

# Code Examples

```kotlin
import ai.koog.agents.core.dsl.graph.*

fun buildAgentGraph() = graph {
    // Using a String-input LLM request node (stable name)
    val llmResponse = nodeLLMRequest("What is the weather today?")

    // Using a Message.User-input LLM send message node (new prefix)
    val userMessage = Message.User("Tell me a joke.")
    val llmMessageResponse = nodeLLMSendMessage(userMessage)

    // Executing tools and receiving results directly
    val toolResults = nodeExecuteTools()

    // Connecting tool results directly to a message-sending node
    val finalResponse = nodeLLMSendToolResults(toolResults)

    // Define graph flow
    llmResponse.connect(toolResults)
    toolResults.connect(finalResponse)
}
```

```kotlin
// Example: Using nodeLLMRequestMultipleChoices for multiple completions
val multipleChoicesNode = nodeLLMRequestMultipleChoices("Generate 3 headlines for AI news")

// Process each choice separately or aggregate results
multipleChoicesNode.forEach { choice ->
    println("Headline: $choice")
}
```

# Summary

With Koog 1.0.0, the graph DSL's node names and behaviors are finalized to provide a stable and clear API for building AI agent workflows. Understanding the distinction between `String`-input nodes and `Message.User`-input nodes, as well as the direct return of tool results from `nodeExecuteTools`, is essential for effective graph construction and maintenance. This stability enables production-grade AI agents with predictable and maintainable graph definitions.