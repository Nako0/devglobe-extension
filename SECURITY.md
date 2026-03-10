# Security Policy

## Supported versions

Only the latest release of each extension receives security updates.

| Extension | Current version | Status |
|-----------|----------------|--------|
| VS Code | 0.1.7 | Supported |
| JetBrains | 0.1.6 | Supported |
| Claude Code | 1.0.0 | Supported |

## Reporting a vulnerability

**Do not open a public issue.** Security vulnerabilities must be reported privately so we can fix them before they are exploited.

### How to report

1. **GitHub Private Vulnerability Reporting** (preferred) — go to the [Security tab](https://github.com/Nako0/devglobe-extension/security/advisories/new) and click *Report a vulnerability*.
2. **Email** — send a detailed report to **contact@devglobe.xyz**.

### What to include

- A clear description of the vulnerability
- Steps to reproduce (or a proof of concept)
- The affected extension(s) and version(s)
- The potential impact

### Response times

| Step | Target |
|------|--------|
| Acknowledgment | **48 hours** |
| Initial assessment | **5 business days** |
| Critical fix released | **7 days** |
| Non-critical fix released | **30 days** |

We will keep you informed of our progress throughout the process.

## Scope

The following are **in scope** for security reports:

### IDE extensions (this repository)

- Heartbeat data leaking information beyond what is documented (language, city-level location, optional repo name)
- API key exposure or insecure storage
- Bypass of anonymous mode (real location sent when anonymous mode is enabled)
- Code injection via the VS Code webview sidebar
- Insecure network communication (TLS downgrade, unencrypted requests)
- Unauthorized access to user data through the Supabase API or Row Level Security bypass

### Backend & infrastructure

- Supabase Row Level Security policy bypass (accessing or modifying another user's data)
- Supabase Edge Functions vulnerabilities
- GitHub App (devglobeapp) permission escalation or data leakage beyond documented scope

### Website

- Vulnerabilities on [devglobe.xyz](https://devglobe.xyz) (XSS, CSRF, authentication bypass, data exposure)

## Out of scope

- Rate limiting on the heartbeat endpoint (server-side throttling is already in place)
- The Supabase anonymous key being visible in source code (this is public by Supabase design — protection relies on RLS policies)
- Social engineering or phishing attacks
- Denial of service attacks
- Vulnerabilities in third-party geolocation services (freeipapi.com, ipapi.co) — report those to the respective service owners
- Vulnerabilities in dependencies of the IDE platforms themselves (VS Code, JetBrains, Claude Code)
- Issues that require physical access to the user's machine

## Security architecture

For a detailed description of what data is collected, how API keys are stored, and how network communication works, see the [Privacy & Security](README.md#privacy--security) section of the main README.

Key design decisions:

- **HTTPS only** — all network requests enforce TLS, no HTTP fallback
- **Minimal data** — only language, city-level location, and coding time are sent; source code, file names, and keystrokes are never accessed
- **Secure key storage** — OS keychain on VS Code (SecretStorage) and JetBrains (PasswordSafe); local config file on Claude Code (no keychain API available)
- **Content Security Policy** — VS Code webview uses a cryptographic nonce-based CSP
- **Row Level Security** — each user's data is isolated server-side
- **No telemetry** — no third-party analytics or tracking services

## Disclosure policy

We follow coordinated disclosure. Once a fix is released, we will:

1. Credit the reporter (unless they prefer to stay anonymous)
2. Publish a summary in the release notes
3. If the vulnerability is significant, publish a GitHub Security Advisory
