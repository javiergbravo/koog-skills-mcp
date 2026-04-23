---
name: embeddings
description: Generate and compare text embeddings with Koog's embeddings-base and embeddings-llm modules
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [embeddings, vector, similarity, text-embedding, llm-embedding, representation]
---

# Embeddings

Generate and compare vector representations of text and code that capture semantic meaning, enabling efficient similarity comparisons. Koog's embedding system is split into two modules.

## Modules

| Module | Purpose |
|--------|---------|
| `embeddings-base` | Core interfaces and data structures for embeddings |
| `embeddings-llm` | LLM-based embedding generation (Ollama, OpenAI, Bedrock) |

## Dependencies

```kotlin
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:embeddings-base:0.8.0")
    implementation("ai.koog:embeddings-llm:0.8.0")
}
```

## LLMEmbedder

The `LLMEmbedder` class is the central abstraction for generating embeddings. It wraps an LLM client and a model reference, exposing two key methods:

| Method | Description |
|--------|-------------|
| `embed(text)` | Generates a vector embedding from input text or code |
| `diff(embedding1, embedding2)` | Computes a difference score (lower = more similar) |

## Embedding Providers

### Ollama (Local)

Requires Ollama installed locally. Models must be pulled first via `ollama pull <model-id>`:

```kotlin
import ai.koog.embeddings.llm.LLMEmbedder
import ai.koog.clients.ollama.OllamaClient
import ai.koog.agents.ext.llm.OllamaModels

val client = OllamaClient()
val embedder = LLMEmbedder(client, OllamaModels.Embeddings.NOMIC_EMBED_TEXT)
val embedding = embedder.embed("This is the text to embed")
```

#### Available Ollama Models

| Constant | Ollama ID | Params | Dimensions | Context | Best For |
|----------|-----------|--------|------------|---------|----------|
| `NOMIC_EMBED_TEXT` | nomic-embed-text | 137M | 768 | 8192 | General semantic search (balanced) |
| `ALL_MINILM` | all-minilm | 33M | 384 | 512 | Maximum speed, minimal resources |
| `MULTILINGUAL_E5` | zylonai/multilingual-e5-large | 300M | 768 | 512 | 100+ languages |
| `BGE_LARGE` | bge-large | 335M | 1024 | 512 | Highest quality English retrieval |
| `MXBAI_EMBED_LARGE` | mxbai-embed-large | — | — | — | High-dimensional embeddings |

### OpenAI

Uses `OpenAILLMClient` with an API key:

```kotlin
import ai.koog.clients.openai.OpenAILLMClient
import ai.koog.agents.ext.llm.OpenAIModels

val client = OpenAILLMClient(System.getenv("OPENAI_API_KEY"))
val embedder = LLMEmbedder(client, OpenAIModels.Embeddings.TextEmbeddingAda002)
val embedding = embedder.embed("This is the text to embed")
```

### AWS Bedrock

Uses `BedrockLLMClient` with AWS credentials:

```kotlin
import ai.koog.clients.bedrock.BedrockLLMClient
import ai.koog.clients.bedrock.BedrockClientSettings
import ai.koog.agents.ext.llm.BedrockModels

val client = BedrockLLMClient(
    identityProvider = StaticCredentialsProvider {
        StaticCredentialsProvider.Credentials(
            accessKeyId = System.getenv("AWS_ACCESS_KEY_ID"),
            secretAccessKey = System.getenv("AWS_SECRET_ACCESS_KEY")
        )
    },
    settings = BedrockClientSettings()
)
val embedder = LLMEmbedder(client, BedrockModels.Embeddings.AmazonTitanEmbedText)
val embedding = embedder.embed("This is the text to embed")
```

#### Bedrock Embedding Models

