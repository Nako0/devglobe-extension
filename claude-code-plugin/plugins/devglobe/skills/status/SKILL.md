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
3. Send the update via curl:

```bash
curl -s -w "\n%{http_code}" -X POST \
  "https://kzcrtlbspkhlnjillhyz.supabase.co/rest/v1/rpc/update_status_message" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk" \
  -d '{"p_key": "API_KEY_HERE", "p_message": "MESSAGE_HERE"}'
```

Replace `API_KEY_HERE` with the actual key and `MESSAGE_HERE` with the user's message (escape JSON special characters).

4. If HTTP status is 200-299: success
5. If not: show error and suggest checking the API key

## Output

- On success: confirm the status was set, show the message
- On failure: show the error and suggest running `/devglobe:setup` if the key might be wrong
