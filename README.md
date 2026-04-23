# koog-skills-mcp

MCP server that exposes the complete [Koog](https://koog.ai) framework documentation as searchable skills. Any MCP-capable client (Claude Code, Cursor, Windsurf, etc.) can query Koog's API reference, code examples, and best practices in real time.

> **Koog version**: 0.8.0 | **Skills**: 38 | **License**: Apache-2.0

## What It Does

Koog is JetBrains' Kotlin-first AI agent framework. This MCP server bundles its entire documentation into structured `SKILL.md` files and exposes them via the Model Context Protocol:

- **`search_skills`** — BM25 full-text search with fuzzy matching across all 38 skills
- **`get_skill`** — Fetch a complete skill with code examples, API tables, and troubleshooting
- **`list_skills`** — Browse skills by category with metadata
- **`skill://{name}`** — MCP resource for direct skill access

## Quick Start

### Claude Code (recommended)

```bash
# Global — available in every project
claude mcp add --scope user koog-skills -- npx -y koog-skills-mcp

# Or from this repo during development
claude mcp add --scope user koog-skills -- node /path/to/koog-skills-mcp/packages/mcp/dist/bin.js --bundle /path/to/koog-skills-mcp/packages/mcp/dist/skills.json
```

### Cursor / Windsurf / Other MCP Clients

Add to your MCP settings JSON:

```json
{
  "mcpServers": {
    "koog-skills": {
      "command": "npx",
      "args": ["-y", "koog-skills-mcp"]
    }
  }
}
```

### Local Development

```bash
git clone <repo-url> && cd koog-skills-mcp
pnpm install
pnpm build

# Run with bundled skills
node packages/mcp/dist/bin.js --bundle packages/mcp/dist/skills.json

# Or re-parse from source SKILL.md files
node packages/mcp/dist/bin.js --skills-dir ./skills
```

## CLI Options

```
koog-skills-mcp [options]

Options:
  --skills-dir <path>   Re-parse skills from a directory of SKILL.md files
                        instead of using the bundled snapshot.
  --bundle <path>       Use a specific pre-built skills.json snapshot.
  --version, -v         Print version and exit.
  --help, -h            Show this help.
```

## Skills Catalog

38 skills organized in 9 categories:

### getting-started (3)
| Skill | Description |
|-------|-------------|
| `quickstart` | Install Koog 0.8.0, configure API keys, create your first agent |
| `key-features` | Multiplatform, reliability, memory, MCP, streaming, observability |
| `llm-providers` | All 8 providers: OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Bedrock, Mistral, Ollama |

### agents (4)
| Skill | Description |
|-------|-------------|
| `basic-agents` | AIAgent constructor, system prompt, tools, event handling, maxIterations |
| `graph-based-agents` | strategy{} builder, nodeLLMRequest(), nodeExecuteTool(), edges, conditions |
| `functional-agents` | Lambda-based agents with plain Kotlin/Java |
| `planner-agents` | LLM-based planners, GOAP agents |

### tools (4)
| Skill | Description |
|-------|-------------|
| `overview` | Tool types, ToolRegistry, execution nodes, parallel tool calls |
| `annotation-based` | @Tool, @LLMDescription, ToolSet, parameter types |
| `class-based` | SimpleTool, ToolDescriptor, ToolDescriptorSchemer |
| `agents-as-tools` | AIAgentService.createAgentTool(), hierarchical architectures |

### memory-and-rag (8)
| Skill | Description |
|-------|-------------|
| `chat-memory` | ChatMemory feature, ChatHistoryProvider, windowSize, preprocessors |
| `agent-memory` | AgentMemory, Facts, Concepts, Subjects, MemoryScope, memory nodes |
| `long-term-memory` | LongTermMemory feature, persistent storage, cross-session retrieval |
| `embeddings` | LLMEmbedder, embedding models, vector representations |
| `rag-overview` | RAG architecture, document storage/retrieval |
| `rag-vector-store` | KoogVectorStore, similarity search, indexing |
| `prompt-cache` | CachedPromptExecutor, file/memory/Redis cache backends |
| `memory-encryption` | EncryptedStorage, Aes256GCMEncryptor, AES-256-GCM encryption |

### strategies (3)
| Skill | Description |
|-------|-------------|
| `predefined` | chatAgentStrategy(), reActStrategy() |
| `custom-graphs` | Advanced strategy builder, custom nodes, subgraphs |
| `parallel-execution` | Parallel node execution, data transfer between nodes |

### prompts (3)
| Skill | Description |
|-------|-------------|
| `creating-prompts` | Prompt builder DSL, prompt(), system(), user() |
| `running-prompts` | PromptExecutor, LLM clients, simpleXxxExecutor() factories |
| `multimodal` | Images, documents, audio in prompts |

### integrations (4)
| Skill | Description |
|-------|-------------|
| `mcp` | McpToolRegistryProvider, stdio/SSE, McpTool |
| `ktor` | Ktor plugin for server-side agent hosting |
| `spring-boot` | Spring Boot starter, auto-configuration |
| `a2a-protocol` | Agent-to-Agent protocol, A2A server/client |

### features (5)
| Skill | Description |
|-------|-------------|
| `event-handlers` | EventHandler, handleEvents{}, onToolCallStarting, onLLMStreaming* |
| `tracing` | Tracing feature, detailed execution tracing |
| `persistence` | Snapshot feature, checkpoint/restore, crash recovery |
| `opentelemetry` | OpenTelemetry, Langfuse, Weave, Datadog exporters |
| `history-compression` | Token-aware truncation, summarization, sliding window |

### advanced (4)
| Skill | Description |
|-------|-------------|
| `structured-output` | @Serializable, executeStructured(), StructureFixingParser |
| `streaming` | StreamFrame types, Flow, markdown streaming |
| `subgraphs` | Subgraph patterns, composition, nesting |
| `content-moderation` | ModerationModel, content filtering, safety checks |

## MCP Tools

### `list_skills`

List all available skills, optionally filtered by category.

```json
{
  "category": "memory-and-rag",
  "limit": 10
}
```

### `search_skills`

Full-text BM25 search across all skills. Returns ranked results with snippets.

```json
{
  "query": "how to use RAG with vector store",
  "k": 5
}
```

### `get_skill`

Fetch a complete skill by name. Set `include_references: true` to inline all linked reference files.

```json
{
  "name": "graph-based-agents",
  "include_references": true
}
```

### Resource: `skill://{name}`

Direct MCP resource access. List all available skills via `resources/list`, then read any skill by URI.

## Project Structure

```
koog-skills-mcp/
├── package.json                    # Root workspace (pnpm)
├── pnpm-workspace.yaml
├── tsconfig.json
├── scripts/
│   └── build-skills-index.mjs      # Generates dist/skills.json from SKILL.md files
├── skills/                         # 38 SKILL.md files organized by category
│   ├── getting-started/            #   3 skills
│   ├── agents/                     #   4 skills
│   ├── tools/                      #   4 skills
│   ├── memory-and-rag/             #   8 skills (priority category)
│   ├── strategies/                 #   3 skills
│   ├── prompts/                    #   3 skills
│   ├── integrations/               #   4 skills
│   ├── features/                   #   5 skills
│   └── advanced/                   #   4 skills
├── packages/
│   ├── core/                       # @koog-skills/core
│   │   └── src/
│   │       ├── types.ts            # Skill, SkillFrontmatter interfaces
│   │       ├── schema.ts           # Zod validation for SKILL.md frontmatter
│   │       ├── parse.ts            # SKILL.md parser (gray-matter)
│   │       ├── load.ts             # Directory walker for SKILL.md files
│   │       ├── search.ts           # BM25 index (MiniSearch)
│   │       ├── render.ts           # SKILL.md serializer
│   │       └── index.ts            # Barrel exports
│   └── mcp/                        # koog-skills-mcp
│       └── src/
│           ├── bin.ts              # CLI entry point (stdio transport)
│           ├── server.ts           # MCP server (3 tools + 1 resource)
│           ├── skills-source.ts    # Loader (bundle JSON or live directory)
│           ├── render.ts           # Markdown rebuild with inlined references
│           └── index.ts            # Library exports
└── dist/                           # Build output (gitignored)
```

## SKILL.md Format

Each skill is a Markdown file with YAML frontmatter:

```markdown
---
name: graph-based-agents
description: Build custom agent workflows using Koog's graph-based strategy builder
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [graph, strategy, workflow, nodes, edges]
---

# Graph-Based Agents

## Overview
...

## Code Examples
...
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Kebab-case identifier (e.g. `graph-based-agents`) |
| `description` | Yes | 1-1024 characters, used for search ranking |
| `compatibility` | Yes | Koog version (e.g. `"Koog 0.8.0"`) |
| `license` | Yes | Apache-2.0 |
| `keywords` | Yes | Array of search terms |

## Development

### Prerequisites

- Node.js >= 20
- pnpm 10+

### Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format

# Type-check
pnpm -r typecheck
```

### Adding a New Skill

1. Create `skills/<category>/<skill-name>/SKILL.md`
2. Add YAML frontmatter with `name`, `description`, `compatibility`, `keywords`
3. Write the skill content with code examples, API tables, and troubleshooting
4. Run `pnpm build` to regenerate `skills.json`
5. Test: `node packages/mcp/dist/bin.js --skills-dir ./skills`

### Architecture

```
SKILL.md files
    ↓ (parse.ts — gray-matter + regex)
Skill objects
    ↓ (search.ts — MiniSearch)
BM25 index
    ↓ (server.ts — @modelcontextprotocol/sdk)
MCP tools + resource
    ↓ (stdio transport)
MCP client (Claude Code, Cursor, etc.)
```

## How It Works

1. **Build time**: `scripts/build-skills-index.mjs` parses all 38 `SKILL.md` files, extracts frontmatter + body, inlines reference links, and writes a portable `skills.json` bundle.

2. **Runtime**: The MCP server loads `skills.json` (or re-parses from `--skills-dir`), builds a BM25 search index over `name`, `keywords`, `description`, and `headings`, and exposes 3 tools + 1 resource via stdio.

3. **Query time**: The MCP client calls `search_skills("rag vector store")`, gets ranked results, then calls `get_skill("rag-vector-store")` to read the full documentation with code examples.

## Inspired By

- [android-skills-mcp](https://github.com/skydoves/android-skills-mcp) by [skydoves](https://github.com/skydoves) — the original Android skills MCP server that this project is based on.

## License

Apache-2.0
