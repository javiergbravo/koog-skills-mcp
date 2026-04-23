---
name: opentelemetry
description: Monitor AI agents with Koog's OpenTelemetry integration including Langfuse, Weave, and Datadog exporters
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [opentelemetry, langfuse, weave, datadog, monitoring, observability, exporter]
---

# OpenTelemetry Integration

Koog's OpenTelemetry integration provides comprehensive monitoring and observability for AI agents. It supports multiple exporters including Langfuse, W&B Weave, and Datadog for tracking metrics, traces, and agent behavior.

## Overview

OpenTelemetry integration enables:

- **Distributed tracing** — Track agent execution across services
- **Metrics collection** — Monitor performance, costs, and usage
- **Log aggregation** — Centralized logging with context
- **Export to multiple backends** — Langfuse, Weave, Datadog, and more
- **Custom spans and attributes** — Add business-specific telemetry

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("ai.koog:koog-agents:0.8.0")
    implementation("ai.koog:agents-features-opentelemetry:0.8.0")

    // Exporter-specific dependencies
    implementation("io.opentelemetry:opentelemetry-exporter-otlp:1.46.0")
    implementation("io.opentelemetry:opentelemetry-sdk:1.46.0")
}
```

## Basic Setup

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.features.opentelemetry.OpenTelemetry
import ai.koog.agents.ext.llm.OpenAIModels
import ai.koog.agents.ext.simple.simpleOpenAIExecutor

val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o
) {
    install(OpenTelemetry) {
        // Configure the OTLP endpoint
        endpoint = "http://localhost:4317"

        // Enable specific signals
        tracesEnabled = true
        metricsEnabled = true
        logsEnabled = true
    }
}
```

## Langfuse Exporter

Langfuse provides LLM-specific observability and analytics.

### Configuration

```kotlin
import ai.koog.agents.features.opentelemetry.OpenTelemetry
import ai.koog.agents.features.opentelemetry.exporters.LangfuseExporter

install(OpenTelemetry) {
    exporter = LangfuseExporter(
        publicKey = System.getenv("LANGFUSE_PUBLIC_KEY"),
        secretKey = System.getenv("LANGFUSE_SECRET_KEY"),
        host = "https://cloud.langfuse.com" // or self-hosted URL
    )

    // Langfuse-specific options
    traceName = "my-agent-trace"
    sessionId = "session-123"
    userId = "user-456"
}
```

### Langfuse Features

```kotlin
install(OpenTelemetry) {
    exporter = LangfuseExporter(
        publicKey = System.getenv("LANGFUSE_PUBLIC_KEY"),
        secretKey = System.getenv("LANGFUSE_SECRET_KEY")
    )

    // Track costs
    trackCosts = true

    // Track token usage
    trackTokenUsage = true

    // Custom metadata
    metadata = mapOf(
        "environment" to "production",
        "version" to "1.0.0",
        "feature" to "chat"
    )
}
```

### Langfuse Dashboard

After configuration, view traces at:
- **Traces** — Individual agent executions
- **Sessions** — Grouped conversations
- **Scores** — Quality metrics and evaluations
- **Models** — Cost and performance by model

## W&B Weave Exporter

Weights & Biases Weave provides experiment tracking and model evaluation.

### Configuration

```kotlin
import ai.koog.agents.features.opentelemetry.OpenTelemetry
import ai.koog.agents.features.opentelemetry.exporters.WeaveExporter

install(OpenTelemetry) {
    exporter = WeaveExporter(
        apiKey = System.getenv("WANDB_API_KEY"),
        entity = "my-team",
        project = "my-agent-project"
    )

    // Weave-specific options
    trackArtifacts = true
    trackMetrics = true
}
```

### Weave Features

```kotlin
install(OpenTelemetry) {
    exporter = WeaveExporter(
        apiKey = System.getenv("WANDB_API_KEY"),
        entity = "my-team",
        project = "my-agent-project"
    )

    // Log custom metrics
    customMetrics = mapOf(
        "accuracy" to 0.95,
        "latency_p99" to 250.0,
        "cost_per_query" to 0.003
    )

    // Track model versions
    modelVersion = "gpt-4o-2024-08-06"
}
```

## Datadog Exporter

Datadog provides infrastructure monitoring with LLM observability.

### Configuration

```kotlin
import ai.koog.agents.features.opentelemetry.OpenTelemetry
import ai.koog.agents.features.opentelemetry.exporters.DatadogExporter

install(OpenTelemetry) {
    exporter = DatadogExporter(
        apiKey = System.getenv("DD_API_KEY"),
        site = "datadoghq.com", // or datadoghq.eu
        serviceName = "my-koog-agent"
    )

    // Datadog-specific options
    environment = "production"
    version = "1.0.0"
}
```

### Datadog Features

```kotlin
install(OpenTelemetry) {
    exporter = DatadogExporter(
        apiKey = System.getenv("DD_API_KEY"),
        site = "datadoghq.com",
        serviceName = "my-koog-agent"
    )

    // Custom tags
    tags = mapOf(
        "team" to "ai-platform",
        "model" to "gpt-4o",
        "region" to "us-east-1"
    )

    // Enable LLMOps integration
    llmObsEnabled = true
}
```

