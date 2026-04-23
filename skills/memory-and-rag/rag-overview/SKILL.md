---
name: rag-overview
description: Implement Retrieval Augmented Generation (RAG) with Koog's rag-base module for document storage and retrieval
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [rag, retrieval-augmented-generation, document, storage, retrieval, knowledge-base]
---

# RAG Overview

Implement Retrieval-Augmented Generation (RAG) with Koog's embedding and vector storage modules. RAG augments LLM prompts with relevant context from a knowledge base, enabling agents to answer questions about domain-specific data.

## Module Architecture

| Module | Purpose |
|--------|---------|
| `rag-base` | Core abstractions for retrieval, storage, search requests, filtering, and document providers |
| `rag-vector` | Local implementations combining document embedding with vector storage |
| `embeddings-base` | Core embedding interfaces |
| `embeddings-llm` | LLM-based embedding generation (Ollama, OpenAI, Bedrock) |

## Dependencies

```kotlin
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:rag-base:0.8.0")
    implementation("ai.koog:rag-vector:0.8.0")
    implementation("ai.koog:embeddings-base:0.8.0")
    implementation("ai.koog:embeddings-llm:0.8.0")
}
```

## RAG Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Documents   │────▶│ DocumentEmbedder │────▶│ VectorStorage    │
│  (files,     │     │ (text → vector)  │     │ Backend          │
│   text)      │     └──────────────────┘     │ (persistence)    │
└─────────────┘                                └──────────────────┘
                                                      │
┌─────────────┐     ┌──────────────────┐              │
│ User Query   │────▶│ SimilaritySearch │◀─────────────┘
│              │     │ Request          │
└─────────────┘     └────────┬─────────┘
                             │
                      ┌──────▼──────┐
                      │  LLM with   │
                      │  Context    │
                      └─────────────┘
```

## Core RAG Flow

The primary workflow uses `EmbeddingStorage`, which composes a `DocumentEmbedder` with a `VectorStorageBackend`:

### Step 1: Create an Embedder

```kotlin
import ai.koog.embeddings.llm.LLMEmbedder
import ai.koog.clients.ollama.OllamaClient
import ai.koog.agents.ext.llm.OllamaModels

val client = OllamaClient()
val embedder = LLMEmbedder(client, OllamaModels.Embeddings.NOMIC_EMBED_TEXT)
```

### Step 2: Create a Document Embedder

```kotlin
import ai.koog.rag.vector.JVMTextDocumentEmbedder

val documentEmbedder = JVMTextDocumentEmbedder(embedder)
```

### Step 3: Instantiate Embedding Storage

```kotlin
import ai.koog.rag.vector.EmbeddingStorage
import ai.koog.rag.vector.InMemoryVectorStorageBackend

val storage = EmbeddingStorage(
    documentEmbedder = documentEmbedder,
    vectorStorageBackend = InMemoryVectorStorageBackend()
)
```

### Step 4: Add Documents

```kotlin
storage.add(listOf(
    Path("/path/to/document1.txt"),
    Path("/path/to/document2.md"),
    Path("/path/to/document3.pdf")
))
```

### Step 5: Search

```kotlin
import ai.koog.rag.base.SimilaritySearchRequest

val request = SimilaritySearchRequest(
    queryText = "How does the authentication system work?",
    limit = 5,
    minScore = 0.7
)

val results = storage.search(request)
for (result in results) {
    println("Score: ${result.score}, Content: ${result.document.content}")
}
```

## Vector Storage Backends

| Implementation | Description |
|----------------|-------------|
| `InMemoryVectorStorageBackend` | In-memory storage; suited for testing and prototypes |
| `FileVectorStorageBackend` | Disk-persisted vectors for durability across restarts |
| `JVMFileVectorStorageBackend` | JVM-specific backend using `java.nio.file.Path` |

## Document Embedders

| Implementation | Description |
|----------------|-------------|
| `TextDocumentEmbedder` | Generic embedder parameterized by document and path types |
| `JVMTextDocumentEmbedder` | JVM-specific embedder reading files from `java.nio.file.Path` |

## Combined Storage Implementations

| Implementation | Description |
|----------------|-------------|
| `EmbeddingStorage` | Composes any `DocumentEmbedder` with any `VectorStorageBackend` |
| `InMemoryDocumentEmbeddingStorage` | Convenience wrapper with in-memory backend |
| `FileDocumentEmbeddingStorage` | Convenience wrapper with file backend |
| `JVMFileDocumentEmbeddingStorage` | JVM file-based embedding storage |
| `TextFileDocumentEmbeddingStorage` | File-based storage targeting text documents |
| `JVMFileEmbeddingStorage` | JVM file-based storage for text documents |

## Agentic RAG (Tool-Based Approach)

Rather than injecting retrieved documents into prompts upfront, expose the storage as an agent tool. This grants the agent autonomy to decide when knowledge base lookups are needed:

```kotlin
import ai.koog.agents.core.tools.annotations.Tool
import ai.koog.agents.core.tools.annotations.LLMDescription

class KnowledgeBaseTools(
    private val storage: SearchStorage<TextDocument, SimilaritySearchRequest>
) {
    @Tool
    @LLMDescription("Search the knowledge base for information about a topic")
    suspend fun searchKnowledgeBase(
        @LLMDescription("The search query")
        query: String,
        @LLMDescription("Maximum number of results to return")
        limit: Int = 5
    ): String {
        val request = SimilaritySearchRequest(
            queryText = query,
            limit = limit,
            minScore = 0.5
        )
        val results = storage.search(request)
        return if (results.isEmpty()) {
            "No relevant information found."
        } else {
            results.joinToString("\n---\n") { it.document.content }
        }
    }
}

// Register the tool
val toolRegistry = ToolRegistry {
    tool(KnowledgeBaseTools(storage))
}

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a helpful assistant. Use the knowledge base tool when users ask about specific topics.",
    toolRegistry = toolRegistry
)
```

This pattern is useful when the agent handles diverse requests — some requiring knowledge base lookups and others not.

## When to Use RAG vs Memory

| Approach | Best For | Limitations |
|----------|----------|-------------|
| **RAG (rag-vector)** | Large document collections, domain-specific knowledge, factual Q&A | Requires embedding model, no built-in chunking |
| **ChatMemory** | Multi-turn conversation continuity | Session-scoped, no cross-session persistence |
| **AgentMemory** | Structured facts, user preferences | Manual concept/fact definition required |
| **LongTermMemory** | Cross-session knowledge with automatic ingestion | Experimental API, requires vector storage |

## Current Limitations

| Limitation | Details |
|------------|---------|
| Search types | Only similarity search in built-in implementations |
| Chunking | No built-in chunking pipeline within the `rag` module |
| Metadata | Limited metadata-rich production record modeling |
| Vector databases | No built-in integrations (Pinecone, Weaviate, pgvector, Milvus) |

For custom backends, build from `rag-base` abstractions and implement your own storage adapter.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No search results | Check `minScore` threshold; lower it or verify documents are indexed |
| Slow indexing | Use a faster embedding model (`ALL_MINILM`) or batch processing |
| Memory issues with large collections | Use `FileVectorStorageBackend` instead of `InMemoryVectorStorageBackend` |
| Poor relevance | Try a higher-quality embedding model (`BGE_LARGE`); improve document quality |
| Ollama connection errors | Ensure Ollama is running: `ollama serve` |
