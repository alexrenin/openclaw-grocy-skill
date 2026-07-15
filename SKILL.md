---
name: grocy
description: Read and manage Grocy home inventory, stock monitoring, products, recipes, quantity units, custom fields, shopping lists, and menu planning through the bundled safe CLI. Use for groceries, household supplies, stock summaries, low-stock or expiring-product checks, shopping lists, recipe ingredients, menu planning, what-can-I-cook questions, and Russian requests about продукты дома, остатки, покупки, список покупок, меню, and что приготовить.
---

# Grocy Home Inventory Skill

Use this skill when the user asks about Grocy, groceries, home inventory, household supplies, shopping lists, stock, products at home, recipes, recipe ingredients, menu planning, or Russian requests such as `список покупок`, `что купить`, `что есть дома`, `остатки`, `продукты дома`, `запланируй меню`, and `что приготовить`.

## Required Rules

- Always use the bundled CLI: `node bin/grocy-openclaw.js <command> --format <format>`.
- Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts.
- Never reveal secrets, `.env`, `GROCY_API_KEY`, local hostnames, tokens, or credential values.
- The CLI uses `GROCY_API_KEY` only through the `GROCY-API-KEY` request header.
- Treat configured `.env` credentials as the user's real Grocy instance unless explicitly told otherwise.
- Read-only commands may run without confirmation.
- Any command that creates, adds, updates, deletes, removes, cleans, marks done, undoes, consumes, adds stock, or otherwise changes Grocy data requires explicit confirmation of that exact action immediately before execution.
- Ask again if the command, target object, amount, unit, price, date, note, field values, or payload changes.
- Prefer correction commands over creating duplicates.
- Use ids returned by read/create commands when correcting or removing just-created records.
- Do not create temporary live Grocy records just to check behavior unless the user confirms the exact write action and cleanup plan.

## Environment

Run commands from the deployed skill directory. The CLI reads `GROCY_URL` and `GROCY_API_KEY` from the process environment; if either variable is missing, it falls back to a local `.env` file in the current working directory. Existing process environment values take priority over `.env`.

Manual loading is supported when needed:

```bash
set -a
. ./.env
set +a
```

Required variables:

```env
GROCY_URL=http://grocy
GROCY_API_KEY=replace_me
```

## Command Metadata

Use the machine-readable command index before choosing or validating a command:

- `docs/commands.json`: command type, formats, confirmation requirement, selectors, mode-specific behavior, confirmation details, and correction/removal path.
- `docs/COMMANDS.md`: command examples and longer workflow notes.

`docs/commands.json` is a policy index for routing and safety checks, not a replacement for CLI argument validation.

If the index and prose disagree, follow the stricter safety rule.

## Read Routing

Use these read commands without confirmation:

| User intent | Command |
|---|---|
| Connectivity or Grocy version | `system-info`, `api-docs` |
| Locations or quantity units | `locations`, `units` |
| Product list or fuzzy product match | `products`, `product-search` |
| Shopping list | `shopping-list` |
| Current stock | `stock` |
| Low stock, expiring stock, overview | `stock-low`, `stock-expiring`, `stock-summary` |
| Recipes and ingredients | `recipes`, `recipe-get` |
| Custom field definitions or values | `userfields`, `userfields-get` |
| Can I cook this, what should I buy, what should I cook | `menu-check`, `menu-shopping-list`, `menu-plan` |
| Current Grocy meal plan | `meal-plan` |

For Russian shopping list requests, prefer:

```bash
node bin/grocy-openclaw.js shopping-list --format text
```

## Write Routing

Every command below modifies Grocy and requires explicit confirmation immediately before execution.