## OTLP Exporter (Generic)

Use the standard OTLP exporter for any OpenTelemetry-compatible backend.

### Configuration

```kotlin
import ai.koog.agents.features.opentelemetry.OpenTelemetry
import ai.koog.agents.features.opentelemetry.exporters.OtlpExporter

install(OpenTelemetry) {
    exporter = OtlpExporter(
        endpoint = "http://localhost:4317",
        protocol = OtlpProtocol.GRPC // or HTTP
    )

    // Authentication
    headers = mapOf(
        "Authorization" to "Bearer ${System.getenv("OTEL_TOKEN")}"
    )
}
```

### With Jaeger

```kotlin
install(OpenTelemetry) {
    exporter = OtlpExporter(
        endpoint = "http://localhost:14268/api/traces",
        protocol = OtlpProtocol.HTTP
    )
}
```

### With Grafana Tempo

```kotlin
install(OpenTelemetry) {
    exporter = OtlpExporter(
        endpoint = "http://localhost:4317",
        protocol = OtlpProtocol.GRPC,
        headers = mapOf(
            "Authorization" to "Bearer ${System.getenv("TEMPO_TOKEN")}"
        )
    )
}
```

## Metrics and Traces

### Custom Metrics

```kotlin
install(OpenTelemetry) {
    // Define custom metrics
    customMetrics = listOf(
        MetricDefinition(
            name = "agent.task.duration",
            type = MetricType.HISTOGRAM,
            description = "Duration of agent tasks",
            unit = "ms"
        ),
        MetricDefinition(
            name = "agent.token.usage",
            type = MetricType.COUNTER,
            description = "Total tokens used",
            unit = "tokens"
        ),
        MetricDefinition(
            name = "agent.cost.total",
            type = MetricType.COUNTER,
            description = "Total cost in USD",
            unit = "usd"
        )
    )
}
```

### Custom Spans

```kotlin
import ai.koog.agents.features.opentelemetry.span

// Add custom spans to the trace
agent.withSpan("custom-operation") { span ->
    span.setAttribute("operation.type", "data-processing")
    span.setAttribute("input.size", inputData.size)

    val result = processData(inputData)

    span.setAttribute("output.size", result.size)
    result
}
```

### Custom Attributes

```kotlin
install(OpenTelemetry) {
    // Global attributes
    attributes = mapOf(
        "service.name" to "my-koog-agent",
        "service.version" to "1.0.0",
        "deployment.environment" to "production"
    )

    // Per-request attributes
    onRequestAttributes { request ->
        mapOf(
            "request.id" to request.id,
            "user.id" to request.userId
        )
    }
}
```

## Multi-Backend Configuration

Export to multiple backends simultaneously:

```kotlin
install(OpenTelemetry) {
    exporters = listOf(
        LangfuseExporter(
            publicKey = System.getenv("LANGFUSE_PUBLIC_KEY"),
            secretKey = System.getenv("LANGFUSE_SECRET_KEY")
        ),
        DatadogExporter(
            apiKey = System.getenv("DD_API_KEY"),
            site = "datadoghq.com",
            serviceName = "my-koog-agent"
        ),
        OtlpExporter(
            endpoint = "http://localhost:4317",
            protocol = OtlpProtocol.GRPC
        )
    )
}
```

## Environment Variables

Configure via environment variables:

```bash
# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=my-koog-agent
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0

# Langfuse
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# W&B Weave
WANDB_API_KEY=...
WANDB_ENTITY=my-team
WANDB_PROJECT=my-agent-project

# Datadog
DD_API_KEY=...
DD_SITE=datadoghq.com
DD_SERVICE=my-koog-agent
```

## Java API

```java
import ai.koog.agents.features.opentelemetry.OpenTelemetry;
import ai.koog.agents.features.opentelemetry.exporters.LangfuseExporter;

var agent = AIAgent.builder(executor, model)
    .withFeature(OpenTelemetry.INSTANCE, config -> {
        config.setExporter(new LangfuseExporter(
            System.getenv("LANGFUSE_PUBLIC_KEY"),
            System.getenv("LANGFUSE_SECRET_KEY"),
            "https://cloud.langfuse.com"
        ));
        config.setTracesEnabled(true);
        config.setMetricsEnabled(true);
        return null;
    })
    .build();
```

## Best Practices

1. **Use environment variables** — Never hardcode API keys or endpoints
2. **Enable sampling** — Use sampling to reduce costs in high-volume scenarios
3. **Add context** — Include session IDs, user IDs, and custom metadata
4. **Monitor costs** — Track token usage and costs in your observability platform
5. **Set up alerts** — Configure alerts for errors, latency spikes, and cost thresholds
6. **Test exporters** — Verify exporters work correctly before deploying to production

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No traces appearing | Check endpoint URL and network connectivity |
| Authentication failed | Verify API keys and tokens are correct |
| Missing metrics | Ensure `metricsEnabled = true` in configuration |
| High latency | Enable sampling or reduce trace verbosity |
| Export errors | Check exporter logs for specific error messages |
