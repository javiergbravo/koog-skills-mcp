---
name: class-based-tools
description: Create tools using SimpleTool class and ToolDescriptor in Koog for advanced tool definitions
compatibility: "Koog 1.0.0"
license: Apache-2.0
keywords: [simple-tool, tool-descriptor, class, schema, tool-descriptor-schemer]
---

# Class-Based Tools

Class-based tools provide more control over tool definitions, schemas, and execution. Use `SimpleTool` and `ToolDescriptor` for advanced tool implementations.

## SimpleTool

`SimpleTool` is the base class for creating tools with typed arguments:

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.tools.Tool
import ai.koog.serialization.typeToken

object CalculatorTool : SimpleTool<CalculatorTool.Args>(
    argsType = typeToken<Args>()
) {
    override val descriptor = ToolDescriptor(
        name = "calculator",
        description = "Perform arithmetic calculations"
    )

    data class Args(
        val expression: String
    ) : Tool.Args

    override suspend fun execute(args: Args): String {
        return evaluateExpression(args.expression).toString()
    }
}
```

### Key Components

| Component | Description |
|-----------|-------------|
| `descriptor` | Defines the tool's name, description, and parameter schema |
| `Args` | Data class representing the tool's input parameters |
| `execute()` | The tool's main logic |

## ToolDescriptor

`ToolDescriptor` defines the tool's metadata and parameter schema:

```kotlin
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.tools.ToolParameterDescriptor
import ai.koog.agents.core.tools.ToolParameterType

val descriptor = ToolDescriptor(
    name = "web_search",
    description = "Search the web for information",
    parameters = listOf(
        ToolParameterDescriptor(
            name = "query",
            description = "The search query",
            type = ToolParameterType.String,
            required = true
        ),
        ToolParameterDescriptor(
            name = "maxResults",
            description = "Maximum number of results",
            type = ToolParameterType.Integer,
            required = false,
            defaultValue = "10"
        )
    )
)
```

### ToolParameterType

| Type | Kotlin Type | Description |
|------|-------------|-------------|
| `ToolParameterType.String` | `String` | Text values |
| `ToolParameterType.Integer` | `Int` | Whole numbers |
| `ToolParameterType.Number` | `Double` | Decimal numbers |
| `ToolParameterType.Boolean` | `Boolean` | True/false values |
| `ToolParameterType.Array` | `List<*>` | List of values |
| `ToolParameterType.Object` | `Map<*, *>` | Key-value pairs |

## Complete Example: Web Search Tool

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.tools.ToolParameterDescriptor
import ai.koog.agents.core.tools.ToolParameterType
import ai.koog.serialization.typeToken

object WebSearchTool : SimpleTool<WebSearchTool.Args>(
    argsType = typeToken<Args>()
) {
    override val descriptor = ToolDescriptor(
        name = "web_search",
        description = "Search the web for current information",
        parameters = listOf(
            ToolParameterDescriptor(
                name = "query",
                description = "The search query",
                type = ToolParameterType.String,
                required = true
            ),
            ToolParameterDescriptor(
                name = "maxResults",
                description = "Maximum number of results to return",
                type = ToolParameterType.Integer,
                required = false,
                defaultValue = "5"
            ),
            ToolParameterDescriptor(
                name = "language",
                description = "Language code (e.g., 'en', 'es', 'fr')",
                type = ToolParameterType.String,
                required = false,
                defaultValue = "en"
            )
        )
    )

    data class Args(
        val query: String,
        val maxResults: Int = 5,
        val language: String = "en"
    ) : Tool.Args

    override suspend fun execute(args: Args): String {
        val results = searchEngine.search(
            query = args.query,
            limit = args.maxResults,
            language = args.language
        )
        return results.joinToString("\n\n") { result ->
            """
            Title: ${result.title}
            URL: ${result.url}
            Snippet: ${result.snippet}
            """.trimIndent()
        }
    }
}
```

## ToolDescriptorSchemer

For tools that need custom JSON schemas, use `ToolDescriptorSchemer`:

