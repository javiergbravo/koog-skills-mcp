---
name: structured-output
description: Extract structured data from LLMs with Koog's @Serializable types, executeStructured(), and StructureFixingParser
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [structured-output, serializable, json, schema, fixing-parser, data-extraction]
---

# Structured Output

Koog provides a comprehensive system for extracting structured data from LLMs using Kotlin's `@Serializable` types. This includes three layers of abstraction and an automatic retry mechanism with `StructureFixingParser`.

## Overview

Structured output enables:

- **Type-safe data extraction** — Get Kotlin objects directly from LLM responses
- **Schema validation** — Ensure responses match expected structure
- **Automatic retries** — Fix malformed responses with `StructureFixingParser`
- **Nested structures** — Support for complex objects, collections, and enums
- **Provider-specific schemas** — Optimize schema generation per LLM provider

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
}
```

## Annotations

### @Serializable

Required for all structured output types:

```kotlin
import kotlinx.serialization.Serializable

@Serializable
data class Person(
    val name: String,
    val age: Int,
    val email: String
)
```

### @SerialName

Map Kotlin property names to JSON field names:

```kotlin
@Serializable
data class User(
    @SerialName("user_name")
    val userName: String,

    @SerialName("created_at")
    val createdAt: String,

    @SerialName("is_active")
    val isActive: Boolean
)
```

### @LLMDescription

Provide descriptions to help the LLM understand each field:

```kotlin
import ai.koog.agents.core.tools.annotation.LLMDescription

@Serializable
@LLMDescription("A user profile with personal information")
data class UserProfile(
    @LLMDescription("Full name of the user")
    val name: String,

    @LLMDescription("Age in years, must be between 0 and 150")
    val age: Int,

    @LLMDescription("Email address in valid format")
    val email: String,

    @LLMDescription("List of user's interests and hobbies")
    val interests: List<String>
)
```

## Layer 1: PromptExecutor

Direct structured execution at the lowest level:

```kotlin
import ai.koog.agents.core.prompt.PromptExecutor
import ai.koog.agents.core.prompt.executeStructured

@Serializable
data class Sentiment(
    @LLMDescription("The sentiment: positive, negative, or neutral")
    val sentiment: String,

    @LLMDescription("Confidence score between 0.0 and 1.0")
    val confidence: Double,

    @LLMDescription("Key phrases that influenced the sentiment")
    val keyPhrases: List<String>
)

suspend fun analyzeSentiment(executor: PromptExecutor, text: String): Sentiment {
    return executor.executeStructured<Sentiment>(
        prompt = "Analyze the sentiment of the following text: $text"
    )
}
```

### With System Prompt

```kotlin
suspend fun extractProductInfo(executor: PromptExecutor, description: String): Product {
    return executor.executeStructured<Product>(
        systemPrompt = "You are a product data extractor. Extract structured product information.",
        prompt = "Extract product info from: $description"
    )
}
```

### With Configuration

```kotlin
import ai.koog.agents.core.prompt.StructuredRequestConfig

suspend fun extractWithConfig(executor: PromptExecutor, text: String): DataClass {
    return executor.executeStructured<DataClass>(
        prompt = "Extract data from: $text",
        config = StructuredRequestConfig(
            temperature = 0.0, // Deterministic output
            maxRetries = 3,
            fixParsingErrors = true
        )
    )
}
```

## Layer 2: WriteSession

Structured requests within an LLM write session:

```kotlin
import ai.koog.agents.core.session.llmWriteSession
import ai.koog.agents.core.session.requestLLMStructured

@Serializable
data class CodeReview(
    @LLMDescription("Overall quality rating: excellent, good, fair, poor")
    val rating: String,

    @LLMDescription("List of issues found")
    val issues: List<Issue>,

    @LLMDescription("Suggestions for improvement")
    val suggestions: List<String>
)

@Serializable
data class Issue(
    @LLMDescription("Severity: critical, major, minor")
    val severity: String,

    @LLMDescription("Description of the issue")
    val description: String,

    @LLMDescription("Line number where issue occurs")
    val lineNumber: Int?
)

suspend fun reviewCode(agent: AIAgent, code: String): CodeReview {
    return agent.llmWriteSession {
        requestLLMStructured<CodeReview>(
            prompt = "Review the following code and provide structured feedback:\n\n$code"
        )
    }
}
```

## Layer 3: Graph Node

Use structured output in graph-based agents:

```kotlin
import ai.koog.agents.core.strategy.nodeLLMRequestStructured

