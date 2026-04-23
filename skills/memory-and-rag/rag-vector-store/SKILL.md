---
name: rag-vector-store
description: Use Koog's rag-vector module with EmbeddingStorage, VectorStorageBackend, and DocumentEmbedder for similarity search and document indexing
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [vector-store, embedding-storage, similarity-search, indexing, rag-vector, document-retrieval, vector-storage-backend]
---

# RAG Vector Store

Use Koog's `rag-vector` module to build vector-based document storage and retrieval systems. This module provides local implementations combining document embedding with vector storage for similarity search.

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

## Core Interfaces (rag-base)

### SearchStorage

The primary interface for searching documents:

```kotlin
interface SearchStorage<Document, Request : SearchRequest> {
    suspend fun search(
        request: Request,
        namespace: String? = null
    ): List<SearchResult<Document>>
}
```

### WriteStorage

Interface for adding documents:

```kotlin
interface WriteStorage<Document> {
    suspend fun add(
        records: List<Document>,
        namespace: String? = null
    )
}
```

### SimilaritySearchRequest

Request object for similarity searches:

```kotlin
data class SimilaritySearchRequest(
    val queryText: String,
    val limit: Int = 10,
    val minScore: Double = 0.0
)
```

## VectorStorageBackend

The low-level backend that stores and retrieves vectors:

| Implementation | Description | Persistence |
|----------------|-------------|-------------|
| `InMemoryVectorStorageBackend` | Stores vectors in memory | Lost on restart |
| `FileVectorStorageBackend` | Persists vectors to disk | Survives restarts |
| `JVMFileVectorStorageBackend` | JVM-specific file backend using `java.nio.file.Path` | Survives restarts |

```kotlin
import ai.koog.rag.vector.InMemoryVectorStorageBackend
import ai.koog.rag.vector.JVMFileVectorStorageBackend

// In-memory (testing)
val inMemoryBackend = InMemoryVectorStorageBackend()

// File-based (production)
val fileBackend = JVMFileVectorStorageBackend(
    directory = Path("/path/to/vector/storage")
)
```

## DocumentEmbedder

Converts documents into vector representations:

| Implementation | Description |
|----------------|-------------|
| `TextDocumentEmbedder` | Generic embedder parameterized by document and path types |
| `JVMTextDocumentEmbedder` | JVM-specific embedder reading files from `java.nio.file.Path` |

```kotlin
import ai.koog.embeddings.llm.LLMEmbedder
import ai.koog.rag.vector.JVMTextDocumentEmbedder
import ai.koog.clients.ollama.OllamaClient
import ai.koog.agents.ext.llm.OllamaModels

val client = OllamaClient()
val embedder = LLMEmbedder(client, OllamaModels.Embeddings.NOMIC_EMBED_TEXT)
val documentEmbedder = JVMTextDocumentEmbedder(embedder)
```

## EmbeddingStorage

The main storage class that composes a `DocumentEmbedder` with a `VectorStorageBackend`:

```kotlin
import ai.koog.rag.vector.EmbeddingStorage

val storage = EmbeddingStorage(
    documentEmbedder = documentEmbedder,
    vectorStorageBackend = InMemoryVectorStorageBackend()
)
```

### Convenience Implementations

| Class | Description |
|-------|-------------|
| `InMemoryDocumentEmbeddingStorage` | `EmbeddingStorage` + in-memory backend |
| `FileDocumentEmbeddingStorage` | `EmbeddingStorage` + file backend |
| `JVMFileDocumentEmbeddingStorage` | JVM file-based embedding storage |
| `TextFileDocumentEmbeddingStorage` | File-based storage for text documents |
| `JVMFileEmbeddingStorage` | JVM file-based storage for text documents |

```kotlin
import ai.koog.rag.vector.InMemoryDocumentEmbeddingStorage

// All-in-one convenience
val storage = InMemoryDocumentEmbeddingStorage(
    documentEmbedder = documentEmbedder
)
```

## Complete Usage Example

### Building a Knowledge Base

