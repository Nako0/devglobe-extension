package xyz.devglobe.plugin.core

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.util.messages.MessageBusConnection
import java.io.File
import java.util.concurrent.TimeUnit

object GitService {

    private val LOG = Logger.getInstance(GitService::class.java)

    // Repo cache (5 min TTL)
    private var cachedRepo: String? = null
    private var cachedRepoCwd: String? = null
    private var repoFetchedAt = 0L

    // File watcher state (tracks remote refs — only pushed commits count)
    @Volatile private var lastRemoteHash: String? = null
    @Volatile private var pendingStats: Pair<Int, Int>? = null
    private var watchedGitDir: String? = null
    private var watchedCwd: String? = null
    private var watchRequest: LocalFileSystem.WatchRequest? = null
    private var vfsConnection: MessageBusConnection? = null

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

    /**
     * Returns total insertions/deletions from the last 24h of pushed commits,
     * but only when a push is detected via file watcher on remote refs.
     * Sets up the file watcher on first call.
     */
    fun getCommitStats(project: Project): Pair<Int, Int>? {
        val cwd = getActiveCwd(project) ?: return null

        // Ensure file watcher is set up for this repo
        setupWatch(cwd)

        // If the watcher already detected a push, return the pending stats
        val stats = pendingStats
        if (stats != null) {
            pendingStats = null
            return stats
        }

        // First call: initialize remote hash and return initial stats
        if (lastRemoteHash == null) {
            val remoteHash = exec(listOf("git", "log", "--remotes=origin", "-1", "--format=%H"), cwd, 5000) ?: return null
            lastRemoteHash = remoteHash
            return fetchStatsForCwd(cwd)
        }

        return null
    }

    /** Disposes the file watcher. Call on plugin/tracker shutdown. */
    fun disposeWatcher() {
        stopWatch()
    }

    // -------------------------------------------------------------------------
    // File watcher (IntelliJ VFS — native, recursive)
    // -------------------------------------------------------------------------

    private fun findGitDir(cwd: String): String? {
        val result = exec(listOf("git", "rev-parse", "--git-dir"), cwd, 5000) ?: return null
        val dir = File(result)
        return if (dir.isAbsolute) result else File(cwd, result).canonicalPath
    }

    private fun setupWatch(cwd: String) {
        val gitDir = findGitDir(cwd) ?: return
        if (gitDir == watchedGitDir) return

        stopWatch()
        watchedGitDir = gitDir
        watchedCwd = cwd
        lastRemoteHash = null

        // Watch refs/remotes/origin/ recursively — updated on git push / git fetch
        val refsPath = "$gitDir/refs/remotes/origin"
        val refsDir = File(refsPath)
        if (!refsDir.isDirectory) return

        // Register the path with IntelliJ's native file watcher (recursive = true)
        watchRequest = LocalFileSystem.getInstance().addRootToWatch(refsPath, true)

        // Subscribe to VFS change events to react when remote refs are updated
        vfsConnection = ApplicationManager.getApplication().messageBus.connect()
        vfsConnection?.subscribe(VirtualFileManager.VFS_CHANGES, object : BulkFileListener {
            override fun after(events: List<VFileEvent>) {
                val prefix = "$refsPath/"
                if (events.any { it.path.startsWith(prefix) || it.path == refsPath }) {
                    onRefChange()
                }
            }
        })

        // Ensure IntelliJ's VFS knows about this directory
        LocalFileSystem.getInstance().refreshAndFindFileByPath(refsPath)
    }

    private fun stopWatch() {
        vfsConnection?.disconnect()
        vfsConnection = null
        watchRequest?.let { LocalFileSystem.getInstance().removeWatchedRoot(it) }
        watchRequest = null
        watchedGitDir = null
        watchedCwd = null
    }

    private fun onRefChange() {
        val cwd = watchedCwd ?: return
        val remoteHash = exec(listOf("git", "log", "--remotes=origin", "-1", "--format=%H"), cwd, 5000)
        if (remoteHash == null || remoteHash == lastRemoteHash) return
        lastRemoteHash = remoteHash
        LOG.debug("Push detected via file watcher")
        pendingStats = fetchStatsForCwd(cwd)
    }

    // -------------------------------------------------------------------------
    // Stats & helpers
    // -------------------------------------------------------------------------

    /** Fetches 24h commit stats from pushed commits only. */
    private fun fetchStatsForCwd(cwd: String): Pair<Int, Int> {
        val out = exec(
            listOf("git", "log", "--remotes=origin", "--since=24 hours ago", "--shortstat", "--format="),
            cwd, 10000
        ) ?: return 0 to 0

        var totalIns = 0
        var totalDel = 0
        for (line in out.lines()) {
            Regex("(\\d+) insertion").find(line)?.let { totalIns += it.groupValues[1].toInt() }
            Regex("(\\d+) deletion").find(line)?.let { totalDel += it.groupValues[1].toInt() }
        }

        LOG.debug("Commit stats (24h): +$totalIns -$totalDel")
        return totalIns to totalDel
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