```kotlin
import ai.koog.agents.core.tools.ToolDescriptorSchemer
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.serialization.typeToken

object DatabaseQueryTool : SimpleTool<DatabaseQueryTool.Args>(
    argsType = typeToken<Args>()
) {

    // Custom schema using ToolDescriptorSchemer
    override val descriptor = ToolDescriptorSchemer.create(
        name = "database_query",
        description = "Execute a database query",
        schema = """
        {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The SQL query to execute"
                },
                "database": {
                    "type": "string",
                    "enum": ["users", "products", "orders"],
                    "description": "The database to query"
                },
                "timeout": {
                    "type": "integer",
                    "description": "Query timeout in seconds",
                    "default": 30
                }
            },
            "required": ["query", "database"]
        }
        """.trimIndent()
    )

    data class Args(
        val query: String,
        val database: String,
        val timeout: Int = 30
    ) : Tool.Args

    override suspend fun execute(args: Args): String {
        return database.query(args.database, args.query, args.timeout)
    }
}
```

## File Operations Tool

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.tools.ToolParameterDescriptor
import ai.koog.agents.core.tools.ToolParameterType
import ai.koog.serialization.typeToken
import java.io.File

object FileOperationTool : SimpleTool<FileOperationTool.Args>(
    argsType = typeToken<Args>()
) {
    override val descriptor = ToolDescriptor(
        name = "file_operation",
        description = "Perform file operations (read, write, list)",
        parameters = listOf(
            ToolParameterDescriptor(
                name = "operation",
                description = "The operation to perform",
                type = ToolParameterType.String,
                required = true
            ),
            ToolParameterDescriptor(
                name = "path",
                description = "The file or directory path",
                type = ToolParameterType.String,
                required = true
            ),
            ToolParameterDescriptor(
                name = "content",
                description = "Content to write (for write operations)",
                type = ToolParameterType.String,
                required = false
            )
        )
    )

    data class Args(
        val operation: String,
        val path: String,
        val content: String? = null
    ) : Tool.Args

    override suspend fun execute(args: Args): String {
        return when (args.operation) {
            "read" -> File(args.path).readText()
            "write" -> {
                File(args.path).parentFile?.mkdirs()
                File(args.path).writeText(args.content ?: "")
                "Successfully wrote to ${args.path}"
            }
            "list" -> {
                File(args.path).listFiles()
                    ?.joinToString("\n") { it.name }
                    ?: "Directory not found or empty"
            }
            else -> "Unknown operation: ${args.operation}. Use 'read', 'write', or 'list'."
        }
    }
}
```

## HTTP Client Tool

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.tools.ToolParameterDescriptor
import ai.koog.agents.core.tools.ToolParameterType
import ai.koog.serialization.typeToken
import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*

object HttpRequestTool : SimpleTool<HttpRequestTool.Args>(
    argsType = typeToken<Args>()
) {
    override val descriptor = ToolDescriptor(
        name = "http_request",
        description = "Make HTTP requests to external APIs",
        parameters = listOf(
            ToolParameterDescriptor(
                name = "method",
                description = "HTTP method (GET, POST, PUT, DELETE)",
                type = ToolParameterType.String,
                required = true
            ),
            ToolParameterDescriptor(
                name = "url",
                description = "The URL to send the request to",
                type = ToolParameterType.String,
                required = true
            ),
            ToolParameterDescriptor(
                name = "headers",
                description = "JSON object of headers",
                type = ToolParameterType.String,
                required = false
            ),
            ToolParameterDescriptor(
                name = "body",
                description = "Request body (for POST/PUT)",
                type = ToolParameterType.String,
                required = false
            )
        )
    )

    data class Args(
        val method: String,
        val url: String,
        val headers: String? = null,
        val body: String? = null
    ) : Tool.Args

    private val client = HttpClient()

    override suspend fun execute(args: Args): String {
        return try {
            val response = when (args.method.uppercase()) {
                "GET" -> client.get(args.url)
                "POST" -> client.post(args.url) {
                    args.body?.let { setBody(it) }
                }
                "PUT" -> client.put(args.url) {
                    args.body?.let { setBody(it) }
                }
                "DELETE" -> client.delete(args.url)
                else -> return "Unsupported method: ${args.method}"
            }
            "Status: ${response.status}\nBody: ${response.bodyAsText()}"
        } catch (e: Exception) {
            "Error: ${e.message}"
        }
    }
}
```

