---
name: memory-encryption
description: Secure agent memory storage with Koog's EncryptedStorage and Aes256GCMEncryptor for AES-256-GCM encryption
compatibility: "Koog 0.8.0"
license: Apache-2.0
keywords: [encryption, aes, gcm, secure-storage, encrypted, memory-security]
---

# Memory Encryption

Secure agent memory storage at rest using AES-256-GCM encryption with Koog's `EncryptedStorage` and `Aes256GCMEncryptor`. Essential when agents handle sensitive data like personal information, credentials, or confidential business data.

## Key Components

| Component | Purpose |
|-----------|---------|
| `EncryptedStorage` | Wraps a filesystem provider with an encryption layer |
| `Aes256GCMEncryptor` | AES-256-GCM encryption/decryption implementation |
| `JVMFileSystemProvider.ReadWrite` | File system access for JVM platforms |

## Setup

### Basic Configuration

```kotlin
import ai.koog.agents.memory.storage.EncryptedStorage
import ai.koog.agents.memory.storage.Aes256GCMEncryptor
import ai.koog.agents.storage.filesystem.JVMFileSystemProvider

// Create the encryptor with a secret key
val encryptor = Aes256GCMEncryptor(
    secretKey = System.getenv("MEMORY_ENCRYPTION_KEY")
)

// Create encrypted filesystem provider
val encryptedFs = EncryptedStorage(
    fsProvider = JVMFileSystemProvider.ReadWrite,
    encryptor = encryptor
)
```

### Integration with AgentMemory

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.memory.feature.AgentMemory
import ai.koog.agents.memory.providers.LocalFileMemoryProvider
import ai.koog.agents.memory.config.LocalMemoryConfig
import ai.koog.agents.memory.storage.SimpleStorage
import ai.koog.agents.memory.storage.EncryptedStorage
import ai.koog.agents.memory.storage.Aes256GCMEncryptor
import ai.koog.agents.storage.filesystem.JVMFileSystemProvider

// 1. Set up encryption
val encryptionKey = System.getenv("MEMORY_ENCRYPTION_KEY")
    ?: throw IllegalStateException("MEMORY_ENCRYPTION_KEY not set")

val encryptor = Aes256GCMEncryptor(secretKey = encryptionKey)

val encryptedFs = EncryptedStorage(
    fsProvider = JVMFileSystemProvider.ReadWrite,
    encryptor = encryptor
)

// 2. Create memory provider with encryption
val memoryProvider = LocalFileMemoryProvider(
    config = LocalMemoryConfig(),
    storage = SimpleStorage(),
    fsProvider = encryptedFs,
    root = Path("/var/lib/myapp/agent-memory")
)

// 3. Configure agent with encrypted memory
val agent = AIAgent(
    promptExecutor = simpleOpenAIExecutor(apiKey),
    llmModel = OpenAIModels.Chat.GPT4o,
    systemPrompt = "You are a customer support agent."
) {
    install(AgentMemory) {
        this.memoryProvider = memoryProvider
        agentName = "customer-support"
        featureName = "secure-memory"
        organizationName = "my-company"
        productName = "my-product"
    }
}
```

## Encryption Details

| Property | Value |
|----------|-------|
| **Algorithm** | AES-256-GCM (Galois/Counter Mode) |
| **Key size** | 256 bits |
| **IV** | Generated randomly per encryption operation |
| **Authentication** | Built-in via GCM mode (detects tampering) |
| **Format** | `IV (12 bytes) + Ciphertext + Auth Tag (16 bytes)` |

## Key Management

### Environment Variable (Recommended)

```kotlin
val key = System.getenv("MEMORY_ENCRYPTION_KEY")
    ?: throw IllegalStateException("Encryption key not configured")

