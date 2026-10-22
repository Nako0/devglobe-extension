# DevGlobe — OpenCode Plugin

Track your OpenCode activity on the [DevGlobe](https://devglobe.app) world map.

## Prerequisites

- [OpenCode](https://github.com/anomalyco/opencode) installed
- A DevGlobe account (sign in at [devglobe.app](https://devglobe.app) with GitHub, X (Twitter), or Google)

## Install

Add `opencode-devglobe` to your `opencode.json`:

```json
{
  "plugins": ["opencode-devglobe"]
}
```

OpenCode installs the plugin automatically on startup via npm.

OpenCode 1 users: the same package still ships the V1 plugin implementation, so the legacy `"plugin"` key keeps working.

<details>
<summary>Alternative: install from a local clone</summary>

```bash
git clone https://github.com/Nako0/devglobe-extension
cd devglobe-extension/opencode-plugin
npm install && npm run build
```

Then in your `opencode.json`:

```json
{
  "plugins": ["/path/to/devglobe-extension/opencode-plugin"]
}
```

</details>

## Setup

After installing, restart OpenCode and ask it to set up DevGlobe:

```
setup devglobe with my key devglobe_YOUR_KEY_HERE
```

Get your API key at [devglobe.app/dashboard/settings](https://devglobe.app/dashboard/settings).

OpenCode will call the `devglobe_setup` tool, which saves your key to `~/.devglobe/config.toml` (mode `0600`). Heartbeats start automatically while you code.

Visibility settings (anonymous mode, repo sharing on the live globe, profile mode) are managed on [devglobe.app/dashboard/settings](https://devglobe.app/dashboard/settings).

### Alternative: manual setup

```bash
mkdir -p ~/.devglobe
cat > ~/.devglobe/config.toml <<'EOF'
api_key = "YOUR_API_KEY"
EOF
```

Or use an environment variable (add to `~/.zshrc` or `~/.bashrc`):

```bash
export DEVGLOBE_API_KEY="your-api-key-here"
```

## Commands

The plugin registers tools that the AI agent can call on your behalf. Just ask in natural language:

| What you say | Tool called | Description |
|--------------|-------------|-------------|
| "setup devglobe with key X" | `devglobe_setup` | Configure your API key (writes to `~/.devglobe/config.toml`) |
| "set my devglobe status to Working on X" | `devglobe_status` | Set a status message on your globe profile |
| "check devglobe status" | `devglobe_check` | Verify installation (config, API key, privacy flags) |

## How it works

The plugin hooks into tool executions and session events to detect coding activity. It sends a heartbeat to DevGlobe at most once per minute via the shared `devglobe-core`. It automatically detects:

- The programming language from the files you interact with (exact file paths from tool calls)
- Your git repository (origin URL, branch, and the current file relative to the repo root)

Your coding session then appears live on the [DevGlobe map](https://devglobe.app/space) with the editor shown as `opencode`.

A forced heartbeat is sent when the session goes idle or is deleted, ensuring your last activity is always recorded.

## Updating

Since the plugin is installed from npm, OpenCode fetches the latest version automatically. To force an update, remove the cache:

```bash
rm -rf ~/.cache/opencode/npm/opencode-devglobe@latest
```

On OpenCode 1 the cache lives at `~/.cache/opencode/node_modules/opencode-devglobe`.

Then restart OpenCode.

## Privacy

The plugin sends programming language, editor name, OS, coding time, the origin remote URL of your current git repo (when present), branch name, and the file path **relative to your repo root** — never an absolute home path.

Files outside any git repository are not tracked beyond their language. We never read source code, file contents, keystrokes, or commit messages.

Local privacy flags can be toggled in `~/.devglobe/config.toml` under `[privacy]`: `hide_file_names`, `hide_branch_names`, `hide_project_names` (the project flag also hides branches).

Globe-side visibility (anonymous mode, repo sharing on the live globe, profile mode) is managed on [devglobe.app/dashboard/settings](https://devglobe.app/dashboard/settings).

## Support

- Website: [devglobe.app](https://devglobe.app)
- Contact: [contact@devglobe.app](mailto:contact@devglobe.app)
- Issues: [GitHub Issues](https://github.com/Nako0/devglobe-extension/issues)
