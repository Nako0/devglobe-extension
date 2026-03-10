---
name: setup
description: Configure DevGlobe plugin with your API key
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash
---

Configure the DevGlobe plugin. User arguments: $ARGUMENTS

## Rules

- The argument is the API key (a single string, no spaces)
- If no argument is provided, show an error with usage instructions

## Error case

If no API key is provided AND no key exists at `~/.devglobe/api_key`:
show an error:
- Usage: `/devglobe:setup YOUR_API_KEY`
- Get your API key at https://devglobe.xyz (profile settings)
- Contact: contact@devglobe.xyz

## Steps

1. Create `~/.devglobe/` directory if needed
2. Write the API key to `~/.devglobe/api_key` (plain text, no trailing newline)
3. If `~/.devglobe/config.json` does not exist, create it with defaults: `{"shareRepo": false, "anonymousMode": true}`
4. If it already exists, leave it unchanged

## Output

Confirm the API key was saved. Show current settings from `~/.devglobe/config.json`.
Mention they're now live on https://devglobe.xyz.
Mention other commands: `/devglobe:status`, `/devglobe:anonymous`, `/devglobe:share-repo`.
