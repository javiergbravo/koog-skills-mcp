---
name: basic-agents
description: Create basic AI agents with AIAgent, system prompts, tool registration, and event handling in Koog
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [agent, basic, system-prompt, tool, event, temperature, max-iterations]
---

# Basic Agents

Learn how to create and configure AI agents using the `AIAgent` class in Koog 0.8.0.

## Minimal Agent

The simplest agent requires only an executor and a model:

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o
)

val result = agent.run("What is the capital of France?")
```

## System Prompt

Define the agent's personality and instructions with a system prompt:

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = """
        You are a helpful Kotlin programming assistant.
        Always provide code examples in Kotlin.
        Use coroutines for async operations.
        Follow Kotlin coding conventions.
    """.trimIndent()
)
```

## Temperature Control

Control the creativity/randomness of responses:

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    temperature = 0.7  // 0.0 = deterministic, 2.0 = very creative
)
```

| Temperature | Use Case |
|-------------|----------|
| 0.0 - 0.2 | Factual Q&A, code generation |
| 0.3 - 0.7 | Balanced conversation, general tasks |
| 0.8 - 1.2 | Creative writing, brainstorming |
| 1.3 - 2.0 | Highly creative, experimental |

## Max Iterations

Control how many LLM calls the agent can make per run (default: 50):

```kotlin
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    maxIterations = 10  // Limit to 10 LLM calls per run
)
```

This is especially important when using tools, as each tool call requires an additional LLM iteration.

## Tool Registration

Register tools using `ToolRegistry`:

```kotlin
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.tools.Tool

val toolRegistry = ToolRegistry {
    tool(MyCustomTool())
    tool(AnotherTool())
}

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    toolRegistry = toolRegistry
)
```

### Annotation-Based Tools

The simplest way to create tools — use `@Tool` and `@LLMDescription` annotations:

```kotlin
import ai.koog.agents.core.tools.Tool
import ai.koog.agents.core.tools.annotations.LLMDescription

@Tool
@LLMDescription("Get the current weather for a location")
suspend fun getWeather(
    @LLMDescription("The city name") city: String,
    @LLMDescription("Temperature unit: celsius or fahrenheit") unit: String = "celsius"
): String {
    return "The weather in $city is 22°C and sunny"
}

// Register annotation-based tools
val toolRegistry = ToolRegistry {
    tool(getWeather)
}
```

### Class-Based Tools

For more control, create tools by extending `SimpleTool`:

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor

object CalculatorTool : SimpleTool<CalculatorTool.Args>() {
    override val descriptor = ToolDescriptor(
        name = "calculator",
        description = "Perform basic arithmetic"
    )

    data class Args(
        val expression: String
    ) : Tool.Args

    override suspend fun execute(args: Args): String {
        // Evaluate expression
        return evaluate(args.expression).toString()
    }
}

val toolRegistry = ToolRegistry {
    tool(CalculatorTool)
}
```

See **[Tools Overview](../../tools/overview/SKILL.md)** for complete tool documentation.

## Event Handling

Handle agent events using `handleEvents{}`:

```kotlin
import ai.koog.agents.core.feature.model.featureConfig

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    toolRegistry = toolRegistry
)

agent.handleEvents {
    onToolCallStarted { toolName, args ->
        println("Tool called: $toolName with args: $args")
    }

    onToolCallCompleted { toolName, args, result ->
        println("Tool $toolName returned: $result")
    }

    onLLMCallStarted { model, messages ->
        println("Calling LLM: $model with ${messages.size} messages")
    }

    onLLMCallCompleted { model, messages, response ->
        println("LLM response: ${response.take(100)}...")
    }

    onError { error ->
        println("Agent error: ${error.message}")
    }

    onAgentFinished { result ->
        println("Agent finished with result: $result")
    }
}
```

## Java Pattern

Creating agents in Java:

```java
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.core.tools.ToolRegistry;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;

public class MyAgent {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("OPENAI_API_KEY");

        // Build tool registry
        var toolRegistry = ToolRegistry.builder()
            .tool(new MyCustomTool())
            .build();

        // Build agent
        var agent = AIAgent.builder(
                SimpleOpenAIExecutorKt.simpleOpenAIExecutor(apiKey),
                OpenAIModels.Chat.GPT4o
            )
            .systemPrompt("You are a helpful assistant.")
            .temperature(0.7)
            .maxIterations(10)
            .toolRegistry(toolRegistry)
            .build();

        // Run agent
        String result = agent.run("What tools do you have?");
        System.out.println(result);
    }
}
```

### ToolSet Interface (Java)

For Java, use the `ToolSet` interface to group related tools:

```java
import ai.koog.agents.core.tools.ToolSet;
import ai.koog.agents.core.tools.Tool;

public class MathTools implements ToolSet {
    @Override
    public List<Tool<?>> getTools() {
        return List.of(
            new AddTool(),
            new SubtractTool(),
            new MultiplyTool()
        );
    }
}

// Register all tools at once
var toolRegistry = ToolRegistry.builder()
    .toolSet(new MathTools())
    .build();
```

## Complete Example

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.tools.annotations.LLMDescription
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

@Tool
@LLMDescription("Get the current date and time")
suspend fun getCurrentDateTime(): String {
    return kotlinx.datetime.Clock.System.now().toString()
}

@Tool
@LLMDescription("Generate a random number")
suspend fun randomNumber(
    @LLMDescription("Minimum value (inclusive)") min: Int = 0,
    @LLMDescription("Maximum value (inclusive)") max: Int = 100
): String {
    return (min..max).random().toString()
}

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    val toolRegistry = ToolRegistry {
        tool(getCurrentDateTime)
        tool(randomNumber)
    }

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a helpful assistant with access to date/time and random number tools.",
        temperature = 0.5,
        maxIterations = 10,
        toolRegistry = toolRegistry
    )

    agent.handleEvents {
        onToolCallStarted { toolName, args ->
            println("[Tool] Calling $toolName")
        }
        onToolCallCompleted { toolName, _, result ->
            println("[Tool] $toolName returned: $result")
        }
    }

    val result = agent.run("What time is it? Also, give me a random number between 1 and 50.")
    println("\nAgent: $result")
}
```

## Configuration Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `promptExecutor` | `PromptExecutor` | *(required)* | LLM executor for the chosen provider |
| `llmModel` | `LLMModel` | *(required)* | Model constant from the provider |
| `systemPrompt` | `String` | `""` | System instructions for the agent |
| `temperature` | `Double` | `provider default` | Randomness control (0.0 - 2.0) |
| `maxIterations` | `Int` | `50` | Maximum LLM calls per run |
| `toolRegistry` | `ToolRegistry` | `ToolRegistry()` | Registry of available tools |
