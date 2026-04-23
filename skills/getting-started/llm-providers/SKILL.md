---
name: llm-providers
description: All supported LLM providers in Koog 0.8.0 with model constants, executor factories, and configuration
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [openai, anthropic, google, deepseek, openrouter, bedrock, mistral, ollama, llm, model]
---

# LLM Providers

Koog 0.8.0 supports 8 LLM providers with a unified executor API. Each provider has a factory function that creates a `PromptExecutor` and a companion object with model constants.

## Provider Quick Reference

| Provider | Executor Factory | Env Variable | Example Model |
|----------|-----------------|--------------|---------------|
| OpenAI | `simpleOpenAIExecutor(apiKey)` | `OPENAI_API_KEY` | `OpenAIModels.Chat.GPT4o` |
| Anthropic | `simpleAnthropicExecutor(apiKey)` | `ANTHROPIC_API_KEY` | `AnthropicModels.Opus_4_1` |
| Google AI | `simpleGoogleAIExecutor(apiKey)` | `GOOGLE_API_KEY` | `GoogleModels.Gemini2_5Pro` |
| DeepSeek | `DeepSeekLLMClient(apiKey)` | `DEEPSEEK_API_KEY` | `DeepSeekModels.DeepSeekChat` |
| OpenRouter | `simpleOpenRouterExecutor(apiKey)` | `OPENROUTER_API_KEY` | `OpenRouterModels.GPT4o` |
| AWS Bedrock | `simpleBedrockExecutorWithBearerToken(apiKey)` | `BEDROCK_API_KEY` | `BedrockModels.AnthropicClaude4_5Sonnet` |
| Mistral AI | `simpleMistralAIExecutor(apiKey)` | `MISTRAL_API_KEY` | `MistralAIModels.Chat.MistralMedium31` |
| Ollama | `simpleOllamaAIExecutor()` | *(none, local)* | `OllamaModels.Meta.LLAMA_3_2` |

---

## OpenAI

```kotlin
import ai.koog.agents.ext.simple.simpleOpenAIExecutor
import ai.koog.agents.ext.llm.OpenAIModels

val apiKey = System.getenv("OPENAI_API_KEY")
val executor = simpleOpenAIExecutor(apiKey)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenAIModels.Chat.GPT4o
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `OpenAIModels.Chat.GPT4o` | GPT-4o |
| `OpenAIModels.Chat.GPT4oMini` | GPT-4o-mini |
| `OpenAIModels.Chat.GPT4Turbo` | GPT-4 Turbo |
| `OpenAIModels.Chat.GPT35Turbo` | GPT-3.5 Turbo |
| `OpenAI.Models.Reasoning.O1` | o1 |
| `OpenAI.Models.Reasoning.O3Mini` | o3-mini |

---

## Anthropic

```kotlin
import ai.koog.agents.ext.simple.simpleAnthropicExecutor
import ai.koog.agents.ext.llm.AnthropicModels

val apiKey = System.getenv("ANTHROPIC_API_KEY")
val executor = simpleAnthropicExecutor(apiKey)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = AnthropicModels.Opus_4_1
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `AnthropicModels.Opus_4_1` | Claude Opus 4.1 |
| `AnthropicModels.Sonnet_4` | Claude Sonnet 4 |
| `AnthropicModels.Haiku_3_5` | Claude 3.5 Haiku |

---

## Google AI

```kotlin
import ai.koog.agents.ext.simple.simpleGoogleAIExecutor
import ai.koog.agents.ext.llm.GoogleModels

val apiKey = System.getenv("GOOGLE_API_KEY")
val executor = simpleGoogleAIExecutor(apiKey)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = GoogleModels.Gemini2_5Pro
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `GoogleModels.Gemini2_5Pro` | Gemini 2.5 Pro |
| `GoogleModels.Gemini2_0Flash` | Gemini 2.0 Flash |
| `GoogleModels.Gemini1_5Pro` | Gemini 1.5 Pro |
| `GoogleModels.Gemini1_5Flash` | Gemini 1.5 Flash |

---

## DeepSeek

```kotlin
import ai.koog.agents.ext.llm.deepseek.DeepSeekLLMClient
import ai.koog.agents.ext.llm.DeepSeekModels

val apiKey = System.getenv("DEEPSEEK_API_KEY")
val client = DeepSeekLLMClient(apiKey)

