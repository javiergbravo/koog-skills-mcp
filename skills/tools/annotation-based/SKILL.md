---
name: annotation-based-tools
description: Create tools using @Tool and @LLMDescription annotations in Koog for automatic tool registration
compatibility: "Koog 1.0.0"
license: Apache-2.0
keywords: [tool, annotation, tool-description, llm-description, toolset, parameters]
---

# Annotation-Based Tools

Annotation-based tools are the simplest way to create tools in Koog. Use `@Tool` and `@LLMDescription` annotations on functions, and Koog handles the rest.

## Quick Example

```kotlin
import ai.koog.agents.core.tools.annotations.Tool
import ai.koog.agents.core.tools.annotations.LLMDescription

@Tool
@LLMDescription("Get the current weather for a city")
suspend fun getWeather(
    @LLMDescription("The city name") city: String
): String {
    return "The weather in $city is 22°C and sunny"
}
```

## The @Tool Annotation

Mark a function as a tool with `@Tool`:

```kotlin
@Tool
suspend fun myTool(): String {
    return "Tool result"
}
```

The `@Tool` annotation:
- Registers the function as a callable tool
- Uses the function name as the tool name (or a custom name via `customName` parameter)
- The function should return `String` (suspend is supported but not required)

### Custom Tool Name

```kotlin
@Tool(customName = "web_search")
suspend fun searchTheWeb(@LLMDescription("Query") query: String): String {
    return "Results for: $query"
}
```

## The @LLMDescription Annotation

Use `@LLMDescription` to provide descriptions that help the LLM understand when and how to use the tool:

### On Functions

```kotlin
@Tool
@LLMDescription("""
    Search the web for current information.
    Use this when you need up-to-date facts, news, or data
    that may not be in your training data.
""")
suspend fun webSearch(
    @LLMDescription("The search query") query: String
): String {
    return performSearch(query)
}
```

### On Parameters

```kotlin
@Tool
@LLMDescription("Send an email to a recipient")
suspend fun sendEmail(
    @LLMDescription("The recipient's email address") to: String,
    @LLMDescription("The email subject line") subject: String,
    @LLMDescription("The email body content") body: String,
    @LLMDescription("Whether to send as HTML (true) or plain text (false)") isHtml: Boolean = false
): String {
    return sendEmail(to, subject, body, isHtml)
}
```

## Parameter Types

Annotation-based tools support these parameter types:

| Kotlin Type | Java Type | Example |
|-------------|-----------|---------|
| `String` | `String` | `@LLMDescription("...") name: String` |
| `Int` | `int` / `Integer` | `@LLMDescription("...") count: Int` |
| `Long` | `long` / `Long` | `@LLMDescription("...") id: Long` |
| `Float` | `float` / `Float` | `@LLMDescription("...") amount: Float` |
| `Double` | `double` / `Double` | `@LLMDescription("...") price: Double` |
| `Boolean` | `boolean` / `Boolean` | `@LLMDescription("...") enabled: Boolean` |

### Default Values

Parameters can have default values:

```kotlin
@Tool
@LLMDescription("Search with pagination")
suspend fun search(
    @LLMDescription("The search query") query: String,
    @LLMDescription("Page number (1-based)") page: Int = 1,
    @LLMDescription("Results per page") pageSize: Int = 10,
    @LLMDescription("Sort order: relevance or date") sortBy: String = "relevance"
): String {
    return performSearch(query, page, pageSize, sortBy)
}
```

When the LLM doesn't provide a value for a parameter with a default, the default is used.

## Kotlin Examples

### Simple Calculator

```kotlin
@Tool
@LLMDescription("Perform basic arithmetic calculations")
suspend fun calculate(
    @LLMDescription("The arithmetic expression (e.g., '2 + 3', '10 * 5')") expression: String
): String {
    return try {
        evaluateExpression(expression).toString()
    } catch (e: Exception) {
        "Error: Invalid expression '${expression}'. ${e.message}"
    }
}
```

### Database Query

```kotlin
@Tool
@LLMDescription("Query the user database for information")
suspend fun queryUsers(
    @LLMDescription("SQL WHERE clause (without the WHERE keyword)") filter: String,
    @LLMDescription("Maximum number of results") limit: Int = 10
): String {
    val query = "SELECT * FROM users WHERE $filter LIMIT $limit"
    val results = database.query(query)
    return results.joinToString("\n") { "${it.name} (${it.email})" }
}
```

### File Operations

```kotlin
@Tool
@LLMDescription("Read the contents of a file")
suspend fun readFile(
    @LLMDescription("The file path relative to the project root") path: String
): String {
    return try {
        File(path).readText()
    } catch (e: FileNotFoundException) {
        "Error: File not found at '$path'"
    }
}

@Tool
@LLMDescription("Write content to a file")
suspend fun writeFile(
    @LLMDescription("The file path relative to the project root") path: String,
    @LLMDescription("The content to write") content: String,
    @LLMDescription("Whether to append (true) or overwrite (false)") append: Boolean = false
): String {
    val file = File(path)
    file.parentFile?.mkdirs()
    if (append) {
        file.appendText(content)
    } else {
        file.writeText(content)
    }
    return "Successfully wrote ${content.length} characters to '$path'"
}
```

### HTTP Client

```kotlin
@Tool
@LLMDescription("Make an HTTP GET request to a URL")
suspend fun httpGet(
    @LLMDescription("The URL to fetch") url: String,
    @LLMDescription("Request timeout in seconds") timeout: Int = 30
): String {
    return try {
        val response = httpClient.get(url) {
            timeout {
                requestTimeoutMillis = timeout * 1000L
            }
        }
        response.bodyAsText()
    } catch (e: Exception) {
        "Error fetching $url: ${e.message}"
    }
}
```

