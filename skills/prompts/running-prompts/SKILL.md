---
name: running-prompts
description: Execute prompts with Koog's PromptExecutor and LLM clients for all supported providers
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [prompt-executor, llm-client, execute, run-prompt, executor-factory]
---

# Running Prompts

Execute prompts against LLM providers using Koog's two levels of abstraction: **LLM Clients** (low-level) and **Prompt Executors** (high-level).

## Execution Flow

```
Prompt → LLM Client or Executor → LLM Provider → Response → Application
```

## LLM Clients (Low-Level)

Direct interfaces for interacting with specific LLM providers. Best when working with a single provider without needing advanced lifecycle management.

| Provider | Client Class | Constructor |
|----------|-------------|-------------|
| OpenAI | `OpenAILLMClient` | `OpenAILLMClient(apiKey)` |
| Anthropic | `AnthropicLLMClient` | `AnthropicLLMClient(apiKey)` |
| Google | `GoogleLLMClient` | `GoogleLLMClient(apiKey)` |
| Ollama | `OllamaClient` | `OllamaClient()` |
| Bedrock | `BedrockLLMClient` | `BedrockLLMClient(credentials, settings)` |
| Mistral | `MistralAILLMClient` | `MistralAILLMClient(apiKey)` |
| OpenRouter | `OpenRouterLLMClient` | `OpenRouterLLMClient(apiKey)` |

## Prompt Executors (High-Level)

Manage the lifecycle of one or multiple LLM clients with a unified API. Supports dynamic switching between providers and fallbacks.

### Executor Types

| Type | Purpose |
|------|---------|
| `SingleLLMPromptExecutor` | Wraps a single LLM client for one provider |
| `MultiLLMPromptExecutor` | Wraps multiple LLM clients, routing by provider |
| `RoutingLLMPromptExecutor` | Distributes requests across multiple instances (experimental) |

## Factory Functions

All providers offer a simple factory function that returns `SingleLLMPromptExecutor`:

| Provider | Factory | Environment Variable |
|----------|---------|---------------------|
| OpenAI | `simpleOpenAIExecutor(apiKey)` | `OPENAI_API_KEY` |
| Azure OpenAI | `simpleAzureOpenAIExecutor(apiKey)` | `OPENAI_API_KEY` |
| Anthropic | `simpleAnthropicExecutor(apiKey)` | `ANTHROPIC_API_KEY` |
| Google | `simpleGoogleAIExecutor(apiKey)` | `GOOGLE_API_KEY` |
| OpenRouter | `simpleOpenRouterExecutor(apiKey)` | `OPENROUTER_API_KEY` |
| Amazon Bedrock | `simpleBedrockExecutor(...)` | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| Bedrock (bearer) | `simpleBedrockExecutorWithBearerToken(...)` | Bearer token |
| Mistral | `simpleMistralAIExecutor(apiKey)` | `MISTRAL_API_KEY` |
| Ollama | `simpleOllamaAIExecutor(...)` | *(none, local)* |

### Kotlin

```kotlin
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.prompt.dsl.prompt

// Create executor
val executor = simpleOpenAIExecutor(System.getenv("OPENAI_API_KEY"))

// Build prompt
val myPrompt = prompt("greeting") {
    system("You are a friendly assistant.")
    user("Hello!")
}

// Execute
val response = executor.execute(
    prompt = myPrompt,
    model = OpenAIModels.Chat.GPT4o
)

println(response.content)
```

### Java

```java
import ai.koog.agents.ext.simple.SimpleOpenAIExecutorKt;
import ai.koog.agents.ext.llm.OpenAIModels;
import ai.koog.prompt.dsl.Prompt;

var executor = SimpleOpenAIExecutorKt.simpleOpenAIExecutor(
    System.getenv("OPENAI_API_KEY")
);

var myPrompt = Prompt.builder("greeting")
    .system("You are a friendly assistant.")
    .user("Hello!")
    .build();

var response = executor.execute(myPrompt, OpenAIModels.Chat.GPT4o);
System.out.println(response.getContent());
```

## Multi-Provider Executor

Switch between providers without changing code:

```kotlin
import ai.koog.agents.ext.prompt.executor.MultiLLMPromptExecutor
import ai.koog.agents.ext.llm.LLMProvider

val executor = MultiLLMPromptExecutor(
    LLMProvider.OpenAI to openAIClient,
    LLMProvider.Anthropic to anthropicClient,
    LLMProvider.Google to googleClient
)

// Route to OpenAI
val openAIResult = executor.execute(prompt, OpenAIModels.Chat.GPT4o)

// Route to Anthropic (same executor, different model)
val anthropicResult = executor.execute(prompt, AnthropicModels.Sonnet_4_5)
```

### Configuring Fallbacks

Fallbacks apply when a requested client isn't available:

```kotlin
val executor = MultiLLMPromptExecutor(
    LLMProvider.OpenAI to openAIClient,
    LLMProvider.Ollama to ollamaClient,
    fallback = MultiLLMPromptExecutor.FallbackPromptExecutorSettings(
        fallbackProvider = LLMProvider.Ollama,
        fallbackModel = OllamaModels.Meta.LLAMA_3_2
    )
)
```

## Routing Executor (Experimental)

Distribute requests across multiple client instances:

```kotlin
import ai.koog.agents.ext.prompt.executor.RoutingLLMPromptExecutor
import ai.koog.agents.ext.prompt.executor.RoundRobinRouter

val openAI1 = OpenAILLMClient(apiKey = "key-1")
val openAI2 = OpenAILLMClient(apiKey = "key-2")
val anthropic = AnthropicLLMClient(apiKey = "anthropic-key")

val router = RoundRobinRouter(openAI1, openAI2, anthropic)
val routingExecutor = RoutingLLMPromptExecutor(router)
```

> **Note**: Requires `@OptIn(ExperimentalRoutingApi::class)`.

## Running a Prompt

```kotlin
val response = executor.execute(
    prompt = prompt("demo") {
        system("You are a helpful assistant.")
        user("Summarize this document.")
    },
    model = OpenAIModels.Chat.GPT4o
)
```

The executor supports streaming, multiple choice generation, and content moderation — matching whatever the underlying client supports.

## Using with Agents

```kotlin
// Simple agent
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a helpful assistant."
)

// Multi-provider agent
val multiAgent = AIAgent(
    promptExecutor = MultiLLMPromptExecutor(
        LLMProvider.OpenAI to openAIClient,
        LLMProvider.Anthropic to anthropicClient
    ),
    llmModel = OpenAIModels.Chat.GPT4o, // Default model
    systemPrompt = "You are a helpful assistant."
)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Unresolved reference: simpleOpenAIExecutor` | Ensure `ai.koog:agents-ext` is in dependencies |
| `Provider not registered` in MultiLLM | Ensure the model's provider has a matching client registered |
| Fallback not triggering | Check that the fallback provider and model are configured correctly |
| Rate limits | Use `RoutingLLMPromptExecutor` with multiple API keys |
| Authentication errors | Verify environment variables are set correctly |
