# Grocy CLI Command Reference

This reference contains examples and workflow details for the Grocy OpenClaw CLI.
`SKILL.md` is the concise runtime guide for agents; this file is the longer command manual.

Always run commands from the deployed skill directory:

```bash
node bin/grocy-openclaw.js <command> --format <format>
```

The CLI loads `GROCY_URL` and `GROCY_API_KEY` from the process environment, then falls back to a local `.env` file. Never print `.env` or `GROCY_API_KEY`.

Read commands do not require confirmation. Commands that create, add, update, delete, remove, mark done, clean, undo, or otherwise change Grocy data require explicit user confirmation immediately before execution.

For machine-readable command metadata, see [`commands.json`](commands.json). It is a policy index for command routing and safety checks, not a replacement for the CLI parser.

## Read Commands

```bash
node bin/grocy-openclaw.js api-docs --format text
node bin/grocy-openclaw.js api-docs --format json
node bin/grocy-openclaw.js system-info --format json
node bin/grocy-openclaw.js locations --format table
node bin/grocy-openclaw.js locations --format json
node bin/grocy-openclaw.js units --format table
node bin/grocy-openclaw.js units --format json
node bin/grocy-openclaw.js products --format table
node bin/grocy-openclaw.js products --format json
node bin/grocy-openclaw.js product-search --name "Milk" --format table
node bin/grocy-openclaw.js shopping-list --format text
node bin/grocy-openclaw.js shopping-list --format json
node bin/grocy-openclaw.js recipes --format table
node bin/grocy-openclaw.js recipe-get --recipe "Pancakes" --format table
node bin/grocy-openclaw.js userfields --entity recipes --format table
node bin/grocy-openclaw.js userfields-get --entity recipes --object-id 10 --format json
node bin/grocy-openclaw.js stock --format table
node bin/grocy-openclaw.js stock-summary --format text
node bin/grocy-openclaw.js stock-low --format text
node bin/grocy-openclaw.js stock-expiring --days 7 --format text
node bin/grocy-openclaw.js menu-check --recipe "Pancakes" --servings 4 --format text
node bin/grocy-openclaw.js menu-plan --count 3 --servings 4 --format text
node bin/grocy-openclaw.js menu-shopping-list --recipes '[{"name":"Pancakes","servings":4}]' --format text
node bin/grocy-openclaw.js meal-plan --from 2026-07-15 --to 2026-07-21 --format table
```

Use read commands freely for discovery and ambiguity resolution. Prefer `product-search`, `units`, `locations`, `recipes`, `recipe-get`, and `shopping-list --format json` before writes when selectors are unclear.

## Write Command Summary

Every command in this table modifies Grocy and requires confirmation of the exact target and payload immediately before execution.

