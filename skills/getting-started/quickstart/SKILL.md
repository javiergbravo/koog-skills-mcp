---
name: quickstart
description: Install Koog 0.8.0, configure API keys, and create your first AI agent in Kotlin or Java
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [install, setup, quickstart, gradle, maven, api-key, first-agent]
---

# Quickstart Guide

Get up and running with Koog 0.8.0 in minutes. This guide covers installation, API key configuration, and creating your first AI agent.

## Requirements

| Requirement | Version |
|-------------|---------|
| JDK | 17+ |
| Kotlin | 2.2.0+ |
| kotlinx-coroutines | 1.10.2 |
| kotlinx-serialization | 1.8.1 |

## Installation

### Gradle (Kotlin DSL)

Add the Koog agents dependency to your `build.gradle.kts`:

```kotlin
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
}
```

### Gradle (Groovy DSL)

```groovy
dependencies {
    implementation 'ai.koog:koog-agents:0.8.0'
}
```

### Maven

```xml
<dependency>
    <groupId>ai.koog</groupId>
    <artifactId>koog-agents-jvm</artifactId>
    <version>0.8.0</version>
</dependency>
```

## API Key Configuration

Koog supports 8 LLM providers. Set the appropriate environment variable for your chosen provider:

| Provider | Environment Variable | Example Models |
|----------|---------------------|----------------|
| OpenAI | `OPENAI_API_KEY` | GPT-4o, GPT-4o-mini |
| Anthropic | `ANTHROPIC_API_KEY` | Claude Opus 4.1, Claude Sonnet 4 |
| Google AI | `GOOGLE_API_KEY` | Gemini 2.5 Pro, Gemini 2.0 Flash |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek Chat |
| OpenRouter | `OPENROUTER_API_KEY` | GPT-4o (via OpenRouter) |
| AWS Bedrock | `BEDROCK_API_KEY` | Claude 4.5 Sonnet (via Bedrock) |
| Mistral AI | `MISTRAL_API_KEY` | Mistral Medium 3.1 |
| Ollama | *(no key needed, local)* | Llama 3.2, etc. |

Set your key as an environment variable:

```bash
# macOS/Linux
export OPENAI_API_KEY="sk-..."

# Windows (PowerShell)
$env:OPENAI_API_KEY = "sk-..."
```

Or load from a `.env` file using a library like `dotenv-kotlin`.

## Creating Your First Agent

### Kotlin Pattern

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.core.feature.model.featureConfig
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

suspend fun main() {
    val apiKey = System.getenv("OPENAI_API_KEY")

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o
    )

    val result = agent.run("Hello! What can you help me with?")
    println(result)
}
```

### Java Pattern

```java
import ai.koog.agents.core.agent.AIAgent;
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;

public class QuickStart {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("OPENAI_API_KEY");

        var agent = AIAgent.builder(
                SimpleOpenAIExecutorKt.simpleOpenAIExecutor(apiKey),
                OpenAIModels.Chat.GPT4o
            )
            .build();

        String result = agent.run("Hello! What can you help me with?");
        System.out.println(result);
    }
}
```

### Running the Agent

```bash
# Kotlin
./gradlew run

# Or compile and run directly
kotlinc -cp "koog-agents-0.8.0.jar:..." Main.kt -include-runtime -d app.jar
java -jar app.jar
```

## Next Steps

- **[LLM Providers](../llm-providers/SKILL.md)** — Configure different LLM providers
- **[Basic Agents](../../agents/basic-agents/SKILL.md)** — Add system prompts, tools, and event handling
- **[Key Features](../key-features/SKILL.md)** — Explore Koog's full capabilities

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Unresolved reference: AIAgent` | Ensure `ai.koog:koog-agents:0.8.0` is in dependencies |
| `API key not found` | Verify environment variable is set: `echo $OPENAI_API_KEY` |
| `ClassNotFound` errors | Ensure JDK 17+ and correct Kotlin version (2.1+) |
| Network errors | Check firewall/proxy settings; try a different provider |
