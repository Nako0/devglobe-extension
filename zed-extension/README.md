# DevGlobe — Zed Extension

Show your live coding presence on the [DevGlobe](https://devglobe.xyz) world map from Zed.

## Requirements

- [Zed](https://zed.dev) editor
- [Node.js](https://nodejs.org) 20 or later
- A DevGlobe account and API key from [devglobe.xyz](https://devglobe.xyz)

## Setup

1. Install the DevGlobe extension from the Zed extensions marketplace
2. Save your API key:

```bash
mkdir -p ~/.devglobe
echo "devglobe_YOUR_KEY_HERE" > ~/.devglobe/api_key
```

3. Open a project in Zed and start coding — you'll appear on the globe within 30 seconds

## How It Works

Since Zed extensions run in a sandboxed WASM environment without access to HTTP, timers, or file events, this extension uses Zed's [MCP context server](https://zed.dev/docs/extensions/mcp-extensions) feature to launch a lightweight Node.js process that runs alongside your editor.

The Node.js server:
- Monitors file changes in your workspace to detect coding activity
- Detects programming language from file extensions (50+ languages)
- Sends a heartbeat every 30 seconds while you're actively coding
- Pauses after 60 seconds of inactivity
- Resolves your city-level location via IP geolocation (cached 1 hour)

## Privacy

- No source code, file contents, or keystrokes are collected
- Only language name, city-level location, and editor name are sent
- Geolocation is resolved via your IP using third-party APIs (freeipapi.com, ipapi.co)
- See [PRIVACY.md](../PRIVACY.md) for full details

## Configuration

| Method | Description |
|--------|-------------|
| `~/.devglobe/api_key` | Plain text file with your API key |
| `DEVGLOBE_API_KEY` env var | Alternative: set in your shell profile |

## Architecture

```
Zed Editor
  └── extension.toml (registers MCP context server)
        └── node server/devglobe-server.js
              ├── activity.js — fs.watch file change detection
              ├── heartbeat.js — Supabase RPC client
              ├── geo.js — IP geolocation with cache
              ├── git.js — repository detection
              └── languages.js — file extension → language map
```
