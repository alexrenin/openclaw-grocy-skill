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

Check Grocy connectivity and API key validity:

```bash
node bin/grocy-openclaw.js system-info --format json
```

Show Grocy quantity units:

```bash
node bin/grocy-openclaw.js units --format table
```

Create a new Grocy quantity unit:

```bash
node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
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

Create a new Grocy product object:

```bash
node bin/grocy-openclaw.js product-create --name "Молоко" --stock-unit "л" --format json
```

Create a product that is purchased in one unit but consumed or stored in another:

```bash
node bin/grocy-openclaw.js product-create --name "Огурцы маринованные" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --consume-unit "шт" --format json
```

Prefer unit names in chat workflows. The command accepts exact Grocy unit names, plural names, and common aliases such as `кг`, `килограмм`, `кило`, `kg`, `л`, `литр`, `шт`, and `штука`.

If unit matching is ambiguous, the command prints matching unit choices. If a unit is unknown, it prints available units. Use `units --format table` when the agent needs to inspect configured Grocy units.

For chat workflows, do not create a new unit immediately when a product unit is unknown. First show suitable existing units to the user. Create a new unit with `unit-create` only when the user confirms none of the existing units fit.

You may also specify units by id when an automation already knows the id:

```bash
node bin/grocy-openclaw.js product-create --name "Картофель" --stock-unit-id 2 --format json
```

Supported `product-create` options:

- `--name`: required product name
- `--stock-unit` or `--stock-unit-id`: required stock unit; prefer `--stock-unit` for chat
- `--purchase-unit` or `--purchase-unit-id`: optional purchase unit, defaults to stock unit
- `--purchase-to-stock-factor`: required when purchase unit differs from stock unit; means how many stock units are in 1 purchase unit
- `--consume-unit` or `--consume-unit-id`: optional consume unit, defaults to stock unit
- `--consume-to-stock-factor`: required when consume unit differs from stock unit; means how many stock units are in 1 consume unit
- `--description`: optional product description
- `--format json`: required output format

For chat agents: if the user asks to create a product with different units but does not give the conversion factor, ask before running `product-create`. For example, if the product is stored as `шт` and purchased as `банка`, ask how many pieces are in one jar.

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

To verify Grocy connectivity from the deployed skill folder:

```bash
node bin/grocy-openclaw.js system-info --format json
```

To inspect configured Grocy quantity units:

```bash
node bin/grocy-openclaw.js units --format table
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
- Read commands are read-only.
- `product-create` modifies Grocy and must only be run when the user explicitly asks to create a product.
- `unit-create` modifies Grocy and must only be run after existing units were considered and the user confirms that a new unit is needed.
- Future write commands must be separate from read commands and require explicit user intent.

## Roadmap

- add item to shopping list
- search products by name
- mark shopping item done
- stock summaries
- expiring products
