---
name: status
description: Set a status message on your DevGlobe profile
user-invocable: true
allowed-tools:
  - Read
  - Bash
---

Update the DevGlobe status message. User arguments: $ARGUMENTS

## Error cases

- If `$ARGUMENTS` is empty: show error explaining usage: `/devglobe:status Your message here` (max 100 characters)
- If message is longer than 100 characters: show error with current length
- If no API key exists (check `~/.devglobe/api_key` file and `DEVGLOBE_API_KEY` env var): show error asking to run `/devglobe:setup YOUR_API_KEY` first. Get key at https://devglobe.xyz. Contact: contact@devglobe.xyz

## Steps

1. Read the API key from `~/.devglobe/api_key` (or env var `DEVGLOBE_API_KEY`)
2. The status message is the full `$ARGUMENTS` string (preserve spaces)
3. Send the update by piping JSON into the update-status script:

```bash
echo '{"api_key": "THE_KEY", "message": "THE_MESSAGE"}' | ${CLAUDE_PLUGIN_ROOT}/scripts/update-status
```

Replace `THE_KEY` with the actual API key and `THE_MESSAGE` with the user's message (escape JSON special characters in the message).

4. The script returns JSON: `{"ok": true}` on success, `{"error": "..."}` on failure
5. If error: show it and suggest checking the API key

## Output

- On success: confirm the status was set, show the message
- On failure: show the error and suggest running `/devglobe:setup` if the key might be wrong
