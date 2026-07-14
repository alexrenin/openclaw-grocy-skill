# AGENTS.md

## Project

This repository contains a reusable OpenClaw skill for Grocy.

The goal is to let OpenClaw agents read and, later, modify a user's Grocy home inventory and shopping list through the Grocy REST API.

This must be developed as a reusable public skill, not as a one-off private script.

## Current scope

The initial read commands remain read-only.

The skill may read Grocy system info, products, product locations, quantity units, shopping list items, recipes, custom fields, and stock.

Write commands include `product-create`, `unit-create`, `recipe-create`, and `userfields-create`. Run them only when the user explicitly asks to modify Grocy. Keep write commands separate from read commands, clearly documented, and covered by tests.

## Core principles

- Build this as a reusable public OpenClaw skill.
- Keep the first version small, reliable, and easy to install.
- Prefer plain Node.js 18+ and built-in APIs.
- Avoid external dependencies unless there is a strong reason.
- Keep code readable, modular, and testable.
- Support Russian output because the initial user workflow is Russian-speaking.
- Configuration must come from environment variables.
- Do not hardcode personal paths, IPs, Telegram IDs, VPS hostnames, or API keys.
- Never commit `.env` or real secrets.
- Never print `.env` contents in logs or command output.
- Never reveal `GROCY_API_KEY`.

## Required environment variables

The skill must be configured through environment variables:

```env
GROCY_URL=http://grocy
GROCY_API_KEY=replace_me
```

Required variables:

- `GROCY_URL`
- `GROCY_API_KEY`

Rules:

- `GROCY_URL` may include or omit a trailing slash.
- `GROCY_API_KEY` must only be used in the `GROCY-API-KEY` request header.
- Error messages must never include the API key.

## Expected repository structure

Create and maintain this structure:

```text
openclaw-grocy-skill/
|-- AGENTS.md
|-- README.md
|-- SKILL.md
|-- package.json
|-- .env.example
|-- .gitignore
|-- bin/
|   `-- grocy-openclaw.js
|-- src/
|   |-- grocy-client.js
|   |-- format-shopping-list.js
|   `-- commands/
|       |-- api-docs.js
|       |-- system-info.js
|       |-- locations.js
|       |-- units.js
|       |-- unit-create.js
|       |-- product-create.js
|       |-- recipe-create.js
|       |-- shopping-list.js
|       |-- products.js
|       |-- userfields.js
|       |-- userfields-create.js
|       |-- userfields-get.js
|       `-- stock.js
|-- test/
|   `-- format-shopping-list.test.js
`-- scripts/
    |-- deploy-local.sh
    `-- smoke-test-openclaw.sh
```

## CLI commands

Implement these commands:

```bash
node bin/grocy-openclaw.js api-docs --format text
node bin/grocy-openclaw.js api-docs --format json
node bin/grocy-openclaw.js system-info --format json
node bin/grocy-openclaw.js locations --format table
node bin/grocy-openclaw.js locations --format json
node bin/grocy-openclaw.js units --format table
node bin/grocy-openclaw.js units --format json
node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
node bin/grocy-openclaw.js product-create --name "Молоко" --location "Холодильник" --stock-unit "л" --format json
node bin/grocy-openclaw.js product-create --name "Огурцы маринованные" --location "Кладовка" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --consume-unit "шт" --format json
node bin/grocy-openclaw.js recipe-create --name "Оливье" --base-servings 4 --ingredients '[{"name":"Картофель","amount":3,"unit":"шт"},{"name":"Огурцы маринованные","amount":2,"unit":"шт","location":"Кладовка"}]' --format json
node bin/grocy-openclaw.js userfields --entity recipes --format table
node bin/grocy-openclaw.js userfields-create --entity recipes --caption "Время готовки" --type text-single-line --format json
node bin/grocy-openclaw.js userfields-get --entity recipes --object-id 10 --format json
node bin/grocy-openclaw.js shopping-list --format text
node bin/grocy-openclaw.js shopping-list --format json
node bin/grocy-openclaw.js products --format table
node bin/grocy-openclaw.js products --format json
node bin/grocy-openclaw.js stock --format table
node bin/grocy-openclaw.js stock --format json
```

