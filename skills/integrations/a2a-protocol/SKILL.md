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

## Security

A2A servers expose agent capabilities over HTTP. Securing them is critical, especially when agents interact with external services or sensitive data.

### Authentication

Protect your A2A server with a bearer token or API key:

```kotlin
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.bearer

install(Authentication) {
    bearer("a2a-auth") {
        authenticate { credential ->
            // Validate the bearer token against a known value loaded from the environment
            val expected = System.getenv("A2A_SECRET_TOKEN")
                ?: error("A2A_SECRET_TOKEN not set")
            if (credential.token == expected) UserIdPrincipal("agent") else null
        }
    }
}

// Apply authentication to all A2A routes
authenticate("a2a-auth") {
    a2aServer(agent)
}
```

### TLS / HTTPS

Never expose an A2A server over plain HTTP in production. Use TLS:

```kotlin
embeddedServer(Netty, port = 8443, configure = {
    sslConnector(
        keyStore = loadKeyStore(),
        keyAlias = "mykey",
        keyStorePassword = { System.getenv("KEYSTORE_PASS").toCharArray() },
        privateKeyPassword = { System.getenv("KEY_PASS").toCharArray() }
    ) {}
}) { a2aModule() }.start(wait = true)
```

For local development behind a TLS-terminating reverse proxy (nginx, Caddy), run your server on `localhost` and ensure the proxy is the only public-facing entry point.

### Input Validation

An A2A server receives task inputs from external agents — treat all incoming data as untrusted:

```kotlin
override suspend fun handleTask(task: A2ATask): A2AResult {
    require(task.input.length <= 10_000) { "Task input exceeds maximum allowed length" }
    // Validate input against expected schema before passing to the agent
    val sanitized = sanitize(task.input)
    return agent.run(sanitized)
}
```

### Network Isolation

For multi-agent systems on the same host, prefer running A2A servers on `localhost` with a local port rather than exposing them on `0.0.0.0`. Use an overlay network (e.g., Docker bridge) to limit inter-agent reachability.

## Best Practices

1. **Define clear capabilities** — Each agent should have well-defined capabilities and schemas
2. **Handle failures gracefully** — Implement retry logic and fallback strategies
3. **Use timeouts** — Set appropriate timeouts for inter-agent communication
4. **Validate responses** — Validate agent responses before passing to the next step
5. **Log interactions** — Log all inter-agent communication for debugging
6. **Secure endpoints** — Use bearer-token authentication and TLS for all production A2A servers
7. **Validate inputs** — Treat all incoming task inputs as untrusted; validate length and schema
8. **Network isolation** — Restrict A2A server binding to `localhost` or a private network

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` | Ensure the A2A server is running and accessible |
| `Capability not found` | Check agent capabilities with `client.discover()` |
| `Task timeout` | Increase timeout in `A2AClientConfig` |
| `Invalid response` | Validate the agent's output schema matches expectations |
| `Authentication failed` | Ensure credentials are correctly configured |
