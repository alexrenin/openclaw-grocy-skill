# OpenClaw Grocy Skill

Reusable OpenClaw skill for Grocy home inventory, stock, products, recipes, custom fields, and shopping list data.

Read commands print output that OpenClaw can return directly to the user. Write commands are explicit CLI commands and should only be run when the user asks to modify Grocy. Shopping list text output is Russian by default.

## Requirements

- Node.js 18 or newer
- Grocy with REST API access enabled
- A Grocy API key
- OpenClaw workspace for deployment

No npm dependencies are required.

## Installation

Clone or copy this repository, then configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your Grocy URL and API key:

```env
GROCY_URL=http://grocy
GROCY_API_KEY=replace_me
```

`GROCY_URL` may include or omit a trailing slash.

## Environment Variables

Required variables:

- `GROCY_URL`: Grocy base URL, for example `http://grocy`
- `GROCY_API_KEY`: Grocy API key

Security rules:

- Do not commit `.env`.
- Do not print `.env`.
- Do not reveal `GROCY_API_KEY`.
- `GROCY_API_KEY` is used only in the `GROCY-API-KEY` request header.

## Local CLI Usage

Load environment variables before running commands:

```bash
set -a
. ./.env
set +a
```

Always use the CLI for Grocy work. Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts; the CLI handles the API key header, safe errors, and chat-friendly output.

Check Grocy connectivity and API key validity:

```bash
node bin/grocy-openclaw.js system-info --format json
```

Show OpenAPI documentation links for the installed Grocy version:

```bash
node bin/grocy-openclaw.js api-docs --format text
```

Show Grocy quantity units:

```bash
node bin/grocy-openclaw.js units --format table
```

Show Grocy product locations:

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

Show the active shopping list as JSON:

```bash
node bin/grocy-openclaw.js shopping-list --format json
```

Show products as a table:

```bash
node bin/grocy-openclaw.js products --format table
```

Show products as JSON:

```bash
node bin/grocy-openclaw.js products --format json
```

Create a new Grocy product object:

```bash
node bin/grocy-openclaw.js product-create --name "Молоко" --location "Холодильник" --stock-unit "л" --format json
```

Create a product that is purchased in one unit but consumed or stored in another:

```bash
node bin/grocy-openclaw.js product-create --name "Огурцы маринованные" --location "Кладовка" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --consume-unit "шт" --format json
```

Prefer unit names in chat workflows. The command accepts exact Grocy unit names, plural names, and common aliases such as `кг`, `килограмм`, `кило`, `kg`, `л`, `литр`, `шт`, and `штука`.

If unit matching is ambiguous, the command prints matching unit choices. If a unit is unknown, it prints available units. Use `units --format table` when the agent needs to inspect configured Grocy units.

For chat workflows, do not create a new unit immediately when a product unit is unknown. First show suitable existing units to the user. Create a new unit with `unit-create` only when the user confirms none of the existing units fit.

Prefer location names in chat workflows. Users should not be expected to know Grocy location ids. If the product location is unclear, inspect existing locations first:

```bash
node bin/grocy-openclaw.js locations --format table
```

You may also specify units by id when an automation already knows the id:

```bash
node bin/grocy-openclaw.js product-create --name "Картофель" --location-id 1 --stock-unit-id 2 --format json
```

Supported `product-create` options:

- `--name`: required product name
- `--location` or `--location-id`: required product location; prefer `--location` for chat
- `--stock-unit` or `--stock-unit-id`: required stock unit; prefer `--stock-unit` for chat
- `--purchase-unit` or `--purchase-unit-id`: optional purchase unit, defaults to stock unit
- `--purchase-to-stock-factor`: required when purchase unit differs from stock unit; means how many stock units are in 1 purchase unit
- `--consume-unit` or `--consume-unit-id`: optional consume unit, defaults to stock unit
- `--consume-to-stock-factor`: required when consume unit differs from stock unit; means how many stock units are in 1 consume unit
- `--description`: optional product description
- `--format json`: required output format

Implementation note: Grocy 4.x stores product-specific unit conversion factors in `quantity_unit_conversions`, not as `qu_factor_*` fields on the product. The CLI creates the product first and then creates the needed conversion rows automatically.

For chat agents: if the user asks to create a product but does not specify the product location, inspect locations with `locations --format table` and ask which existing location to use. If the user asks to create a product with different units but does not give the conversion factor, ask before running `product-create`. For example, if the product is stored as `шт` and purchased as `банка`, ask how many pieces are in one jar.

Create a recipe with ingredients:

```bash
node bin/grocy-openclaw.js recipe-create --name "Оливье" --base-servings 4 --ingredients '[{"name":"Картофель","amount":3,"unit":"шт"},{"name":"Огурцы маринованные","amount":2,"unit":"шт","location":"Кладовка","note":"нарезать"}]' --format json
```

`recipe-create` creates the recipe object and its `recipes_pos` ingredient rows. Each ingredient must include:

- `name` or `productId`: product name or known Grocy product id
- `amount`: positive number
- `unit`: Grocy quantity unit name or common alias

Optional ingredient fields: `note`, `ingredientGroup`, `variableAmount`, `onlyCheckSingleUnitInStock`, `roundUp`, `location`, `locationId`, and a nested `product` object.

If an ingredient product name does not exist, `recipe-create` creates a new product automatically using the ingredient unit as the stock, purchase, and consume unit. The new product still needs a Grocy location, so include `location` or `locationId` on the ingredient or nested product object. For more control, include a nested `product` object, for example:

