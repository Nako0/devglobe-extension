# DevGlobe — Claude Code Plugin

Track your Claude Code activity on the [DevGlobe](https://devglobe.xyz) world map.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) installed
- [Node.js](https://nodejs.org) (v18+)
- A DevGlobe account (sign in with GitHub at [devglobe.xyz](https://devglobe.xyz))

## Install

Clone the extension repository, then install the plugin from the local folder:

```bash
git clone https://github.com/Nako0/devglobe-extension
```

Open Claude Code **from the same folder**, then run these two slash commands:

```bash
/plugin marketplace add ./devglobe-extension/claude-code-plugin
/plugin install devglobe@devglobe
```

## Setup

1. Go to [devglobe.xyz](https://devglobe.xyz), sign in, then open your **profile settings** to copy your API key
2. Save your API key using one of these methods:

   **Option A** — Environment variable (add to your `~/.zshrc` or `~/.bashrc`):
   ```bash
   export DEVGLOBE_API_KEY="your-api-key-here"
   ```

   **Option B** — Config file:
   ```bash
   mkdir -p ~/.devglobe
   echo "your-api-key-here" > ~/.devglobe/api_key
   ```

3. Restart Claude Code — you're done! Your activity will appear on the globe.

### Configuration

Create `~/.devglobe/config.json` to customize behavior:

```json
{
  "shareRepo": true,
  "anonymousMode": false
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `shareRepo` | `false` | Display your current repo on your DevGlobe profile |
| `anonymousMode` | `false` | Hide your exact location — your marker is placed on a random city in your country (from a database of 152,000+ cities worldwide) |

## How it works

The plugin hooks into Claude Code events (`PostToolUse`, `UserPromptSubmit`, `Stop`) and sends a heartbeat to DevGlobe at most once per minute. It automatically detects:

- The programming language from the files you interact with
- Your git repository (from `git remote get-url origin`)
- Your approximate location (via IP geolocation, cached for 1 hour)

Your coding session then appears live on the [DevGlobe map](https://devglobe.xyz) with the editor shown as `claude-code`.

## GitHub App — Verified commit stats

Commit statistics displayed on DevGlobe (insertions/deletions per week) are **never collected by this plugin**. They are fetched server-side via a [GitHub App](https://github.com/apps/devglobeapp) that requests only **Metadata: Read-only** — the most minimal permission available. No access to source code, file contents, commit messages, issues, or pull requests.

See the [main extensions README](../README.md#-github-app--verified-commit-stats) for details.

## Privacy

| Data | Sent | Detail |
|------|------|--------|
| Programming language | Yes | Detected from file extensions. Nothing else. |
| Approximate location | Yes | Coordinates **snapped to your city center** (from a database of 152,000+ cities). |
| Repo name | Always sent | `owner/repo` is always sent to the server (used for featured project score), but **displayed on the globe only if `shareRepo` is enabled** (disabled by default). |
| Anonymous mode | **You decide** | When enabled, real coordinates are replaced with a random city in your country (from a database of 152,000+ cities worldwide). Your actual location is never transmitted. |
| Coding time | Yes | Accumulated per day, per language. |

The plugin **never** reads your source code, file contents, file names, keystrokes, commit messages, environment variables, or credentials.
