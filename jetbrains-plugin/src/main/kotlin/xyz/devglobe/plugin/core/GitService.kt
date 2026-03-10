package xyz.devglobe.plugin.core

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import java.io.File
import java.util.concurrent.TimeUnit

object GitService {

    private val LOG = Logger.getInstance(GitService::class.java)

    // Repo cache (5 min TTL)
    @Volatile private var cachedRepo: String? = null
    @Volatile private var cachedRepoCwd: String? = null
    @Volatile private var repoFetchedAt = 0L

    /**
     * Returns "owner/repo" for the active file's git remote, or null.
     * Cached for 5 minutes per working directory.
     */
    fun detectRepo(project: Project): String? {
        val cwd = getActiveCwd(project) ?: return null

        if (cwd == cachedRepoCwd && System.currentTimeMillis() - repoFetchedAt < Constants.GIT_CACHE_TTL_MS) {
            return cachedRepo
        }

        val url = exec(listOf("git", "remote", "get-url", "origin"), cwd, 5000)
        if (url == null) {
            cachedRepo = null
            cachedRepoCwd = cwd
            repoFetchedAt = System.currentTimeMillis()
            return null
        }

        // SSH: git@github.com:owner/repo.git
        val sshMatch = Regex("[:/]([^/]+/[^/]+?)(?:\\.git)?$").find(url)
        if (sshMatch != null) {
            cachedRepo = sshMatch.groupValues[1]
            cachedRepoCwd = cwd
            repoFetchedAt = System.currentTimeMillis()
            return cachedRepo
        }

        // HTTPS: https://github.com/owner/repo.git
        try {
            val path = java.net.URI.create(url).path
                .removePrefix("/")
                .removeSuffix(".git")
            if (path.contains("/")) {
                cachedRepo = path
                cachedRepoCwd = cwd
                repoFetchedAt = System.currentTimeMillis()
                return cachedRepo
            }
        } catch (_: Exception) { }

        cachedRepo = null
        cachedRepoCwd = cwd
        repoFetchedAt = System.currentTimeMillis()
        return null
    }

    private fun getActiveCwd(project: Project): String? {
        val editor = FileEditorManager.getInstance(project).selectedTextEditor ?: return null
        val path = editor.virtualFile?.path ?: return null
        return File(path).parent
    }

    private fun exec(cmd: List<String>, cwd: String, timeoutMs: Long): String? {
        return try {
            val process = ProcessBuilder(cmd)
                .directory(File(cwd))
                .redirectErrorStream(true)
                .start()
            val completed = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS)
            if (!completed) {
                process.destroyForcibly()
                return null
            }
            if (process.exitValue() != 0) return null
            process.inputStream.bufferedReader().readText().trim().takeIf { it.isNotEmpty() }
        } catch (e: Exception) {
            null
        }
    }
}
