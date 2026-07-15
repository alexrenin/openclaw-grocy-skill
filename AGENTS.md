# AGENTS.md

## Project

This repository contains a reusable OpenClaw skill for Grocy.

The goal is to let OpenClaw agents read and modify a user's Grocy home inventory and shopping list through the Grocy REST API.

This must be developed as a reusable public skill, not as a one-off private script.

## Current scope

The initial read commands remain read-only.

The skill may read Grocy system info, products, product locations, quantity units, shopping list items, recipes, custom fields, stock, menu planning data, and meal plan rows.

Write commands include product lifecycle commands, quantity unit lifecycle commands, recipe lifecycle commands, recipe ingredient lifecycle commands, custom field lifecycle and value commands, shopping list lifecycle commands, stock add/undo commands, and meal plan lifecycle commands. Run them only after explicit user confirmation for that specific data manipulation. Keep write commands separate from read commands, clearly documented, and covered by tests.

## Project tracking

Use `ROADMAP.md` as the source of truth for current implementation status, completed work, planned work, and verification notes.

The current implementation stage is tracked only in `ROADMAP.md` so changing status does not become duplicated or stale here.

Agent workflow:

- Before planning or implementing roadmap work, read `ROADMAP.md` to understand the current stage.
- When a roadmap item is completed, update `ROADMAP.md` in the same change.
- Use `[x]` in `ROADMAP.md` only after code, tests, and user-facing documentation are updated.
- Use `[~]` for functionality implemented locally but still waiting on real Grocy verification.
- Keep `AGENTS.md` focused on durable instructions; keep changing task status in `ROADMAP.md`.
- When adding a create/add write command, also add the corresponding edit/update and delete/remove/cancel needs to `ROADMAP.md`, unless they already exist.
- Preserve the confirmation rule in roadmap and docs: reads do not need confirmation, every data manipulation does.
- Keep `docs/commands.json` as a strict machine-readable safety policy index, not as a complete CLI option schema. The CLI owns full argument validation.
- Keep OpenClaw-facing runtime files free of development workflow instructions. Development guidance belongs in `AGENTS.md`, `ROADMAP.md`, and README development sections, not in `SKILL.md`, `docs/COMMANDS.md`, or `docs/commands.json`.

## Core principles

- Build this as a reusable public OpenClaw skill.
- Keep the first version small, reliable, and easy to install.
- Prefer plain Node.js 18+ and built-in APIs.
- Avoid external dependencies unless there is a strong reason.
- Keep code readable, modular, and testable.
- Treat entity lifecycle support as part of write-command design: agents must be able to correct or remove records they just created, not only add new ones.
- Support Russian output because the initial user workflow is Russian-speaking.
- Configuration must come from environment variables.
- Do not hardcode personal paths, IPs, Telegram IDs, VPS hostnames, or API keys.
- Never commit `.env` or real secrets.
- Never print `.env` contents in logs or command output.
- Never reveal `GROCY_API_KEY`.
- Treat a configured local `.env` as potentially pointing to the user's real Grocy instance, not a disposable test system.
- Do not create, update, delete, consume, add stock, or otherwise mutate real Grocy data just to test functionality unless the user explicitly approves a controlled test and cleanup plan.

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
- A present `.env` may contain real production-like Grocy credentials. Do not inspect, print, summarize, or copy its contents.
- Commands using `.env` should be read-only unless the user explicitly confirms a concrete data change against the real Grocy instance.

## Expected repository structure

Create and maintain this structure. Command and test files should grow with the CLI surface instead of being duplicated here exhaustively:

```text
openclaw-grocy-skill/
|-- AGENTS.md
|-- docs/
|   |-- COMMANDS.md
|   `-- commands.json
|-- README.md
|-- ROADMAP.md
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
|       |-- <command>.js
|       `-- <shared-command-helper>.js
|-- test/
|   |-- command-index.test.js
|   `-- <feature>.test.js
`-- scripts/
    |-- deploy-local.sh
    `-- smoke-test-openclaw.sh
