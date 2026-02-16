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

For full CLI reference, see https://eremos.jp/skill

## OAuth
- The CLI uses OAuth 2.1 PKCE with a loopback redirect (`http://127.0.0.1:17654/callback`).
- Use `eremos login --manual` if the local server cannot be started.
- Tokens are stored at `~/.eremos/credentials.json`.

## License
MIT
