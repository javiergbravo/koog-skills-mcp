---
title: Mermaid Diagram Support for Nested Subgraphs
description: This skill demonstrates how to utilize the enhanced Mermaid diagram generator to visualize subgraphs and nested subgraphs within the Koog framework.
tags: [mermaid, diagrams, visualization, subgraphs]
koog_version: "0.8.0"
difficulty: Intermediate
category: Visualization
---

## Overview

With the introduction of Mermaid diagram support for nested subgraphs in Koog v0.8.0, developers can now create more complex visualizations that represent hierarchical relationships and structures. This skill will guide you through the process of implementing and utilizing this feature effectively.

## Code Examples

### Basic Mermaid Diagram

Here’s a simple example of how to create a basic Mermaid diagram:

```kotlin
import ai.koog.visualization.MermaidDiagram

fun createBasicDiagram() {
    val diagram = MermaidDiagram {
        graph TD
        A[Start] --> B[Process]
        B --> C[End]
    }
    diagram.render()
}
```

### Nested Subgraphs

To create a diagram with nested subgraphs, you can structure your Mermaid code as follows:

```kotlin
import ai.koog.visualization.MermaidDiagram

fun createNestedSubgraphDiagram() {
    val diagram = MermaidDiagram {
        graph TD
        subgraph A[Main Process]
            direction TB
            B[Step 1] --> C[Step 2]
            subgraph D[Sub Process]
                direction LR
                E[Sub Step 1] --> F[Sub Step 2]
            end
        end
        C --> G[Final Step]
    }
    diagram.render()
}
```

### Rendering the Diagram

To render the diagram, ensure you have the necessary setup in your application:

```kotlin
fun main() {
    createBasicDiagram()
    createNestedSubgraphDiagram()
}
```

## Key Concepts

- **Mermaid Diagrams**: A tool for generating diagrams and flowcharts using a simple markdown-like syntax.
- **Subgraphs**: A way to group related nodes within a diagram, allowing for better organization and clarity.
- **Nested Subgraphs**: Subgraphs within other subgraphs, enabling complex visual structures to be represented clearly.
- **Rendering**: The process of converting the Mermaid syntax into a visual diagram that can be displayed in your application.

By leveraging these concepts, you can create sophisticated visual representations of processes and data flows, enhancing the clarity and effectiveness of your applications.