@Serializable
data class TaskPlan(
    @LLMDescription("List of steps to complete the task")
    val steps: List<String>,

    @LLMDescription("Estimated time in minutes")
    val estimatedMinutes: Int,

    @LLMDescription("Required resources")
    val resources: List<String>
)

val strategy = strategy("planning-agent") {
    val plan by nodeLLMRequestStructured<TaskPlan>()
    val execute by nodeExecuteTool()
    val respond by nodeLLMRequest()

    edge(nodeStart forwardTo plan)
    edge(plan forwardTo execute onToolCall { true })
    edge(execute forwardTo respond onAssistantMessage { true })
    edge(respond forwardTo nodeFinish)
}
```

## StructureFixingParser

Automatically fix malformed LLM responses with retries:

```kotlin
import ai.koog.agents.core.structured.StructureFixingParser

@Serializable
data class ExtractedData(
    val title: String,
    val summary: String,
    val tags: List<String>
)

val parser = StructureFixingParser(
    maxRetries = 3,
    fixStrategy = FixStrategy.RE_PROMPT // Ask LLM to fix the response
)

val result = parser.parse<ExtractedData>(
    rawResponse = llmResponse,
    expectedSchema = ExtractedData.serializer(),
    fixPrompt = "The previous response was not valid JSON. Please fix it to match the schema."
)
```

### Fix Strategies

```kotlin
enum class FixStrategy {
    RE_PROMPT,      // Ask LLM to fix the response
    REGEX_FIX,      // Try to fix with regex patterns
    JSON_REPAIR,    // Attempt JSON repair
    FALLBACK        // Return default values
}

val parser = StructureFixingParser(
    maxRetries = 3,
    fixStrategy = FixStrategy.RE_PROMPT,
    // Custom fix prompts
    fixPrompts = mapOf(
        FixType.INVALID_JSON to "Your response was not valid JSON. Please provide valid JSON.",
        FixType.MISSING_FIELD to "Your response is missing required fields. Please include all fields.",
        FixType.INVALID_TYPE to "Some fields have incorrect types. Please check the schema."
    )
)
```

### With Fallback

```kotlin
val parser = StructureFixingParser(
    maxRetries = 3,
    fixStrategy = FixStrategy.FALLBACK,
    fallbackValue = ExtractedData(
        title = "Unknown",
        summary = "Could not extract",
        tags = emptyList()
    )
)
```

## StructuredRequestConfig

Configure structured output behavior:

```kotlin
@Serializable
data class StructuredRequestConfig(
    val temperature: Double = 0.0,        // Use 0.0 for deterministic output
    val maxRetries: Int = 3,              // Max retries for fixing
    val fixParsingErrors: Boolean = true, // Enable StructureFixingParser
    val strictSchema: Boolean = true,     // Enforce strict schema validation
    val schemaGenerator: SchemaGenerator = StandardJsonSchemaGenerator
)
```

## Schema Generators

### StandardJsonSchemaGenerator

Full JSON Schema support with all features:

```kotlin
import ai.koog.agents.core.structured.StandardJsonSchemaGenerator

val schema = StandardJsonSchemaGenerator.generate(Person.serializer())
```

### BasicJsonSchemaGenerator

Simplified schema for providers with limited support:

```kotlin
import ai.koog.agents.core.structured.BasicJsonSchemaGenerator

val schema = BasicJsonSchemaGenerator.generate(Person.serializer())
```

## Nested Classes

```kotlin
@Serializable
data class Address(
    val street: String,
    val city: String,
    val state: String,
    val zipCode: String
)

@Serializable
data class Company(
    @LLMDescription("Company name")
    val name: String,

    @LLMDescription("Company address")
    val address: Address,

    @LLMDescription("List of employees")
    val employees: List<Employee>
)

@Serializable
data class Employee(
    val name: String,
    val role: String,
    val department: String
)
```

## Collections

```kotlin
@Serializable
data class SearchResult(
    @LLMDescription("List of search results")
    val results: List<ResultItem>,

    @LLMDescription("Total number of results")
    val totalCount: Int,

    @LLMDescription("Categories found")
    val categories: Set<String>,

    @LLMDescription("Metadata as key-value pairs")
    val metadata: Map<String, String>
)

