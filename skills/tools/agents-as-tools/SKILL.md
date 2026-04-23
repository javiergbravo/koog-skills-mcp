---
name: agents-as-tools
description: Convert AI agents into tools for hierarchical multi-agent architectures in Koog
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [agent-tool, hierarchical, multi-agent, aiaagent-service, coordinator]
---

# Agents as Tools

Koog allows you to convert AI agents into tools, enabling hierarchical multi-agent architectures where a coordinator agent delegates tasks to specialized sub-agents.

## Core Concept

```
Coordinator Agent
├── Research Agent (as tool)
├── Writer Agent (as tool)
└── Reviewer Agent (as tool)
```

The coordinator agent decides which sub-agent to invoke based on the task, passing work down the hierarchy.

## AIAgentService

`AIAgentService` provides the `createAgentTool()` factory method to convert any `AIAgent` into a tool:

```kotlin
import ai.koog.agents.core.agent.AIAgentService
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

val apiKey = System.getenv("OPENAI_API_KEY")
val executor = simpleOpenAIExecutor(apiKey)

// Create a specialized sub-agent
val researchAgent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = """
        You are a research specialist. Your job is to find accurate,
        up-to-date information on any topic. Always cite your sources.
    """.trimIndent()
)

// Convert it to a tool
val researchTool = AIAgentService.createAgentTool(
    agent = researchAgent,
    agentName = "researcher",
    agentDescription = "Research specialist that finds and analyzes information on any topic",
    inputDescription = "The research question or topic to investigate",
    inputType = String::class
)
```

## createAgentTool Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent` | `AIAgent` | The agent to convert into a tool |
| `agentName` | `String` | Name for the tool (used by LLM to reference it) |
| `agentDescription` | `String` | Description helping the LLM decide when to use this tool |
| `inputDescription` | `String` | Description of the input the tool expects |
| `inputType` | `KClass<*>` | The type of input the tool accepts |

## Building a Multi-Agent System

### Step 1: Create Specialized Agents

```kotlin
// Research Agent
val researchAgent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = """
        You are a research specialist. Find accurate, current information.
        Always cite sources and verify facts.
    """.trimIndent()
)

// Writer Agent
val writerAgent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = """
        You are a professional writer. Create clear, engaging content.
        Adapt your tone to the audience and purpose.
    """.trimIndent()
)

// Reviewer Agent
val reviewerAgent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = """
        You are an editor and reviewer. Check for:
        - Accuracy and factual correctness
        - Grammar and style
        - Clarity and coherence
        Provide specific, actionable feedback.
    """.trimIndent()
)
```

### Step 2: Convert to Tools

```kotlin
import ai.koog.agents.core.agent.AIAgentService

val researchTool = AIAgentService.createAgentTool(
    agent = researchAgent,
    agentName = "researcher",
    agentDescription = "Research specialist that finds and analyzes information",
    inputDescription = "The research question or topic to investigate",
    inputType = String::class
)

val writerTool = AIAgentService.createAgentTool(
    agent = writerAgent,
    agentName = "writer",
    agentDescription = "Professional writer that creates content",
    inputDescription = "The writing task: topic, style, and requirements",
    inputType = String::class
)

val reviewerTool = AIAgentService.createAgentTool(
    agent = reviewerAgent,
    agentName = "reviewer",
    agentDescription = "Editor that reviews and improves content",
    inputDescription = "The content to review with specific review criteria",
    inputType = String::class
)
```

### Step 3: Create Coordinator Agent

```kotlin
import ai.koog.agents.core.tools.ToolRegistry

val toolRegistry = ToolRegistry {
    tool(researchTool)
    tool(writerTool)
    tool(reviewerTool)
}

val coordinatorAgent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = """
        You are a content production coordinator. Your job is to:
        1. Break down content requests into tasks
        2. Delegate research to the researcher
        3. Delegate writing to the writer
        4. Delegate review to the reviewer
        5. Integrate results and deliver the final product

        Work step by step. Always start with research, then writing, then review.
    """.trimIndent(),
    toolRegistry = toolRegistry,
    maxIterations = 20
)
```

### Step 4: Run the Coordinator

```kotlin
val result = coordinatorAgent.run("""
    Create a blog post about "The Future of AI Agents in Software Development".
    The post should be:
    - 800-1000 words
    - Technical but accessible
    - Include real-world examples
    - End with actionable takeaways
""")

println(result)
```

