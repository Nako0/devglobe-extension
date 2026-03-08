# DevGlobe — Claude Code Plugin

[Claude Code](https://claude.ai/claude-code) plugin for [DevGlobe](https://devglobe.xyz). Appear active on the globe while coding with an AI agent.

## How it works

The plugin uses Claude Code's native **hooks** system to send a heartbeat to DevGlobe on every significant action:

- **PostToolUse** — after each tool use (Edit, Write, Bash...)
- **UserPromptSubmit** — when you send a prompt
- **Stop** — at the end of a session (final heartbeat)

Heartbeats are sent **async** (non-blocking) and **rate-limited to 1 per minute** to avoid spamming the API.

### Data sent

| Data | Source | Description |
|------|--------|-------------|
| Language | Edited file extension (`tool_input.file_path`) | TypeScript, Python, Rust... (~100 languages supported) |
| Repository | `git remote get-url origin` | `owner/repo` format |
| Editor | Hardcoded | `claude-code` |
| Geolocation | IP (rounded to ~11km) | City, latitude, longitude |

Geolocation is **cached locally for 1 hour** to limit network calls.

## Installation

### 1. Get your API key

Log in to [devglobe.xyz](https://devglobe.xyz), go to your settings, and copy your API key (format `devglobe_xxxxxxxxxxxx`).

### 2. Configure the key

**Option A** — File (recommended):

```bash
mkdir -p ~/.devglobe
echo "YOUR_API_KEY" > ~/.devglobe/api_key
```

**Option B** — Environment variable:

```bash
export DEVGLOBE_API_KEY="YOUR_API_KEY"
```

### 3. Install the plugin

The plugin is not yet on the official Claude Code marketplace. Local installation:

```bash
# Clone the DevGlobe repo, then:
claude plugin marketplace add /path/to/extensions/claude-code-plugin
claude plugin install devglobe
```

That's it. The plugin is automatically active in all your Claude Code sessions.

## Uninstall

```bash
claude plugin uninstall devglobe
```

To also remove the local configuration:

```bash
rm -f ~/.devglobe/api_key
rm -f ~/.devglobe/config.json
```

## Configuration (optional)

Create `~/.devglobe/config.json` to customize behavior:

```json
{
  "shareRepo": true
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shareRepo` | `boolean` | `false` | Display the repo name on the globe |

## Development

```bash
cd extensions/claude-code-plugin/plugins/devglobe
npm install
npm run build    # Single build
npm run watch    # Auto-rebuild on changes
```

The build uses **esbuild** and produces `dist/index.js` (Node.js bundle, zero runtime dependencies).

### Structure

```
claude-code-plugin/
├── .claude-plugin/
│   └── marketplace.json       # Marketplace manifest
└── plugins/devglobe/
    ├── .claude-plugin/
    │   └── plugin.json         # Plugin metadata
    ├── hooks/
    │   └── hooks.json          # Hook declarations
    ├── scripts/
    │   └── run                 # Shell launcher (detects Node.js)
    ├── src/
    │   ├── index.ts            # Main logic
    │   ├── lang.ts             # Extension → language map
    │   └── types.ts            # TypeScript types
    ├── dist/
    │   └── index.js            # Compiled bundle
    ├── package.json
    └── tsconfig.json
```

## Verification

To verify the plugin is working, launch Claude Code in a project and make a file edit. You should appear active on the globe with the Claude Code icon on your profile.

You can also check the logs in Claude Code's debug mode to see the heartbeats being sent.
