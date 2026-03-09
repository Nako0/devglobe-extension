# DevGlobe — Claude Code Plugin

Track your Claude Code activity on the [DevGlobe](https://devglobe.xyz) world map.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) installed
- [Node.js](https://nodejs.org) (v18+)
- A DevGlobe account (sign in with GitHub at [devglobe.xyz](https://devglobe.xyz))

## Install

Add the marketplace and install the plugin:

```bash
/plugin marketplace add Nako0/devglobe-extension
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

### Optional: share your repository

To display your current repo on your DevGlobe profile, create `~/.devglobe/config.json`:

```json
{
  "shareRepo": true
}
```

## How it works

The plugin hooks into Claude Code events (`PostToolUse`, `UserPromptSubmit`, `Stop`) and sends a heartbeat to DevGlobe at most once per minute. It automatically detects:

- The programming language from the files you interact with
- Your git repository
- Your approximate location (via IP geolocation, cached for 1 hour)

Your coding session then appears live on the [DevGlobe map](https://devglobe.xyz) with the editor shown as `claude-code`.