@Serializable
data class ResultItem(
    val title: String,
    val url: String,
    val snippet: String
)
```

## Enums

```kotlin
@Serializable
enum class Priority {
    @SerialName("low") LOW,
    @SerialName("medium") MEDIUM,
    @SerialName("high") HIGH,
    @SerialName("critical") CRITICAL
}

@Serializable
data class Task(
    val title: String,
    val description: String,
    val priority: Priority,
    val status: TaskStatus
)

@Serializable
enum class TaskStatus {
    @SerialName("pending") PENDING,
    @SerialName("in_progress") IN_PROGRESS,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}
```

## Polymorphism

```kotlin
@Serializable
sealed interface Shape {
    val area: Double
}

@Serializable
@SerialName("circle")
data class Circle(val radius: Double) : Shape {
    override val area: Double get() = Math.PI * radius * radius
}

@Serializable
@SerialName("rectangle")
data class Rectangle(val width: Double, val height: Double) : Shape {
    override val area: Double get() = width * height
}

@Serializable
@SerialName("triangle")
data class Triangle(val base: Double, val height: Double) : Shape {
    override val area: Double get() = 0.5 * base * height
}

// Usage
@Serializable
data class GeometryProblem(
    @LLMDescription("The geometric shape described")
    val shape: Shape,

    @LLMDescription("The calculated area")
    val calculatedArea: Double
)
```

## Complete Example

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.prompt.executeStructured
import ai.koog.agents.core.structured.StructureFixingParser
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
@LLMDescription("Analysis of a business document")
data class DocumentAnalysis(
    @LLMDescription("Document title")
    val title: String,

    @LLMDescription("Document type: contract, report, memo, invoice")
    val documentType: String,

    @LLMDescription("Key findings from the document")
    val keyFindings: List<String>,

    @LLMDescription("Risk assessment")
    val risks: List<Risk>,

    @LLMDescription("Recommended actions")
    val recommendations: List<String>,

    @LLMDescription("Overall confidence in analysis (0.0 to 1.0)")
    val confidence: Double
)

@Serializable
data class Risk(
    @LLMDescription("Risk level: low, medium, high, critical")
    val level: String,

    @LLMDescription("Description of the risk")
    val description: String,

    @LLMDescription("Suggested mitigation")
    val mitigation: String
)

suspend fun analyzeDocument(text: String): DocumentAnalysis {
    val apiKey = System.getenv("OPENAI_API_KEY")
    val executor = simpleOpenAIExecutor(apiKey)

    return executor.executeStructured<DocumentAnalysis>(
        systemPrompt = "You are a business document analyst. Analyze documents and extract structured information.",
        prompt = "Analyze the following document:\n\n$text",
        config = StructuredRequestConfig(
            temperature = 0.0,
            maxRetries = 3,
            fixParsingErrors = true
        )
    )
}
```

## Java API

```java
import ai.koog.agents.core.prompt.PromptExecutorExtensions;

// Java uses a different API due to lack of reified generics
DocumentAnalysis result = PromptExecutorExtensions.executeStructured(
    executor,
    DocumentAnalysis.class,
    "Analyze this document: " + text,
    null,
    new StructuredRequestConfig(0.0, 3, true, true, StandardJsonSchemaGenerator.INSTANCE)
);
```

## Best Practices

1. **Use `@LLMDescription`** — Always describe fields to help the LLM understand expectations
2. **Set temperature to 0.0** — Use deterministic output for structured extraction
3. **Enable fixing** — Use `StructureFixingParser` for resilience against malformed responses
4. **Validate output** — Add custom validation after parsing for business rules
5. **Use enums for fixed values** — Enums constrain LLM output to valid options
6. **Keep schemas simple** — Complex nested structures may reduce accuracy
7. **Test with edge cases** — Verify parsing works with unusual inputs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing fields | Add `@LLMDescription` and ensure all fields are documented |
| Type mismatches | Use enums for fixed values; add validation for numeric ranges |
| JSON parse errors | Enable `fixParsingErrors = true` with `StructureFixingParser` |
| Nested object failures | Simplify nesting or use separate extraction calls |
| Provider schema errors | Try `BasicJsonSchemaGenerator` for providers with limited support |
