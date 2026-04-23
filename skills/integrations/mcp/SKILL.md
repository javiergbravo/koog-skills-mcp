---
name: mcp-integration
description: Integrate MCP (Model Context Protocol) servers with Koog agents using McpToolRegistryProvider for stdio and SSE transports
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [mcp, model-context-protocol, tool-registry, stdio, sse, external-tools]
---

# MCP Integration

The Model Context Protocol (MCP) enables Koog agents to discover and use tools exposed by external MCP servers. Koog provides first-class MCP support through the `McpToolRegistryProvider` for both stdio and SSE transports.

## Overview

MCP is an open protocol that standardizes how AI agents connect to external tool providers. With Koog's MCP integration, you can:

- Connect to any MCP-compliant server (stdio or SSE)
- Dynamically discover tools at runtime
- Bridge MCP tools into Koog's native `ToolRegistry`
- Use well-known MCP servers like Google Maps, Playwright, and more

## Dependencies

Add the MCP integration dependency:

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-mcp:0.8.0")
}
```

## McpToolRegistryProvider

The `McpToolRegistryProvider` is the central entry point for creating tool registries from MCP servers.

### Creating a Tool Registry from a Transport

```kotlin
import ai.koog.agents.mcp.McpToolRegistryProvider
import ai.koog.agents.mcp.McpTransport

// Create a tool registry from an MCP transport
val toolRegistry = McpToolRegistryProvider.fromTransport(
    transport = McpTransport.Stdio(process)
)
```

### Factory Methods

| Method | Transport | Use Case |
|--------|-----------|----------|
| `fromTransport(transport)` | Any `McpTransport` | Generic transport |
| `fromProcess(process)` | Stdio (subprocess) | Local MCP servers |
| `fromClient(client)` | Existing `McpClient` | Pre-configured client |
| `fromSseUrl(url)` | SSE (HTTP) | Remote MCP servers |

## Stdio Connection

Connect to MCP servers that communicate via standard input/output using a subprocess.

### Basic Stdio Connection

```kotlin
import ai.koog.agents.mcp.McpToolRegistryProvider
import ai.koog.agents.mcp.McpTransport

// Start the MCP server as a subprocess
val process = ProcessBuilder("npx", "-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir")
    .redirectErrorStream(true)
    .start()

// Create a tool registry from the process
val toolRegistry = McpToolRegistryProvider.fromProcess(process)

// Use the registry with an agent
val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    toolRegistry = toolRegistry
)

val result = agent.run("List all files in the directory")
println(result)

// Clean up
process.destroy()
```

### Stdio with Custom Environment

```kotlin
val process = ProcessBuilder("npx", "-y", "@modelcontextprotocol/server-postgres")
    .apply {
        environment()["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/mydb"
        redirectErrorStream(true)
    }
    .start()

val toolRegistry = McpToolRegistryProvider.fromProcess(process)
```

### Google Maps MCP Server Example

```kotlin
import ai.koog.agents.mcp.McpToolRegistryProvider
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")
    val googleMapsKey = System.getenv("GOOGLE_MAPS_API_KEY")

    // Start Google Maps MCP server
    val process = ProcessBuilder(
        "npx", "-y", "@modelcontextprotocol/server-google-maps"
    ).apply {
        environment()["GOOGLE_MAPS_API_KEY"] = googleMapsKey
        redirectErrorStream(true)
    }.start()

    // Create tool registry from the MCP server
    val toolRegistry = McpToolRegistryProvider.fromProcess(process)

    // Create agent with MCP tools
    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        toolRegistry = toolRegistry
    )

    val result = agent.run("Find coffee shops near the Eiffel Tower")
    println(result)

    process.destroy()
}
```

### Playwright MCP Server Example

```kotlin
import ai.koog.agents.mcp.McpToolRegistryProvider
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    // Start Playwright MCP server
    val process = ProcessBuilder(
        "npx", "-y", "@playwright/mcp@latest"
    ).apply {
        redirectErrorStream(true)
    }.start()

    val toolRegistry = McpToolRegistryProvider.fromProcess(process)

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        toolRegistry = toolRegistry
    )

    // The agent can now browse the web using Playwright
    val result = agent.run("Go to example.com and extract the page title")
    println(result)

    process.destroy()
}
```

## SSE Connection

Connect to remote MCP servers over HTTP using Server-Sent Events (SSE) transport.

### Basic SSE Connection

```kotlin
import ai.koog.agents.mcp.McpToolRegistryProvider

// Connect to a remote MCP server via SSE
val toolRegistry = McpToolRegistryProvider.fromSseUrl(
    url = "http://localhost:3000/mcp"
)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    toolRegistry = toolRegistry
)

