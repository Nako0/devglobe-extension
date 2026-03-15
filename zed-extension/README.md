# DevGlobe — Zed Extension

Show your live coding presence on the [DevGlobe](https://devglobe.xyz) world map from Zed.

## Requirements

- [Zed](https://zed.dev) editor
- [Node.js](https://nodejs.org) 18 or later
- A DevGlobe API key from [devglobe.xyz](https://devglobe.xyz)

## Setup

### 1. Get your API key

Sign in on [devglobe.xyz](https://devglobe.xyz) with GitHub, then copy your API key from profile settings.

### 2. Configure DevGlobe

**macOS / Linux:**

```bash
mkdir -p ~/.devglobe
echo -n "devglobe_YOUR_KEY_HERE" > ~/.devglobe/api_key
echo '{"shareRepo": false, "anonymousMode": true}' > ~/.devglobe/config.json
```

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.devglobe"
"devglobe_YOUR_KEY_HERE" | Out-File -NoNewline "$env:USERPROFILE\.devglobe\api_key"
'{"shareRepo": false, "anonymousMode": true}' | Out-File "$env:USERPROFILE\.devglobe\config.json"
```

Replace `devglobe_YOUR_KEY_HERE` with your actual API key.

### 3. Install the extension

Install DevGlobe from the Zed extensions marketplace, or as a dev extension:

1. Open Zed
2. `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Linux) → "zed: install dev extension"
3. Select the `zed-extension/` folder

### 4. Trust your project

When you open a project, Zed may ask you to trust the worktree. Accept to allow the DevGlobe language server to start.

### 5. Start coding

Open any code file and start editing. You'll appear on the globe within 30 seconds. The extension detects your language automatically.

## Configuration

Edit `~/.devglobe/config.json` to change settings. Changes are detected automatically.

```json
{
  "shareRepo": false,
  "anonymousMode": true
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `shareRepo` | `false` | Show your repository name on the globe |
| `anonymousMode` | `true` | Appear on a random city in your country instead of your real location |

### Update status message

**macOS / Linux:**

```bash
cd /path/to/zed-extension/server
node -- dist/server.js status "Working on my project"
```

**Clear status:**

```bash
node -- dist/server.js status ""
```

## How it works

The extension runs a lightweight Language Server (LSP) that receives file open/change/save events from Zed. It uses DevGlobe's shared core to send heartbeats every 30 seconds while you're actively coding. After 1 minute of inactivity, heartbeats pause automatically.

### What is sent

- Programming language (e.g. "TypeScript", "Python")
- City-level location (snapped to a GeoNames city center, never exact)
- Editor name ("zed")
- Repository name (only if `shareRepo` is enabled)

### What is never sent

- Source code, file contents, or keystrokes
- File paths or names
- Exact coordinates or IP address

## Supported languages

80+ languages including: JavaScript, TypeScript, Python, Rust, Go, C, C++, Java, Kotlin, Swift, Ruby, PHP, Elixir, Haskell, Scala, and many more.

## Privacy

See [PRIVACY.md](../PRIVACY.md) for full details.