The CLI should:

- Validate required environment variables.
- Print readable errors.
- Exit with non-zero status on failure.
- Never print secrets.
- Support `--help`.
- Keep output suitable for OpenClaw to return to the user.

OpenClaw agents should always use the CLI for Grocy work. Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts; the CLI owns API key handling, safe errors, and chat-friendly output.

## Grocy API

Use the Grocy REST API.

Before adding or changing any command that calls the Grocy API, run:

```bash
node bin/grocy-openclaw.js api-docs --format text
```

Use the version-specific OpenAPI link for the installed Grocy version first. Use `master` only when intentionally checking upcoming Grocy behavior. Verify the endpoint, entity name, query parameters, response shape, and request payload fields in OpenAPI before implementing the command.

Required endpoints for the initial read-only version:

```text
GET /api/system/info
GET /api/objects/products
GET /api/objects/locations
GET /api/objects/recipes
GET /api/objects/recipes_pos
GET /api/objects/userfields
GET /api/userfields/{entity}/{objectId}
GET /api/objects/quantity_units
GET /api/objects/shopping_list
GET /api/stock
```

Required endpoints for explicit write commands:

```text
POST /api/objects/products
POST /api/objects/quantity_units
POST /api/objects/quantity_unit_conversions
POST /api/objects/recipes
POST /api/objects/recipes_pos
POST /api/objects/userfields
```

Product-specific unit conversion factors must be stored as `quantity_unit_conversions` rows. Do not send `qu_factor_purchase_to_stock` or `qu_factor_consume_to_stock` fields in the `products` payload for Grocy 4.x.

Products must include `location_id` when created. The CLI should accept `--location` for chat workflows and resolve it against `GET /api/objects/locations`; users should not be expected to know Grocy location ids.

The Grocy client should:

- Send the `GROCY-API-KEY` header.
- Use `GROCY_URL` as the base URL.
- Support `GROCY_URL` with or without a trailing slash.
- Throw readable errors for non-2xx responses.
- Avoid leaking secrets in error output.
- Use built-in `fetch` from Node.js 18+.

## Shopping list formatting

Text output for a non-empty shopping list should look like this:

```text
Список покупок:

• Заправка для Борща MAGGI — 2 Упаковка
• Картофель — 0.5 кг
• Свинина — 0.6 кг
• Сметана — 0.4 кг
```

If the list is empty:

```text
Список покупок пуст.
```

Formatting rules:

- Use Russian labels by default.
- Include product name.
- Include amount when present.
- Include unit when present.
- Include note when present.
- Do not include completed shopping list items by default.
- Keep output compact enough for Telegram.

## Products output

The products command should be read-only.

For table output, show at least:

- product id
- product name
- description if present
- stock unit if useful
- purchase unit if useful

For JSON output, return structured data suitable for later automation.

## Stock output

The stock command should be read-only.

For table output, show at least:

- product id
- product name
- amount
- unit
- best-before date if available

For JSON output, return structured data suitable for later automation.

## OpenClaw skill behavior

`SKILL.md` should teach OpenClaw when to use this skill.

Use this skill when the user asks about:

- Grocy
- groceries
- home inventory
- household supplies
- shopping list
- stock
- products in stock
- create product
- add product
- список покупок
- покупки
- что купить
- что есть дома
- остатки
- продукты дома
- бытовые расходники

The skill must tell OpenClaw:

- how to load environment variables safely
- how to run the CLI
- not to reveal `.env`
- not to reveal `GROCY_API_KEY`
- not to modify Grocy unless the user explicitly asks
- to keep write commands separate from read commands
- to prefer quantity unit names and aliases in chat workflows, not raw ids
- to use `units` when the configured Grocy units need to be inspected
- to prefer location names in chat workflows, not raw ids
- to use `locations` when configured Grocy product locations need to be inspected
- to ask which existing location to use before `product-create` when the product location is missing
- to require conversion factors when purchase or consume units differ from stock unit
- to ask a clarification question before `product-create` when a required conversion factor is missing
- to ask for missing recipe ingredient amounts or units before `recipe-create`
- to ask for a storage location before `recipe-create` when the recipe includes missing products without locations
- to let `recipe-create` create missing ingredient products only when the user explicitly asked to create the recipe
- to use `userfields` for configured custom fields and `userfields-get` for values on a specific object
- to ask for the custom field type before `userfields-create` when the user did not provide it
- to return command output clearly to the user

