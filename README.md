<h1 align="center">DevGlobe — IDE Extensions</h1>

<p align="center">
  <strong>Show up on a 3D globe in real time while you code.</strong><br/>
  Official extensions for <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>

<p align="center">
  <a href="#vs-code">VS Code</a> &nbsp;·&nbsp;
  <a href="#jetbrains">JetBrains</a> &nbsp;·&nbsp;
  <a href="#claude-code">Claude Code</a> &nbsp;·&nbsp;
  <a href="#privacy--security">Privacy</a> &nbsp;·&nbsp;
  <a href="#how-it-works-technically">Technical</a>
</p>

---

> **Open source & transparent** — These extensions are 100% open source. No code is read, no sensitive data is collected. You can audit every line of this repository. We explain in detail everything that is sent (and what is not) in the [Privacy & Security](#privacy--security) section.

---

## Why DevGlobe?

DevGlobe is a free and open source platform that displays active developers on an interactive 3D globe. When you code, a marker lights up at your position on the map. Other developers see you in real time.

**What it brings you:**

- **Visibility** — Your GitHub profile, your X account, your projects and your links are accessible to all developers on the globe. It's a showcase for what you're building. Your repo names are only visible if you choose so.

- **Networking** — You see who's coding right now and in which language. Click a marker to discover a developer, their projects, their social links. It's a simple way to meet people who share your tech stack.

- **Motivation** — A weekly leaderboard ranks all developers by coding time. Your streak (consecutive days of coding) is visible on your profile. It's a small daily motivation boost.

- **Project showcase** — You can feature up to 10 projects on the globe. The most active projects (coding time + Git activity) are displayed in a carousel visible to all site visitors. If you have a startup, you can link your [TrustMRR](https://trustmrr.com) data to publicly display your MRR, growth and metrics.

---

## The globe at a glance

On [devglobe.xyz](https://devglobe.xyz), you'll find:

- **A 3D globe** with active developers in real time (colored markers or GitHub avatars)
- **Clickable profiles** — active language, session time, bio, tech stack, social links (GitHub, X, Reddit), and repo if the developer chose to share it
- **A weekly leaderboard** — top developers by coding time, updated live
- **A featured projects carousel** — the most active projects, ranked by a score: `0.5 × coding time on the repo + (insertions − deletions)` over the last 24 hours
- **An activity feed** — who just connected, who left
- **A search** — find a developer by name or GitHub username
- **Detailed stats** — today's time, streak, language breakdown over 30 days, per-repo activity over 24h (if the developer chose to share their git activity)

**Account deletion** — If you delete your account, all your data is erased. No information is kept.

---

## How it works

```
┌──────────────┐    heartbeat (30s)    ┌──────────────┐    real time     ┌──────────────┐
│  Your IDE     │ ───────────────────► │   Database    │ ──────────────► │  3D Globe     │
│  (extension)  │  lang, position, repo│  (PostgreSQL) │                 │  devglobe.xyz │
└──────────────┘                       └──────────────┘                  └──────────────┘
```

1. **Sign in** on [devglobe.xyz](https://devglobe.xyz) with GitHub
2. **Copy your API key** from the site settings
3. **Install the extension** in VS Code, your JetBrains IDE, or Claude Code
4. **Paste the key** in the extension sidebar (or run `/devglobe:setup YOUR_API_KEY` for Claude Code)
5. **You're online** — your marker appears on the globe

The extension sends a **heartbeat every 30 seconds** as long as you're actively coding. If you stop typing for more than 1 minute, heartbeats pause automatically. **After 10 minutes of inactivity, you disappear from the globe** and are considered inactive.

---

## VS Code

### Installation

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=devglobe.devglobe)
2. Open the **DevGlobe** sidebar (globe icon in the activity bar)
3. Paste your API key → **Connect**

### Features

| Feature | Description |
|---------|-------------|
| **Live heartbeat** | Sends your activity every 30s. Auto-pauses after 1 min of inactivity. |
| **Language detection** | Detects 48+ languages from your active editor tab. |
| **Git integration** | Detects your repo from the git remote. Commit stats (insertions/deletions) are verified server-side via the GitHub API — never sent by the extension. |
| **Anonymous mode** | Hide your exact location — your marker is placed on a random city in your country (from a database of 152,000+ cities worldwide). |
| **Status message** | Write what you're working on — visible on your globe profile. |
| **Repo sharing** | **You decide.** Your repo name is never shown unless you explicitly enable this toggle (disabled by default). |
| **Offline recovery** | Detects connection loss and automatically resumes when the network is back. |
| **Status bar** | Displays your coding time for today (e.g. `2h 15m`) in the VS Code status bar. |

### Sidebar

Two views in the side panel:

- **Login** — masked API key field + link to get your key on devglobe.xyz
- **Dashboard** — live coding time, active language, status message, repo sharing toggle, start/stop buttons, logout

### Command

`DevGlobe: Set Status Message` — accessible from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

### Requirements

- VS Code **1.80+**
- **Zero external dependencies** — uses only native VS Code and Node.js APIs

---

## JetBrains

Compatible with **all JetBrains IDEs**: IntelliJ IDEA, WebStorm, PyCharm, GoLand, Rider, PhpStorm, CLion, RubyMine, DataGrip, Android Studio.

### Installation

1. Install from the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/devglobe) or download the `.zip` from the [Releases](https://github.com/devglobe/devglobe-extensions/releases)
2. For manual installation: **Settings → Plugins → ⚙️ → Install Plugin from Disk**
3. Open the **DevGlobe** tool window (right sidebar)
4. Paste your API key → **Connect**

### Features

Same features as the VS Code extension, adapted for the JetBrains platform:

| Feature | Description |
|---------|-------------|
| **Live heartbeat** | 30s interval, pauses after 1 min of inactivity. |
| **Language detection** | Uses JetBrains' native FileType system — supports all languages in your IDE without configuration. |
| **Git integration** | Same repo detection. Commit stats verified server-side via GitHub API. |
| **Anonymous mode** | Same privacy toggle as VS Code — a random city in your country (from a database of 152,000+ cities worldwide). |
| **Status message** | Editable from the side panel, persists in IDE settings. |
| **Repo sharing** | Same toggle as VS Code — your repo stays invisible unless explicitly enabled. |
| **Offline recovery** | Automatic detection + resume when the network is back. |
| **Status bar** | Displays `⏱ 2h 15m` in the IDE status bar. |
| **Notifications** | Native IDE notifications for every action (connection, tracking, status, errors). |

### Compatibility

- **IDE builds**: 233 — 253.* (2023.3 to 2025.3)
- **Java**: 17+

---

## Claude Code

### Installation

In Claude Code, run:

```
/plugin marketplace add Nako0/devglobe-extension
/plugin install devglobe@devglobe
```

### Setup

```
/devglobe:setup YOUR_API_KEY
```

Get your API key at [devglobe.xyz](https://devglobe.xyz) — sign in, then open your **profile settings**.

This saves your key and creates default settings in `~/.devglobe/`.

### Features

| Feature | Description |
|---------|-------------|
| **Live heartbeat** | Hooks into Claude Code events. Sends a heartbeat at most once per minute. |
| **Language detection** | Detects the language from file extensions being edited. |
| **Git integration** | Detects your repo from the git remote. |
| **Anonymous mode** | **Enabled by default.** Hides your exact location — placed on a random city in your country (from a database of 152,000+ cities worldwide). Disable with `/devglobe:anonymous false`. |
| **Status message** | Set a custom status on your profile: `/devglobe:status Your message here` |
| **Repo sharing** | Display your repo name on the globe: `/devglobe:share-repo true` (disabled by default). |

### Commands

| Command | Description |
|---------|-------------|
| `/devglobe:setup YOUR_API_KEY` | Configure the plugin with your API key |
| `/devglobe:anonymous true/false` | Enable or disable anonymous mode |
| `/devglobe:share-repo true/false` | Enable or disable repo sharing |
| `/devglobe:status MESSAGE` | Set a status message on your DevGlobe profile |

Settings are stored in `~/.devglobe/config.json` and can also be edited manually.

---

## GitHub App — Verified commit stats

DevGlobe uses a [GitHub App](https://github.com/apps/devglobeapp) to display **verified** commit statistics (insertions & deletions per week) on featured projects. This replaces the old client-side stats collection, which could be falsified.

### How it works

1. On your DevGlobe profile, click **"Connect repo"** in the Projects section
2. You're redirected to GitHub to install the [DevGlobe App](https://github.com/apps/devglobeapp) on the repos you choose
3. A server-side job syncs commit stats from the GitHub API **every 15 minutes**
4. Stats are displayed on your featured projects in the carousel and on your profile

### What the GitHub App can access

The app requests **Metadata: Read-only** — the most minimal GitHub permission available. It uses the `GET /repos/{owner/repo}/stats/contributors` endpoint to retrieve aggregated contribution statistics (weekly insertions and deletions per contributor).

| Data | Access |
|------|--------|
| Aggregated commit statistics (insertions/deletions per week) | **Read** |
| Repo metadata (name, description, stars, forks) | **Read** |
| Your source code | **No access** |
| Your file contents or file names | **No access** |
| Your commit messages | **No access** |
| Your issues and pull requests | **No access** |
| Your repo settings | **No access** |
| Your actions/workflows | **No access** |
| Your collaborators list | **No access** |

### What happens if you don't install it

- You can still use DevGlobe normally (heartbeats, coding time, leaderboard)
- You can still add projects to your profile
- You just **can't feature a project** in the carousel without connecting its repo
- No commit stats will be displayed on your profile

### How to uninstall

Go to [github.com/settings/installations](https://github.com/settings/installations), find "DevGlobe", and click **Uninstall**. Your coding time and profile data on DevGlobe remain intact.

---

## Privacy & Security

We know that when you install an extension, you trust the developer. We take that seriously. Here's exactly what the extension does — no gray area.

### What the extension sends

| Data | Sent | Detail |
|------|------|--------|
| Programming language | Yes | The language name of your active tab (e.g. "TypeScript"). Nothing else. |
| Approximate location | Yes | City + coordinates **snapped to your city center** (from a database of 152,000+ cities). You appear as an area on the globe, not an address. |
| Repo name | **Only if enabled** | `owner/repo` is sent only when you enable the "Share repo" toggle (disabled by default). If disabled, no repo information is transmitted. |
| Commit stats | **Never by the extension** | Insertions/deletions are fetched **server-side** from the GitHub API via the GitHub App. The extension never reads or sends commit data. |
| Anonymous mode | **You decide** | When enabled, your real coordinates are replaced with a random city in your country (from a database of 152,000+ cities worldwide). Your actual location is never sent to DevGlobe. |
| Coding time | Yes | Accumulated per day, per language. |
| Status message | Yes | Only what you write yourself. |

### What the extension does NOT send

| Data | Sent |
|------|------|
| Your source code | **Never** |
| Your file contents | **Never** |
| Your file names | **Never** |
| Your folder paths | **Never** |
| Your keystrokes | **Never** |
| Your commit messages | **Never** |
| Your Git branches | **Never** |
| Your IP address | **Never stored** — used only to determine city via a geolocation service, then discarded, the IP stays on your IDE |
| Your environment variables | **Never** |
| Your SSH keys or credentials | **Never** |

### Location: how it works exactly

The extension determines your city from your IP address via an external geolocation service (freeipapi.com, with fallback to ipapi.co). Both are free public services, no API key required.

**Coordinates are snapped to your city center** using a database of 152,000+ cities (GeoNames). You appear at your city's canonical center on the globe, not at your address. If the city is not found in the database, coordinates are randomly offset within a 20 km radius.

The location is **cached for 1 hour** — the extension does not call the geolocation service on every heartbeat.

**Your IP address is never transmitted to DevGlobe.** It is only used by the third-party geolocation service to determine your city, then discarded.

### API key storage

Your DevGlobe API key is **never stored in plain text**.

| IDE | Storage method |
|-----|----------------|
| VS Code | **SecretStorage** — your OS system keychain (macOS Keychain, Windows Credential Manager, Linux libsecret) |
| JetBrains | **PasswordSafe** — the IDE's native credential manager, backed by the OS keychain |
| Claude Code | **Environment variable** (`DEVGLOBE_API_KEY`) or **config file** (`~/.devglobe/api_key`) |

The VS Code extension automatically migrates old keys that were stored in plain text in `settings.json` to the secure keychain.

### Network security

- **HTTPS only** (TLS 1.2+) — no HTTP fallback
- Heartbeats go directly to the database — no intermediary server
- The VS Code side panel uses a **Content Security Policy** with a cryptographic nonce to prevent script injection
- Server-side, Row Level Security policies isolate each user's data

### Open source

All extensions are open source. You can read every line of code that runs on your machine. That's the purpose of this repository.

---

## How it works technically

### The heartbeat

Every 30 seconds, if you've typed code in the last minute, the extension sends a heartbeat to the database. This heartbeat contains:

```
{
  api_key,                      // your identifier (stored in the OS keychain)
  latitude, longitude,          // snapped to city center (152k+ cities)
  city,                         // "Paris, France"
  language,                     // "TypeScript"
  editor,                       // "vscode", "intellij", "claude-code", etc.
  repo,                         // "owner/repo" (sent only if share_repo is true)
  share_repo,                   // true/false — controls whether repo name is sent and displayed
  anonymous,                    // true/false — when true, coordinates are a random city
}
```

The server responds with today's total coding time. The extension updates the display in the sidebar and status bar.

### Language detection

- **VS Code**: reads the `languageId` of the active editor, then translates it via a table of 48+ languages (JavaScript, TypeScript, Python, Rust, Go, Kotlin, etc.)
- **JetBrains**: uses the IDE's native `FileType` system — no manual table, automatically supports all languages your IDE supports
- **Claude Code**: detects the language from the file extension of edited files

### Git integration

The extension runs `git remote get-url origin` in your active file's directory and extracts the `owner/repo` identifier from the URL (SSH or HTTPS). The result is cached for 5 minutes.

**The extension never reads commits, diffs, or file contents.** Commit statistics (insertions/deletions) are fetched entirely server-side via the GitHub API using the token granted by the [GitHub App](#-github-app--verified-commit-stats). This prevents falsification — the stats displayed on DevGlobe always match the real data on GitHub.

### Anonymous mode

When anonymous mode is enabled, the extension replaces your real coordinates with a **random city in your country**, chosen from a database of 152,000+ cities worldwide (GeoNames). Your actual location is never transmitted to DevGlobe. The random city is selected once per session and stays consistent until you restart your IDE or toggle the mode.

On the globe, your profile displays an "anonymous mode" badge instead of your city name.

### Offline detection

After 2 consecutive network failures, the extension switches to offline mode and notifies you. As soon as the connection is back, it automatically resumes heartbeats.

### Architecture

```
vscode-extension/
├── src/
│   ├── extension.ts      # Lifecycle, API key management (SecretStorage)
│   ├── tracker.ts        # State machine, heartbeat loop, offline detection
│   ├── heartbeat.ts      # HTTP calls to the database
│   ├── sidebar.ts        # Side panel (webview HTML/CSS/JS)
│   ├── geo.ts            # IP geolocation (dual provider + fallback)
│   ├── git.ts            # Repo detection (owner/repo from remote)
│   ├── language.ts       # languageId → display name translation
│   ├── logger.ts         # Debug/info/warn/error logs
│   └── constants.ts      # URLs, timeouts, intervals
└── package.json

jetbrains-plugin/
├── src/main/kotlin/xyz/devglobe/plugin/
│   ├── core/
│   │   ├── DevGlobeTracker.kt    # Singleton tracker, heartbeat scheduler
│   │   ├── HeartbeatService.kt   # HTTP client
│   │   ├── GeoService.kt         # IP geolocation (same logic)
│   │   ├── GitService.kt         # Repo detection (owner/repo from remote)
│   │   ├── LanguageService.kt    # Language detection via native FileType
│   │   ├── TrackerState.kt       # Immutable state
│   │   └── Constants.kt          # URLs, timeouts, intervals
│   ├── auth/
│   │   └── ApiKeyStorage.kt      # PasswordSafe wrapper (OS keychain)
│   ├── settings/
│   │   └── DevGlobeSettings.kt   # IDE settings persistence
│   ├── ui/
│   │   ├── SidebarPanel.kt       # Swing panel (login + dashboard)
│   │   ├── SidebarFactory.kt     # Tool window integration
│   │   └── DevGlobeStatusBarFactory.kt
│   └── DevGlobeStartupActivity.kt
├── src/main/resources/META-INF/
│   └── plugin.xml
└── build.gradle.kts

claude-code-plugin/
├── plugins/devglobe/
│   ├── src/
│   │   ├── index.ts       # Heartbeat logic (PostToolUse, UserPromptSubmit, Stop)
│   │   └── lang.ts        # File extension → language mapping
│   ├── hooks/
│   │   └── hooks.json     # Claude Code hook definitions
│   ├── skills/
│   │   ├── setup/SKILL.md      # /devglobe:setup
│   │   ├── anonymous/SKILL.md  # /devglobe:anonymous
│   │   ├── share-repo/SKILL.md # /devglobe:share-repo
│   │   └── status/SKILL.md     # /devglobe:status
│   ├── scripts/
│   │   └── run            # Heartbeat launcher
│   └── package.json
└── .claude-plugin/
    └── marketplace.json
```

---

## Build from source

### VS Code

```bash
cd vscode-extension
npm install
npm run compile
```

Test: `F5` in VS Code to launch an Extension Development Host.

Package: `npx @vscode/vsce package`

### JetBrains

```bash
cd jetbrains-plugin
./gradlew buildPlugin
```

The `.zip` will be in `build/distributions/`.

Test: `./gradlew runIde` or **Run → Run Plugin** in IntelliJ.

### Claude Code

```bash
cd claude-code-plugin/plugins/devglobe
npm install
npm run build
```

Install locally:

```
/plugin marketplace add ./claude-code-plugin
/plugin install devglobe@devglobe
```

---

## Contributing

Contributions are welcome — fixes, new features, documentation.

1. Fork the repository
2. Create your branch (`git checkout -b fix/something`)
3. Commit your changes
4. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">
  <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>