val agent = AIAgent(
    promptExecutor = client,
    llmModel = DeepSeekModels.DeepSeekChat
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `DeepSeekModels.DeepSeekChat` | DeepSeek Chat |
| `DeepSeekModels.DeepSeekCoder` | DeepSeek Coder |

---

## OpenRouter

OpenRouter provides access to multiple LLM providers through a single API.

```kotlin
import ai.koog.agents.ext.simple.simpleOpenRouterExecutor
import ai.koog.agents.ext.llm.OpenRouterModels

val apiKey = System.getenv("OPENROUTER_API_KEY")
val executor = simpleOpenRouterExecutor(apiKey)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = OpenRouterModels.GPT4o
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `OpenRouterModels.GPT4o` | GPT-4o (via OpenRouter) |
| `OpenRouterModels.ClaudeSonnet4` | Claude Sonnet 4 (via OpenRouter) |
| `OpenRouterModels.Llama3_2` | Llama 3.2 (via OpenRouter) |

---

## AWS Bedrock

```kotlin
import ai.koog.agents.ext.simple.simpleBedrockExecutorWithBearerToken
import ai.koog.agents.ext.llm.BedrockModels

val bearerToken = System.getenv("BEDROCK_API_KEY")
val executor = simpleBedrockExecutorWithBearerToken(bearerToken)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = BedrockModels.AnthropicClaude4_5Sonnet
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `BedrockModels.AnthropicClaude4_5Sonnet` | Claude 4.5 Sonnet (via Bedrock) |
| `BedrockModels.AnthropicClaude3_5Sonnet` | Claude 3.5 Sonnet (via Bedrock) |
| `BedrockModels.AnthropicClaude3Haiku` | Claude 3 Haiku (via Bedrock) |

### Alternative: AWS Credentials

```kotlin
import ai.koog.agents.ext.simple.simpleBedrockExecutorWithCredentials

val executor = simpleBedrockExecutorWithCredentials(
    accessKeyId = System.getenv("AWS_ACCESS_KEY_ID"),
    secretAccessKey = System.getenv("AWS_SECRET_ACCESS_KEY"),
    region = "us-east-1"
)
```

---

## Mistral AI

```kotlin
import ai.koog.agents.ext.simple.simpleMistralAIExecutor
import ai.koog.agents.ext.llm.MistralAIModels

val apiKey = System.getenv("MISTRAL_API_KEY")
val executor = simpleMistralAIExecutor(apiKey)

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = MistralAIModels.Chat.MistralMedium31
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `MistralAIModels.Chat.MistralMedium31` | Mistral Medium 3.1 |
| `MistralAIModels.Chat.MistralSmall` | Mistral Small |
| `MistralAIModels.Chat.Mixtral8x7B` | Mixtral 8x7B |

---

## Ollama (Local)

Ollama runs models locally — no API key required.

```kotlin
import ai.koog.agents.ext.simple.simpleOllamaAIExecutor
import ai.koog.agents.ext.llm.OllamaModels

// Default: http://localhost:11434
val executor = simpleOllamaAIExecutor()

// Custom endpoint
val executor = simpleOllamaAIExecutor(baseUrl = "http://192.168.1.100:11434")

val agent = AIAgent(
    promptExecutor = executor,
    llmModel = OllamaModels.Meta.LLAMA_3_2
)
```

### Available Models

| Constant | Model |
|----------|-------|
| `OllamaModels.Meta.LLAMA_3_2` | Llama 3.2 |
| `OllamaModels.Meta.LLAMA_3_1` | Llama 3.1 |
| `OllamaModels.Mistral.MISTRAL` | Mistral |
| `OllamaModels.DeepSeek.DEEPSEEK_R1` | DeepSeek R1 |

---

## Multi-Provider Support

Use `MultiLLMPromptExecutor` to wrap multiple providers and switch between them:

```kotlin
import ai.koog.agents.ext.llm.MultiLLMPromptExecutor
import ai.koog.agents.ext.llm.LLMClient

val openAIClient: LLMClient = simpleOpenAIExecutor(openAiKey)
val anthropicClient: LLMClient = simpleAnthropicExecutor(anthropicKey)

val multiExecutor = MultiLLMPromptExecutor(openAIClient, anthropicClient)

// Switch providers at runtime
val agent = AIAgent(
    promptExecutor = multiExecutor,
    llmModel = OpenAIModels.Chat.GPT4o
)

// Later, switch to Anthropic
agent.switchModel(AnthropicModels.Sonnet_4)
```

---

## Provider Selection Guide

| Use Case | Recommended Provider |
|----------|---------------------|
| General purpose, fast | OpenAI GPT-4o |
| Complex reasoning | Anthropic Claude Opus 4.1 or Google Gemini 2.5 Pro |
| Cost-effective | OpenAI GPT-4o-mini or DeepSeek |
| Code generation | DeepSeek Coder |
| Local/offline | Ollama |
| Enterprise/AWS | AWS Bedrock |
| Multi-provider routing | OpenRouter |
| European compliance | Mistral AI |
