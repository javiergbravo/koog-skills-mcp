---
title: DataDog LLM Observability Integration
description: Integrate DataDog LLM Observability into your Kotlin applications to enhance monitoring and performance tracking of language model interactions.
tags: [DataDog, LLM, Observability, Integration]
koog_version: "0.8.0"
difficulty: Intermediate
category: Integrations
---

## Overview

The DataDog LLM Observability integration allows developers to monitor and analyze the performance of language model interactions within their applications. By leveraging DataDog's observability features, you can gain insights into response times, error rates, and other critical metrics, enabling you to optimize your AI-driven solutions effectively.

## Code Examples

### Setting Up DataDog LLM Observability

To begin using DataDog LLM Observability, you need to configure the necessary components in your Kotlin application. Below is an example of how to set up the integration.

```kotlin
import ai.koog.observability.datadog.DataDogLLMObservability
import ai.koog.prompt.llm.LLModel
import ai.koog.prompt.executor.model.PromptExecutor

fun main() {
    // Initialize DataDog Observability
    val dataDogObservability = DataDogLLMObservability("YOUR_DATADOG_API_KEY")

    // Create your language model
    val model: LLModel = // Initialize your LLM model here

    // Create a prompt executor
    val promptExecutor: PromptExecutor = // Initialize your prompt executor here

    // Use the observability wrapper around your model
    val observabilityModel = dataDogObservability.wrap(model)

    // Execute a prompt and observe metrics
    val response = observabilityModel.execute("What is the weather today?")
    println(response)
}
```

### Monitoring Metrics

Once you have set up the integration, you can monitor various metrics related to your language model's performance. DataDog provides a dashboard where you can visualize metrics such as:

- Response times
- Error rates
- Request counts

You can customize your monitoring setup to focus on the metrics that matter most to your application.

## Key Concepts

- **DataDog Integration**: This integration allows you to send observability data to DataDog, enabling performance tracking and monitoring of language model interactions.
- **Response Metadata**: The integration captures response metadata, which includes information about the execution time and any errors encountered during the interaction with the language model.
- **Metrics Visualization**: DataDog provides powerful visualization tools to help you analyze the performance of your language models and make informed decisions based on the data collected.

By utilizing the DataDog LLM Observability integration, you can enhance the reliability and performance of your AI applications, ensuring a better experience for your users.