---
name: grocy
description: Work with Grocy home inventory, stock, products, and shopping list.
---

# Grocy Home Inventory Skill

Use this skill when the user asks about:

- Grocy
- groceries
- home inventory
- household supplies
- shopping list
- stock
- products in stock
- список покупок
- покупки
- что купить
- что есть дома
- остатки
- продукты дома
- бытовые расходники

## Scope

Read commands are read-only.

You may read Grocy products, stock, and shopping list data.

The `product-create` command modifies Grocy by creating a product object. Run it only after the user explicitly confirms creating that product.

The `product-update` command modifies Grocy by updating a product object or product-specific unit conversion. Run it only after the user explicitly confirms the exact product and fields to change.

The `product-delete` command modifies Grocy by deleting an unused product object. Run it only after especially clear confirmation of the exact product id. Prefer deactivating with `product-update --active false` when deletion is not safe.

The `recipe-create` command modifies Grocy by creating a recipe and recipe ingredient rows. It may create missing ingredient products only when `--create-missing-products true` is used after explicit user confirmation. Run it only after the user confirms creating that recipe.

The `recipe-ingredient-add` command modifies Grocy by adding one ingredient row to an existing recipe. Run it only after the user confirms adding that ingredient row.

The `recipe-ingredient-update` command modifies Grocy by updating one existing recipe ingredient row. Run it only after the user confirms correcting that ingredient row.

The `stock-add` command modifies Grocy by adding a purchased product amount to stock and may record the latest purchase price. Run it only after the user confirms adding those purchases or stock entries.

The `stock-transaction-undo` command modifies Grocy by undoing one stock transaction. Run it only after the user confirms the exact transaction id to undo.

## Safety

- Never reveal secrets.
- Never print `.env`.
- Never reveal `GROCY_API_KEY`.
- Do not include `GROCY_API_KEY` in command output, errors, summaries, or logs.
- Use `GROCY_API_KEY` only through the `GROCY-API-KEY` request header.
- Treat configured `.env` credentials as the user's real Grocy instance unless told otherwise.
- Read-only commands do not require confirmation.
- Do not run any command that changes Grocy data unless the user explicitly confirms that specific action immediately before execution.
- Treat create, add, update, delete, remove, cancel, mark done, consume stock, stock add, and correction commands as data manipulation commands requiring confirmation.
- Prefer update/delete correction workflows over creating duplicates when the user asks to fix a wrong record.
- Ask again if the command, target object, amount, unit, price, or payload changes before execution.

## Environment

Run commands from the deployed skill directory. The CLI reads `GROCY_URL` and `GROCY_API_KEY` from the process environment; if either variable is missing, it falls back to a local `.env` file in the current working directory. Existing process environment values take priority over `.env`.

Manual loading is also supported when needed:

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

`GROCY_URL` may include or omit a trailing slash.

The configured `.env` can point to real Grocy data. Do not print it or inspect it for display.

## Execution rule

Always use the provided Node.js CLI for Grocy work:

```bash
node bin/grocy-openclaw.js <command> --format <format>
```

Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts. The CLI is responsible for loading the API key safely, setting the `GROCY-API-KEY` header, formatting output, and keeping errors safe for chat.

For connectivity checks, prefer read-only commands. Run write commands against the configured Grocy instance only when the user confirms the exact data change.

## Commands

Check Grocy connectivity and API key validity:

```bash
node bin/grocy-openclaw.js system-info --format json
```

Show OpenAPI documentation links for the installed Grocy version:

```bash
node bin/grocy-openclaw.js api-docs --format text
```

Show configured Grocy quantity units:

```bash
node bin/grocy-openclaw.js units --format table
```

Show configured Grocy product locations:

```bash
node bin/grocy-openclaw.js locations --format table
```

Create a new Grocy quantity unit:

```bash
node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
```

Show the active shopping list as compact Russian text:

```bash
node bin/grocy-openclaw.js shopping-list --format text
```

Return the active shopping list as JSON:

```bash
node bin/grocy-openclaw.js shopping-list --format json
```

Show Grocy products as a table:

```bash
node bin/grocy-openclaw.js products --format table
```

Return Grocy products as JSON:

```bash
node bin/grocy-openclaw.js products --format json
```

