<h1 align="center">DevGlobe — IDE Extensions</h1>

<p align="center">
  <strong>Show up on a 3D globe in real time while you code.</strong><br/>
  Official extensions for <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>

<p align="center">
  <a href="https://github.com/Nako0/devglobe-extension/stargazers"><img src="https://img.shields.io/github/stars/Nako0/devglobe-extension?style=flat-square&color=yellow" alt="Stars" /></a>&nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=devglobe.devglobe"><img src="https://img.shields.io/visual-studio-marketplace/i/devglobe.devglobe?style=flat-square&label=VS%20Code%20installs&color=007ACC" alt="VS Code Installs" /></a>&nbsp;
  <a href="https://plugins.jetbrains.com/plugin/30572-devglobe"><img src="https://img.shields.io/jetbrains/plugin/d/xyz.devglobe.plugin?style=flat-square&label=JetBrains%20downloads&color=FE315D" alt="JetBrains Downloads" /></a>
</p>

<p align="center">
  <a href="#vs-code">VS Code</a> &nbsp;·&nbsp;
  <a href="#jetbrains">JetBrains</a> &nbsp;·&nbsp;
  <a href="#claude-code">Claude Code</a>
</p>

<p align="center">
  <a href="https://devglobe.xyz">
    <img src="assets/demo.gif" alt="DevGlobe — developers coding live on a 3D globe" width="800" />
  </a>
</p>

---

## Why DevGlobe?

DevGlobe is a **free, open-source** platform that lights up a marker on a 3D globe every time you code. Other developers see you in real time.

<table>
<tr>
<td width="25%" align="center"><h3>Visibility</h3><p>Your GitHub, X, projects and links — visible to every developer on the globe. A showcase for what you're building.</p></td>
<td width="25%" align="center"><h3>Networking</h3><p>See who's coding right now and in which language. Click a marker to discover a developer and their projects.</p></td>
<td width="25%" align="center"><h3>Motivation</h3><p>Weekly leaderboard by coding time. Your streak (consecutive coding days) is visible on your profile.</p></td>
<td width="25%" align="center"><h3>Projects</h3><p>Feature up to 10 projects. The most active ones appear in a carousel visible to all visitors. Link your <a href="https://trustmrr.com">TrustMRR</a> to display your MRR.</p></td>
</tr>
</table>

---

## Quick Start

```
1. Sign in on devglobe.xyz with GitHub
2. Copy your API key from the profile settings
3. Install the extension in your IDE and paste the key
```

**That's it — your marker appears on the globe.**

The extension sends a heartbeat every 30 seconds while you code. Stop typing for 1 minute and heartbeats pause. After 10 minutes of inactivity, you disappear from the globe.

---

## How it works

```
┌──────────────┐    heartbeat (30s)    ┌──────────────┐    real time     ┌──────────────┐
│  Your IDE     │ ───────────────────► │   Database    │ ──────────────► │  3D Globe     │
│  (extension)  │  lang, position, repo│  (PostgreSQL) │                 │  devglobe.xyz │
└──────────────┘                       └──────────────┘                  └──────────────┘
```

---

## Supported IDEs

### VS Code

#### Installation

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=devglobe.devglobe)
2. Open the **DevGlobe** sidebar (globe icon in the activity bar)
3. Paste your API key → **Connect**

#### Features

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

#### Sidebar

Two views in the side panel:

- **Login** — masked API key field + link to get your key on devglobe.xyz
- **Dashboard** — live coding time, active language, status message, repo sharing toggle, start/stop buttons, logout

#### Command

`DevGlobe: Set Status Message` — accessible from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

#### Requirements

- VS Code **1.80+** — also works with **Cursor**, **Windsurf**, **Antigravity**, and other VS Code forks
- **Zero external dependencies** — uses only native VS Code and Node.js APIs

---

### JetBrains

Compatible with **all JetBrains IDEs**: IntelliJ IDEA, WebStorm, PyCharm, GoLand, Rider, PhpStorm, CLion, RubyMine, DataGrip, Android Studio.

#### Installation