| Command | Effect | Correction or removal path |
|---|---|---|
| `unit-create` | Creates a quantity unit | `unit-update`, `unit-delete` |
| `unit-update` | Updates a quantity unit | `unit-update`, `unit-delete` if unused |
| `unit-delete` | Deletes an unused quantity unit | none |
| `product-create` | Creates a product and optional unit conversions | `product-update`, `product-delete`, or `product-update --active false` |
| `product-update` | Updates a product or unit conversion | `product-update`, `product-delete` if unused |
| `product-delete` | Deletes an unused product | `product-update --active false` fallback |
| `recipe-create` | Creates a recipe and ingredient rows | `recipe-update`, `recipe-delete` |
| `recipe-update` | Updates a recipe | `recipe-update`, `recipe-delete` |
| `recipe-delete` | Deletes a recipe | none |
| `recipe-ingredient-add` | Adds one recipe ingredient row | `recipe-ingredient-update`, `recipe-ingredient-delete` |
| `recipe-ingredient-update` | Updates one recipe ingredient row | `recipe-ingredient-update`, `recipe-ingredient-delete` |
| `recipe-ingredient-delete` | Deletes one recipe ingredient row | none |
| `userfields-create` | Creates a custom field definition | `userfields-update`, `userfields-delete` |
| `userfields-update` | Updates a custom field definition | `userfields-update`, `userfields-delete` |
| `userfields-delete` | Deletes a custom field definition | none |
| `userfields-set` | Sets custom field values on one object | `userfields-set` |
| `stock-add` | Adds stock and may record purchase price | `stock-transaction-undo` |
| `stock-transaction-undo` | Undoes one stock transaction | none |
| `shopping-list-add` | Adds or increments a shopping list row | `shopping-list-update`, `shopping-list-delete` |
| `shopping-list-update` | Updates a shopping list row | `shopping-list-update`, `shopping-list-delete` |
| `shopping-list-delete` | Deletes one shopping list row | none |
| `shopping-list-done` | Marks one row done or undone | `shopping-list-done --done false` or `--done true` |
| `shopping-list-clean` | Previews or deletes completed rows only | `--dry-run true` is read-only; cleanup without dry-run has no undo |
| `meal-plan-add` | Adds one meal plan row | `meal-plan-update`, `meal-plan-delete` |
| `meal-plan-update` | Updates one meal plan row | `meal-plan-update`, `meal-plan-delete` |
| `meal-plan-delete` | Deletes one meal plan row | none |

## Product And Unit Workflows

Create a unit only after existing units were checked and the user confirmed none fit:

```bash
node bin/grocy-openclaw.js unit-create --name "jar" --name-plural "jars" --format json
node bin/grocy-openclaw.js unit-update --unit-id 7 --name "glass jar" --name-plural "glass jars" --format json
node bin/grocy-openclaw.js unit-delete --unit-id 7 --confirm-unit-name "glass jar" --format json
```

Create products with location and stock unit. Prefer names in chat workflows, ids only when automation already knows them:

```bash
node bin/grocy-openclaw.js product-create --name "Milk" --location "Fridge" --stock-unit "l" --format json
node bin/grocy-openclaw.js product-create --name "Pickles" --location "Pantry" --stock-unit "pcs" --purchase-unit "jar" --purchase-to-stock-factor 10 --format json
```

If purchase or consume units differ from the stock unit, ask for the conversion factor before writing. In Grocy 4.x product-specific conversion factors are stored in `quantity_unit_conversions`; do not send `qu_factor_*` fields directly to product objects.

Correct products instead of creating duplicates:

```bash
node bin/grocy-openclaw.js product-update --product "Milk" --name "Milk 2.5%" --location "Fridge" --active true --format json
node bin/grocy-openclaw.js product-delete --product-id 42 --confirm-product-name "Milk 2.5%" --format json
node bin/grocy-openclaw.js product-update --product-id 42 --active false --format json
```

Use `product-delete` only for unused products. If deletion is blocked, prefer confirmed deactivation with `product-update --active false`.

## Recipe Workflows

Create recipes only after ingredient amounts and units are known:

```bash
node bin/grocy-openclaw.js recipe-create --name "Salad" --base-servings 4 --ingredients '[{"name":"Pickles","amount":3,"unit":"pcs"}]' --format json
```

Use `--create-missing-products true` only after the user explicitly confirms creating missing ingredient products. Missing products need a location; inspect `locations` first when the location is unclear.

Correct recipes and ingredient rows directly:

```bash
node bin/grocy-openclaw.js recipe-update --recipe "Salad" --name "Potato salad" --base-servings 4 --format json
node bin/grocy-openclaw.js recipe-delete --recipe-id 11 --confirm-recipe-name "Potato salad" --delete-ingredients true --format json
node bin/grocy-openclaw.js recipe-ingredient-add --recipe "Pancakes" --product "Sunflower oil" --amount 30 --unit "ml" --note "in batter" --format json
node bin/grocy-openclaw.js recipe-ingredient-update --position-id 12 --amount 0.03 --unit "l" --format json
node bin/grocy-openclaw.js recipe-ingredient-delete --position-id 12 --format json
```