Search existing Grocy products by name:

```bash
node bin/grocy-openclaw.js product-search --name "молоко" --format table
node bin/grocy-openclaw.js product-search --name "молоко" --format json
```

Use `product-search` when a user, receipt parser, or natural-language request gives an inexact product name. It is read-only and does not require confirmation. Prefer this before asking the user to choose an existing product for `stock-add`, recipe ingredient commands, or product correction workflows.

Create a new Grocy product object:

```bash
node bin/grocy-openclaw.js product-create --name "Молоко" --location "Холодильник" --stock-unit "л" --format json
```

When purchase or consume units differ from stock unit, include conversion factors:

```bash
node bin/grocy-openclaw.js product-create --name "Огурцы маринованные" --location "Кладовка" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --consume-unit "шт" --format json
```

Every new product needs a Grocy location. Prefer `--location` with a location name in chat workflows. Users should not be expected to know Grocy location ids.

If the product location is unclear, inspect configured locations first:

```bash
node bin/grocy-openclaw.js locations --format table
```

Then ask which existing location to use before running `product-create`.

`--purchase-to-stock-factor` means how many stock units are in 1 purchase unit. `--consume-to-stock-factor` means how many stock units are in 1 consume unit. If the units are equal, the factor is `1` and may be omitted.

Do not add `qu_factor_purchase_to_stock` or `qu_factor_consume_to_stock` directly to a Grocy product object. In Grocy 4.x, product-specific unit conversions are separate `quantity_unit_conversions` objects. Use the CLI options above; the CLI creates the product first and then creates the conversion rows.

If the user asks to create a product with different purchase or consume units but does not provide the conversion factor, do not run `product-create` yet. Ask a clarification question first:

- For purchase unit: "How many stock units are in 1 purchase unit?"
- For consume unit: "How many stock units are in 1 consume unit?"

Example: if the user says pickles are stored and consumed as pieces but bought in jars, ask how many pieces are in one jar before creating the product.

For chat workflows, prefer unit names or common aliases. Users should not be expected to know Grocy unit ids.

If the unit is unclear, inspect configured units first:

```bash
node bin/grocy-openclaw.js units --format table
```

If no existing unit fits, ask the user before creating a new unit. Only after the user confirms, run:

```bash
node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
```

Then create the product using the new unit name.

Use ids only when an automation already knows the id:

```bash
node bin/grocy-openclaw.js product-create --name "Картофель" --location-id 1 --stock-unit-id 2 --format json
```

`--purchase-unit` and `--consume-unit` are optional and default to the stock unit.

Update an existing Grocy product:

```bash
node bin/grocy-openclaw.js product-update --product "Milk" --name "Milk 2.5%" --location "Fridge" --active true --format json
node bin/grocy-openclaw.js product-update --product-id 42 --purchase-unit "bottle" --purchase-to-stock-factor 1 --format json
```

Use `product-update` when the user asks to correct a product name, description, active flag, location, stock unit, purchase unit, consume unit, or conversion factor. Do not create a duplicate product to fix a wrong product. Confirm the exact target product and payload before running it.

For `product-update`, use `--product` or `--product-id` to select the product. Optional update fields are `--name`, `--description`, `--active`, `--location` / `--location-id`, `--stock-unit` / `--stock-unit-id`, `--purchase-unit` / `--purchase-unit-id`, `--consume-unit` / `--consume-unit-id`, `--purchase-to-stock-factor`, and `--consume-to-stock-factor`. If a changed purchase or consume unit differs from stock unit and no matching conversion exists, ask for the conversion factor before running the command.

Delete an unused Grocy product:

```bash
node bin/grocy-openclaw.js product-delete --product-id 42 --confirm-product-name "Milk 2.5%" --format json
```

Use `product-delete` only for a product that should be removed and only after especially clear confirmation of the exact product id. It refuses deletion when the product has non-zero stock, recipe ingredient rows, or shopping list rows. If deletion is refused or Grocy rejects it because of other references, ask for confirmation to deactivate the product instead:

```bash
node bin/grocy-openclaw.js product-update --product-id 42 --active false --format json
```

Create a recipe with ingredients:

