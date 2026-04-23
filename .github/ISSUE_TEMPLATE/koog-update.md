---
name: Koog version update
about: Update skills documentation for a new koog release
title: "chore: update skills for koog $NEW_VERSION"
labels: ["automated", "koog-update"]
assignees: []
---

## Nueva release de koog: `$CURRENT_VERSION` → `$NEW_VERSION`

### Release notes

<!-- Release notes from JetBrains/koog -->

### Diff entre versiones

https://github.com/JetBrains/koog/compare/$CURRENT_VERSION...$NEW_VERSION

### Qué hacer

1. Revisa las release notes y el diff entre versiones enlazado arriba
2. Actualiza los archivos en `skills/` que reflejen cambios en APIs, features o ejemplos de código
3. Añade nuevos `SKILL.md` si hay features significativas nuevas
4. Marca como obsoletos o elimina skills de features eliminadas
5. Actualiza el archivo `.koog-version` a `$NEW_VERSION`
6. Actualiza el badge de versión en `README.md` (línea `> **Koog version**: ...`)
7. Abre un PR con los cambios

### Directorios clave

| Directorio | Contenido |
|------------|-----------|
| `skills/agents/` | Tipos de agentes, grafos, planners |
| `skills/tools/` | Herramientas, ToolRegistry, llamadas paralelas |
| `skills/features/` | Event handlers, tracing, persistence, OpenTelemetry |
| `skills/getting-started/` | Quickstart, key features, LLM providers |
| `skills/memory-and-rag/` | Chat memory, embeddings, RAG, vector store |
| `skills/integrations/` | MCP, Ktor, Spring Boot, A2A |
| `skills/prompts/` | Prompt DSL, multimodal |
| `skills/strategies/` | Estrategias predefinidas y custom |
| `skills/advanced/` | Structured output, streaming, subgraphs |

---
*Issue generado automáticamente por koog-watcher (CT106)*
