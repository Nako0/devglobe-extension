package xyz.devglobe.plugin.ui

import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPasswordField
import com.intellij.ui.components.JBTextField
import com.intellij.ui.components.JBCheckBox
import com.intellij.util.ui.JBUI
import xyz.devglobe.plugin.core.TrackerState
import java.awt.*
import java.awt.event.KeyAdapter
import java.awt.event.KeyEvent
import javax.swing.*

interface SidebarListener {
    fun onConnect(apiKey: String)
    fun onDisconnect()
    fun onStartTracking()
    fun onStopTracking()
    fun onSetStatus(message: String)
    fun onToggleShareRepo(enabled: Boolean)
    fun onToggleAnonymousMode(enabled: Boolean)
    fun onOpenExternal(url: String)
}

class SidebarPanel : JPanel() {

    var listener: SidebarListener? = null

    private val cardLayout = CardLayout()
    private val cards = JPanel(cardLayout)

    // Login
    private val tokenField = JBPasswordField()
    private val connectButton = JButton("Connect")

    // Dashboard
    private val codingTimeLabel = JBLabel("0m")
    private val languageLabel = JBLabel("--")
    private val shareRepoCheckbox = JBCheckBox("Share repository")
    private val anonymousModeCheckbox = JBCheckBox("Anonymous mode")
    private val statusField = JBTextField()
    private val statusButton = JButton("Set")
    private val stopButton = JButton("Stop Tracking")
    private val startButton = JButton("Start Tracking")

    init {
        layout = BorderLayout()
        border = JBUI.Borders.empty(10)

        cards.isOpaque = false
        cards.add(buildLoginPanel(), "login")
        cards.add(buildDashboardPanel(), "dashboard")
        add(cards, BorderLayout.NORTH)

        wireEvents()
    }

    fun updateState(state: TrackerState) {
        if (state.connected) {
            cardLayout.show(cards, "dashboard")
            codingTimeLabel.text = state.codingTime.ifEmpty { "0m" }
            languageLabel.text = state.language ?: "--"
            shareRepoCheckbox.isSelected = state.shareRepo
            anonymousModeCheckbox.isSelected = state.anonymousMode
            statusField.text = state.statusMessage
            stopButton.isEnabled = state.tracking
            startButton.isEnabled = !state.tracking
        } else {
            cardLayout.show(cards, "login")
            tokenField.text = ""
        }
    }

    // -------------------------------------------------------------------------
    // Login panel
    // -------------------------------------------------------------------------