## ToolSet Interface

Group related tools into a `ToolSet` for organized registration:

```kotlin
import ai.koog.agents.core.tools.ToolSet
import ai.koog.agents.core.tools.annotations.Tool
import ai.koog.agents.core.tools.annotations.LLMDescription

class WeatherTools : ToolSet {

    @Tool
    @LLMDescription("Get current weather for a city")
    suspend fun getCurrentWeather(
        @LLMDescription("City name") city: String
    ): String {
        return "Current weather in $city: 22°C, sunny"
    }

    @Tool
    @LLMDescription("Get weather forecast for the next 5 days")
    suspend fun getForecast(
        @LLMDescription("City name") city: String,
        @LLMDescription("Number of days (1-5)") days: Int = 3
    ): String {
        return "Forecast for $city for $days days: ..."
    }

    @Tool
    @LLMDescription("Get weather alerts for a region")
    suspend fun getAlerts(
        @LLMDescription("Region code (e.g., US-CA)") region: String
    ): String {
        return "No active alerts for $region"
    }
}

// Register all tools at once
val toolRegistry = ToolRegistry {
    toolSet(WeatherTools())
}
```

### Multiple ToolSets

```kotlin
class EmailTools : ToolSet {
    @Tool
    @LLMDescription("Send an email")
    suspend fun sendEmail(
        @LLMDescription("Recipient") to: String,
        @LLMDescription("Subject") subject: String,
        @LLMDescription("Body") body: String
    ): String = "Email sent to $to"

    @Tool
    @LLMDescription("List recent emails")
    suspend fun listEmails(
        @LLMDescription("Number of emails") count: Int = 10
    ): String = "Last $count emails..."
}

// Combine multiple tool sets
val toolRegistry = ToolRegistry {
    toolSet(WeatherTools())
    toolSet(EmailTools())
    toolSet(CalculatorTools())
}
```

## Java Examples

### Basic Tool

```java
import ai.koog.agents.core.tools.annotations.Tool;
import ai.koog.agents.core.tools.annotations.LLMDescription;

public class MyTools {

    @Tool
    @LLMDescription("Convert temperature between Celsius and Fahrenheit")
    public static String convertTemperature(
            @LLMDescription("The temperature value") double value,
            @LLMDescription("Source unit: celsius or fahrenheit") String from,
            @LLMDescription("Target unit: celsius or fahrenheit") String to
    ) {
        if (from.equalsIgnoreCase("celsius") && to.equalsIgnoreCase("fahrenheit")) {
            return value * 9/5 + 32 + "°F";
        } else if (from.equalsIgnoreCase("fahrenheit") && to.equalsIgnoreCase("celsius")) {
            return (value - 32) * 5/9 + "°C";
        }
        return "Invalid units. Use 'celsius' or 'fahrenheit'.";
    }
}
```

### Java ToolSet

```java
import ai.koog.agents.core.tools.ToolSet;
import ai.koog.agents.core.tools.Tool;
import ai.koog.agents.core.tools.annotations.LLMDescription;

public class MathToolSet implements ToolSet {

    @Tool
    @LLMDescription("Add two numbers")
    public String add(
            @LLMDescription("First number") double a,
            @LLMDescription("Second number") double b
    ) {
        return String.valueOf(a + b);
    }

    @Tool
    @LLMDescription("Multiply two numbers")
    public String multiply(
            @LLMDescription("First number") double a,
            @LLMDescription("Second number") double b
    ) {
        return String.valueOf(a * b);
    }

    @Override
    public List<Tool<?>> getTools() {
        return ToolSet.fromAnnotations(this);
    }
}

// Register
var registry = ToolRegistry.builder()
    .toolSet(new MathToolSet())
    .build();
```

### Instance vs Static Methods

```java
// Static methods (recommended for stateless tools)
@Tool
@LLMDescription("Static tool example")
public static String staticTool(@LLMDescription("Input") String input) {
    return "Result: " + input;
}

// Instance methods (for stateful tools)
public class StatefulTools {
    private final Database db;

    public StatefulTools(Database db) {
        this.db = db;
    }

    @Tool
    @LLMDescription("Query the database")
    public String query(@LLMDescription("SQL query") String sql) {
        return db.execute(sql).toString();
    }
}

// Register instance tools
var statefulTools = new StatefulTools(database);
var registry = ToolRegistry.builder()
    .tool(statefulTools)
    .build();
```

## Best Practices

1. **Write clear descriptions** — The LLM relies on `@LLMDescription` to decide when to use a tool
2. **Describe every parameter** — Each parameter should have a description explaining its purpose
3. **Use descriptive names** — Function names become tool names; make them self-explanatory
4. **Provide defaults** — Use default values for optional parameters
5. **Validate inputs** — Check parameter values before executing
6. **Return useful results** — Help the LLM understand the outcome
7. **Handle errors gracefully** — Return error messages, don't throw exceptions
8. **Keep tools focused** — One tool, one responsibility

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Missing `@LLMDescription` | Always describe the tool and its parameters |
| Non-suspend functions | Tool functions must be `suspend` in Kotlin |
| Complex parameter types | Use simple types (String, Int, Boolean, etc.) |
| Throwing exceptions | Return error strings instead |
| Ambiguous descriptions | Be specific about what the tool does and when to use it |