```bash
node bin/grocy-openclaw.js recipe-create --name "Оливье" --base-servings 4 --ingredients '[{"name":"Картофель","amount":3,"unit":"шт"},{"name":"Огурцы маринованные","amount":2,"unit":"шт","location":"Кладовка","note":"нарезать"}]' --format json
```

For `recipe-create`, build `--ingredients` as a JSON array. Each ingredient must include `name` or `productId`, `amount`, and `unit`. Optional fields are `note`, `ingredientGroup`, `variableAmount`, `onlyCheckSingleUnitInStock`, `roundUp`, `location`, `locationId`, and a nested `product` object. Use `--create-missing-products true` only after the user explicitly confirms creating missing ingredient products.

If an ingredient product does not exist, `recipe-create` stops before writing anything and asks for explicit confirmation before creating a new product. After the user confirms, rerun with `--create-missing-products true`. A missing ingredient product still needs a Grocy location, so include `location` or `locationId` on the ingredient or nested product object. If the product needs different purchase or consume units, include a nested `product` object with `location`, `stockUnit`, `purchaseUnit`, `purchaseToStockFactor`, `consumeUnit`, and `consumeToStockFactor` as needed.

If the user asks to create a recipe but omits ingredient amounts or units, ask a clarification question before running `recipe-create`. If a unit is unclear, inspect existing units first with `units --format table`; create a new unit only after the user confirms none fit. If the recipe includes products that are not found in Grocy, ask the user whether to create those products before rerunning with `--create-missing-products true`. If product creation was confirmed but the user did not specify where to store the new products, inspect existing locations first with `locations --format table` and ask which location to use.

Add one ingredient to an existing recipe:

```bash
node bin/grocy-openclaw.js recipe-ingredient-add --recipe "Блины" --product "Масло подсолнечное" --amount 30 --unit "мл" --note "в тесто" --format json
```

Use `recipe-ingredient-add` when the user says an existing recipe is missing an ingredient or one ingredient was misunderstood. This command creates only one `recipes_pos` row and does not delete or recreate the recipe.

For `recipe-ingredient-add`, use `--recipe` or `--recipe-id` to select the recipe, and `--product` or `--product-id` to select the product. Prefer names in chat workflows. Required fields are recipe selector, product selector, `--amount`, and `--unit`. Optional fields are `--note`, `--ingredient-group`, `--variable-amount`, `--only-check-single-unit-in-stock`, `--round-up`, and `--create-missing-products true`.

If `--product` does not match an existing product, `recipe-ingredient-add` stops before writing anything and asks for explicit confirmation before creating a new product. After the user confirms, rerun with `--create-missing-products true`. In that case, include `--location` or `--location-id`; include purchase or consume unit conversion factors when needed, the same as for `product-create`.

If the user asks to add an ingredient but omits the amount or unit, ask a clarification question before running `recipe-ingredient-add`. If the product name is unclear, inspect products first with `products --format table`; if the unit is unclear, inspect units first with `units --format table`. If the product is not found, ask whether to create it before rerunning with `--create-missing-products true`.

Update one ingredient row in an existing recipe:

```bash
node bin/grocy-openclaw.js recipe-ingredient-update --recipe "Блины" --product "Масло подсолнечное" --amount 0.03 --unit "л" --format json
```

Use `recipe-ingredient-update` when an ingredient was added with the wrong amount, unit, note, ingredient group, or flags. Do not call Grocy directly with `curl`, inline Python, or `fetch` for this.

For `recipe-ingredient-update`, use `--position-id` when the recipe position id is known. Otherwise select the row with `--recipe` or `--recipe-id` plus `--product` or `--product-id`. Required fields are either `--position-id`, or both recipe selector and product selector. At least one update field must be provided: `--amount`, `--unit`, `--note`, `--ingredient-group`, `--variable-amount`, `--only-check-single-unit-in-stock`, or `--round-up`.

If the matching recipe/product pair has multiple ingredient rows, the command prints the matching position ids. Rerun with `--position-id`.

If the user says a unit such as `ст.ложка`, `ст ложка`, or `столовая ложка`, never treat it as `л`. If that unit is not configured in Grocy, ask whether to convert to an existing unit such as liters or milliliters, or create the missing unit after confirmation.

Show custom fields configured for an entity:

