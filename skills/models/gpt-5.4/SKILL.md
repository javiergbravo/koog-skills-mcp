---
title: Support for GPT-5.4Mini and GPT-5.4Nano models
description: This skill provides guidance on utilizing the GPT-5.4Mini and GPT-5.4Nano models within the Koog Kotlin AI framework.
tags: [gpt, models, ai, koog]
koog_version: "0.8.0"
difficulty: Intermediate
category: Models
---

## Overview
The Koog Kotlin AI framework now supports the latest GPT-5.4Mini and GPT-5.4Nano models, enabling developers to leverage advanced language generation capabilities in their applications. This skill outlines how to integrate and utilize these models effectively.

## Code Examples

### Basic Usage
To use the GPT-5.4Mini model, you can initialize the `LLMClient` as follows:

```kotlin
import com.koog.llm.LLMClient
import com.koog.llm.models.GPT5_4Mini

fun main() {
    val client = LLMClient(GPT5_4Mini)
    val response = client.generate("What are the benefits of using AI in healthcare?")
    println(response)
}
```

### Using GPT-5.4Nano
For the GPT-5.4Nano model, the initialization is similar:

```kotlin
import com.koog.llm.LLMClient
import com.koog.llm.models.GPT5_4Nano

fun main() {
    val client = LLMClient(GPT5_4Nano)
    val response = client.generate("Explain quantum computing in simple terms.")
    println(response)
}
```

### Customizing Parameters
You can customize the generation parameters for more control over the output:

```kotlin
val parameters = mapOf("temperature" to 0.7, "max_tokens" to 150)
val response = client.generate("Tell me a joke.", parameters)
println(response)
```

## Key Concepts

- **Model Selection**: Choose between GPT-5.4Mini and GPT-5.4Nano based on your application's requirements for performance and output quality.
- **LLMClient**: The primary interface for interacting with the models. It allows for generating text based on prompts and customizable parameters.
- **Parameters**: Adjusting parameters like temperature and max tokens can significantly influence the style and length of the generated text.
- **Integration**: The new models can be seamlessly integrated into existing applications, enhancing their capabilities with state-of-the-art language processing.