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

The current version is read-only.

You may read Grocy products, stock, and shopping list data. Do not modify Grocy unless the user explicitly asks and a documented write command exists.

## Safety

- Never reveal secrets.
- Never print `.env`.
- Never reveal `GROCY_API_KEY`.
- Do not include `GROCY_API_KEY` in command output, errors, summaries, or logs.
- Use `GROCY_API_KEY` only through the `GROCY-API-KEY` request header.

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