```

## CLI commands

Keep these command groups implemented, documented, and covered by tests:

Read commands:

- `api-docs`, `system-info`, `locations`, `units`
- `shopping-list`, `products`, `product-search`
- `recipes`, `recipe-get`
- `userfields`, `userfields-get`
- `stock`, `stock-expiring`, `stock-low`, `stock-summary`
- `menu-check`, `menu-plan`, `menu-shopping-list`, `meal-plan`

Write commands:

- `unit-create`, `unit-update`, `unit-delete`
- `product-create`, `product-update`, `product-delete`
- `recipe-create`, `recipe-update`, `recipe-delete`
- `recipe-ingredient-add`, `recipe-ingredient-update`, `recipe-ingredient-delete`
- `userfields-create`, `userfields-update`, `userfields-delete`, `userfields-set`
- `shopping-list-add`, `shopping-list-update`, `shopping-list-delete`, `shopping-list-done`, `shopping-list-clean` without `--dry-run true`
- `stock-add`, `stock-transaction-undo`
- `meal-plan-add`, `meal-plan-update`, `meal-plan-delete`

`docs/COMMANDS.md` is the human command reference. `docs/commands.json` is the strict safety policy index for command routing, read/write classification, confirmation requirements, mode-specific safety behavior, supported output formats, and correction/removal paths. Do not turn `docs/commands.json` into a full CLI argument schema; the CLI dispatcher and command modules own option validation.

The CLI should:

- Validate required environment variables.
- Print readable errors.
- Exit with non-zero status on failure.
- Never print secrets.
- Support `--help`.
- Keep output suitable for OpenClaw to return to the user.

OpenClaw agents should always use the CLI for Grocy work. Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts; the CLI owns API key handling, safe errors, and chat-friendly output.

For every user-facing create/add command, plan matching edit/update and delete/remove/cancel workflows. This prevents the agent from being able to add an incorrect record but unable to fix or undo it through the skill.

Confirmation rule: read commands may run without confirmation. Any command that creates, updates, deletes, removes, cancels, reverses, marks done, consumes stock, adds stock, or otherwise changes Grocy data must be confirmed by the user immediately before execution.

Real Grocy rule: once `.env` is configured, assume it targets the user's real Grocy data. Use mocked tests for automated verification. For live checks, prefer read-only commands such as `system-info`, `api-docs`, `products`, `units`, `locations`, `shopping-list`, and `stock`. Write tests are allowed only when the user confirms the exact command, target object, amount, unit, price, expected effect, and cleanup plan.

Test record rule: if a live write test creates test data, use an obvious unique marker such as `OPENCLAW_TEST_<date>_<purpose>`, record the created ids from command output, and remove or reverse the test data immediately after verification. Do not create test data unless the corresponding cleanup command or manual cleanup path is already known.

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
PUT /api/userfields/{entity}/{objectId}
GET /api/objects/quantity_units
GET /api/objects/shopping_list
GET /api/stock
```

Required endpoints for explicit write commands:

