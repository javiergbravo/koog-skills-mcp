---
name: a2a-protocol
description: Implement Agent-to-Agent (A2A) protocol with Koog for inter-agent communication and collaboration
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [a2a, agent-to-agent, protocol, communication, collaboration, server, client]
---

# Agent-to-Agent (A2A) Protocol

The Agent-to-Agent (A2A) protocol enables Koog agents to communicate and collaborate with other agents. This allows building complex multi-agent systems where specialized agents work together to solve tasks.

## Overview

A2A provides:

- **Agent discovery** — Agents can discover each other's capabilities
- **Task delegation** — Agents can delegate subtasks to specialized agents
- **Result aggregation** — Collect and combine results from multiple agents
- **Protocol-based communication** — Standardized message format for interoperability

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-a2a:0.8.0")
}
```

## A2A Server

An A2A server exposes an agent's capabilities to other agents.

### Basic A2A Server

```kotlin
import ai.koog.agents.a2a.A2AServer
import ai.koog.agents.a2a.A2AServerConfig
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

suspend fun main() {
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a research specialist. Provide detailed, accurate research."
    )

    val server = A2AServer(
        config = A2AServerConfig(
            name = "research-agent",
            description = "Specialized in research and information gathering",
            version = "1.0.0"
        ),
        agent = agent
    )

    // Start the server on port 8080
    server.start(port = 8080)
}
```

### A2A Server with Custom Capabilities

```kotlin
import ai.koog.agents.a2a.A2AServer
import ai.koog.agents.a2a.A2AServerConfig
import ai.koog.agents.a2a.AgentCapability

suspend fun main() {
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
        llmModel = OpenAIModels.Chat.GPT4o
    )

    val server = A2AServer(
        config = A2AServerConfig(
            name = "data-analysis-agent",
            description = "Analyzes data and generates reports",
            version = "1.0.0",
            capabilities = listOf(
                AgentCapability(
                    name = "analyze_csv",
                    description = "Analyze CSV data and produce insights",
                    inputSchema = """{"type":"object","properties":{"data":{"type":"string"}}}""",
                    outputSchema = """{"type":"object","properties":{"insights":{"type":"array","items":{"type":"string"}}}}"""
                ),
                AgentCapability(
                    name = "generate_report",
                    description = "Generate a formatted report from data",
                    inputSchema = """{"type":"object","properties":{"title":{"type":"string"},"data":{"type":"string"}}}"""
                )
            )
        ),
        agent = agent
    )

    server.start(port = 8081)
}
```

## A2A Client

An A2A client connects to other agents and delegates tasks.

### Basic A2A Client

```kotlin
import ai.koog.agents.a2a.A2AClient
import ai.koog.agents.a2a.A2AClientConfig

suspend fun main() {
    val client = A2AClient(
        config = A2AClientConfig(
            serverUrl = "http://localhost:8080"
        )
    )

    // Discover agent capabilities
    val agentInfo = client.discover()
    println("Connected to: ${agentInfo.name}")
    println("Capabilities: ${agentInfo.capabilities.map { it.name }}")

    // Delegate a task
    val result = client.sendTask("Research the latest developments in quantum computing")
    println("Result: $result")
}
```

### Multiple Agent Client

```kotlin
import ai.koog.agents.a2a.A2AClient
import ai.koog.agents.a2a.A2AClientConfig

suspend fun main() {
    val researchClient = A2AClient(
        config = A2AClientConfig(serverUrl = "http://localhost:8080")
    )

    val analysisClient = A2AClient(
        config = A2AClientConfig(serverUrl = "http://localhost:8081")
    )

    // Step 1: Research
    val researchResult = researchClient.sendTask(
        "Research the current state of renewable energy adoption globally"
    )

    // Step 2: Analyze
    val analysisResult = analysisClient.sendTask(
        "Analyze this data and identify key trends: $researchResult"
    )

    println("Analysis: $analysisResult")
}
```

## Koog Integration

### Agent as A2A Server

```kotlin
import ai.koog.agents.a2a.A2AServer
import ai.koog.agents.a2a.A2AServerConfig
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.tools.annotation.Tool
import ai.koog.agents.core.tools.annotation.LLMDescription

@Tool
@LLMDescription("Search the web for information")
suspend fun webSearch(@LLMDescription("Search query") query: String): String {
    return "Search results for: $query"
}