```json
{
  "name": "Огурцы маринованные",
  "amount": 3,
  "unit": "шт",
  "product": {
    "location": "Кладовка",
    "stockUnit": "шт",
    "purchaseUnit": "банка",
    "purchaseToStockFactor": 10
  }
}
```

For chat agents: if a recipe ingredient unit is unknown, inspect existing units first with `units --format table`. Create a new unit only after the user confirms none of the existing units fit. If a recipe includes new products and the user did not specify where to store them, inspect locations with `locations --format table` and ask which existing location to use.

Add one ingredient to an existing recipe:

```bash
node bin/grocy-openclaw.js recipe-ingredient-add --recipe "Блины" --product "Масло подсолнечное" --amount 30 --unit "мл" --note "в тесто" --format json
```

`recipe-ingredient-add` creates only a new `recipes_pos` ingredient row. It does not delete or recreate the recipe. Use `--recipe` or `--recipe-id` to select the recipe, and `--product` or `--product-id` to select the product.

Supported `recipe-ingredient-add` options:

- `--recipe` or `--recipe-id`: required recipe selector; prefer `--recipe` for chat
- `--product` or `--product-id`: required product selector; prefer `--product` for chat
- `--amount`: required positive amount
- `--unit`: required Grocy quantity unit name or common alias
- `--note`: optional ingredient note
- `--ingredient-group`, `--variable-amount`, `--only-check-single-unit-in-stock`, `--round-up`: optional recipe position fields

If `--product` does not match an existing product, the command can create the missing product before adding the ingredient. In that case, include `--location` or `--location-id`; include purchase or consume unit conversion factors when needed, the same as for `product-create`.

For chat agents: if the user says a recipe is missing an ingredient, use `recipe-ingredient-add`. Do not suggest deleting or manually recreating the recipe just to add one ingredient.

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

Use `userfields` to answer which custom fields can exist on an entity. Use `userfields-get` to answer which values are set on a specific object. For recipes, use `--entity recipes`; for products, use `--entity products`.

Supported custom field types: `text-single-line`, `text-multi-line`, `number-integral`, `number-decimal`, `number-currency`, `date`, `datetime`, `checkbox`, `preset-list`, `preset-checklist`, `link`, `link-with-title`, `file`, and `image`.

For chat agents: if the user asks to create a custom field but does not specify the type, ask a clarification question before running `userfields-create`. For example, for cooking time ask whether it should be free-form text such as `45 minutes` or a number such as minutes.

Show stock as a table:

```bash
node bin/grocy-openclaw.js stock --format table
```

Show stock as JSON:

```bash
node bin/grocy-openclaw.js stock --format json
```

Show help:

```bash
node bin/grocy-openclaw.js --help
```

## Deploy To OpenClaw Workspace

Deploy to the default OpenClaw workspace:

```bash
./scripts/deploy-local.sh
```

Deploy to a custom workspace:

```bash
OPENCLAW_WORKSPACE=/custom/workspace ./scripts/deploy-local.sh
```

Default target:

```text
~/.openclaw/workspace/skills/grocy
```

The deploy script copies `SKILL.md`, `README.md`, `bin/`, `src/`, `package.json`, `.env.example`, and `scripts/`.

It does not overwrite an existing `.env`. If `.env` is missing in the deployed skill folder, it creates one from `.env.example`.

## Test Inside OpenClaw Gateway Docker Container

From inside the OpenClaw gateway container, run:

```bash
cd /home/node/.openclaw/workspace/skills/grocy
./scripts/smoke-test-openclaw.sh
```

Equivalent manual commands:

```bash
cd /home/node/.openclaw/workspace/skills/grocy
set -a
. ./.env
set +a
node bin/grocy-openclaw.js shopping-list --format text
```

To verify Grocy connectivity from the deployed skill folder:

```bash
node bin/grocy-openclaw.js system-info --format json
```

To inspect configured Grocy quantity units:

```bash
node bin/grocy-openclaw.js units --format table
```

To inspect configured Grocy product locations:

```bash
node bin/grocy-openclaw.js locations --format table
```

## Development

Run tests:

```bash
npm test
```

On Windows PowerShell, if script execution policy blocks `npm`, use:

```powershell
npm.cmd test
```

Tests use mocked data and do not require a real Grocy instance.

## Security Notes

- Never commit `.env` or real secrets.
- Never expose `GROCY_API_KEY`, Telegram bot tokens, OpenClaw gateway tokens, private IPs, or private hostnames.
- Error output must not include `GROCY_API_KEY`.
- Read commands are read-only.
- `product-create` modifies Grocy and must only be run when the user explicitly asks to create a product.
- `unit-create` modifies Grocy and must only be run after existing units were considered and the user confirms that a new unit is needed.
- `recipe-create` modifies Grocy and may create missing products; run it only when the user explicitly asks to create a recipe.
- `recipe-ingredient-add` modifies Grocy by adding an ingredient row to an existing recipe; run it only when the user explicitly asks to update a recipe.
- `userfields-create` modifies Grocy and must only be run when the user explicitly asks to create a custom field.
- Future write commands must be separate from read commands and require explicit user intent.

## API Documentation Workflow

Before adding or changing any Grocy API command, run:

```bash
node bin/grocy-openclaw.js api-docs --format text
```

Use the version-specific OpenAPI link first, because `master` can describe a different Grocy version than the installed server. Verify the endpoint, entity name, query parameters, response shape, and request payload fields against that OpenAPI document before implementing the command.

## Roadmap

- add item to shopping list
- search products by name
- mark shopping item done
- stock summaries
- expiring products
