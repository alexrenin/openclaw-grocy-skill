# OpenClaw Grocy Skill Roadmap

This file tracks the current implementation status and the planned functional roadmap.
Keep `AGENTS.md` focused on agent instructions; update this file when scope changes or a roadmap item is completed.

## Status Legend

- `[x]` Done
- `[~]` In progress / implemented locally but needs real Grocy verification
- `[ ]` Planned

## Implemented

- `[x]` CLI foundation with `--help`, command validation, safe error output, and environment-based configuration.
- `[x]` CLI `.env` fallback loading when required environment variables are not already set.
- `[x]` Grocy client using `GROCY_URL` and `GROCY_API_KEY` through the `GROCY-API-KEY` header.
- `[x]` Read system info with `system-info`.
- `[x]` Read API documentation links with `api-docs`.
- `[x]` Read locations with `locations`.
- `[x]` Read quantity units with `units`.
- `[x]` Read products with `products`.
- `[x]` Search products by name with `product-search`.
- `[x]` Update products with `product-update`, including product-specific unit conversion upsert.
- `[x]` Safely delete unused products with `product-delete`, with documented deactivation fallback.
- `[x]` Read shopping list with `shopping-list`.
- `[x]` Read stock with `stock`.
- `[x]` Read configured custom fields with `userfields`.
- `[x]` Read custom field values with `userfields-get`.
- `[x]` Create quantity units with `unit-create`.
- `[x]` Update quantity units with `unit-update`.
- `[x]` Safely delete unused quantity units with `unit-delete`.
- `[x]` Create products with `product-create`, including product-specific unit conversions.
- `[x]` Create recipes with `recipe-create`.
- `[x]` Update recipes with `recipe-update`.
- `[x]` Safely delete recipes with `recipe-delete`, including explicit ingredient-row cleanup.
- `[x]` Add recipe ingredients with `recipe-ingredient-add`.
- `[x]` Update recipe ingredients with `recipe-ingredient-update`.
- `[x]` Delete recipe ingredients with `recipe-ingredient-delete`.
- `[x]` Create custom fields with `userfields-create`.
- `[x]` Set custom field values with `userfields-set`.
- `[x]` Update custom field definitions with `userfields-update` and safely delete them with `userfields-delete`.
- `[x]` Add purchased product amounts to stock with `stock-add`, including optional latest purchase price and best-before date.
- `[x]` Undo stock transactions with `stock-transaction-undo`.

## Current Verification Notes

- `npm.cmd test` passed locally with 199 tests.
- Grocy 4.6.0 OpenAPI was checked before implementing the custom field lifecycle. The commands use generic userfields object `PUT` and `DELETE`.
- Custom field lifecycle was live-verified against the configured Grocy 4.6.0 instance after explicit confirmations for each write. The test created recipe custom field `OPENCLAW_TEST_20260714_CUSTOM_FIELD_LIFECYCLE` as id 7, updated its caption to `OPENCLAW_TEST_20260714_CUSTOM_FIELD_LIFECYCLE_UPDATED`, inspected 7 recipes and found no populated values, deleted field id 7, and verified the test marker was absent afterward.
- `recipe-update`, `recipe-delete`, and `recipe-ingredient-delete` are implemented, documented, covered by mocked unit tests, and live-verified against the configured Grocy 4.6.0 instance after explicit user confirmation.
- Recipe lifecycle live test first exposed a Grocy 4.6.0 mismatch when `recipe-update` sent returned service fields back to `PUT /api/objects/recipes/{objectId}`. The command was corrected to send only supported recipe fields.
- Recipe lifecycle live test created `OPENCLAW_TEST_20260714_RECIPE_LIFECYCLE` as recipe id 6 with ingredient row ids 17 and 18, updated it to `OPENCLAW_TEST_20260714_RECIPE_LIFECYCLE_UPDATED`, deleted row 17 with `recipe-ingredient-delete`, then deleted recipe id 6 and remaining row 18 with `recipe-delete --delete-ingredients true`.
- A second recipe lifecycle live test repeated the same flow after the fix: created recipe id 7 with ingredient row ids 19 and 20, updated it, deleted row 19 with `recipe-ingredient-delete`, then deleted recipe id 7 and remaining row 20 with `recipe-delete --delete-ingredients true`.
- `api-docs --format text` passed locally using the `.env` fallback and reported installed Grocy version 4.6.0.
- `product-update` and `product-delete` are implemented locally, covered by mocked unit tests, and live-verified against the configured Grocy 4.6.0 instance after explicit user confirmation.
- Product lifecycle live test created `OPENCLAW_TEST_20260714_PRODUCT_LIFECYCLE` as product id 15, updated it to `OPENCLAW_TEST_20260714_PRODUCT_LIFECYCLE_UPDATED` with `active: false`, deleted it with `product-delete`, and verified both test names no longer appear in `product-search`.
- `unit-update` and `unit-delete` are implemented locally, covered by mocked unit tests, and live-verified against the configured Grocy 4.6.0 instance after explicit user confirmation.
- Unit lifecycle live test created `OPENCLAW_TEST_20260714_UNIT_LIFECYCLE` as quantity unit id 8, updated it to `OPENCLAW_TEST_20260714_UNIT_LIFECYCLE_UPDATED`, deleted it with `unit-delete`, and verified both test names no longer appear in `units`.
- Grocy 4.6.0 OpenAPI was checked before implementing product lifecycle commands. Generic object endpoints support `PUT /objects/{entity}/{objectId}` and `DELETE /objects/{entity}/{objectId}`.
- `product-search` is implemented locally and covered by mocked unit tests.
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
   - `[x]` Product lifecycle: `product-update` and safe `product-delete`; fallback is `product-update --active false` when deletion is unsafe or rejected.
   - `[x]` Unit lifecycle: `unit-update` and safe `unit-delete`; fallback is to update dependent records first or leave referenced units in Grocy.
   - `[x]` Recipe lifecycle: `recipe-update` and safe `recipe-delete`; `recipe-delete` refuses recipes with ingredient rows unless `--delete-ingredients true` is explicitly confirmed.
   - `[x]` Recipe ingredient lifecycle: `recipe-ingredient-delete` for removing one incorrect ingredient row.
   - `[x]` Custom field lifecycle: `userfields-update` and `userfields-delete`; deletion inspects existing values and requires `--delete-values true` when values would be lost.
   - Stock lifecycle: `stock-transaction-undo` is implemented and live-verified during the controlled `stock-add` test.
   - Purpose: OpenClaw must be able to fix or undo a record it just created instead of creating duplicates or leaving bad data behind.

3. `[x]` Add product search.
   - `[x]` Command: `product-search --name "молоко" --format table`
   - `[x]` Command: `product-search --name "молоко" --format json`
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
