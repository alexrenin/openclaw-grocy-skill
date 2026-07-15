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
- `[x]` Read a compact monitoring overview with `stock-summary`.
- `[x]` Read products below minimum stock with `stock-low`.
- `[x]` Read due-soon, overdue, and expired stock with `stock-expiring`.
- `[x]` Read configured custom fields with `userfields`.
- `[x]` Read custom field values with `userfields-get`.
- `[x]` Create quantity units with `unit-create`.
- `[x]` Update quantity units with `unit-update`.
- `[x]` Safely delete unused quantity units with `unit-delete`.
- `[x]` Create products with `product-create`, including product-specific unit conversions.
- `[x]` Read recipes with `recipes` and `recipe-get`, including resolved ingredient product and quantity-unit names.
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
- `[x]` Manage shopping list rows with `shopping-list-add`, `shopping-list-update`, `shopping-list-delete`, `shopping-list-done`, and completed-row-only `shopping-list-clean`.
- `[x]` Read-only menu planning helpers with `menu-check` and `menu-shopping-list`.

## Current Verification Notes

- `menu-check` and `menu-shopping-list` are implemented, documented, covered by mocked tests, and live-verified read-only against the configured Grocy 4.6.0 instance. The live check used recipe id 2 (`Рассольник`) for 8 servings. `menu-check` correctly reported `status: missing`, `can_cook: false`, 6 ingredients, 5 missing products, 1 available product, and no unresolved conversions. `menu-shopping-list` returned only the 5 missing products and did not create Grocy shopping list rows. No Grocy data was changed.
- Live menu helper verification exposed that tiny non-zero amounts such as `0.000001 кг` were rounded to `0 кг` in text output. The formatter now preserves tiny non-zero values and has a regression test.
- `recipes` and `recipe-get` are implemented, documented, covered by mocked tests, and live-verified read-only against the configured Grocy 4.6.0 instance. `recipes` returned 4 normal recipes with correct ingredient counts and excluded 3 internal `mealplan-*` pseudo-recipes exposed by the objects endpoint. Its table output converted and truncated HTML descriptions for chat. `recipe-get` resolved recipe 3 by both id and name and returned 2 ingredient rows with correct position ids, product names, amounts, and quantity units. No Grocy data was changed.
- `npm.cmd test` passed locally with 253 tests.
- Shopping list write commands are implemented, documented, covered by mocked tests, and live-verified against the configured Grocy 4.6.0 instance after explicit confirmation before each write. The lifecycle test created note-only row `OPENCLAW_TEST_20260715_SHOPPING_LIST_LIFECYCLE` as id 5, updated its amount and note, marked it done, restored it to undone, and deleted it. The cleanup test created `OPENCLAW_TEST_20260715_SHOPPING_LIST_CLEAN` as id 6, marked it done, previewed exactly that one affected row with `shopping-list-clean --dry-run true`, then removed it with `shopping-list-clean`. Final read-only verification found both markers absent, the four original pending rows unchanged, and zero completed rows.
- Live shopping list verification exposed that note-only rows were labeled `Unknown product null`; the formatter now leaves their product name empty and has a regression test. The test also added the read-only `shopping-list-clean --dry-run true` preview so completed rows can be inspected before confirming cleanup.
- Grocy 4.6.0 OpenAPI and frontend source were checked: item create/update/delete use generic `shopping_list` object endpoints, done toggles the `done` field with generic `PUT`, and completed-only cleanup uses `POST /stock/shoppinglist/clear` with `done_only: true`.
- `stock-expiring` is implemented, documented, covered by mocked tests, and read-only live-verified against the configured Grocy 4.6.0 instance. A live check with a 60-day due-soon window returned 1 due-soon product with its amount, stock unit, and due date without changing Grocy data.
- Grocy 4.6.0 OpenAPI was checked before implementing `stock-expiring`. The command passes `--days` as `due_soon_days` to read-only `GET /stock/volatile` and preserves Grocy's `due_products`, `overdue_products`, and `expired_products` categories.
- `stock-low` is implemented, documented, covered by mocked tests, and read-only live-verified against the configured Grocy 4.6.0 instance. The live check returned 2 products below minimum stock with their missing amounts and stock units without changing Grocy data.
- Grocy 4.6.0 OpenAPI was checked before implementing `stock-low`. The command uses `missing_products` from read-only `GET /stock/volatile` and enriches those rows with product minimums and stock units from read-only object lists.
- `stock-summary` is implemented, documented, covered by mocked tests, and read-only live-verified against the configured Grocy 4.6.0 instance. The live check reported 14 tracked products, 1 product in stock, 2 products below minimum stock, and the nearest meaningful due date without changing Grocy data.
- Grocy 4.6.0 OpenAPI was checked before implementing `stock-summary`. The command uses read-only `GET /stock` for current amounts and nearest due dates, plus read-only `GET /stock/volatile` for Grocy-native due, overdue, expired, and missing-product categories.
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

2. `[x]` Add correction and removal workflows for created records.
   - `[x]` Product lifecycle: `product-update` and safe `product-delete`; fallback is `product-update --active false` when deletion is unsafe or rejected.
   - `[x]` Unit lifecycle: `unit-update` and safe `unit-delete`; fallback is to update dependent records first or leave referenced units in Grocy.
   - `[x]` Recipe lifecycle: `recipe-update` and safe `recipe-delete`; `recipe-delete` refuses recipes with ingredient rows unless `--delete-ingredients true` is explicitly confirmed.
   - `[x]` Recipe ingredient lifecycle: `recipe-ingredient-delete` for removing one incorrect ingredient row.
   - `[x]` Custom field lifecycle: `userfields-update` and `userfields-delete`; deletion inspects existing values and requires `--delete-values true` when values would be lost.
   - `[x]` Stock lifecycle: `stock-transaction-undo` is implemented and live-verified during the controlled `stock-add` test.
   - Purpose: OpenClaw must be able to fix or undo a record it just created instead of creating duplicates or leaving bad data behind.

3. `[x]` Add product search.
   - `[x]` Command: `product-search --name "молоко" --format table`
   - `[x]` Command: `product-search --name "молоко" --format json`
   - Purpose: support receipt-derived names and natural chat queries without forcing exact product names.

4. `[x]` Add stock monitoring.
   - `[x]` Command: `stock-low`
   - `[x]` Command: `stock-expiring`
   - `[x]` Command: `stock-summary`
   - Purpose: answer "what is running low?", "what expires soon?", and "what do we have at home?"

5. `[x]` Add shopping list write commands.
   - `[x]` Command: `shopping-list-add`
   - `[x]` Command: `shopping-list-update`
   - `[x]` Command: `shopping-list-done`
   - `[x]` Command: `shopping-list-delete`
   - `[x]` Command: `shopping-list-clean` (completed rows only)
   - Purpose: let OpenClaw manage the buying workflow after menu planning or stock checks.

6. `[x]` Add recipe read commands.
   - `[x]` Command: `recipes`
   - `[x]` Command: `recipe-get`
   - Purpose: expose recipes and ingredients in a chat-friendly format before planning menus.

7. `[~]` Add menu planning helpers.
   - `[x]` Command: `menu-check` implemented, documented, covered by mocked tests, and live-verified read-only.
   - `[x]` Command: `menu-shopping-list` implemented, documented, covered by mocked tests, and live-verified read-only; it calculates missing items only and does not write Grocy shopping list rows.
   - `[ ]` Later command: `menu-plan`
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
