package xyz.devglobe.plugin.auth

import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.generateServiceName
import com.intellij.ide.passwordSafe.PasswordSafe

object ApiKeyStorage {

    private val attributes = CredentialAttributes(
        generateServiceName("DevGlobe", "apiKey")
    )

    fun get(): String? =
        PasswordSafe.instance.getPassword(attributes)?.takeIf { it.isNotBlank() }

    fun set(key: String) {
        PasswordSafe.instance.setPassword(attributes, key)
    }

    fun clear() {
        PasswordSafe.instance.setPassword(attributes, null)
    }
}