    private fun buildLoginPanel(): JPanel {
        val panel = JPanel(GridBagLayout())
        panel.isOpaque = false
        val gbc = fillRow()
        var row = 0

        gbc.gridy = row++
        panel.add(sectionHeading("Connect to DevGlobe"), gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(8, 0, 0, 0)
        tokenField.emptyText.text = "Paste your API key"
        panel.add(tokenField, gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(6, 0, 0, 0)
        panel.add(connectButton, gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(6, 0, 0, 0)
        panel.add(createLink("Get your API key on devglobe.xyz") {
            listener?.onOpenExternal("https://devglobe.xyz")
        }, gbc)

        return panel
    }

    // -------------------------------------------------------------------------
    // Dashboard panel
    // -------------------------------------------------------------------------

    private fun buildDashboardPanel(): JPanel {
        val panel = JPanel(GridBagLayout())
        panel.isOpaque = false
        val gbc = fillRow()
        var row = 0

        // --- Stats ---
        gbc.gridy = row++; gbc.insets = JBUI.emptyInsets()
        panel.add(sectionHeading("Dashboard"), gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(4, 0, 0, 0)
        panel.add(statRow("Coding today", codingTimeLabel), gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(2, 0, 0, 0)
        panel.add(statRow("Language", languageLabel), gbc)

        // --- Separator ---
        gbc.gridy = row++; gbc.insets = JBUI.insets(10, 0, 10, 0)
        panel.add(JSeparator(), gbc)

        // --- Preferences ---
        gbc.gridy = row++; gbc.insets = JBUI.emptyInsets()
        panel.add(sectionHeading("Preferences"), gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(4, 0, 0, 0)
        shareRepoCheckbox.isOpaque = false
        panel.add(shareRepoCheckbox, gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(2, 0, 0, 0)
        val hint = JBLabel("<html>Your coding time and commits are always tracked. This toggle controls whether your repository name is visible on the globe.</html>")
        hint.font = hint.font.deriveFont(Font.PLAIN, 11f)
        hint.foreground = UIManager.getColor("Label.disabledForeground")
        panel.add(hint, gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(8, 0, 0, 0)
        anonymousModeCheckbox.isOpaque = false
        panel.add(anonymousModeCheckbox, gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(2, 0, 0, 0)
        val anonHint = JBLabel("<html>Your real location is never sent to the server. You appear on a random city in your country, chosen from a database of 152,000+ cities (GeoNames). The random city stays the same for the entire session.</html>")
        anonHint.font = anonHint.font.deriveFont(Font.PLAIN, 11f)
        anonHint.foreground = UIManager.getColor("Label.disabledForeground")
        panel.add(anonHint, gbc)

        // --- Separator ---
        gbc.gridy = row++; gbc.insets = JBUI.insets(10, 0, 10, 0)
        panel.add(JSeparator(), gbc)

        // --- Status ---
        gbc.gridy = row++; gbc.insets = JBUI.emptyInsets()
        panel.add(sectionHeading("Status Message"), gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(4, 0, 0, 0)
        val statusRow = JPanel(BorderLayout(4, 0))
        statusRow.isOpaque = false
        statusField.emptyText.text = "What are you working on?"
        statusRow.add(statusField, BorderLayout.CENTER)
        statusRow.add(statusButton, BorderLayout.EAST)
        panel.add(statusRow, gbc)

        // --- Separator ---
        gbc.gridy = row++; gbc.insets = JBUI.insets(10, 0, 10, 0)
        panel.add(JSeparator(), gbc)

        // --- Buttons ---
        gbc.gridy = row++; gbc.insets = JBUI.emptyInsets()
        val buttonRow = JPanel(GridLayout(1, 2, 6, 0))
        buttonRow.isOpaque = false
        buttonRow.add(stopButton)
        buttonRow.add(startButton)
        panel.add(buttonRow, gbc)

        gbc.gridy = row++; gbc.insets = JBUI.insets(12, 0, 0, 0)
        gbc.fill = GridBagConstraints.NONE
        gbc.anchor = GridBagConstraints.CENTER
        panel.add(createLink("Disconnect") { listener?.onDisconnect() }, gbc)

        return panel
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    private fun wireEvents() {
        connectButton.addActionListener {
            val key = String(tokenField.password).trim()
            if (key.isNotEmpty()) listener?.onConnect(key)
        }
        tokenField.addKeyListener(object : KeyAdapter() {
            override fun keyPressed(e: KeyEvent) {
                if (e.keyCode == KeyEvent.VK_ENTER) connectButton.doClick()
            }
        })
        shareRepoCheckbox.addActionListener {
            listener?.onToggleShareRepo(shareRepoCheckbox.isSelected)
        }
        anonymousModeCheckbox.addActionListener {
            listener?.onToggleAnonymousMode(anonymousModeCheckbox.isSelected)
        }
        statusButton.addActionListener {
            listener?.onSetStatus(statusField.text)
        }
        statusField.addKeyListener(object : KeyAdapter() {
            override fun keyPressed(e: KeyEvent) {
                if (e.keyCode == KeyEvent.VK_ENTER) statusButton.doClick()
            }
        })
        stopButton.addActionListener { listener?.onStopTracking() }
        startButton.addActionListener { listener?.onStartTracking() }
    }

    // -------------------------------------------------------------------------
    // UI helpers
    // -------------------------------------------------------------------------

    /** Returns a GridBagConstraints that fills the full row width. */
    private fun fillRow(): GridBagConstraints = GridBagConstraints().apply {
        gridx = 0
        weightx = 1.0
        fill = GridBagConstraints.HORIZONTAL
        anchor = GridBagConstraints.NORTHWEST
    }

    private fun sectionHeading(text: String): JBLabel {
        val label = JBLabel(text.uppercase())
        label.font = label.font.deriveFont(Font.BOLD, 11f)
        label.foreground = UIManager.getColor("Label.disabledForeground")
        return label
    }

    private fun statRow(labelText: String, valueLabel: JBLabel): JPanel {
        val row = JPanel(BorderLayout())
        row.isOpaque = false
        val label = JBLabel(labelText)
        label.foreground = UIManager.getColor("Label.disabledForeground")
        row.add(label, BorderLayout.WEST)
        valueLabel.font = valueLabel.font.deriveFont(Font.BOLD)
        row.add(valueLabel, BorderLayout.EAST)
        return row
    }

    private fun createLink(text: String, action: () -> Unit): JBLabel {
        val label = JBLabel("<html><a href='#'>$text</a></html>")
        label.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        label.addMouseListener(object : java.awt.event.MouseAdapter() {
            override fun mouseClicked(e: java.awt.event.MouseEvent) {
                action()
            }
        })
        return label
    }
}
