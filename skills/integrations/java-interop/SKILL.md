---
name: java-interop
title: Using Koog's Redesigned Java Interop Layer and Blocking APIs
description: Learn how to use Koog's redesigned Java interop layer introduced in version 1.0.0, including uniform blocking APIs and deadlock-free reentrant calls.
tags: [java, interop, blocking, concurrency, kotlin, kotlin-multiplatform]
koog_version: "1.0.0"
difficulty: intermediate
category: integrations
---

# Overview

Koog 1.0.0 introduces a redesigned Java interop layer that simplifies calling Koog APIs from Java and improves concurrency behavior. This skill covers the new uniform blocking API pattern, how to use the Java-friendly blocking methods, and the deadlock-free reentrant call mechanism that prevents common concurrency pitfalls in single-threaded executors.

The redesign removes explicit `ExecutorService` or `Executor` parameters from Java-facing APIs, instead relying on the agent's configured dispatcher. This leads to cleaner Java code and safer interop with Kotlin coroutines.

# Key Concepts

- **Uniform blocking API**: Kotlin APIs expose `xxxBlocking` methods, while Java calls the plain `xxx` methods. This pattern standardizes how blocking calls are made from Java and Kotlin.
- **No explicit executor parameters**: Java methods no longer require passing executors; the agent's dispatcher handles execution context internally.
- **Deadlock-free reentrant calls**: Kotlin → Java → Kotlin call chains on single-threaded executors detect reentrancy and skip dispatching to avoid deadlocks.
- **Stable API surface**: All deprecated APIs have been removed in 1.0.0, ensuring a stable and consistent interop experience.

# Kotlin Examples

```kotlin
import com.koog.ai.agent.AIAgent

fun main() {
    // Create an agent instance (Kotlin)
    val agent = AIAgent {
        // agent configuration here
    }

    // Use the blocking API in Kotlin
    val result = agent.runBlocking {
        // suspend function body
        "Hello from Kotlin blocking call"
    }

    println(result)
}
```

```kotlin
import com.koog.ai.agent.AIAgent

suspend fun callAgent(agent: AIAgent) {
    // Normal suspend call in Kotlin
    val response = agent.run {
        // suspend function body
        "Hello from Kotlin suspend call"
    }
    println(response)
}
```

# Java Usage Example

```java
import com.koog.ai.agent.AIAgent;

public class JavaInteropExample {
    public static void main(String[] args) {
        // Build the agent using the builder pattern
        AIAgent agent = AIAgent.builder()
            // configure agent here
            .build();

        // Call the blocking method from Java (no executor needed)
        String result = agent.run();

        System.out.println(result);
    }
}
```

# Deadlock-Free Reentrant Calls

The redesigned interop layer detects when a Kotlin → Java → Kotlin call chain happens on a single-threaded executor and avoids dispatching again, preventing deadlocks that previously occurred in such scenarios.

This means you can safely call Java APIs from Kotlin coroutines and vice versa without worrying about thread starvation or deadlocks caused by reentrant dispatch.

# Summary

- Use `xxxBlocking` methods in Kotlin for blocking calls.
- Call plain `xxx` methods from Java; no executor parameters needed.
- The agent's dispatcher manages execution context internally.
- Deadlock-free reentrant calls improve concurrency safety.
- APIs are stable and free of deprecated methods in Koog 1.0.0.

For more detailed Java interop patterns and examples, see the `add-java-code-snippets-in-docs` skill and Koog documentation.