val result = agent.run("Use the available tools to complete this task")
println(result)
```

### SSE with Authentication

```kotlin
val toolRegistry = McpToolRegistryProvider.fromSseUrl(
    url = "https://mcp.example.com/sse",
    headers = mapOf(
        "Authorization" to "Bearer ${System.getenv("MCP_TOKEN")}",
        "X-API-Key" to System.getenv("MCP_API_KEY")
    )
)
```

## McpTool Bridge

Koog bridges MCP tools into its native tool system via `McpTool`. This allows MCP-discovered tools to be used seamlessly with all Koog features.

```kotlin
import ai.koog.agents.mcp.McpTool
import ai.koog.agents.mcp.McpToolDescriptorParser

// Parse an MCP tool descriptor into a Koog tool
val mcpTool = McpTool(
    name = "search_web",
    description = "Search the web for information",
    inputSchema = McpToolDescriptorParser.parse(inputJsonSchema)
)

// The McpTool implements Koog's Tool interface
// It can be registered in a ToolRegistry like any other tool
val registry = ToolRegistry {
    tool(mcpTool)
}
```

### McpToolDescriptorParser

The `McpToolDescriptorParser` converts MCP tool schemas into Koog's internal format:

```kotlin
import ai.koog.agents.mcp.McpToolDescriptorParser

// Parse an MCP JSON schema
val descriptor = McpToolDescriptorParser.parse("""
{
    "type": "object",
    "properties": {
        "query": {
            "type": "string",
            "description": "The search query"
        },
        "maxResults": {
            "type": "integer",
            "description": "Maximum number of results",
            "default": 10
        }
    },
    "required": ["query"]
}
""")
```

## McpServerInfo

When connecting to an MCP server, you can retrieve server information:

```kotlin
import ai.koog.agents.mcp.McpServerInfo

// After creating a client, inspect server capabilities
val serverInfo: McpServerInfo = client.getServerInfo()

println("Server name: ${serverInfo.name}")
println("Server version: ${serverInfo.version}")
println("Capabilities: ${serverInfo.capabilities}")
```

## Multiple MCP Servers

Combine tools from multiple MCP servers in a single agent:

```kotlin
import ai.koog.agents.mcp.McpToolRegistryProvider
import ai.koog.agents.core.tools.ToolRegistry

// Connect to multiple MCP servers
val filesystemTools = McpToolRegistryProvider.fromProcess(
    ProcessBuilder("npx", "-y", "@modelcontextprotocol/server-filesystem", "/data").start()
)

val webTools = McpToolRegistryProvider.fromSseUrl(
    url = "http://localhost:3001/mcp"
)

val databaseTools = McpToolRegistryProvider.fromProcess(
    ProcessBuilder("npx", "-y", "@modelcontextprotocol/server-postgres").apply {
        environment()["DATABASE_URL"] = System.getenv("DATABASE_URL")
    }.start()
)

// Combine all tool registries
val combinedRegistry = ToolRegistry {
    registerAllFrom(filesystemTools)
    registerAllFrom(webTools)
    registerAllFrom(databaseTools)
}

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    toolRegistry = combinedRegistry
)
```

## Java API

```java
import ai.koog.agents.mcp.McpToolRegistryProvider;
import ai.koog.agents.core.agent.AIAgent;

public class McpExample {
    public static void main(String[] args) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            "npx", "-y", "@modelcontextprotocol/server-filesystem", "/path"
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        var toolRegistry = McpToolRegistryProvider.fromProcess(process);

        var agent = AIAgent.builder(executor, model)
            .setToolRegistry(toolRegistry)
            .build();

        String result = agent.run("List all files");
        System.out.println(result);

        process.destroy();
    }
}
```

## Best Practices

1. **Always clean up processes** — Call `process.destroy()` when done with stdio-based servers
2. **Handle connection failures** — Wrap MCP connections in try-catch for network errors
3. **Timeout configuration** — Set appropriate timeouts for SSE connections
4. **Tool discovery** — Use `McpToolRegistryProvider` for automatic tool discovery rather than manual registration
5. **Error handling** — MCP tool errors are propagated as Koog tool errors; handle them in your agent's error strategy

## Common MCP Servers

| Server | Package | Transport |
|--------|---------|-----------|
| Filesystem | `@modelcontextprotocol/server-filesystem` | Stdio |
| Google Maps | `@modelcontextprotocol/server-google-maps` | Stdio |
| Playwright | `@playwright/mcp` | Stdio |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Stdio |
| GitHub | `@modelcontextprotocol/server-github` | Stdio |
| Slack | `@modelcontextprotocol/server-slack` | Stdio |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Process exited unexpectedly` | Check that the MCP server package is installed (`npx -y <package>`) |
| `Connection refused (SSE)` | Verify the MCP server is running and the URL is correct |
| `Tool not found` | Ensure the MCP server exposes the expected tools (check server docs) |
| `Schema parse error` | Validate the MCP tool's JSON schema against the MCP specification |
| `Timeout on SSE` | Increase timeout settings or check network connectivity |
