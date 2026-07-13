# OpenClaw Grocy Skill

Reusable read-only OpenClaw skill for Grocy home inventory, stock, products, and shopping list data.

The first version reads Grocy through the REST API and prints output that OpenClaw can return directly to the user. Shopping list text output is Russian by default.

## Requirements

- Node.js 18 or newer
- Grocy with REST API access enabled
- A Grocy API key
- OpenClaw workspace for deployment

No npm dependencies are required.

## Installation

Clone or copy this repository, then configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your Grocy URL and API key:

```env
GROCY_URL=http://grocy
GROCY_API_KEY=replace_me
```

`GROCY_URL` may include or omit a trailing slash.

## Environment Variables

Required variables:

- `GROCY_URL`: Grocy base URL, for example `http://grocy`
- `GROCY_API_KEY`: Grocy API key

Security rules:

- Do not commit `.env`.
- Do not print `.env`.
- Do not reveal `GROCY_API_KEY`.
- `GROCY_API_KEY` is used only in the `GROCY-API-KEY` request header.

## Local CLI Usage

Load environment variables before running commands:

```bash
set -a
. ./.env
set +a
```

Show the active shopping list as compact Russian text:

```bash
node bin/grocy-openclaw.js shopping-list --format text
```

Show the active shopping list as JSON:

```bash
node bin/grocy-openclaw.js shopping-list --format json
```

Show products as a table:

```bash
node bin/grocy-openclaw.js products --format table
```

Show products as JSON:

```bash
node bin/grocy-openclaw.js products --format json
```

Show stock as a table:

```bash
node bin/grocy-openclaw.js stock --format table
```

Show stock as JSON:

```bash
node bin/grocy-openclaw.js stock --format json
```

Show help:

```bash
node bin/grocy-openclaw.js --help
```

## Deploy To OpenClaw Workspace

Deploy to the default OpenClaw workspace:

```bash
./scripts/deploy-local.sh
```

Deploy to a custom workspace:

```bash
OPENCLAW_WORKSPACE=/custom/workspace ./scripts/deploy-local.sh
```

Default target:

```text
~/.openclaw/workspace/skills/grocy
```

The deploy script copies `SKILL.md`, `README.md`, `bin/`, `src/`, `package.json`, `.env.example`, and `scripts/`.

It does not overwrite an existing `.env`. If `.env` is missing in the deployed skill folder, it creates one from `.env.example`.

## Test Inside OpenClaw Gateway Docker Container

From inside the OpenClaw gateway container, run:

```bash
cd /home/node/.openclaw/workspace/skills/grocy
./scripts/smoke-test-openclaw.sh
```

Equivalent manual commands:

```bash
cd /home/node/.openclaw/workspace/skills/grocy
set -a
. ./.env
set +a
node bin/grocy-openclaw.js shopping-list --format text
```

## Development

Run tests:

```bash
npm test
```

On Windows PowerShell, if script execution policy blocks `npm`, use:

```powershell
npm.cmd test
```

Tests use mocked data and do not require a real Grocy instance.

## Security Notes

- Never commit `.env` or real secrets.
- Never expose `GROCY_API_KEY`, Telegram bot tokens, OpenClaw gateway tokens, private IPs, or private hostnames.
- Error output must not include `GROCY_API_KEY`.
- The current CLI is read-only.
- Future write commands must be separate from read commands and require explicit user intent.

## Roadmap

- add item to shopping list
- search products by name
- mark shopping item done
- stock summaries
- expiring products
