---
name: anonymous
description: Enable or disable anonymous mode on DevGlobe
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

Set anonymous mode for DevGlobe. User arguments: $ARGUMENTS

## Rules

- Argument must be `true` or `false`
- If no argument: show the current value from `~/.devglobe/config.json` and explain usage

## Error cases

- No API key at `~/.devglobe/api_key` and no `DEVGLOBE_API_KEY` env var: show error, ask to run `/devglobe:setup YOUR_API_KEY` first.
- No argument provided: show current value and usage: `/devglobe:anonymous true` or `/devglobe:anonymous false`
- Argument is not `true` or `false`: show error with usage

## Steps

1. Read `~/.devglobe/config.json` (default: `{"shareRepo": false, "anonymousMode": true}`)
2. Set `anonymousMode` to the provided value (`true` or `false`)
3. Write updated config to `~/.devglobe/config.json` (pretty-printed JSON)

## Output

Confirm the change. Explain briefly what anonymous mode does:
- `true`: your location is replaced with a random city in your country (from 152,000+ cities). Your real location is never sent.
- `false`: your real city is shown on the globe (snapped to city center).
