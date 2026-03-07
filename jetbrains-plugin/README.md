<h1 align="center">DevGlobe for JetBrains</h1>

<p align="center">
  <strong>Show up on a 3D globe in real time while you code.</strong><br/>
  Your activity is displayed live on <a href="https://devglobe.xyz">devglobe.xyz</a> — other developers see you, discover your projects and your links.
</p>

<p align="center">
  <a href="https://plugins.jetbrains.com/plugin/devglobe">JetBrains Marketplace</a> &nbsp;·&nbsp;
  <a href="https://devglobe.xyz">devglobe.xyz</a> &nbsp;·&nbsp;
  <a href="https://github.com/Nako0/devglobe-extension">Source code</a>
</p>

---

> **Open source & transparent** — This plugin is 100% open source. No code is read, no sensitive data is collected. You can audit every line on [GitHub](https://github.com/Nako0/devglobe-extension).

---

## Compatible IDEs

Compatible with **all JetBrains IDEs**: IntelliJ IDEA, WebStorm, PyCharm, GoLand, Rider, PhpStorm, CLion, RubyMine, DataGrip, Android Studio.

---

## How it works

1. Sign in on [devglobe.xyz](https://devglobe.xyz) with GitHub
2. Copy your API key from the site settings
3. Open the **DevGlobe** tool window in your IDE (right sidebar)
4. Paste your API key → **Connect**
5. You're online — your marker appears on the globe

The plugin sends a **heartbeat every 30 seconds** as long as you're actively coding. It pauses after 1 minute of inactivity. **After 10 minutes of inactivity, you disappear from the globe.**

### Manual installation

You can also download the `.zip` from the [Releases](https://github.com/Nako0/devglobe-extension/releases) and install it via **Settings → Plugins → ⚙️ → Install Plugin from Disk**.

---

## Features

| Feature | Description |
|---------|-------------|
| **Live heartbeat** | Sends your activity every 30s. Auto-pauses after 1 min of inactivity. |
| **Language detection** | Uses JetBrains' native FileType system — supports all languages in your IDE without configuration. |
| **Git integration** | Detects your repo from the git remote. Counts insertions/deletions over 24h on each new commit. |
| **Status message** | Write what you're working on — visible on your globe profile. Persists in IDE settings. |
| **Repo sharing** | **You decide.** Your repo name is never shown unless you explicitly enable this toggle (disabled by default). |
| **Offline recovery** | Detects connection loss and automatically resumes when the network is back. |
| **Status bar** | Displays your coding time for today (e.g. `⏱ 2h 15m`) in the IDE status bar. |
| **Notifications** | Native IDE notifications for every action (connection, tracking, status, errors). |

### Side panel

Two views in the DevGlobe tool window:

- **Login** — masked API key field + link to get your key on devglobe.xyz
- **Dashboard** — live coding time, active language, status message, repo sharing toggle, start/stop buttons, logout

---

## What DevGlobe brings you

- **Visibility** — Your GitHub profile, your X account, your projects and your links are accessible to all developers on the globe. It's a showcase for what you're building.
- **Networking** — See who's coding right now and in which language. Click a marker to discover a developer, their projects, their social links.
- **Motivation** — A weekly leaderboard ranks all developers by coding time. Your streak (consecutive days of coding) is visible on your profile.
- **Project showcase** — Feature up to 10 projects on the globe. The most active projects appear in a carousel visible to all site visitors.

---

## The globe at a glance

On [devglobe.xyz](https://devglobe.xyz), you'll find:

- **A 3D globe** with active developers in real time (colored markers or GitHub avatars)
- **Clickable profiles** — active language, session time, bio, tech stack, social links (GitHub, X, Reddit), and repo if the developer chose to share it
- **A weekly leaderboard** — top developers by coding time, updated live
- **A featured projects carousel** — the most active projects over the last 24h
- **An activity feed** — who just connected, who left
- **A search** — find a developer by name or GitHub username
- **Detailed stats** — today's time, streak, language breakdown over 30 days

**Account deletion** — If you delete your account, all your data is erased. No information is kept.

---

## Privacy & Security

### What the plugin sends

| Data | Sent | Detail |
|------|------|--------|
| Programming language | Yes | The language name of your active tab (e.g. "Kotlin"). Nothing else. |
| Approximate location | Yes | City + coordinates **rounded to ~11 km**. You appear as an area on the globe, not an address. |
| Repo name | **You decide** | `owner/repo` format only. **Sharing is disabled by default.** Nobody sees your repo unless you enable the toggle. |
| Commit stats | Yes | Number of insertions and deletions over 24h. Sent only once per new detected commit. |
| Coding time | Yes | Accumulated per day, per language. |
| Status message | Yes | Only what you write yourself. |

### What the plugin does NOT send

| Data | Sent |
|------|------|
| Your source code | **Never** |
| Your file contents | **Never** |
| Your file names | **Never** |
| Your folder paths | **Never** |
| Your keystrokes | **Never** |
| Your commit messages | **Never** |
| Your Git branches | **Never** |
| Your IP address | **Never stored** — used only for geolocation, then discarded |
| Your environment variables | **Never** |
| Your SSH keys or credentials | **Never** |

### Location

The plugin determines your city from your IP address via an external geolocation service. Coordinates are **rounded to 1 decimal place (~11 km)** — you appear in a region on the globe, not at your address. The location is cached for 1 hour.

**Your IP address is never transmitted to DevGlobe.**

### API key storage

Your API key is stored in your **IDE's native credential manager** via PasswordSafe, backed by the OS keychain — never in plain text.

### Network security

- **HTTPS only** (TLS 1.2+) — no HTTP fallback
- Heartbeats go directly to the database — no intermediary server
- Server-side, Row Level Security policies isolate each user's data

---

## Compatibility

- **IDE builds**: 233 — 253.* (2023.3 to 2025.3)
- **Java**: 17+

---

## Links

- [devglobe.xyz](https://devglobe.xyz) — the globe
- [Source code](https://github.com/Nako0/devglobe-extension) — public GitHub repo

---

<p align="center">
  <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>