Do not delete and recreate a recipe just to add or correct one ingredient. Use ingredient row commands. If a tablespoon-like unit is not configured, do not match it to liter; ask whether to convert to an existing unit or create a new unit after confirmation.

## Shopping List Workflows

Read first when ids are needed:

```bash
node bin/grocy-openclaw.js shopping-list --format json
```

Then write only after confirmation:

```bash
node bin/grocy-openclaw.js shopping-list-add --product "Milk" --amount 2 --unit "bottle" --note "sale" --format json
node bin/grocy-openclaw.js shopping-list-add --note "Buy birthday candles" --amount 2 --format json
node bin/grocy-openclaw.js shopping-list-update --item-id 12 --amount 3 --unit "bottle" --note "sale" --format json
node bin/grocy-openclaw.js shopping-list-delete --item-id 12 --format json
node bin/grocy-openclaw.js shopping-list-done --item-id 12 --format json
node bin/grocy-openclaw.js shopping-list-done --item-id 12 --done false --format json
node bin/grocy-openclaw.js shopping-list-clean --list-id 1 --dry-run true --format json
node bin/grocy-openclaw.js shopping-list-clean --list-id 1 --format json
```

`shopping-list-clean --dry-run true` is read-only and may run without confirmation. `shopping-list-clean` without dry-run deletes completed rows only and requires explicit confirmation after the preview.

## Custom Field Workflows

```bash
node bin/grocy-openclaw.js userfields --entity recipes --format table
node bin/grocy-openclaw.js userfields-create --entity recipes --caption "Cooking time" --type text-single-line --format json
node bin/grocy-openclaw.js userfields-update --entity recipes --field cook_time --caption "Cooking time, min" --format json
node bin/grocy-openclaw.js userfields-delete --userfield-id 14 --confirm-field-name cook_time --format json
node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Pancakes" --values '{"difficulty":"easy","cook_time":"10 minutes"}' --format json
```

Ask for the custom field type before `userfields-create` when it is missing. Use `userfields-update` to fix a definition instead of creating a duplicate. `userfields-delete` refuses deletion when populated values exist unless `--delete-values true` is separately confirmed.

## Stock Workflows

```bash
node bin/grocy-openclaw.js stock-add --product "Milk" --amount 1 --unit "l" --price 2.49 --best-before-date 2026-12-31 --format json
node bin/grocy-openclaw.js stock-transaction-undo --transaction-id "abc123" --format json
```

Use `stock-add` only after the product, amount, unit, price, best-before date, and transaction type are clear. The amount must be in the product stock unit. If the product is unclear, run `product-search` first. Keep returned `transaction_ids` so a mistaken stock addition can be reversed with `stock-transaction-undo`.

## Menu And Meal Plan Workflows

Use read-only menu helpers first:

```bash
node bin/grocy-openclaw.js menu-check --recipe "Pancakes" --servings 4 --format text
node bin/grocy-openclaw.js menu-plan --count 3 --servings 4 --format text
node bin/grocy-openclaw.js menu-shopping-list --recipes '[{"name":"Pancakes","servings":4},{"id":8,"servings":2}]' --format json
```

These commands calculate readiness and missing products only. They do not write shopping list or meal plan rows.

After the user confirms exact rows, manage Grocy meal plan:

```bash
node bin/grocy-openclaw.js meal-plan-add --date 2026-07-16 --recipe "Pancakes" --section "Dinner" --note "family" --format json
node bin/grocy-openclaw.js meal-plan-update --entry-id 12 --date 2026-07-17 --note "changed" --format json
node bin/grocy-openclaw.js meal-plan-delete --entry-id 12 --confirm-recipe-name "Pancakes" --format json
```

Grocy 4.6.0 meal plan rows do not support per-row servings; do not pass `--servings` to meal plan write commands.
