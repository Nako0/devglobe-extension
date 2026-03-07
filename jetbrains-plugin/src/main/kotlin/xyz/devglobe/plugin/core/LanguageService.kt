package xyz.devglobe.plugin.core

import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.wm.WindowManager

object LanguageService {

    /**
     * Returns the display name of the language in the currently focused editor,
     * or null if no editor is open.
     *
     * JetBrains provides human-readable file type names natively
     * (e.g. "Kotlin", "TypeScript", "Python"), so no manual map is needed.
     */
    fun getActiveLanguage(): String? {
        val project = getFocusedProject() ?: return null
        val editor = FileEditorManager.getInstance(project).selectedTextEditor ?: return null
        return editor.virtualFile?.fileType?.name
    }

    /** Returns the currently focused project, or null. */
    fun getFocusedProject(): Project? {
        return ProjectManager.getInstance().openProjects.firstOrNull { project ->
            WindowManager.getInstance().getFrame(project)?.isActive == true
        }
    }
}
