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
| **Git integration** | Detects your repo from the git remote. Commit stats (insertions/deletions) are verified server-side via the GitHub API. |
| **Anonymous mode** | Hide your exact location — your marker is placed on a random city in your country (from a database of 152,000+ cities worldwide). |
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

## GitHub App — Verified commit stats

DevGlobe uses a [GitHub App](https://github.com/apps/devglobeapp) to display **verified** commit statistics (insertions & deletions per week) on featured projects. This replaces the old client-side stats collection, which could be falsified.

### How it works

1. On your DevGlobe profile, click **"Connect repo"** in the Projects section
2. You're redirected to GitHub to install the [DevGlobe App](https://github.com/apps/devglobeapp) on the repos you choose
3. DevGlobe syncs commit stats from the GitHub API every 15 minutes using your token
4. Stats are displayed on your featured projects in the carousel and on your profile

### What the GitHub App can read

The app requests **Metadata: Read-only** — the most minimal GitHub permission available.

| Data | Access |
|------|--------|
| Repo name, description, stars, forks | **Read** |
| Commit statistics (insertions/deletions) | **Read** |
| Your source code | **No access** |
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

## The globe at a glance

On [devglobe.xyz](https://devglobe.xyz), you'll find:

- **A 3D globe** with active developers in real time (colored markers or GitHub avatars)
- **Clickable profiles** — active language, session time, bio, tech stack, social links (GitHub, X, Reddit), and repo if the developer chose to share it
- **A weekly leaderboard** — top developers by coding time, updated live
- **A featured projects carousel** — the most active projects, ranked by coding time and verified commit stats
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
| Approximate location | Yes | City + coordinates **snapped to your city center** (from a database of 152,000+ cities). You appear as an area on the globe, not an address. |
| Repo name | Always sent | `owner/repo` is always sent to the server (used for featured project score calculation), but **displayed on the globe only if you enable the "Share repo" toggle** (disabled by default). |
| Anonymous mode | **You decide** | When enabled, your real coordinates are replaced with a random city in your country (from a database of 152,000+ cities worldwide). Your actual location is never sent to DevGlobe. |
| Coding time | Yes | Accumulated per day, per language. Server-side rate-limited to prevent abuse. |
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

### Commit stats verification

Commit statistics (insertions/deletions) are **never sent by the plugin**. They are fetched **server-side** directly from the GitHub API using the token granted when you install the GitHub App. This prevents any falsification — the stats displayed on DevGlobe always match the real data on GitHub.

### Rate limiting

The server enforces rate-limiting on heartbeats to prevent abuse on coding time stats.

### Location

The plugin determines your city from your IP address via an external geolocation service. Coordinates are **snapped to your city center** using a database of 152,000+ cities (GeoNames) — you appear at your city's canonical center on the globe, not at your address. If the city is not found in the database, coordinates are randomly offset within a 20 km radius. The location is cached for 1 hour.

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