```bash
node bin/grocy-openclaw.js userfields --entity recipes --format table
```

Create a custom field for an entity:

```bash
node bin/grocy-openclaw.js userfields-create --entity recipes --caption "Время готовки" --type text-single-line --format json
```

`--name` is optional. If omitted, the command generates a technical name from the caption, for example `Время готовки` becomes `vremya_gotovki`.

Show custom field values for one object:

```bash
node bin/grocy-openclaw.js userfields-get --entity recipes --object-id 10 --format json
```

Set custom field values for one object:

```bash
node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Быстрые блины" --values '{"Уровень сложности":"легкий","Время готовки":"10 минут"}' --format json
```

Use `userfields` when the user asks what custom fields an entity has. Use `userfields-get` when the user asks what custom field values are set on a specific object. Use `userfields-set` when the user explicitly asks to set or update custom field values. For recipes, use `--entity recipes`; for products, use `--entity products`.

For `userfields-set`, use either `--object-id` or `--object-name`. Prefer `--object-name` in chat workflows when the object name is unique. Values can be passed as a JSON object through `--values`; keys can be custom field technical names or captions. For a single field, use `--field` and `--value`.

If the user says "set recipe difficulty to easy" or "время готовки - 10 минут", use `userfields-set`. Do not call Grocy directly with `curl`, inline Python, or `fetch` for this. If a custom field name is unclear, inspect configured fields first with:

```bash
node bin/grocy-openclaw.js userfields --entity recipes --format table
```

Supported custom field types: `text-single-line`, `text-multi-line`, `number-integral`, `number-decimal`, `number-currency`, `date`, `datetime`, `checkbox`, `preset-list`, `preset-checklist`, `link`, `link-with-title`, `file`, and `image`.

If the user asks to create a custom field but does not specify the type, ask a clarification question before running `userfields-create`. For cooking time, ask whether it should be free-form text such as `45 minutes` or a number such as minutes.

Show Grocy stock as a table:

```bash
node bin/grocy-openclaw.js stock --format table
```

Return Grocy stock as JSON:

```bash
node bin/grocy-openclaw.js stock --format json
```

Add a purchased product amount to Grocy stock and record the latest purchase price:

```bash
node bin/grocy-openclaw.js stock-add --product "Молоко" --amount 1 --unit "л" --price 2.49 --format json
```

Use `stock-add` when OpenClaw has already understood the purchase item. Do not parse receipts inside this skill. Do not call Grocy directly with `curl`, inline Python, or `fetch` for stock additions.

For `stock-add`, use `--product` or `--product-id` to select an existing product. Required fields are product selector and `--amount`. Optional fields are `--unit` or `--unit-id`, `--price`, `--best-before-date`, and `--transaction-type`. The default transaction type is `purchase`; allowed values are `purchase`, `consume`, `inventory-correction`, and `product-opened`. The amount must be in the product stock unit; if the user gives a purchase unit that differs from the stock unit, ask the user or convert only when the conversion is known.

The JSON output from `stock-add` includes `transaction_ids` when Grocy returns stock log entries. Keep the transaction id if the user may need to undo the stock addition.

Undo a mistaken stock transaction:

```bash
node bin/grocy-openclaw.js stock-transaction-undo --transaction-id "abc123" --format json
```

Use `stock-transaction-undo` to reverse a mistaken `stock-add` when the transaction id is known. Do not guess transaction ids. Ask for confirmation again if the transaction id changes.

If the product is not found, search existing products first with:

```bash
node bin/grocy-openclaw.js product-search --name "<name>" --format table
```

Ask which existing product to use. Do not create a missing product unless the user explicitly asks for product creation.

## API documentation workflow

When extending this skill or troubleshooting a Grocy API mismatch, first run:

```bash
node bin/grocy-openclaw.js api-docs --format text
```

Use the version-specific OpenAPI link before `master`. Before adding or changing any Grocy API command, verify the endpoint, entity name, query parameters, response shape, and request payload fields in that OpenAPI document.

## Response behavior

Return command output clearly to the user.

For Russian shopping list requests, prefer:

```bash
node bin/grocy-openclaw.js shopping-list --format text
```

If a command fails, summarize the readable error without exposing `.env` or `GROCY_API_KEY`.
