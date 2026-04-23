---
title: JSON Schema support for Claude 4.5+
description: |
    This skill provides guidance on utilizing JSON Schema support for Claude 4.5+ models across various providers, enabling structured output and enhanced data validation.
tags: [JSON Schema, Claude 4.5, LLM, Data Validation]
koog_version: "0.8.0"
difficulty: Intermediate
category: Models
---

## Overview

With the introduction of JSON Schema support for Claude 4.5+ models, developers can now leverage structured output capabilities to ensure data integrity and facilitate easier integration with other systems. This skill outlines how to implement and utilize JSON Schema in your applications when working with Claude 4.5+ models.

## Code Example

Here’s a simple example demonstrating how to define a JSON Schema for a Claude 4.5+ model and validate the output:

```kt
import com.example.YourClaudeModel
import com.example.JsonSchemaValidator

fun main() {
    val model = YourClaudeModel()
    val output = model.generateOutput()

    val schema = """
    {
        "\$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "age": {
                "type": "integer"
            }
        },
        "required": ["name", "age"]
    }
    """.trimIndent()

    val isValid = JsonSchemaValidator.validate(output, schema)

    if (isValid) {
        println("Output is valid according to the JSON Schema.")
    } else {
        println("Output is invalid according to the JSON Schema.")
    }
}
```

## Key Concepts

- **JSON Schema**: A powerful tool for validating the structure of JSON data. It allows you to define the expected format, types, and required fields for your output.
- **Claude 4.5+ Models**: These models support structured output, making it easier to integrate with other systems and ensuring that the data adheres to predefined formats.
- **Validation**: Using a JSON Schema validator, you can check if the output from your Claude model meets the specified schema requirements, helping to catch errors early in the development process.