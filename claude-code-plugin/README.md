# DevGlobe — Claude Code Plugin

Track your Claude Code activity on the [DevGlobe](https://devglobe.xyz) world map.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) installed
- [Node.js](https://nodejs.org) (v18+)
- A DevGlobe account (sign in with GitHub at [devglobe.xyz](https://devglobe.xyz))

## Install

In Claude Code, run:

```
/plugin marketplace add Nako0/devglobe-extension
```
```
/plugin install devglobe@devglobe
```

That's it — Claude Code fetches the plugin directly from GitHub.

<details>
<summary>Alternative: install from a local clone</summary>

```bash
git clone https://github.com/Nako0/devglobe-extension
```

Then in Claude Code:

```
/plugin marketplace add ./devglobe-extension
/plugin install devglobe@devglobe
```

</details>

## Setup

Once the plugin is installed, configure it directly from Claude Code:

```
/devglobe:setup YOUR_API_KEY
```

Get your API key at [devglobe.xyz](https://devglobe.xyz) — sign in, then open your **profile settings**.

This command saves your key to `~/.devglobe/api_key` and creates default settings in `~/.devglobe/config.json` (anonymousMode on, shareRepo off).

> If no API key is provided, the command shows an error with instructions.

### Settings

```
/devglobe:anonymous true          # hide your exact location (default)
/devglobe:anonymous false         # show your real city on the globe
/devglobe:share-repo true         # display your repo name on the globe
/devglobe:share-repo false        # hide your repo name (default)
```

| Setting | Default | Description |
|---------|---------|-------------|
| `anonymousMode` | `true` | Your marker is placed on a random city in your country (from 152,000+ cities). Your real location is never sent. |
| `shareRepo` | `false` | Display your current repo on your DevGlobe profile |

Settings are stored in `~/.devglobe/config.json` and can also be edited manually.

### Status message

Display a custom status message on your DevGlobe profile:

```
/devglobe:status Shipping features with Claude
```

Max 100 characters. Requires a valid API key — run `/devglobe:setup` first.

### Alternative API key setup

If you prefer not to use `/devglobe:setup`, you can set your key manually:

**Option A** — Environment variable (add to `~/.zshrc` or `~/.bashrc`):
```bash
export DEVGLOBE_API_KEY="your-api-key-here"
```

**Option B** — Config file:
```bash
mkdir -p ~/.devglobe
echo "your-api-key-here" > ~/.devglobe/api_key
```

## How it works

The plugin hooks into Claude Code events (`PostToolUse`, `UserPromptSubmit`, `Stop`) and sends a heartbeat to DevGlobe at most once per minute. It automatically detects:

- The programming language from the files you interact with
- Your git repository (from `git remote get-url origin`)
- Your approximate location (via IP geolocation, cached for 1 hour)

Your coding session then appears live on the [DevGlobe map](https://devglobe.xyz) with the editor shown as `claude-code`.

## Commands

| Command | Description |
|---------|-------------|
| `/devglobe:setup YOUR_API_KEY` | Configure the plugin with your API key |
| `/devglobe:anonymous true/false` | Enable or disable anonymous mode |
| `/devglobe:share-repo true/false` | Enable or disable repo sharing |
| `/devglobe:status MESSAGE` | Set a status message on your DevGlobe profile |

## GitHub App — Verified commit stats

Commit statistics displayed on DevGlobe (insertions/deletions per week) are **never collected by this plugin**. They are fetched server-side via a [GitHub App](https://github.com/apps/devglobeapp) that requests only **Metadata: Read-only** — the most minimal permission available. No access to source code, file contents, commit messages, issues, or pull requests.

See the [main extensions README](../README.md#-github-app--verified-commit-stats) for details.

## Privacy

| Data | Sent | Detail |
|------|------|--------|
| Programming language | Yes | Detected from file extensions. Nothing else. |
| Approximate location | Yes | Coordinates **snapped to your city center** (from a database of 152,000+ cities). |
| Repo name | **Only if enabled** | `owner/repo` is sent only when `shareRepo` is enabled (`/devglobe:share-repo true`). Disabled by default — nothing is sent. |
| Anonymous mode | **On by default** | When enabled, real coordinates are replaced with a random city in your country (from a database of 152,000+ cities worldwide). Your actual location is never transmitted. Disable with `/devglobe:anonymous false`. |
| Coding time | Yes | Accumulated per day, per language. |

The plugin **never** reads your source code, file contents, file names, keystrokes, commit messages, environment variables, or credentials.

## Support

- Website: [devglobe.xyz](https://devglobe.xyz)
- Contact: [contact@devglobe.xyz](mailto:contact@devglobe.xyz)
- Issues: [GitHub Issues](https://github.com/Nako0/devglobe-extension/issues)

