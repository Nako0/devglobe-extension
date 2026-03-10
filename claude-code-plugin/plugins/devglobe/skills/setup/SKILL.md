---
name: setup
description: Configure DevGlobe plugin — set your API key, toggle shareRepo and anonymousMode
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

Configure the DevGlobe plugin. User arguments: $ARGUMENTS

## Parsing

- The API key is the first non-flag argument (not starting with `--`)
- Supported flags: `--share-repo`, `--anonymous`
- Examples:
  - `/devglobe:setup sk-abc123` → save key, create default config
  - `/devglobe:setup sk-abc123 --share-repo --anonymous` → save key, enable both
  - `/devglobe:setup --share-repo` → toggle shareRepo (no key change)
  - `/devglobe:setup --anonymous` → toggle anonymousMode (no key change)
  - `/devglobe:setup` → no args, show error

## Error cases

- If no API key is provided AND no flags AND no key exists at `~/.devglobe/api_key`:
  show an error explaining that an API key is required. Get it at https://devglobe.xyz (profile settings). Contact: contact@devglobe.xyz
- If only flags are provided AND no key exists at `~/.devglobe/api_key`:
  show an error asking to run `/devglobe:setup YOUR_API_KEY` first.

## Steps

1. Create `~/.devglobe/` directory if needed
2. If an API key argument is provided, write it to `~/.devglobe/api_key` (plain text, no newline)
3. Read existing config from `~/.devglobe/config.json` (default: `{"shareRepo": false, "anonymousMode": false}`)
4. If `--share-repo` flag present: toggle `shareRepo` (`true` → `false`, `false` → `true`)
5. If `--anonymous` flag present: toggle `anonymousMode` (`true` → `false`, `false` → `true`)
6. If API key provided without flags: set defaults only if keys missing (`shareRepo` defaults to `false`, `anonymousMode` defaults to `false`)
7. Write config to `~/.devglobe/config.json` (pretty-printed JSON)

## Output

Show the user a concise confirmation:
- If key was saved: confirm it
- Always show current settings (shareRepo, anonymousMode values)
- If first setup: mention they're now live on https://devglobe.xyz and can set a status with `/devglobe:status`
- If toggle only: confirm what changed