val encryptor = Aes256GCMEncryptor(secretKey = key)
```

### From Configuration File

```kotlin
val key = config.property("memory.encryption.key").getString()
// Ensure the config file itself is protected (restricted permissions, not committed to VCS)
val encryptor = Aes256GCMEncryptor(secretKey = key)
```

### Key Derivation from Password

For scenarios where a password is more practical than a raw key:

```kotlin
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import java.security.SecureRandom
import java.util.Base64

/**
 * Derives a 256-bit AES key from a password using PBKDF2-HMAC-SHA256.
 *
 * IMPORTANT: The returned [salt] must be stored alongside the encrypted data.
 * You need the same salt to re-derive the key for decryption. If you lose the
 * salt, decryption becomes impossible.
 */
data class DerivedKey(val encodedKey: String, val salt: ByteArray)

fun deriveKey(password: String, salt: ByteArray = SecureRandom().generateSeed(32)): DerivedKey {
    // 600,000 iterations — meets NIST SP 800-132 (2023) recommendation for PBKDF2-HMAC-SHA256
    val spec = PBEKeySpec(password.toCharArray(), salt, 600_000, 256)
    val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
    val keyBytes = factory.generateSecret(spec).encoded
    return DerivedKey(encodedKey = Base64.getEncoder().encodeToString(keyBytes), salt = salt)
}

// First run — derive and persist the salt alongside encrypted data
val derived = deriveKey("my-secure-password")
persistSalt(derived.salt) // store derived.salt in a secure location
val encryptor = Aes256GCMEncryptor(secretKey = derived.encodedKey)

// Subsequent runs — re-derive using the persisted salt
val storedSalt = loadSalt()
val reDerived = deriveKey("my-secure-password", salt = storedSalt)
val encryptorForDecryption = Aes256GCMEncryptor(secretKey = reDerived.encodedKey)
```

## Complete Example with LongTermMemory

```kotlin
import ai.koog.agents.core.agent.AIAgent
import ai.koog.agents.features.memory.LongTermMemory
import ai.koog.agents.memory.storage.EncryptedStorage
import ai.koog.agents.memory.storage.Aes256GCMEncryptor
import ai.koog.agents.storage.filesystem.JVMFileSystemProvider

@OptIn(ExperimentalAgentsApi::class)
suspend fun main() {
    val encryptor = Aes256GCMEncryptor(
        secretKey = System.getenv("MEMORY_ENCRYPTION_KEY")
    )

    val encryptedFs = EncryptedStorage(
        fsProvider = JVMFileSystemProvider.ReadWrite,
        encryptor = encryptor
    )

    // Use encrypted storage with LongTermMemory
    val storage = MyEncryptedVectorStorage(encryptedFs)

    val agent = AIAgent(
        promptExecutor = simpleOpenAIExecutor(apiKey),
        llmModel = OpenAIModels.Chat.GPT4o,
        systemPrompt = "You are a secure assistant."
    ) {
        install(LongTermMemory) {
            retrieval {
                this.storage = storage
            }
            ingestion {
                this.storage = storage
            }
        }
    }

    agent.run("Store my API key securely")
}
```

## Security Best Practices

1. **Never hardcode keys**: Use environment variables or secret management systems
2. **Rotate keys**: Implement key rotation for long-running deployments
3. **Secure key storage**: Use HSMs or cloud KMS (AWS KMS, Azure Key Vault) in production
4. **Access control**: Restrict file permissions on memory storage directories
5. **Audit logging**: Log memory access for sensitive applications
6. **Backup encryption**: Encrypt backups of memory storage
7. **Key length**: Always use 256-bit keys for AES-256-GCM

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `InvalidKeyException` | Ensure the key is exactly 256 bits (32 bytes) |
| `AEADBadTagException` | Data was tampered with or key is wrong |
| Decryption fails after key rotation | Re-encrypt data with the new key |
| Performance overhead | AES-256-GCM has minimal overhead; check for other bottlenecks |
| File permissions errors | Ensure the process has read/write access to the storage directory |
