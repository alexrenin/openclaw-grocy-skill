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

## Commands

Check Grocy connectivity and API key validity:

```bash
node bin/grocy-openclaw.js system-info --format json
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

Show Grocy stock as a table:

```bash
node bin/grocy-openclaw.js stock --format table
```

Return Grocy stock as JSON:

```bash
node bin/grocy-openclaw.js stock --format json
```

## Response behavior

Return command output clearly to the user.

For Russian shopping list requests, prefer:

```bash
node bin/grocy-openclaw.js shopping-list --format text
```

If a command fails, summarize the readable error without exposing `.env` or `GROCY_API_KEY`.
