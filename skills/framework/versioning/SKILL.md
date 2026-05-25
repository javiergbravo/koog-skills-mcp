---
title: "Koog Versioning and Stable/Beta Module Split"
description: "Learn about Koog's versioning scheme, stable and beta module streams, and how to write future-proof code using the 1.0.0 framework."
tags:
  - versioning
  - stable
  - beta
  - modules
  - API stability
  - Kotlin
koog_version: "1.0.0"
difficulty: "Intermediate"
category: "Framework"
---

# Overview

Koog 1.0.0 introduces a stable and beta module split alongside a strict semantic versioning policy to ensure API stability and smooth upgrades. This skill explains how Koog's versioning works, the difference between stable and beta modules, and how you can write production code that pins to stable APIs while experimenting with beta features safely.

The stable modules guarantee no breaking changes without a major version bump, while beta modules allow early access to new features that may evolve. This approach helps teams confidently adopt Koog in production while staying up to date with innovations.

# Key Concepts

- **Semantic Versioning (SemVer):** Koog uses `X.Y.Z` format where:
  - `X` (Major) indicates breaking changes.
  - `Y` (Minor) adds features and may deprecate APIs without breaking existing code.
  - `Z` (Patch) includes bug fixes only.

- **Stable Modules:**
  - APIs are guaranteed not to break without a major version bump.
  - No deprecated APIs remain.
  - Suitable for production code that requires long-term support.

- **Beta Modules:**
  - Contain experimental or evolving APIs.
  - May introduce breaking changes in minor or patch releases.
  - Ideal for early adopters and experimentation.

- **No Deprecated APIs in 1.0:**
  - All previously deprecated APIs have been removed.
  - The 1.0 line provides a clean, stable surface.

# Code Examples

```kotlin
// Import stable module for production use
import com.koog.stable.agent.Agent

fun main() {
    // Use stable Agent API - guaranteed not to break without major version bump
    val agent = Agent.createBlocking()
    val response = agent.runBlocking("Hello, Koog!")
    println(response)
}
```

```kotlin
// Import beta module to try new features
import com.koog.beta.experimental.ExperimentalAgent

fun main() {
    // Beta APIs may change; use with caution
    val experimentalAgent = ExperimentalAgent.create()
    val result = experimentalAgent.run("Testing beta features")
    println(result)
}
```

```kotlin
// Pin dependencies explicitly in build.gradle.kts

dependencies {
    implementation("com.koog:agent-stable:1.0.0") // stable API
    implementation("com.koog:tools-beta:1.0.0-beta01") // beta API
}
```

# Summary

By understanding Koog's versioning and module split:

- You can confidently build production systems on stable modules.
- Experiment safely with beta modules without risking production stability.
- Manage dependencies precisely to control upgrade paths.
- Benefit from a clean, stable API surface with no deprecated methods in 1.0.

This approach ensures your Koog-based applications remain robust and maintainable as the framework evolves.