## Complete Example

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.agent.AIAgentService
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")
    val executor = simpleOpenAIExecutor(apiKey)

    // Specialized agents
    val researcher = AIAgent(
        promptExecutor = executor,
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a research specialist. Find facts and cite sources."
    )

    val coder = AIAgent(
        promptExecutor = executor,
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a Kotlin developer. Write clean, idiomatic code."
    )

    val tester = AIAgent(
        promptExecutor = executor,
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a QA engineer. Write comprehensive tests."
    )

    // Convert to tools
    val tools = ToolRegistry {
        tool(AIAgentService.createAgentTool(
            agent = researcher,
            agentName = "researcher",
            agentDescription = "Research APIs, libraries, and best practices",
            inputDescription = "What to research",
            inputType = String::class
        ))
        tool(AIAgentService.createAgentTool(
            agent = coder,
            agentName = "coder",
            agentDescription = "Write Kotlin code based on requirements",
            inputDescription = "Coding requirements and specifications",
            inputType = String::class
        ))
        tool(AIAgentService.createAgentTool(
            agent = tester,
            agentName = "tester",
            agentDescription = "Write and review tests for code",
            inputDescription = "Code to test and test requirements",
            inputType = String::class
        ))
    }

    // Coordinator
    val coordinator = AIAgent(
        promptExecutor = executor,
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = """
            You are a tech lead coordinating a development task.
            Use your team:
            - researcher: For finding APIs and best practices
            - coder: For writing implementation code
            - tester: For writing tests

            Follow this workflow:
            1. Research the requirements
            2. Write the code
            3. Write tests
            4. Review and finalize
        """.trimIndent(),
        toolRegistry = tools,
        maxIterations = 15
    )

    val result = coordinator.run("""
        Build a Kotlin function that:
        - Fetches weather data from an API
        - Parses the JSON response
        - Returns a formatted weather summary
        - Include error handling
    """)

    println(result)
}
```

## Java Pattern

```java
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.core.agent.AIAgentService;
import ai.koog.agents.core.tools.ToolRegistry;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;

public class MultiAgentSystem {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("OPENAI_API_KEY");
        var executor = SimpleOpenAIExecutorKt.simpleOpenAIExecutor(apiKey);

        // Create specialized agents
        var researcher = AIAgent.builder(executor, OpenAIModels.Chat.GPT4o)
            .systemPrompt("You are a research specialist.")
            .build();

        var writer = AIAgent.builder(executor, OpenAIModels.Chat.GPT4o)
            .systemPrompt("You are a professional writer.")
            .build();

        // Convert to tools
        var researchTool = AIAgentService.createAgentTool(
            researcher,
            "researcher",
            "Research specialist that finds information",
            "The topic to research",
            String.class
        );

        var writerTool = AIAgentService.createAgentTool(
            writer,
            "writer",
            "Professional writer that creates content",
            "The writing task and requirements",
            String.class
        );

        // Build coordinator
        var toolRegistry = ToolRegistry.builder()
            .tool(researchTool)
            .tool(writerTool)
            .build();

        var coordinator = AIAgent.builder(executor, OpenAIModels.Chat.GPT4o)
            .systemPrompt("You coordinate research and writing tasks.")
            .toolRegistry(toolRegistry)
            .maxIterations(15)
            .build();

        String result = coordinator.run("Write an article about Kotlin coroutines");
        System.out.println(result);
    }
}
```

## Hierarchical Architecture Patterns

### Flat Hierarchy

```
Coordinator
├── Agent A
├── Agent B
└── Agent C
```

All sub-agents at the same level. Coordinator delegates directly.

### Nested Hierarchy

```
Top Coordinator
├── Research Team Lead
│   ├── Web Researcher
│   └── Database Researcher
├── Development Team Lead
│   ├── Frontend Developer
│   └── Backend Developer
└── QA Team Lead
    ├── Unit Tester
    └── Integration Tester
```

Sub-agents can themselves be coordinators with their own sub-agents.

### Pipeline Pattern

```
Pipeline Coordinator
├── Step 1: Researcher → output
├── Step 2: Writer(input from 1) → output
├── Step 3: Reviewer(input from 2) → output
└── Step 4: Finalizer(input from 3) → result
```

Sequential processing where each agent's output feeds the next.

## Best Practices

1. **Clear agent descriptions** — Help the coordinator decide which agent to use
2. **Specific input descriptions** — Tell the coordinator what format each agent expects
3. **Set maxIterations** — Prevent runaway delegation loops
4. **Use appropriate models** — Sub-agents can use cheaper models for simple tasks
5. **Limit hierarchy depth** — Deep hierarchies add latency and cost
6. **Handle failures** — Sub-agents should return useful error messages
7. **Monitor costs** — Each agent call consumes tokens; track total usage
8. **Test individually** — Test each sub-agent before integrating into the hierarchy

## Cost Considerations

Each agent-as-tool invocation involves:
- 1 LLM call for the coordinator to decide to use the tool
- 1+ LLM calls for the sub-agent to complete its task
- 1 LLM call for the coordinator to process the result

For a simple delegation, that's 3+ LLM calls. Plan your hierarchies accordingly.

## When to Use Agents as Tools

| Use Agents as Tools | Use Regular Tools |
|--------------------|-------------------|
| Complex, multi-step reasoning | Simple, deterministic operations |
| Tasks requiring conversation | Single input → single output |
| Dynamic task decomposition | Well-defined parameters |
| Different expertise domains | Domain-specific logic |
| Need for iterative refinement | One-shot execution |