| User intent | Command | Correction/removal |
|---|---|---|
| Create, correct, or remove units | `unit-create`, `unit-update`, `unit-delete` | `unit-update`, `unit-delete` |
| Create, correct, deactivate, or remove products | `product-create`, `product-update`, `product-delete` | `product-update`, `product-delete`, `product-update --active false` |
| Create, correct, or remove recipes | `recipe-create`, `recipe-update`, `recipe-delete` | `recipe-update`, `recipe-delete` |
| Add, correct, or remove one recipe ingredient | `recipe-ingredient-add`, `recipe-ingredient-update`, `recipe-ingredient-delete` | `recipe-ingredient-update`, `recipe-ingredient-delete` |
| Create, correct, remove, or set custom fields | `userfields-create`, `userfields-update`, `userfields-delete`, `userfields-set` | `userfields-update`, `userfields-delete`, `userfields-set` |
| Add purchased stock or undo a stock write | `stock-add`, `stock-transaction-undo` | `stock-transaction-undo` |
| Add, correct, complete, delete, or clean shopping list rows | `shopping-list-add`, `shopping-list-update`, `shopping-list-done`, `shopping-list-delete`, `shopping-list-clean` | `shopping-list-update`, `shopping-list-done`, `shopping-list-delete` |
| Add, correct, or remove meal plan rows | `meal-plan-add`, `meal-plan-update`, `meal-plan-delete` | `meal-plan-update`, `meal-plan-delete` |

Before running any write command, show or summarize the exact command target and changed data, then ask for confirmation. User intent to modify is not enough by itself.

## Workflow Rules

- Use `product-search` before product-related writes when product matching is unclear.
- Prefer product, unit, recipe, field, and location names in chat workflows; use raw ids only when known from command output or automation context.
- Use `locations` before `product-create` or missing-product creation when the storage location is unclear.
- Use `units` before unit-sensitive writes when the unit is unclear.
- Create a new quantity unit only after the user confirms no existing unit fits.
- Create a new product only after the user confirms product creation and required location/unit details.
- Product creation requires a location and stock unit.
- If purchase or consume units differ from stock unit, require conversion factors before writing.
- Do not send Grocy 4.x product conversion factors as `qu_factor_*` product fields; use the CLI's unit conversion options.
- Use `product-update` to fix product details. Do not create a duplicate product to fix a wrong product.
- Use `product-delete` only for unused products; if deletion is blocked, ask whether to deactivate with `product-update --active false`.
- Use `recipe-get` before precise recipe ingredient updates when position ids are needed.
- Use `recipe-ingredient-add` or `recipe-ingredient-update` for ingredient changes. Do not delete and recreate a recipe just to change one ingredient.
- If a tablespoon-like unit such as `ст.ложка` is not configured, never match it to liter `л`; ask whether to convert or create the missing unit after confirmation.
- Use `userfields` before custom field writes when the field name or type is unclear.
- Use `userfields-update` to fix a custom field definition instead of creating a duplicate.
- Use `userfields-delete --delete-values true` only after a separate confirmation that populated values may be lost.
- Use `stock-add` only after product, amount, unit, price, best-before date, and transaction type are clear.
- Keep `stock-add` transaction ids so mistakes can be reversed with `stock-transaction-undo`.
- Receipt parsing is outside this skill; parse receipts separately, then use confirmed `stock-add` commands for writes.
- Use `shopping-list --format json` to get item ids before update, delete, or done.
- `shopping-list-clean --dry-run true` is read-only and may run without confirmation.
- Run `shopping-list-clean --dry-run true` before asking for confirmation to delete completed rows with `shopping-list-clean` without dry-run.
- `menu-check`, `menu-plan`, and `menu-shopping-list` are read-only; they do not create shopping list or meal plan rows.
- Before adding menu-derived missing items to Grocy, show the proposed `shopping-list-add` writes and ask for confirmation.
- `meal-plan-add`, `meal-plan-update`, and `meal-plan-delete` only manage meal plan rows; they do not add missing ingredients or consume stock.
- Grocy 4.6.0 meal plan rows do not support per-row servings; do not pass `--servings` to meal plan write commands.

## Response Behavior

Return command output clearly to the user. If a command fails, summarize the readable error without exposing `.env`, `GROCY_API_KEY`, or other secrets.