```text
POST /api/objects/products
POST /api/objects/quantity_units
PUT /api/objects/quantity_units/{objectId}
DELETE /api/objects/quantity_units/{objectId}
POST /api/objects/quantity_unit_conversions
POST /api/objects/recipes
POST /api/objects/recipes_pos
POST /api/objects/userfields
PUT /api/objects/userfields/{objectId}
DELETE /api/objects/userfields/{objectId}
POST /api/stock/products/{productId}/add
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
- not to modify Grocy unless the user explicitly confirms the specific manipulation
- to keep write commands separate from read commands
- to run read-only commands without confirmation when needed
- to ask for confirmation before every non-read command, including create, update, delete, remove, cancel, done, consume, stock add, and stock correction commands
- to treat configured `.env` credentials as a real Grocy instance and avoid leaving test data behind
- to avoid write-based smoke tests against real Grocy unless the user explicitly confirms the exact write operation and cleanup plan
- to delete or reverse live test records immediately after the test, using the ids returned by the create/add command when possible
- to prefer correcting an existing record with update/delete commands over creating duplicates
- to ask for a new confirmation if the planned command, target object, amount, unit, price, or payload changes
- to prefer quantity unit names and aliases in chat workflows, not raw ids
- to use `units` when the configured Grocy units need to be inspected
- to use `unit-update` when correcting a quantity unit name, plural name, or description
- to use `unit-delete` only for unused quantity units and to stop when products, recipe ingredients, shopping list rows, or conversion rows still reference the unit
- to prefer location names in chat workflows, not raw ids
- to use `locations` when configured Grocy product locations need to be inspected
- to ask which existing location to use before `product-create` when the product location is missing
- to require conversion factors when purchase or consume units differ from stock unit
- to ask a clarification question before `product-create` when a required conversion factor is missing
- to ask for missing recipe ingredient amounts or units before `recipe-create`
- to ask for a storage location before `recipe-create` when the recipe includes missing products without locations
- to ask for confirmation before creating missing recipe ingredient products
- to use `--create-missing-products true` only after the user explicitly confirmed creating missing products
- to use `recipe-ingredient-add` when the user asks to add a missing ingredient to an existing recipe
- to use `recipe-ingredient-update` when the user asks to correct an existing recipe ingredient amount, unit, note, group, or flags
- to avoid deleting or recreating a recipe just to add one ingredient
- to avoid direct Grocy API calls for recipe ingredient updates
- to ask for missing ingredient amount or unit before `recipe-ingredient-add`
- to never match tablespoon-like text such as `ст.ложка` to the liter unit `л`
- to use `userfields` for configured custom fields and `userfields-get` for values on a specific object
- to use `userfields-set` for setting custom field values on an object
- to ask for the custom field type before `userfields-create` when the user did not provide it
- to use `userfields-update` to correct a custom field definition instead of creating a duplicate
- to use `userfields-delete` only after confirming the technical name and checking whether object values would be lost
- to require a separate explicit confirmation before `userfields-delete --delete-values true`
- to avoid direct Grocy API calls for custom field updates
- to use `stock-add` when the user explicitly asks to add purchased products or stock
- to avoid parsing receipts inside this skill; OpenClaw may parse receipts, then use the CLI for confirmed stock writes
- to ask which existing product to use before `stock-add` when product matching is ambiguous or missing
- to require stock amounts in the product stock unit for `stock-add`
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
- Copy `SKILL.md`, `README.md`, `docs/`, `bin/`, `src/`, `scripts/`, `package.json`, and needed files.
- Do not overwrite an existing `.env`.
- Create `.env` from `.env.example` if missing.
- `chmod +x` executable scripts.
- Print clear next steps.
- Do not print secrets.

## Smoke test

`scripts/smoke-test-openclaw.sh` should:

- run from a deployed OpenClaw gateway environment
- load `.env` from the deployed skill folder
- run a read-only command such as the shopping-list command
- never print secrets
- never create, update, delete, consume, add stock, or otherwise mutate Grocy data

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

Automated tests must not require or mutate the user's real Grocy instance. Use mocks by default. Any live Grocy verification must be an explicit, manual, user-confirmed step.

## README requirements

`README.md` should include:

- What this skill does
- Requirements
- Installation
- Environment variables
- Local CLI usage
- Deploy to OpenClaw workspace
- How to test inside OpenClaw gateway Docker container
- Command reference files, including `docs/COMMANDS.md` and the strict policy index `docs/commands.json`
- Security notes
- Roadmap

Roadmap should include:

- a link to `ROADMAP.md`
- current implementation status
- planned or pending command groups
- verification notes for local tests and any live Grocy checks

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

Implemented write operations:

- create, update, and delete unused quantity unit objects
- create, update, and delete product objects, with `active=false` preferred when hard deletion is unsafe
- create, update, and delete recipes, including ingredient-row cleanup when explicitly confirmed
- add, update, and delete one ingredient row on an existing recipe
- create, update, delete, get, and set custom field definitions and values
- add stock with optional latest purchase price and undo stock transactions
- add, update, delete, mark done, and clean completed shopping list rows
- add, update, and delete Grocy meal plan rows

Examples:

- add item to shopping list
- mark shopping item done
- add stock entry

Rules for future write operations:

- Keep read-only commands separate from write commands.
- Require explicit user confirmation before every command that modifies Grocy.
- User intent to modify is not enough by itself; confirm the concrete command or action before execution.
- For every create/add write operation, design the matching update/edit and delete/remove/cancel operations.
- If delete is too risky or unsupported for a Grocy entity, document the limitation and provide the safest available correction path.
- Do not leave OpenClaw in a state where it can create a wrong record but cannot correct or remove it through the CLI.
- When a product unit is missing, offer existing `units` choices first.
- When a product location is missing, offer existing `locations` choices first.
- Create a new quantity unit only after the user confirms none of the existing units fit.
- Document write behavior clearly in `SKILL.md`.
- Add tests where possible.
- Prefer confirmation-oriented wording in the skill instructions.