## Stateful Tools

Class-based tools can maintain state:

```kotlin
import ai.koog.agents.core.tools.SimpleTool
import ai.koog.agents.core.tools.ToolDescriptor
import ai.koog.agents.core.tools.ToolParameterDescriptor
import ai.koog.agents.core.tools.ToolParameterType
import ai.koog.serialization.typeToken

class CounterTool : SimpleTool<CounterTool.Args>(
    argsType = typeToken<Args>()
) {
    override val descriptor = ToolDescriptor(
        name = "counter",
        description = "Increment, decrement, or get the current counter value",
        parameters = listOf(
            ToolParameterDescriptor(
                name = "action",
                description = "Action: increment, decrement, or get",
                type = ToolParameterType.String,
                required = true
            ),
            ToolParameterDescriptor(
                name = "amount",
                description = "Amount to increment or decrement",
                type = ToolParameterType.Integer,
                required = false,
                defaultValue = "1"
            )
        )
    )

    data class Args(
        val action: String,
        val amount: Int = 1
    ) : Tool.Args

    private var count = 0

    override suspend fun execute(args: Args): String {
        return when (args.action) {
            "increment" -> {
                count += args.amount
                "Counter is now $count"
            }
            "decrement" -> {
                count -= args.amount
                "Counter is now $count"
            }
            "get" -> "Counter value: $count"
            else -> "Unknown action: ${args.action}"
        }
    }
}

// Register as instance (not object)
val toolRegistry = ToolRegistry {
    tool(CounterTool())  // New instance each time
}
```

## Java Class-Based Tools

```java
import ai.koog.agents.core.tools.SimpleTool;
import ai.koog.agents.core.tools.ToolDescriptor;
import ai.koog.agents.core.tools.ToolParameterDescriptor;
import ai.koog.agents.core.tools.ToolParameterType;
import java.util.List;

public class CalculatorTool extends SimpleTool<CalculatorTool.Args> {

    public static class Args implements Tool.Args {
        public final String expression;
        public final int precision;

        public Args(String expression, int precision) {
            this.expression = expression;
            this.precision = precision;
        }
    }

    @Override
    public ToolDescriptor getDescriptor() {
        return new ToolDescriptor(
            "calculator",
            "Perform arithmetic calculations",
            List.of(
                new ToolParameterDescriptor(
                    "expression",
                    "The arithmetic expression",
                    ToolParameterType.String,
                    true,
                    null
                ),
                new ToolParameterDescriptor(
                    "precision",
                    "Decimal places for the result",
                    ToolParameterType.Integer,
                    false,
                    "2"
                )
            )
        );
    }

    @Override
    public String execute(Args args) {
        double result = evaluateExpression(args.expression);
        return String.format("%." + args.precision + "f", result);
    }
}

// Register
var registry = ToolRegistry.builder()
    .tool(new CalculatorTool())
    .build();
```

## Registration

```kotlin
// Kotlin
val toolRegistry = ToolRegistry {
    tool(CalculatorTool)
    tool(WebSearchTool)
    tool(FileOperationTool)
}

// Java
var toolRegistry = ToolRegistry.builder()
    .tool(new CalculatorTool())
    .tool(new WebSearchTool())
    .tool(new FileOperationTool())
    .build();
```

## When to Use Class-Based vs Annotation-Based

| Use Class-Based | Use Annotation-Based |
|-----------------|---------------------|
| Complex parameter schemas | Simple parameters |
| Stateful tools | Stateless tools |
| Custom validation logic | Basic validation |
| Need ToolDescriptorSchemer | Standard schema is fine |
| Object singleton pattern | Function-based approach |
| Multiple related operations in one tool | Single-purpose tools |

## Best Practices

1. **Use `object` for stateless tools** — Avoids unnecessary instantiation
2. **Use `class` for stateful tools** — Each instance maintains its own state
3. **Provide clear descriptions** — Both in `ToolDescriptor` and parameter descriptions
4. **Set defaults wisely** — Use `defaultValue` for optional parameters
5. **Validate inputs** — Check parameter values in `execute()` before processing
6. **Return actionable results** — Help the LLM understand what happened
7. **Handle errors gracefully** — Return error messages, don't throw exceptions