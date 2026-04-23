---
name: content-moderation
description: Filter and moderate LLM content with Koog's ModerationModel for safe agent interactions
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [moderation, content-filter, safety, moderation-model, filtering]
---

# Content Moderation

Koog's `ModerationModel` interface provides content filtering and safety checks for LLM interactions. This ensures agents produce safe, appropriate content and can filter harmful inputs and outputs.

## Overview

Content moderation enables:

- **Input filtering** — Block harmful user inputs before processing
- **Output filtering** — Catch unsafe LLM outputs before returning to users
- **Safety checks** — Validate content against configurable policies
- **Custom moderation** — Implement domain-specific moderation rules
- **Provider integration** — Use OpenAI, Anthropic, or custom moderation APIs

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
}
```

## ModerationModel Interface

The `ModerationModel` is the core interface for content moderation:

```kotlin
import ai.koog.agents.core.moderation.ModerationModel
import ai.koog.agents.core.moderation.ModerationResult

interface ModerationModel {
    suspend fun moderate(content: String): ModerationResult
    suspend fun moderateInput(content: String): ModerationResult
    suspend fun moderateOutput(content: String): ModerationResult
}

sealed class ModerationResult {
    object Allowed : ModerationResult()
    data class Blocked(val reason: String, val categories: List<String>) : ModerationResult()
    data class Flagged(val reason: String, val categories: List<String>) : ModerationResult()
}
```

## Built-in Moderation Models

### OpenAI Moderation

Use OpenAI's content moderation API:

```kotlin
import ai.koog.agents.core.moderation.OpenAIModerationModel

val moderationModel = OpenAIModerationModel(
    apiKey = System.getenv("OPENAI_API_KEY"),
    model = "text-moderation-latest"
)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model,
    moderationModel = moderationModel
)
```

### Custom Moderation Model

Implement your own moderation logic:

```kotlin
import ai.koog.agents.core.moderation.ModerationModel
import ai.koog.agents.core.moderation.ModerationResult