suspend fun main() {
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
        llmModel = OpenAIModels.Chat.GPT4o,
        toolRegistry = ToolRegistry { tool(::webSearch) },
        systemPrompt = "You are a research agent. Use web search to find information."
    )

    val server = A2AServer(
        config = A2AServerConfig(
            name = "research-agent",
            description = "Research agent with web search capability"
        ),
        agent = agent
    )

    server.start(port = 8080)
}
```

### Orchestrator Agent

```kotlin
import ai.koog.agents.a2a.A2AClient
import ai.koog.agents.a2a.A2AClientConfig
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.tools.annotation.Tool
import ai.koog.agents.core.tools.annotation.LLMDescription

class AgentOrchestrator {
    private val researchClient = A2AClient(
        config = A2AClientConfig(serverUrl = "http://localhost:8080")
    )
    private val analysisClient = A2AClient(
        config = A2AClientConfig(serverUrl = "http://localhost:8081")
    )

    @Tool
    @LLMDescription("Delegate research to the research agent")
    suspend fun delegateResearch(@LLMDescription("Research topic") topic: String): String {
        return researchClient.sendTask(topic)
    }

    @Tool
    @LLMDescription("Delegate analysis to the analysis agent")
    suspend fun delegateAnalysis(@LLMDescription("Data to analyze") data: String): String {
        return analysisClient.sendTask(data)
    }

    fun createOrchestratorAgent(): AIAgent {
        return AIAgent(
            promptExecutor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY")),
            llmModel = OpenAIModels.Chat.GPT4o,
            toolRegistry = ToolRegistry {
                tool(::delegateResearch)
                tool(::delegateAnalysis)
            },
            systemPrompt = """
                You are an orchestrator agent. You coordinate between specialized agents:
                - Use delegateResearch for research tasks
                - Use delegateAnalysis for data analysis tasks
                Break complex tasks into subtasks and delegate appropriately.
            """.trimIndent()
        )
    }
}
```

## Inter-Agent Communication Patterns

### Sequential Pipeline

```kotlin
suspend fun sequentialPipeline(task: String): String {
    // Agent 1: Research
    val research = researchClient.sendTask("Research: $task")

    // Agent 2: Summarize
    val summary = summaryClient.sendTask("Summarize: $research")

    // Agent 3: Format
    val formatted = formatClient.sendTask("Format as report: $summary")

    return formatted
}
```

### Parallel Execution

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

suspend fun parallelExecution(task: String): String = coroutineScope {
    val results = listOf(
        async { researchClient.sendTask("Research aspect 1 of: $task") },
        async { researchClient.sendTask("Research aspect 2 of: $task") },
        async { researchClient.sendTask("Research aspect 3 of: $task") }
    ).awaitAll()

    // Aggregate results
    analysisClient.sendTask("Analyze and combine: ${results.joinToString("\n")}")
}
```

### Request-Response with Context

```kotlin
suspend fun contextAwareDelegation(task: String, context: Map<String, String>): String {
    val contextStr = context.entries.joinToString("\n") { "${it.key}: ${it.value}" }

    val result = researchClient.sendTask("""
        Task: $task

        Context:
        $contextStr
    """.trimIndent())

    return result
}
```

## Java API

```java
import ai.koog.agents.a2a.A2AClient;
import ai.koog.agents.a2a.A2AClientConfig;

public class A2AExample {
    public static void main(String[] args) throws Exception {
        var client = new A2AClient(
            new A2AClientConfig("http://localhost:8080")
        );

        var agentInfo = client.discover();
        System.out.println("Connected to: " + agentInfo.getName());

        String result = client.sendTask("Research quantum computing");
        System.out.println("Result: " + result);
    }
}
```

## Best Practices

1. **Define clear capabilities** — Each agent should have well-defined capabilities and schemas
2. **Handle failures gracefully** — Implement retry logic and fallback strategies
3. **Use timeouts** — Set appropriate timeouts for inter-agent communication
4. **Validate responses** — Validate agent responses before passing to the next step
5. **Log interactions** — Log all inter-agent communication for debugging
6. **Secure endpoints** — Use authentication for production A2A servers

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` | Ensure the A2A server is running and accessible |
| `Capability not found` | Check agent capabilities with `client.discover()` |
| `Task timeout` | Increase timeout in `A2AClientConfig` |
| `Invalid response` | Validate the agent's output schema matches expectations |
| `Authentication failed` | Ensure credentials are correctly configured |
