# Eremos CLI

Official CLI for interacting with the [Eremos](https://eremos.jp) platform.

## Requirements
- Node.js >= 20

## Installation
```bash
npm install -g eremos
```

## Usage
```bash
eremos login          # OAuth login (opens browser)
eremos status         # Check authentication status
eremos me             # View your profile
eremos content list   # List contents
eremos --help         # Show all commands
```

For full CLI reference, see https://eremos.jp/skill.md

## `me` Behavior
- `eremos me` always aims to return a usable self profile.
- It first calls `GET /api/users/me`.
- If OAuth receives `OAUTH_NOT_ALLOWED`, it automatically falls back to `GET /api/users/{sub}` (JWT `sub`).
- `--json` output includes `data.source`:
  - `users_me`: direct response from `/api/users/me`
  - `users_get_fallback`: fallback response from `/api/users/{id}`

## OAuth
- The CLI uses OAuth 2.1 PKCE with a loopback redirect (`http://127.0.0.1:17654/callback`).
- Use `eremos login --manual` if the local server cannot be started.
- Tokens are stored at `~/.eremos/credentials.json`.

## License
MIT
