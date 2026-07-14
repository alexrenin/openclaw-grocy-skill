# OpenClaw Grocy Skill Roadmap

This file tracks the current implementation status and the planned functional roadmap.
Keep `AGENTS.md` focused on agent instructions; update this file when scope changes or a roadmap item is completed.

## Status Legend

- `[x]` Done
- `[~]` In progress / implemented locally but needs real Grocy verification
- `[ ]` Planned

## Implemented

- `[x]` CLI foundation with `--help`, command validation, safe error output, and environment-based configuration.
- `[x]` Grocy client using `GROCY_URL` and `GROCY_API_KEY` through the `GROCY-API-KEY` header.
- `[x]` Read system info with `system-info`.
- `[x]` Read API documentation links with `api-docs`.
- `[x]` Read locations with `locations`.
- `[x]` Read quantity units with `units`.
- `[x]` Read products with `products`.
- `[x]` Read shopping list with `shopping-list`.
- `[x]` Read stock with `stock`.
- `[x]` Read configured custom fields with `userfields`.
- `[x]` Read custom field values with `userfields-get`.
- `[x]` Create quantity units with `unit-create`.
- `[x]` Create products with `product-create`, including product-specific unit conversions.
- `[x]` Create recipes with `recipe-create`.
- `[x]` Add recipe ingredients with `recipe-ingredient-add`.
- `[x]` Update recipe ingredients with `recipe-ingredient-update`.
- `[x]` Create custom fields with `userfields-create`.
- `[x]` Set custom field values with `userfields-set`.
- `[x]` Add purchased product amounts to stock with `stock-add`, including optional latest purchase price and best-before date.
- `[x]` Undo stock transactions with `stock-transaction-undo`.

## Current Verification Notes

- `npm.cmd test` passed locally with 129 tests.
- `stock-add` is covered by mocked unit tests.
- `stock-add` endpoint and payload were checked against the installed Grocy 4.6.0 OpenAPI. The endpoint is `POST /stock/products/{productId}/add`; supported request fields include `amount`, `best_before_date`, `transaction_type`, and `price`.
- Grocy 4.6.0 also supports `POST /stock/transactions/{transactionId}/undo`; `stock-transaction-undo` is implemented and live-verified as the precise correction path for a mistaken `stock-add`.
- `api-docs --format text` passed against the configured Grocy instance and reported installed Grocy version 4.6.0.
- The user has added a local `.env` for the real Grocy instance they plan to use after setup.
- Treat that Grocy instance as real data, not a disposable test system.
- `stock-add` was live-tested against the configured Grocy instance after explicit user confirmation. The controlled test added 1 package of an existing product with `price: 0.01` and `best_before_date: 2026-12-31`, received a stock transaction id, immediately undid that transaction with `stock-transaction-undo`, and verified that final stock returned to the original amount.

## Priority Roadmap

1. `[x]` Finalize `stock-add`.
   - `[x]` Verify the endpoint and payload against the installed Grocy OpenAPI via `api-docs`.
   - `[x]` Add a precise rollback command using Grocy stock transaction undo.
   - `[x]` Confirm that the installed Grocy accepts the `price` payload for the latest purchase price workflow.
   - `[x]` Adjust the payload to match the installed Grocy version.

2. `[ ]` Add correction and removal workflows for created records.
   - Product lifecycle: `product-update` and a safe `product-delete` or documented alternative.
   - Unit lifecycle: `unit-update` and a safe `unit-delete` or documented alternative.
   - Recipe lifecycle: `recipe-update` and a safe `recipe-delete` or documented alternative.
   - Recipe ingredient lifecycle: `recipe-ingredient-delete` for removing one incorrect ingredient row.
   - Custom field lifecycle: `userfields-update` and a safe `userfields-delete` or documented alternative.
   - Stock lifecycle: `stock-transaction-undo` is implemented and live-verified during the controlled `stock-add` test.
   - Purpose: OpenClaw must be able to fix or undo a record it just created instead of creating duplicates or leaving bad data behind.