class CustomModerationModel(
    private val blockedWords: Set<String>,
    private val blockedPatterns: List<Regex>
) : ModerationModel {

    override suspend fun moderate(content: String): ModerationResult {
        val lowerContent = content.lowercase()

        // Check blocked words
        for (word in blockedWords) {
            if (lowerContent.contains(word.lowercase())) {
                return ModerationResult.Blocked(
                    reason = "Content contains blocked word: $word",
                    categories = listOf("profanity")
                )
            }
        }

        // Check patterns
        for (pattern in blockedPatterns) {
            if (pattern.containsMatchIn(content)) {
                return ModerationResult.Blocked(
                    reason = "Content matches blocked pattern",
                    categories = listOf("policy-violation")
                )
            }
        }

        return ModerationResult.Allowed
    }

    override suspend fun moderateInput(content: String): ModerationResult {
        // Input-specific rules
        return moderate(content)
    }

    override suspend fun moderateOutput(content: String): ModerationResult {
        // Output-specific rules (e.g., no PII exposure)
        if (containsPII(content)) {
            return ModerationResult.Blocked(
                reason = "Output contains personally identifiable information",
                categories = listOf("pii")
            )
        }
        return moderate(content)
    }

    private fun containsPII(content: String): Boolean {
        val emailPattern = Regex("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
        val phonePattern = Regex("\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b")
        val ssnPattern = Regex("\\b\\d{3}-\\d{2}-\\d{4}\\b")

        return emailPattern.containsMatchIn(content) ||
               phonePattern.containsMatchIn(content) ||
               ssnPattern.containsMatchIn(content)
    }
}
```

## Content Filtering

### Input Filtering

Filter user inputs before they reach the LLM:

```kotlin
import ai.koog.agents.core.moderation.ModerationModel

class InputFilter(
    private val moderationModel: ModerationModel
) {
    suspend fun filterInput(input: String): String? {
        val result = moderationModel.moderateInput(input)

        return when (result) {
            is ModerationResult.Allowed -> input
            is ModerationResult.Blocked -> {
                println("Input blocked: ${result.reason}")
                null
            }
            is ModerationResult.Flagged -> {
                println("Input flagged: ${result.reason}")
                input // Allow but log
            }
        }
    }
}
```

### Output Filtering

Filter LLM outputs before returning to users:

```kotlin
class OutputFilter(
    private val moderationModel: ModerationModel
) {
    suspend fun filterOutput(output: String): String {
        val result = moderationModel.moderateOutput(output)

        return when (result) {
            is ModerationResult.Allowed -> output
            is ModerationResult.Blocked -> {
                "I apologize, but I cannot provide that information. Please rephrase your request."
            }
            is ModerationResult.Flagged -> {
                // Modify output to remove flagged content
                sanitizeOutput(output)
            }
        }
    }

    private fun sanitizeOutput(output: String): String {
        // Remove or redact sensitive content
        return output.replace(Regex("\\b\\d{3}-\\d{2}-\\d{4}\\b"), "[REDACTED]")
    }
}
```

## Safety Checks

### Category-Based Checks

```kotlin
import ai.koog.agents.core.moderation.ModerationCategory

class SafetyChecker(
    private val moderationModel: ModerationModel
) {
    private val blockedCategories = setOf(
        ModerationCategory.HATE,
        ModerationCategory.VIOLENCE,
        ModerationCategory.SELF_HARM,
        ModerationCategory.SEXUAL
    )

    suspend fun checkSafety(content: String): SafetyCheckResult {
        val result = moderationModel.moderate(content)

        return when (result) {
            is ModerationResult.Allowed -> SafetyCheckResult.Safe
            is ModerationResult.Blocked -> {
                val hasBlockedCategory = result.categories.any { cat ->
                    blockedCategories.any { it.name.equals(cat, ignoreCase = true) }
                }
                if (hasBlockedCategory) {
                    SafetyCheckResult.Unsafe(result.reason, result.categories)
                } else {
                    SafetyCheckResult.Warning(result.reason, result.categories)
                }
            }
            is ModerationResult.Flagged -> {
                SafetyCheckResult.Warning(result.reason, result.categories)
            }
        }
    }
}

sealed class SafetyCheckResult {
    object Safe : SafetyCheckResult()
    data class Warning(val reason: String, val categories: List<String>) : SafetyCheckResult()
    data class Unsafe(val reason: String, val categories: List<String>) : SafetyCheckResult()
}
```

### Threshold-Based Checks

`ThresholdModerationModel` upgrades a `Flagged` result to `Blocked` when the confidence score from the underlying model exceeds the threshold. The delegate model must return a `ModerationResult.Flagged` result that includes a parseable confidence value.

```kotlin
/**
 * Wraps a [ModerationResult.Flagged] result: if the delegate model provides a
 * confidence score above [threshold], the result is escalated to [ModerationResult.Blocked].
 *
 * Implement [extractConfidence] to parse the actual score from your delegate model's
 * result (e.g., from a custom `reason` string format or a subclass that carries the score).
 */
class ThresholdModerationModel(
    private val delegate: ModerationModel,
    private val threshold: Double = 0.8
) : ModerationModel {

    override suspend fun moderate(content: String): ModerationResult {
        val result = delegate.moderate(content)

        return when (result) {
            is ModerationResult.Flagged -> {
                val confidence = extractConfidence(result)
                if (confidence > threshold) {
                    ModerationResult.Blocked(result.reason, result.categories)
                } else {
                    result
                }
            }
            else -> result
        }
    }

    /**
     * Override this to extract the numeric confidence from the flagged result.
     * The default returns 0.0, meaning no escalation occurs unless overridden.
     *
     * Example: parse a reason string like "confidence=0.92" returned by your model.
     */
    protected open fun extractConfidence(result: ModerationResult.Flagged): Double {
        val match = Regex("confidence=([0-9.]+)").find(result.reason)
        return match?.groupValues?.getOrNull(1)?.toDoubleOrNull() ?: 0.0
    }

    override suspend fun moderateInput(content: String) = moderate(content)
    override suspend fun moderateOutput(content: String) = moderate(content)
}
```

## Integration with Agent Pipeline

### Pre-Processing Hook

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.feature.EventHandler

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(EventHandler) {
        handleEvents {
            onToolCallStarting { context ->
                // Moderate tool arguments
                val result = moderationModel.moderate(context.arguments)
                if (result is ModerationResult.Blocked) {
                    throw ModerationException("Tool call blocked: ${result.reason}")
                }
            }
        }
    }
}

class ModerationException(message: String) : Exception(message)
```

### Post-Processing Hook

```kotlin
import ai.koog.agents.core.feature.EventHandler

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = model
) {
    install(EventHandler) {
        handleEvents {
            onToolCallFinished { context ->
                // Moderate tool results
                val result = moderationModel.moderate(context.result ?: "")
                if (result is ModerationResult.Blocked) {
                    // Replace with safe response
                    context.result = "Unable to process this request."
                }
            }
        }
    }
}
```

### Full Pipeline Integration

```kotlin
class ModeratedAgent(
    private val agent: AIAgent,
    private val inputFilter: InputFilter,
    private val outputFilter: OutputFilter
) {
    suspend fun run(input: String): String {
        // Step 1: Filter input
        val filteredInput = inputFilter.filterInput(input)
            ?: return "Your input was blocked by content moderation."

        // Step 2: Run agent
        val rawOutput = agent.run(filteredInput)

        // Step 3: Filter output
        return outputFilter.filterOutput(rawOutput)
    }
}
```

## Custom Moderation Rules

### Rule-Based Moderation

```kotlin
class RuleBasedModerationModel : ModerationModel {
    private val rules = mutableListOf<ModerationRule>()

    fun addRule(rule: ModerationRule) {
        rules.add(rule)
    }

    override suspend fun moderate(content: String): ModerationResult {
        for (rule in rules) {
            val result = rule.evaluate(content)
            if (result != null) {
                return result
            }
        }
        return ModerationResult.Allowed
    }

    override suspend fun moderateInput(content: String) = moderate(content)
    override suspend fun moderateOutput(content: String) = moderate(content)
}

interface ModerationRule {
    fun evaluate(content: String): ModerationResult?
}

class WordFilterRule(private val words: Set<String>) : ModerationRule {
    override fun evaluate(content: String): ModerationResult? {
        val lowerContent = content.lowercase()
        for (word in words) {
            if (lowerContent.contains(word.lowercase())) {
                return ModerationResult.Blocked(
                    reason = "Contains blocked word",
                    categories = listOf("profanity")
                )
            }
        }
        return null
    }
}

class LengthLimitRule(private val maxLength: Int) : ModerationRule {
    override fun evaluate(content: String): ModerationResult? {
        if (content.length > maxLength) {
            return ModerationResult.Flagged(
                reason = "Content exceeds maximum length",
                categories = listOf("length")
            )
        }
        return null
    }
}
```

### LLM-Based Moderation

> **Security note:** Always isolate user-supplied content from the instruction portion of the
> prompt using clear delimiters. Without them, a user could inject instructions that override
> the moderation logic (prompt injection). The example below uses XML-style delimiters and
> strips the closing tag to prevent injection via content.

```kotlin
class LLMBasedModerationModel(
    private val executor: PromptExecutor,
    private val model: LLModel
) : ModerationModel {

    override suspend fun moderate(content: String): ModerationResult {
        // Prevent prompt injection: strip the closing delimiter from user content
        val safeContent = content.replace("</CONTENT>", "[TAG_REMOVED]")

        val prompt = """
            Analyze the content between the <CONTENT> tags for safety and appropriateness.
            Categories to check: hate, violence, self-harm, sexual, harassment, spam.

            <CONTENT>
            $safeContent
            </CONTENT>

            Respond with valid JSON only, no explanation:
            {"safe": true or false, "categories": ["..."], "reason": "..."}
        """.trimIndent()

        return try {
            val response = executor.execute(prompt, model)
            val parsed = Json.parseToJsonElement(response).jsonObject

            val safe = parsed["safe"]?.jsonPrimitive?.booleanOrNull
                // Fail-closed: if the response can't be parsed, treat as unsafe
                ?: return ModerationResult.Blocked("Moderation response could not be parsed", listOf("moderation-error"))
            val categories = parsed["categories"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList()
            val reason = parsed["reason"]?.jsonPrimitive?.content ?: ""

            if (safe) ModerationResult.Allowed else ModerationResult.Blocked(reason, categories)
        } catch (e: Exception) {
            // Fail-closed: if the moderation call fails, block the content
            ModerationResult.Blocked("Moderation check failed: ${e.message}", listOf("moderation-error"))
        }
    }

    override suspend fun moderateInput(content: String) = moderate(content)
    override suspend fun moderateOutput(content: String) = moderate(content)
}
```

## Java API

```java
import ai.koog.agents.core.moderation.ModerationModel;
import ai.koog.agents.core.moderation.ModerationResult;

public class CustomModeration implements ModerationModel {
    private final Set<String> blockedWords;

    public CustomModeration(Set<String> blockedWords) {
        this.blockedWords = blockedWords;
    }

    public ModerationResult moderate(String content) {
        String lower = content.toLowerCase();
        for (String word : blockedWords) {
            if (lower.contains(word.toLowerCase())) {
                return new ModerationResult.Blocked(
                    "Contains blocked word: " + word,
                    List.of("profanity")
                );
            }
        }
        return ModerationResult.Allowed.INSTANCE;
    }
}
```

## Best Practices

1. **Layer your moderation** — Use multiple moderation models for comprehensive coverage
2. **Log all moderation decisions** — Track what was blocked and why for auditing
3. **Provide clear feedback** — Tell users why content was blocked
4. **Test with adversarial inputs** — Ensure moderation can't be easily bypassed
5. **Update regularly** — Keep moderation rules and models current
6. **Balance safety and usability** — Avoid over-blocking legitimate content
7. **Handle moderation failures** — Have fallback behavior when moderation is unavailable

## Troubleshooting

| Issue | Solution |
|-------|----------|
| False positives | Tune moderation rules and thresholds |
| False negatives | Add more rules or use multiple moderation models |
| High latency | Use async moderation or cache results |
| Moderation API errors | Implement fallback to local moderation rules |
| Content bypassed | Add input and output filtering at multiple layers |
