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

The `product-create` command modifies Grocy by creating a product object. Run it only when the user explicitly asks to create a new product.

The `recipe-create` command modifies Grocy by creating a recipe, recipe ingredient rows, and any missing ingredient products. Run it only when the user explicitly asks to create a recipe.

## Safety

- Never reveal secrets.
- Never print `.env`.
- Never reveal `GROCY_API_KEY`.
- Do not include `GROCY_API_KEY` in command output, errors, summaries, or logs.
- Use `GROCY_API_KEY` only through the `GROCY-API-KEY` request header.
- Do not run write commands unless the user's intent to modify Grocy is explicit.

## Environment

Before running commands, load environment variables from the deployed skill directory:

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

## Execution rule

Always use the provided Node.js CLI for Grocy work:

```bash
node bin/grocy-openclaw.js <command> --format <format>
```

Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts. The CLI is responsible for loading the API key safely, setting the `GROCY-API-KEY` header, formatting output, and keeping errors safe for chat.

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

Create a new Grocy product object:

```bash
node bin/grocy-openclaw.js product-create --name "Молоко" --stock-unit "л" --format json
```

When purchase or consume units differ from stock unit, include conversion factors:

```bash
node bin/grocy-openclaw.js product-create --name "Огурцы маринованные" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --consume-unit "шт" --format json
```

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
node bin/grocy-openclaw.js product-create --name "Картофель" --stock-unit-id 2 --format json
```

`--purchase-unit` and `--consume-unit` are optional and default to the stock unit.

Create a recipe with ingredients:

```bash
node bin/grocy-openclaw.js recipe-create --name "Оливье" --base-servings 4 --ingredients '[{"name":"Картофель","amount":3,"unit":"шт"},{"name":"Огурцы маринованные","amount":2,"unit":"шт","note":"нарезать"}]' --format json
```

For `recipe-create`, build `--ingredients` as a JSON array. Each ingredient must include `name` or `productId`, `amount`, and `unit`. Optional fields are `note`, `ingredientGroup`, `variableAmount`, `onlyCheckSingleUnitInStock`, `roundUp`, and a nested `product` object.

If an ingredient product does not exist, `recipe-create` creates it automatically using the ingredient unit as stock, purchase, and consume unit. If the product needs different purchase or consume units, include a nested `product` object with `stockUnit`, `purchaseUnit`, `purchaseToStockFactor`, `consumeUnit`, and `consumeToStockFactor` as needed.

If the user asks to create a recipe but omits ingredient amounts or units, ask a clarification question before running `recipe-create`. If a unit is unclear, inspect existing units first with `units --format table`; create a new unit only after the user confirms none fit.

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

Use `userfields` when the user asks what custom fields an entity has. Use `userfields-get` when the user asks what custom field values are set on a specific object. For recipes, use `--entity recipes`; for products, use `--entity products`.

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