| Provider | Model Name | Model ID | Dimensions | Context |
|----------|------------|----------|------------|---------|
| Amazon | Titan Embeddings G1 | `amazon.titan-embed-text-v1` | 1,536 | 8192 |
| Amazon | Titan Text Embeddings V2 | `amazon.titan-embed-text-v2:0` | 1,024 | 8192 |
| Cohere | Embed English v3 | `cohere.embed-english-v3` | 1,024 | 8192 |
| Cohere | Embed Multilingual v3 | `cohere.embed-multilingual-v3` | 1,024 | 8192 |

## Similarity Comparison

### Code-to-Text Comparison

Embeddings bridge code and natural language. Compare a code snippet against descriptions to find semantic matches:

```kotlin
val client = OllamaClient()
val embedder = LLMEmbedder(client, OllamaModels.Embeddings.NOMIC_EMBED_TEXT)

val codeEmbedding = embedder.embed("""
    fun factorial(n: Int): Int = if (n <= 1) 1 else n * factorial(n - 1)
""".trimIndent())

val descriptionA = embedder.embed("A recursive function that calculates the product of all positive integers up to n")
val descriptionB = embedder.embed("A sorting algorithm that rearranges elements in ascending order")

val scoreA = embedder.diff(codeEmbedding, descriptionA) // Lower = more similar
val scoreB = embedder.diff(codeEmbedding, descriptionB) // Higher = less similar

// scoreA < scoreB → descriptionA is the better semantic match
```

### Code-to-Code Comparison

Cross-language similarity detection:

```kotlin
val kotlinFib = embedder.embed("""
    fun fib(n: Int): Int = if (n <= 1) n else fib(n - 1) + fib(n - 2)
""".trimIndent())

val pythonFib = embedder.embed("""
    def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)
""".trimIndent())

val javaSort = embedder.embed("""
    void bubbleSort(int[] arr) { /* ... */ }
""".trimIndent())

val fibSimilarity = embedder.diff(kotlinFib, pythonFib)   // Low (similar algorithms)
val crossSimilarity = embedder.diff(kotlinFib, javaSort)   // High (different algorithms)

// fibSimilarity < crossSimilarity → same algorithm, different syntax are more similar
```

## Model Selection Guide

| Use Case | Recommended Model |
|----------|-------------------|
| General text semantic search | `NOMIC_EMBED_TEXT` |
| Multilingual content | `MULTILINGUAL_E5` or Cohere Multilingual |
| Maximum English quality | `BGE_LARGE` |
| Maximum speed / minimal resources | `ALL_MINILM` |
| Cloud-based, no local setup | OpenAI `TextEmbeddingAda002` |
| AWS infrastructure | Amazon Titan Embeddings V2 |

## Integration with RAG

Embeddings are the foundation for RAG (Retrieval-Augmented Generation). Use `LLMEmbedder` with a vector store to build a knowledge base:

```kotlin
// See rag-vector-store SKILL.md for full integration details
val embedder = LLMEmbedder(ollamaClient, OllamaModels.Embeddings.NOMIC_EMBED_TEXT)
val storage = EmbeddingStorage(
    documentEmbedder = JVMTextDocumentEmbedder(embedder),
    vectorStorageBackend = InMemoryVectorStorageBackend()
)
```

## API References

| Module | API Docs |
|--------|----------|
| `embeddings-base` | [api.koog.ai/embeddings/embeddings-base](https://api.koog.ai/embeddings/embeddings-base/ai.koog.embeddings.base/index.html) |
| `embeddings-llm` | [api.koog.ai/embeddings/embeddings-llm](https://api.koog.ai/embeddings/embeddings-llm/index.html) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `OllamaClient` connection refused | Ensure Ollama is running: `ollama serve` |
| Model not found | Pull the model first: `ollama pull nomic-embed-text` |
| High similarity scores for unrelated text | Try a higher-quality model (`BGE_LARGE`) or check input preprocessing |
| Slow embedding generation | Use a smaller model (`ALL_MINILM`) or batch inputs |
| OpenAI rate limits | Implement retry logic or use `RoutingLLMPromptExecutor` with multiple keys |
