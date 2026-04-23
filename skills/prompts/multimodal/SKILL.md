---
name: multimodal-prompts
description: Send images, documents, and audio in prompts with Koog's multimodal content support
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [multimodal, image, document, audio, attachment, file, media]
---

# Multimodal Prompts

Send images, audio, video, and files to LLMs within `user` messages. Koog supports two approaches: auto-configured attachments and custom-configured attachments.

## Supported Media Types

| Function | Media Type | Supported Formats |
|----------|-----------|-------------------|
| `image()` | Images | JPG, PNG, WebP, GIF |
| `audio()` | Audio | MP3, WAV, FLAC |
| `video()` | Video | MP4, AVI, MOV |
| `file()` / `binaryFile()` / `textFile()` | Documents | PDF, TXT, MD, etc. |

> **Note**: Multimodal content support varies by LLM provider. Check individual provider documentation.

## Auto-Configured Attachments

Pass a URL or file path, and Koog automatically constructs the attachment parameters based on the file extension.

### Kotlin — Images

```kotlin
import ai.koog.prompt.dsl.prompt

// From file path
val imagePrompt = prompt("image-analysis") {
    system("You are an image analysis assistant.")
    user {
        text("What's in this image?")
        image(Path("/path/to/photo.jpg"))
    }
}

// From URL
val urlPrompt = prompt("url-image") {
    user {
        text("What's in this image?")
        image("https://example.com/photo.jpg")
    }
}
```

### Kotlin — Audio

```kotlin
val audioPrompt = prompt("audio-transcription") {
    system("Transcribe the following audio.")
    user {
        text("Please transcribe this:")
        audio(Path("/path/to/recording.mp3"))
    }
}
```

### Kotlin — Video

```kotlin
val videoPrompt = prompt("video-analysis") {
    system("Analyze the content of this video.")
    user {
        text("What happens in this video?")
        video(Path("/path/to/clip.mp4"))
    }
}
```

### Kotlin — Files

```kotlin
val filePrompt = prompt("document-analysis") {
    user {
        text("Summarize this document:")
        binaryFile(Path("/path/to/report.pdf"), mimeType = "application/pdf")
    }
}

val textFilePrompt = prompt("code-review") {
    user {
        text("Review this code:")
        textFile(Path("/path/to/code.kt"))
    }
}
```

### Java

```java
import ai.koog.prompt.dsl.Prompt;
import ai.koog.prompt.dsl.ContentPartsBuilder;

var imagePrompt = Prompt.builder("image-analysis")
    .system("You are an image analysis assistant.")
    .user(ContentPartsBuilder.create()
        .text("What's in this image?")
        .image(Path.of("/path/to/photo.jpg"))
        .build())
    .build();
```

## Custom-Configured Attachments

The `ContentPart` interface allows fine-grained control over attachments:

### ContentPart Types

| Class | Purpose |
|-------|---------|
| `ContentPart.Image` | Image attachments (JPG, PNG) |
| `ContentPart.Audio` | Audio attachments (MP3, WAV) |
| `ContentPart.Video` | Video attachments (MP4, AVI) |
| `ContentPart.File` | File attachments (PDF, TXT) |

### Attachment Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `content` | `AttachmentContent` | Yes | Source of file content |
| `format` | `String` | Yes | e.g., `"png"`, `"mp3"` |
| `mimeType` | `String` | Only for `ContentPart.File` | Defaults to `<type>/<format>` for image/audio/video |
| `fileName` | `String?` | No | File name with extension |

### AttachmentContent Sources

| Type | Description |
|------|-------------|
| `AttachmentContent.URL` | Content referenced by URL |
| `AttachmentContent.Binary.Bytes` | Content as a byte array |
| `AttachmentContent.Binary.Base64` | Content as a Base64-encoded string |
| `AttachmentContent.PlainText` | Content as plain text (for `ContentPart.File` only) |

### Example — Custom Image Attachment

```kotlin
import ai.koog.prompt.message.ContentPart
import ai.koog.prompt.message.AttachmentContent

val customImagePrompt = prompt("custom-image") {
    user {
        text("Analyze this image:")
        attachment(
            ContentPart.Image(
                content = AttachmentContent.Binary.Bytes(imageBytes),
                format = "png",
                fileName = "screenshot.png"
            )
        )
    }
}
```

### Example — Base64 Image

```kotlin
val base64Image = java.util.Base64.getEncoder().encodeToString(imageBytes)

val base64Prompt = prompt("base64-image") {
    user {
        text("Describe this image:")
        attachment(
            ContentPart.Image(
                content = AttachmentContent.Binary.Base64(base64Image),
                format = "png"
            )
        )
    }
}
```

## Mixed Attachments

Combine multiple attachment types in a single `user` message:

```kotlin
val mixedPrompt = prompt("mixed-content") {
    system("You are a document analysis assistant.")
    user {
        text("Analyze the following:")
        text("1. This screenshot:")
        image(Path("/path/to/screenshot.png"))
        text("2. And this PDF report:")
        binaryFile(Path("/path/to/report.pdf"), mimeType = "application/pdf")
    }
}
```

### Java — Mixed Attachments

```java
var mixedPrompt = Prompt.builder("mixed-content")
    .system("You are a document analysis assistant.")
    .user(List.of(
        new ContentPart.Text("Analyze the following:"),
        new ContentPart.Text("1. This screenshot:"),
        new ContentPart.Image(
            new AttachmentContent.Binary.Bytes(imageBytes),
            "png", null, "screenshot.png"
        ),
        new ContentPart.Text("2. And this PDF report:"),
        new ContentPart.File(
            new AttachmentContent.Binary.Bytes(pdfBytes),
            "pdf", "application/pdf", "report.pdf"
        )
    ))
    .build();
```

## Multiple Images

```kotlin
val comparePrompt = prompt("compare-images") {
    system("Compare the following images and describe the differences.")
    user {
        text("Image 1:")
        image(Path("/path/to/before.png"))
        text("Image 2:")
        image(Path("/path/to/after.png"))
        text("What changed between these images?")
    }
}
```

## Provider-Specific Notes

| Provider | Images | Audio | Video | Documents |
|----------|--------|-------|-------|-----------|
| OpenAI | GPT-4o, GPT-4o-mini | GPT-4o-audio | — | GPT-4o (PDF) |
| Anthropic | Claude Sonnet 4, Opus 4.1 | — | — | Claude (PDF) |
| Google | Gemini 2.5 Pro, Flash | Gemini | Gemini | Gemini |

## Best Practices

1. **Image size**: Resize large images to reduce token usage
2. **Format**: Use JPEG for photos, PNG for screenshots/diagrams
3. **Resolution**: Higher resolution for OCR tasks, lower for general description
4. **Batch**: Combine related images in one prompt for comparison
5. **Error handling**: Handle unsupported formats gracefully
6. **MIME types**: Always specify MIME types for `ContentPart.File` attachments

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Image not recognized | Check MIME type; ensure format matches content |
| Token limit exceeded | Reduce image resolution or number of attachments |
| Provider rejects attachment | Check provider-specific multimodal support |
| Base64 decoding error | Ensure the Base64 string is valid and complete |
| File not found | Verify file path is absolute and file exists |
