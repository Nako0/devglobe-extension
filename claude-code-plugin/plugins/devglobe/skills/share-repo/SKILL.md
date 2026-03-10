---
name: share-repo
description: Enable or disable repo sharing on DevGlobe
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

Set repo sharing for DevGlobe. User arguments: $ARGUMENTS

## Rules

- Argument must be `true` or `false`
- If no argument: show the current value from `~/.devglobe/config.json` and explain usage

## Error cases

- No API key at `~/.devglobe/api_key` and no `DEVGLOBE_API_KEY` env var: show error, ask to run `/devglobe:setup YOUR_API_KEY` first.
- No argument provided: show current value and usage: `/devglobe:share-repo true` or `/devglobe:share-repo false`
- Argument is not `true` or `false`: show error with usage

## Steps

1. Read `~/.devglobe/config.json` (default: `{"shareRepo": false, "anonymousMode": true}`)
2. Set `shareRepo` to the provided value (`true` or `false`)
3. Write updated config to `~/.devglobe/config.json` (pretty-printed JSON)

## Output

Confirm the change. Explain briefly what repo sharing does:
- `true`: your current repo name (e.g. `owner/repo`) is visible on your DevGlobe profile.
- `false`: your repo name is hidden from the globe (still sent server-side for project scoring, but never displayed).