1. Install from the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/30572-devglobe) or download the `.zip` from the [Releases](https://github.com/Nako0/devglobe-extension/releases)
2. For manual installation: **Settings → Plugins → ⚙️ → Install Plugin from Disk**
3. Open the **DevGlobe** tool window (right sidebar)
4. Paste your API key → **Connect**

#### Features

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

#### Compatibility

- **IDE builds**: 233 — 253.* (2023.3 to 2025.3)
- **Java**: 17+

---

### Claude Code

#### Installation

In Claude Code, run:

```
/plugin marketplace add Nako0/devglobe-extension
```

```
/plugin install devglobe@devglobe
```

After installing, **restart Claude Code** (`/exit`, then reopen) so the plugin and its commands are loaded.

#### Setup

```
/devglobe:setup YOUR_API_KEY
```

Get your API key at [devglobe.xyz](https://devglobe.xyz) — sign in, then open your **profile settings**.

This saves your key and creates default settings in `~/.devglobe/`.

#### Features

| Feature | Description |
|---------|-------------|
| **Live heartbeat** | Hooks into Claude Code events. Sends a heartbeat at most once per minute. |
| **Language detection** | Detects the language from file extensions being edited. |
| **Git integration** | Detects your repo from the git remote. |
| **Anonymous mode** | **Enabled by default.** Hides your exact location — placed on a random city in your country (from a database of 152,000+ cities worldwide). Disable with `/devglobe:anonymous false`. |
| **Status message** | Set a custom status on your profile: `/devglobe:status Your message here` |
| **Repo sharing** | Display your repo name on the globe: `/devglobe:share-repo true` (disabled by default). |

#### Commands

| Command | Description |
|---------|-------------|
| `/devglobe:setup YOUR_API_KEY` | Configure the plugin with your API key |
| `/devglobe:anonymous true/false` | Enable or disable anonymous mode |
| `/devglobe:share-repo true/false` | Enable or disable repo sharing |
| `/devglobe:status MESSAGE` | Set a status message on your DevGlobe profile |

Settings are stored in `~/.devglobe/config.json` and can also be edited manually.

---

## The Globe

On [devglobe.xyz](https://devglobe.xyz), you'll find:

- **A 3D globe** with active developers in real time (colored markers or GitHub avatars)
- **Clickable profiles** — active language, session time, bio, tech stack, social links
- **A weekly leaderboard** — top developers by coding time, updated live
- **A featured projects carousel** — most active projects, ranked by coding time + Git activity
- **An activity feed** — who just connected, who left
- **Search** — find a developer by name or GitHub username
- **Detailed stats** — today's time, streak, language breakdown (30 days), per-repo activity (24h)

**Account deletion** — delete your account and all your data is permanently erased.

---

## Privacy & Security

> **100% open source. No code is read. No sensitive data collected.** Audit every line yourself.

**What we send:** programming language, city-level location (snapped to city center from 152k+ cities), coding time, your status message.

**What you control:** repo name (only shared if you enable it), anonymous mode (random city in your country).

**What we NEVER touch:** source code, file contents, file names, folder paths, keystrokes, commit messages, Git branches, environment variables, SSH keys. Your IP is used once for geolocation then discarded — never sent to DevGlobe.

**API keys** are stored in your OS keychain (VS Code SecretStorage, JetBrains PasswordSafe) or local config file (Claude Code).

**Network:** HTTPS only (TLS 1.2+), no intermediary server, Content Security Policy on webviews, Row Level Security on the database. No telemetry.

**[Read the full Privacy & Security documentation →](PRIVACY.md)**

---

## GitHub App

DevGlobe uses a [GitHub App](https://github.com/apps/devglobeapp) to display **verified** commit statistics on featured projects. The app requests **Metadata: Read-only** — the most minimal permission available. It has **no access** to your source code, file contents, commit messages, issues, or PRs.

The app is optional — you can use DevGlobe without it. **[Learn more →](PRIVACY.md#github-app--verified-commit-stats)**

---

## Build from source

### VS Code

```bash
cd vscode-extension
npm install
npm run compile
```

Test: `F5` in VS Code to launch an Extension Development Host. Package: `npx @vscode/vsce package`

### JetBrains

```bash
cd jetbrains-plugin
./gradlew buildPlugin
```

The `.zip` will be in `build/distributions/`. Test: `./gradlew runIde`

### Claude Code

```bash
cd claude-code-plugin/plugins/devglobe
npm install && npm run build
```

Install locally: `/plugin marketplace add ./claude-code-plugin` then `/plugin install devglobe@devglobe`

---

## Contributing

Contributions are welcome — fixes, new features, documentation.

1. Fork the repository
2. Create your branch (`git checkout -b fix/something`)
3. Commit your changes
4. Open a Pull Request

---

## Share

If you like DevGlobe, help us spread the word!

<p align="center">
  <a href="https://twitter.com/intent/tweet?text=I%20just%20discovered%20DevGlobe%20%E2%80%94%20a%20free%20open-source%203D%20globe%20that%20shows%20developers%20coding%20in%20real%20time.%20Extensions%20for%20VS%20Code%2C%20JetBrains%20%26%20Claude%20Code.&url=https%3A%2F%2Fgithub.com%2FNako0%2Fdevglobe-extension"><img src="https://img.shields.io/badge/Share_on-X%20(Twitter)-000000?style=for-the-badge&logo=x" alt="Share on X" /></a>&nbsp;
  <a href="https://www.reddit.com/submit?url=https%3A%2F%2Fgithub.com%2FNako0%2Fdevglobe-extension&title=DevGlobe%20%E2%80%94%20See%20developers%20coding%20in%20real%20time%20on%20a%203D%20globe"><img src="https://img.shields.io/badge/Share_on-Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Share on Reddit" /></a>&nbsp;
  <a href="https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2FNako0%2Fdevglobe-extension&t=DevGlobe%20%E2%80%94%20See%20developers%20coding%20in%20real%20time%20on%20a%203D%20globe"><img src="https://img.shields.io/badge/Share_on-Hacker%20News-F0652F?style=for-the-badge&logo=ycombinator&logoColor=white" alt="Share on HN" /></a>&nbsp;
  <a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithub.com%2FNako0%2Fdevglobe-extension"><img src="https://img.shields.io/badge/Share_on-LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="Share on LinkedIn" /></a>
</p>

---

## Contributors

<a href="https://github.com/Nako0/devglobe-extension/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Nako0/devglobe-extension" alt="Contributors" />
</a>

---

## License

MIT

---

<p align="center">
  <a href="https://devglobe.xyz"><strong>devglobe.xyz</strong></a>
</p>