Read commands must remain read-only.

## Deploy target

For local development, `scripts/deploy-local.sh` should copy the repository into the OpenClaw workspace.

Default workspace:

```bash
~/.openclaw/workspace
```

Default skill target:

```bash
~/.openclaw/workspace/skills/grocy
```

The script should support:

```bash
OPENCLAW_WORKSPACE=/custom/workspace ./scripts/deploy-local.sh
```

If `OPENCLAW_COMPOSE_DIR` is set, the script may restart the OpenClaw gateway:

```bash
OPENCLAW_COMPOSE_DIR=~/home-server/openclaw ./scripts/deploy-local.sh
```

Deploy script requirements:

- Create target directories if missing.
- Copy `SKILL.md`, `bin/`, `src/`, `package.json`, and needed files.
- Do not overwrite an existing `.env`.
- Create `.env` from `.env.example` if missing.
- `chmod +x` executable scripts.
- Print clear next steps.
- Do not print secrets.

## Smoke test

`scripts/smoke-test-openclaw.sh` should:

- run from a deployed OpenClaw gateway environment
- load `.env` from the deployed skill folder
- run the shopping-list command
- never print secrets

Example expected command inside OpenClaw gateway:

```bash
cd /home/node/.openclaw/workspace/skills/grocy
set -a
. ./.env
set +a
node bin/grocy-openclaw.js shopping-list --format text
```

## Tests

Use Node.js built-in test runner.

```bash
npm test
```

Add tests for shopping list formatting:

- normal list
- empty list
- item without unit
- item with note
- completed items are ignored by default

Keep tests fast and independent from a real Grocy instance.

Use mocked data for formatting tests.

## README requirements

`README.md` should include:

- What this skill does
- Requirements
- Installation
- Environment variables
- Local CLI usage
- Deploy to OpenClaw workspace
- How to test inside OpenClaw gateway Docker container
- Security notes
- Roadmap

Roadmap should include:

- add item to shopping list
- search products by name
- mark shopping item done
- stock summaries
- expiring products

## Security requirements

Never commit or expose:

- `.env`
- `GROCY_API_KEY`
- Telegram bot token
- OpenClaw gateway token
- real VPS IPs or hostnames unless they are intentionally documentation examples

All examples must use placeholders.

Bad:

```env
GROCY_API_KEY=actual-secret-value
```

Good:

```env
GROCY_API_KEY=replace_me
```

## Current prototype behavior

The current working prototype can output a Grocy shopping list like:

```text
Список покупок:

• Заправка для Борща MAGGI — 2 Упаковка
• Картофель — 0.5 кг
• Свинина — 0.6 кг
• Сметана — 0.4 кг
```

Build a clean reusable version of this behavior.

## Development workflow

Prefer small, reviewable changes.

For each change:

1. Update code.
2. Update tests.
3. Run `npm test`.
4. Update README or SKILL.md if user-facing behavior changes.
5. Summarize what changed and what remains.

## Write operations

Write operations must be added carefully.

Implemented write operation:

- create quantity unit object
- create product object

Examples:

- add item to shopping list
- mark shopping item done
- consume stock
- add stock entry

Rules for future write operations:

- Keep read-only commands separate from write commands.
- Require explicit user intent before modifying Grocy.
- When a product unit is missing, offer existing `units` choices first.
- When a product location is missing, offer existing `locations` choices first.
- Create a new quantity unit only after the user confirms none of the existing units fit.
- Document write behavior clearly in `SKILL.md`.
- Add tests where possible.
- Prefer confirmation-oriented wording in the skill instructions.
