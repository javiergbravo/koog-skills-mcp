---
name: predefined-strategies
description: Use Koog's built-in chatAgentStrategy() and reActStrategy() for conversational and reasoning agents
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [chat-agent, react, strategy, predefined, reasoning, act-observe]
---

# Predefined Strategies

Koog provides two built-in agent strategies that cover the most common agent patterns.

## Overview

| Strategy | Pattern | Best For |
|----------|---------|----------|
| `chatAgentStrategy()` | Conversational loop with tool enforcement | Chatbots, Q&A, general assistants |
| `reActStrategy()` | Reason → Act → Observe cycle | Complex multi-step tasks, analysis |

## Chat Agent Strategy

A conversational agent that processes user input, calls tools when needed, and returns responses. Enforces tool usage over plain-text answers.

### Dependency

```kotlin
import ai.koog.agents.ext.agent.chatAgentStrategy
```

### Kotlin Setup

```kotlin
import ai.koog.agents.ext.agent.chatAgentStrategy
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

val chatAgent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
    llmModel = OpenAIModels.Chat.GPT4o,
    strategy = chatAgentStrategy(),
    toolRegistry = ToolRegistry {
        tool(searchTool)
        tool(weatherTool)
    }
)

val result = chatAgent.run("What's the weather like today?")
```

### Java Setup

```java
import ai.koog.agents.ext.agent.AIAgentStrategies;
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.core.tools.ToolRegistry;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;

ToolRegistry toolRegistry = ToolRegistry.builder()
    .tools(new SearchAndWeatherTools())
    .build();

AIAgent<String, String> chatAgent = AIAgent.builder()
    .promptExecutor(SimpleOpenAIExecutorKt.simpleOpenAIExecutor(
        System.getenv("OPENAI_API_KEY")))
    .llmModel(OpenAIModels.Chat.GPT4o)
    .graphStrategy(AIAgentStrategies.chatAgentStrategy())
    .toolRegistry(toolRegistry)
    .build();

String result = chatAgent.run("What's the weather like today?");
```

### How It Works

```
User Input → LLM Processing → Tool Call? → Execute Tool → Loop Back
                                     ↓ No
                                  Response
```

1. User sends a message
2. LLM processes the message with available tools
3. If LLM requests tool calls → execute tools → send results back to LLM
4. Repeat until LLM produces a final text response
5. Provides feedback if the LLM tries to respond with plain text instead of using tools

### Best Use Cases

- Conversational agents requiring tool access
- Assistants performing actions on user requests
- Chatbots accessing external systems or data
- Situations enforcing tool usage over plain text

## ReAct Strategy (Reasoning and Acting)

Alternates between reasoning and execution stages in a loop: **Reason** → **Act** → **Observe** → repeat until complete.

### Dependency

```kotlin
import ai.koog.agents.ext.agent.reActStrategy
```

### Kotlin Setup

```kotlin
import ai.koog.agents.ext.agent.reActStrategy
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

val reActAgent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    strategy = reActStrategy(
        reasoningInterval = 1,
        name = "banking_agent"
    ),
    toolRegistry = ToolRegistry {
        tool(getTransactions)
        tool(calculateSum)
    }
)

val result = reActAgent.run("How much did I spend last month?")
```

### Java Setup

```java
AIAgent<String, String> reActAgent = AIAgent.<String, String>builder()
    .promptExecutor(SimpleOpenAIExecutorKt.simpleOpenAIExecutor(
        System.getenv("OPENAI_API_KEY")))
    .llmModel(OpenAIModels.Chat.GPT4o)
    .graphStrategy(AIAgentStrategies.reActStrategy(1, "banking_agent"))
    .toolRegistry(ToolRegistry.builder()
        .tools(new BankingTools())
        .build())
    .build();

String result = reActAgent.run("How much did I spend last month?");
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `reasoningInterval` | `Int` | `1` | Interval for reasoning steps; must be > 0 |
| `name` | `String` | `"re_act"` | The strategy name for tracing |

### How It Works

```
User Question
    ↓
┌─── Reason: Plan next step ───┐
│                               │
├─── Act: Call a tool ──────────┤
│                               │
├─── Observe: Tool result ──────┤
│                               │
└─── (repeat until solved) ─────┘
    ↓
Final Answer
```

### Banking Example Trace

**User**: "How much did I spend last month?"

1. **Reason**: I need to get transactions, filter deposits, then calculate the sum
2. **Act**: `get_transactions(startDate: "2025-05-19", endDate: "2025-06-18")`
3. **Observe**: Returns transaction records including positive (deposits) and negative (spending)
4. **Reason**: I need to remove the salary deposit and sum remaining transactions
5. **Act**: `calculate_sum(amounts: [-100.00, -500.00, -200.00])`
6. **Observe**: Result: `-800.00`
7. **Final**: "You spent $800.00 last month on groceries, rent, and utilities."

### Best Use Cases

- Complex tasks requiring multistep reasoning
- Scenarios where the agent gathers information before answering
- Problems benefiting from decomposition into smaller steps
- Tasks combining analytical thinking with tool usage

## When to Use Each

| Scenario | Recommended Strategy |
|----------|---------------------|
| Simple Q&A with tools | `chatAgentStrategy()` |
| Multi-step analysis | `reActStrategy()` |
| Data processing pipeline | `reActStrategy()` |
| Conversational chatbot | `chatAgentStrategy()` |
| Research tasks | `reActStrategy()` |
| Quick lookups | `chatAgentStrategy()` |

## Key Differences

| Aspect | Chat Agent | ReAct |
|--------|-----------|-------|
| **Pattern** | Input → LLM → Tool/Response loop | Reason → Act → Observe cycle |
| **Reasoning** | Implicit (LLM decides) | Explicit, structured reasoning steps |
| **Parameters** | None configurable | `reasoningInterval`, `name` |
| **Complexity** | Simpler conversational flows | Multi-step complex tasks |
| **Import** | `chatAgentStrategy()` | `reActStrategy()` |
| **Java** | `AIAgentStrategies.chatAgentStrategy()` | `AIAgentStrategies.reActStrategy(...)` |