3. `[ ]` Add product search.
   - Command: `product-search --name "молоко" --format table`
   - Command: `product-search --name "молоко" --format json`
   - Purpose: support receipt-derived names and natural chat queries without forcing exact product names.

4. `[ ]` Add stock monitoring.
   - Command: `stock-low`
   - Command: `stock-expiring`
   - Command: `stock-summary`
   - Purpose: answer "what is running low?", "what expires soon?", and "what do we have at home?"

5. `[ ]` Add shopping list write commands.
   - Command: `shopping-list-add`
   - Command: `shopping-list-update`
   - Command: `shopping-list-done`
   - Command: `shopping-list-delete`
   - Optional command: `shopping-list-clean`
   - Purpose: let OpenClaw manage the buying workflow after menu planning or stock checks.

6. `[ ]` Add recipe read commands.
   - Command: `recipes`
   - Command: `recipe-get`
   - Purpose: expose recipes and ingredients in a chat-friendly format before planning menus.

7. `[ ]` Add menu planning helpers.
   - Command: `menu-check`
   - Command: `menu-shopping-list`
   - Later command: `menu-plan`
   - Purpose: check whether selected recipes can be cooked from current stock and calculate missing ingredients.

## Write Lifecycle Principle

Adding records is not enough. For each entity that the skill can create or add, the roadmap should include a way to edit/update it and a way to delete/remove/cancel it, or a documented reason why Grocy does not support that safely.

This is required so OpenClaw can fix mistakes through the skill. A typical failure to avoid: the agent creates a wrong product, recipe ingredient, custom field, shopping list item, or stock transaction, then cannot correct the just-created record without direct API calls.

Read commands do not require confirmation. Every data manipulation requires explicit user confirmation immediately before execution, including create, add, update, delete, remove, cancel, mark done, consume stock, stock add, and stock correction commands.

Deletion and reversal commands are destructive and must require especially clear confirmation. Prefer precise selectors such as ids returned by the create/add command when undoing a just-created record.

## Real Grocy Data Safety

The local `.env` may point to the user's real Grocy instance. Automated tests must stay mocked and independent from live Grocy.

Live verification should be read-only by default: `system-info`, `api-docs`, `locations`, `units`, `products`, `shopping-list`, and `stock` are acceptable checks. Write verification requires a separate user confirmation that names the exact command, test data, expected effect, and cleanup plan.

Temporary test records are acceptable only when they are cleaned up immediately after verification. Use obvious unique names such as `OPENCLAW_TEST_<date>_<purpose>`, capture created ids, and delete or reverse the test records before marking verification complete.

## Receipt Workflow Boundary

Receipt parsing should remain outside this skill. OpenClaw can parse receipts and normalize item names, amounts, units, and prices. This skill should provide safe Grocy commands for the final write step, primarily `stock-add`.

Expected workflow:

1. OpenClaw receives and parses a receipt.
2. OpenClaw matches receipt items to existing Grocy products.
3. OpenClaw asks for clarification when product, unit, or amount is ambiguous.
4. OpenClaw runs `stock-add` for confirmed purchased items.

## Update Rules

- Mark items as `[x]` only after code, tests, and documentation are updated.
- Use `[~]` for functionality that is implemented locally but still needs real Grocy verification.
- Keep write commands separate from read commands.
- Keep the confirmation rule explicit for every write command: reads do not need confirmation, data changes do.
- For every new create/add command, add matching update/edit and delete/remove/cancel needs to this roadmap.
- Do not mark live-write verification as complete unless it was intentionally confirmed by the user against real Grocy data and any temporary test records were cleaned up.
- Keep user-facing behavior documented in `README.md` and `SKILL.md`.
- Do not store secrets, environment contents, hostnames, or personal deployment details in this file.