```kotlin
import ai.koog.embeddings.llm.LLMEmbedder
import ai.koog.clients.ollama.OllamaClient
import ai.koog.agents.ext.llm.OllamaModels
import ai.koog.rag.vector.*
import ai.koog.rag.base.SimilaritySearchRequest

suspend fun main() {
    // 1. Create embedder
    val client = OllamaClient()
    val embedder = LLMEmbedder(client, OllamaModels.Embeddings.NOMIC_EMBED_TEXT)

    // 2. Create document embedder
    val documentEmbedder = JVMTextDocumentEmbedder(embedder)

    // 3. Create storage
    val storage = EmbeddingStorage(
        documentEmbedder = documentEmbedder,
        vectorStorageBackend = JVMFileVectorStorageBackend(
            directory = Path("./knowledge-base-vectors")
        )
    )

    // 4. Index documents
    val documents = listOf(
        Path("/docs/architecture.md"),
        Path("/docs/api-reference.md"),
        Path("/docs/faq.md"),
        Path("/docs/troubleshooting.md")
    )
    storage.add(documents)
    println("Indexed ${documents.size} documents")

    // 5. Search
    val request = SimilaritySearchRequest(
        queryText = "How do I configure authentication?",
        limit = 3,
        minScore = 0.5
    )
    val results = storage.search(request)

    for (result in results) {
        println("Score: ${"%.3f".format(result.score)}")
        println("File: ${result.document.path}")
        println("Content: ${result.document.content.take(200)}...")
        println("---")
    }
}
```

### Using with an Agent (Agentic RAG)

```kotlin
import ai.koog.agents.core.tools.annotations.Tool
import ai.koog.agents.core.tools.annotations.LLMDescription
import ai.koog.agents.core.tools.ToolRegistry
import ai.koog.agents.core.agent.AIAgent

class DocumentSearchTools(
    private val storage: SearchStorage<TextDocument, SimilaritySearchRequest>
) {
    @Tool
    @LLMDescription("Search indexed documents for relevant information")
    suspend fun searchDocuments(
        @LLMDescription("The search query describing what you're looking for")
        query: String,
        @LLMDescription("Maximum number of results (1-10)")
        limit: Int = 5
    ): String {
        val request = SimilaritySearchRequest(
            queryText = query,
            limit = limit.coerceIn(1, 10),
            minScore = 0.5
        )
        val results = storage.search(request)
        return if (results.isEmpty()) {
            "No relevant documents found for: $query"
        } else {
            buildString {
                appendLine("Found ${results.size} relevant documents:")
                for ((index, result) in results.withIndex()) {
                    appendLine("\n[${index + 1}] Score: ${"%.3f".format(result.score)}")
                    appendLine(result.document.content)
                }
            }
        }
    }
}

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a documentation assistant. Search the knowledge base to answer questions.",
    toolRegistry = ToolRegistry {
        tool(DocumentSearchTools(storage))
    }
)
```

## Namespaces

Use namespaces to organize documents into separate collections within the same storage:

```kotlin
// Add documents to different namespaces
storage.add(docsList, namespace = "product-a")
storage.add(otherDocs, namespace = "product-b")

// Search within a specific namespace
val results = storage.search(
    SimilaritySearchRequest(queryText = "pricing", limit = 5),
    namespace = "product-a"
)
```

## Configuration Patterns

### Development / Testing

```kotlin
val storage = InMemoryDocumentEmbeddingStorage(
    documentEmbedder = JVMTextDocumentEmbedder(
        LLMEmbedder(OllamaClient(), OllamaModels.Embeddings.ALL_MINILM)
    )
)
```

### Production

```kotlin
val storage = EmbeddingStorage(
    documentEmbedder = JVMTextDocumentEmbedder(
        LLMEmbedder(OpenAILLMClient(apiKey), OpenAIModels.Embeddings.TextEmbeddingAda002)
    ),
    vectorStorageBackend = JVMFileVectorStorageBackend(
        directory = Path("/data/vector-store")
    )
)
```

## Best Practices

1. **Chunking strategy**: Split large documents into meaningful chunks (paragraphs, sections) before indexing
2. **Metadata**: Add rich metadata to enable filtering alongside similarity search
3. **Embedding model**: Choose an appropriate embedding model based on quality/speed requirements (see [embeddings SKILL](../embeddings/SKILL.md))
4. **Score threshold**: Set appropriate `minScore` to filter irrelevant results
5. **Namespaces**: Use namespaces to organize documents by topic, product, or date
6. **Persistence**: Use `FileVectorStorageBackend` or `JVMFileVectorStorageBackend` for production

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No search results | Lower `minScore`; ensure documents are indexed; check embedding model |
| Slow indexing | Use a smaller embedding model; batch document processing |
| Memory exhaustion | Switch from `InMemoryVectorStorageBackend` to `FileVectorStorageBackend` |
| Poor relevance quality | Use a higher-quality embedding model (`BGE_LARGE`); improve document preprocessing |
| File not found errors | Verify document paths are absolute and files exist |
| Ollama timeout | Increase Ollama timeout; ensure model is pulled: `ollama pull nomic-embed-text` |
