<h1 align="center">DevGlobe for VS Code</h1>

<p align="center">
  <strong>Show up on a 3D globe in real time while you code.</strong><br/>
  Your activity is displayed live on <a href="https://devglobe.xyz">devglobe.xyz</a> — other developers see you, discover your projects and your links.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=devglobe.devglobe">VS Code Marketplace</a> &nbsp;·&nbsp;
  <a href="https://devglobe.xyz">devglobe.xyz</a> &nbsp;·&nbsp;
  <a href="https://github.com/Nako0/devglobe-extension">Source code</a>
</p>

---

> **Open source & transparent** — This extension is 100% open source. No code is read, no sensitive data is collected. You can audit every line on [GitHub](https://github.com/Nako0/devglobe-extension).

---

## How it works

1. Sign in on [devglobe.xyz](https://devglobe.xyz) with GitHub, X (Twitter), or Google
2. Copy your API key from the site settings
3. Open the **DevGlobe** sidebar in VS Code (globe icon in the activity bar)
4. Paste your API key → **Connect**
5. You're online — your marker appears on the globe

The extension sends a **heartbeat every 30 seconds** as long as you're actively coding. It pauses after 1 minute of inactivity. **After 10 minutes of inactivity, you disappear from the globe.**

---

## Features

| Feature | Description |
|---------|-------------|
| **Live heartbeat** | Sends your activity every 30s. Auto-pauses after 1 min of inactivity. |
| **Language detection** | Detects 48+ languages from your active editor tab. |
| **Git integration** | Detects your repo from the git remote. Commit stats (insertions/deletions) are verified server-side via the GitHub API. |
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

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `devglobe.trackingEnabled` | `true` | Enable/disable tracking |
| `devglobe.shareRepo` | `false` | Make your repo name visible on the globe |
| `devglobe.anonymousMode` | `false` | Hide your exact location — your marker is placed on a random city in your country (from a database of 152,000+ cities worldwide) |
| `devglobe.statusMessage` | `""` | Your status message (max 100 characters) |

### VS Code Web (vscode.dev)

The extension now provides a dedicated web runtime for vscode.dev and github.dev, with the same feature set as desktop VS Code:

- 30s heartbeats while active coding
- pause after 1 minute inactivity
- language detection from VS Code language IDs
- optional repo sharing toggle
- anonymous mode with random city in your country
- status message update
- offline/online recovery behavior
- status bar coding time

In web mode, the OS sent to DevGlobe is detected from browser-provided data (User-Agent), similar to server-side parsing of `HTTP_USER_AGENT`:

- `navigator.userAgentData.platform` (when available)
- `navigator.userAgent`
- `navigator.platform`

### How To Try (Desktop + Web)

From this repository:

```bash
cd devglobe-core
npm install
npm run build

cd ../vscode-extension
npm install
npm run compile
```

Then:

1. Desktop: run the `Run Extension` debug configuration.
2. Web: run the `Run Web Extension` debug configuration.
3. In the opened window, open the DevGlobe sidebar, connect with your API key, and start tracking.

### How To Test

Functional checks:

1. Connect/disconnect from the sidebar.
2. Start/stop tracking and verify status bar updates.
3. Toggle `Share repository` and `Anonymous mode`.
4. Set and clear status message.
5. Edit files in different languages and confirm language updates.
6. Temporarily disable network and verify offline warning, then restore network and verify recovery.

Network checks (Desktop or Web):

1. Open DevTools network tab.
2. Filter on `heartbeat`, `update_status_message`, `freeipapi`, `ipapi`, `ipwho`.
3. Confirm payloads match the documented fields below.

### Exact Network Requests

#### DevGlobe API

1. `POST https://kzcrtlbspkhlnjillhyz.supabase.co/rest/v1/rpc/heartbeat`
2. `POST https://kzcrtlbspkhlnjillhyz.supabase.co/rest/v1/rpc/update_status_message`

Headers:

- `Content-Type: application/json`
- `apikey: <supabase-anon-key>`
- `Authorization: Bearer <supabase-anon-key>`

Heartbeat payload fields:

- `p_key` (DevGlobe API key)
- `p_city` (city display label, when available)
- `p_lat` and `p_lng` (city-level coordinates)
- `p_lang` (language label)
- `p_editor` (e.g. `vscode`, `cursor`, `windsurf`)
- `p_anonymous` (boolean)
- `p_share_repo` (boolean)
- `p_repo` (`owner/repo`, only if share repo is enabled)
- `p_platform` (OS derived from browser User-Agent in web mode)

Status payload fields:

- `p_key`
- `p_message` (max 100 chars)

#### Geolocation providers

Used to determine city-level location (with fallback order):

1. `GET https://free.freeipapi.com/api/json`
2. `GET https://ipapi.co/json/`
3. `GET https://ipwho.is/`

These providers receive your public IP as part of normal HTTPS request routing. DevGlobe API key is never sent to them.

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

### What the extension sends

| Data | Sent | Detail |
|------|------|--------|
| Programming language | Yes | The language name of your active tab (e.g. "TypeScript"). Nothing else. |
| Approximate location | Yes | City + coordinates **snapped to your city center** (from a database of 152,000+ cities). You appear as an area on the globe, not an address. |
| Repo name | **You decide** | `owner/repo` is **only sent to the server if you enable the "Share repo" toggle** (disabled by default). When disabled, your repo name never leaves your IDE. |
| Anonymous mode | **You decide** | When enabled, your real coordinates are replaced with a random city in your country (from a database of 152,000+ cities worldwide). Your actual location is never sent to DevGlobe. |
| Coding time | Yes | Accumulated per day, per language. Server-side rate-limited to prevent abuse. |
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
| Your IP address | **Never stored** — used only for geolocation, then discarded |
| Your environment variables | **Never** |
| Your SSH keys or credentials | **Never** |

### Commit stats verification

Commit statistics (insertions/deletions) are **never sent by the extension**. They are fetched **server-side** directly from the GitHub API using the token granted when you install the GitHub App. This prevents any falsification — the stats displayed on DevGlobe always match the real data on GitHub.

### Rate limiting

The server enforces rate-limiting on heartbeats to prevent abuse on coding time stats.

### Location

The extension determines your city from your IP address via an external geolocation service. Coordinates are **snapped to your city center** using a database of 152,000+ cities (GeoNames) — you appear at your city's canonical center on the globe, not at your address. If the city is not found in the database, coordinates are randomly offset within a 20 km radius. The location is cached for 1 hour.

**Your IP address is never transmitted to DevGlobe.**

### API key storage

Your API key is stored in your **OS system keychain** via SecretStorage (macOS Keychain, Windows Credential Manager, Linux libsecret) — never in plain text. The extension automatically migrates old keys that were stored in plain text in `settings.json` to the secure keychain.

### Network security

- **HTTPS only** (TLS 1.2+) — no HTTP fallback
- Heartbeats go directly to the database — no intermediary server
- The side panel uses a **Content Security Policy** with a cryptographic nonce
- Server-side, Row Level Security policies isolate each user's data

---

## Requirements

- VS Code **1.80+**
- **Zero external dependencies** — uses only native VS Code and Node.js APIs

---

## Links

- [devglobe.xyz](https://devglobe.xyz) — the globe
- [Source code](https://github.com/Nako0/devglobe-extension) — public GitHub repo

---

<p align="center">
  <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>
