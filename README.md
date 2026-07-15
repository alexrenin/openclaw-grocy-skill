# OpenClaw Grocy Skill

Reusable OpenClaw skill for Grocy home inventory, stock, products, recipes, custom fields, and shopping list data.

Read commands print output that OpenClaw can return directly to the user. Write commands are explicit CLI commands and should only be run after the user confirms the specific data change. Shopping list text output is Russian by default.

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
- Treat `.env` as real Grocy credentials. Use mocked tests by default; create temporary live test records only with confirmation and cleanup.

## Local CLI Usage

The CLI reads `GROCY_URL` and `GROCY_API_KEY` from the process environment. If either variable is missing, it falls back to a local `.env` file in the current working directory. Existing process environment values take priority over `.env`.

You may still load `.env` manually before running commands:

```bash
set -a
. ./.env
set +a
```

Always use the CLI for Grocy work. Do not call Grocy directly with inline Python, `fetch`, `curl`, or ad hoc scripts; the CLI handles the API key header, safe errors, and chat-friendly output.

Read-only commands may run without confirmation. Before any command that changes Grocy data, ask the user to confirm the concrete action and target data. This applies to create, add, update, delete, remove, cancel, mark done, consume stock, stock add, and correction commands.

If `.env` points to a real Grocy instance, use read-only commands for connectivity checks. Temporary test products, test units, test recipes, test custom fields, shopping list entries, stock entries, or price records are allowed only when the user explicitly confirms the exact test action and cleanup plan. Delete or reverse test records immediately after verification.

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

Update an existing Grocy quantity unit:

```bash
node bin/grocy-openclaw.js unit-update --unit-id 7 --name "стеклянная банка" --name-plural "стеклянные банки" --format json
```

Delete an unused Grocy quantity unit:

```bash
node bin/grocy-openclaw.js unit-delete --unit-id 7 --confirm-unit-name "стеклянная банка" --format json
```

`unit-update` and `unit-delete` modify Grocy. Use them only after the user confirms the exact unit and change. `unit-delete` checks products, recipe ingredient rows, shopping list rows, and quantity unit conversion rows before deleting; if the unit is still referenced, update dependent records first or leave the unit in Grocy.

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

Search existing products by name:

```bash
node bin/grocy-openclaw.js product-search --name "молоко" --format table
node bin/grocy-openclaw.js product-search --name "молоко" --format json
```

`product-search` is read-only. Use it before product-related writes when a receipt item or chat query may not match a Grocy product name exactly. Results include product id, name, description, stock unit, purchase unit, and a match score.

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

Update an existing Grocy product:

```bash
node bin/grocy-openclaw.js product-update --product "Milk" --name "Milk 2.5%" --location "Fridge" --active true --format json
node bin/grocy-openclaw.js product-update --product-id 42 --purchase-unit "bottle" --purchase-to-stock-factor 1 --format json
```

`product-update` modifies Grocy. Use it only after the user confirms the exact product and fields to change. It preserves existing product fields that are not mentioned. It can update name, description, active flag, location, stock unit, purchase unit, consume unit, and product-specific conversion factors.

Supported `product-update` options:

- `--product` or `--product-id`: required product selector; prefer `--product` for chat when the name is unique
- `--name`: optional new product name
- `--description`: optional product description; pass an empty value to clear it
- `--active`: optional `true` or `false`; use `false` as the documented fallback when deletion is not safe
- `--location` or `--location-id`: optional new product location
- `--stock-unit` or `--stock-unit-id`: optional new stock unit
- `--purchase-unit` or `--purchase-unit-id`: optional new purchase unit
- `--purchase-to-stock-factor`: required when the new purchase unit differs from stock unit and no matching conversion exists
- `--consume-unit` or `--consume-unit-id`: optional new consume unit
- `--consume-to-stock-factor`: required when the new consume unit differs from stock unit and no matching conversion exists
- `--format json`: required output format

Safely delete an unused Grocy product:

```bash
node bin/grocy-openclaw.js product-delete --product-id 42 --confirm-product-name "Milk 2.5%" --format json
```

`product-delete` modifies Grocy and is intentionally conservative. It only accepts `--product-id`, optionally checks `--confirm-product-name`, and refuses to delete when the product has non-zero stock, recipe ingredient rows, or shopping list rows. If deletion is refused or Grocy rejects it because of other references, ask for confirmation to deactivate the product instead:

```bash
node bin/grocy-openclaw.js product-update --product-id 42 --active false --format json
```

Create a recipe with ingredients:

```bash
node bin/grocy-openclaw.js recipe-create --name "Оливье" --base-servings 4 --ingredients '[{"name":"Картофель","amount":3,"unit":"шт"},{"name":"Огурцы маринованные","amount":2,"unit":"шт","location":"Кладовка","note":"нарезать"}]' --format json
```

`recipe-create` creates the recipe object and its `recipes_pos` ingredient rows. Each ingredient must include:

- `name` or `productId`: product name or known Grocy product id
- `amount`: positive number
- `unit`: Grocy quantity unit name or common alias

Optional ingredient fields: `note`, `ingredientGroup`, `variableAmount`, `onlyCheckSingleUnitInStock`, `roundUp`, `location`, `locationId`, and a nested `product` object.

Use `--create-missing-products true` only after the user explicitly confirms creating missing ingredient products.

If an ingredient product name does not exist, `recipe-create` stops before writing anything and asks for explicit confirmation before creating a new product. After the user confirms, rerun with `--create-missing-products true`. The new product still needs a Grocy location, so include `location` or `locationId` on the ingredient or nested product object. For more control, include a nested `product` object, for example:

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

For chat agents: if a recipe ingredient unit is unknown, inspect existing units first with `units --format table`. Create a new unit only after the user confirms none of the existing units fit. If a recipe includes new products, ask for confirmation before creating those products and only then add `--create-missing-products true`. If the user confirmed product creation but did not specify where to store the new products, inspect locations with `locations --format table` and ask which existing location to use.

Update an existing recipe:

```bash
node bin/grocy-openclaw.js recipe-update --recipe "Оливье" --name "Оливье быстрый" --base-servings 4 --format json
node bin/grocy-openclaw.js recipe-update --recipe-id 11 --description "" --desired-servings 4 --format json
```

`recipe-update` modifies Grocy. Use it only after the user confirms the exact recipe and fields to change. It preserves existing recipe fields that are not mentioned.

Supported `recipe-update` options:

- `--recipe` or `--recipe-id`: required recipe selector; prefer `--recipe` for chat when the name is unique
- `--name`: optional new recipe name
- `--description`: optional recipe description; pass an empty value to clear it
- `--base-servings`: optional positive integer
- `--desired-servings`: optional positive integer
- `--format json`: required output format

Delete a recipe:

```bash
node bin/grocy-openclaw.js recipe-delete --recipe-id 11 --confirm-recipe-name "Оливье быстрый" --delete-ingredients true --format json
```

`recipe-delete` modifies Grocy and is intentionally conservative. It accepts `--recipe` or `--recipe-id`, optionally checks `--confirm-recipe-name`, and refuses to delete a recipe that still has ingredient rows unless `--delete-ingredients true` is provided after explicit confirmation. With `--delete-ingredients true`, it deletes the recipe's `recipes_pos` rows first, then deletes the recipe.

Supported `recipe-delete` options:

- `--recipe` or `--recipe-id`: required recipe selector; prefer `--recipe-id` when deleting a just-created recipe from command output
- `--confirm-recipe-name`: optional safety check
- `--delete-ingredients true`: required when the recipe still has ingredient rows
- `--format json`: required output format

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
- `--create-missing-products true`: optional; use only after the user explicitly confirms creating a missing product

If `--product` does not match an existing product, the command stops before writing anything and asks for explicit confirmation before creating the new product. After the user confirms, rerun with `--create-missing-products true`. In that case, include `--location` or `--location-id`; include purchase or consume unit conversion factors when needed, the same as for `product-create`.

For chat agents: if the user says a recipe is missing an ingredient, use `recipe-ingredient-add`. Do not suggest deleting or manually recreating the recipe just to add one ingredient. If the product is not found, ask whether to create it before rerunning with `--create-missing-products true`.

Update an ingredient row in an existing recipe:

```bash
node bin/grocy-openclaw.js recipe-ingredient-update --recipe "Блины" --product "Масло подсолнечное" --amount 0.03 --unit "л" --format json
```

`recipe-ingredient-update` updates only an existing `recipes_pos` ingredient row. Use it when an ingredient was added with the wrong amount, unit, note, ingredient group, or flags. It can select the row by `--position-id`, or by `--recipe` / `--recipe-id` together with `--product` / `--product-id`.

Supported `recipe-ingredient-update` options:

- `--position-id`: optional direct recipe position id
- `--recipe` or `--recipe-id`: required when `--position-id` is not used
- `--product` or `--product-id`: required when `--position-id` is not used
- `--amount`: optional positive amount
- `--unit`: optional Grocy quantity unit name or common alias
- `--note`, `--ingredient-group`, `--variable-amount`, `--only-check-single-unit-in-stock`, `--round-up`: optional fields to update

If the matching recipe/product pair has multiple ingredient rows, the command stops and prints the matching position ids. Rerun with `--position-id`.

For chat agents: if a unit such as `ст.ложка` is not configured in Grocy, do not let it match `л`. Either ask the user whether to convert to an existing unit such as liters or milliliters, or create the missing unit after confirmation.

Delete one ingredient row from an existing recipe:

```bash
node bin/grocy-openclaw.js recipe-ingredient-delete --recipe "Блины" --product "Масло подсолнечное" --format json
node bin/grocy-openclaw.js recipe-ingredient-delete --position-id 12 --format json
```

`recipe-ingredient-delete` modifies Grocy by deleting one `recipes_pos` row. Use it after confirmation when an ingredient was added by mistake. It can select the row by `--position-id`, or by `--recipe` / `--recipe-id` together with `--product` / `--product-id`. If the matching recipe/product pair has multiple rows, the command stops and prints the matching position ids; rerun with `--position-id`.

Show custom fields configured for an entity:

```bash
node bin/grocy-openclaw.js userfields --entity recipes --format table
```

Create a custom field for an entity:

```bash
node bin/grocy-openclaw.js userfields-create --entity recipes --caption "Время готовки" --type text-single-line --format json
```

`--name` is optional. If omitted, the command generates a technical name from the caption, for example `Время готовки` becomes `vremya_gotovki`.

Update a custom field definition:

```bash
node bin/grocy-openclaw.js userfields-update --entity recipes --field cook_time --caption "Cooking time" --type number-integral --format json
```

Select the field either by `--userfield-id`, or by `--entity` plus `--field` (technical name or caption). Only explicitly supplied properties are changed.

Safely delete a custom field definition:

```bash
node bin/grocy-openclaw.js userfields-delete --userfield-id 14 --confirm-field-name cook_time --format json
```

The delete command inspects values on all objects of the field entity and refuses deletion when populated values exist. Deleting the definition and those values requires a newly confirmed command with `--delete-values true`. `--confirm-field-name` must exactly match the technical name.

Show custom field values for one object:

```bash
node bin/grocy-openclaw.js userfields-get --entity recipes --object-id 10 --format json
```

Set custom field values for one object:

```bash
node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Быстрые блины" --values '{"Уровень сложности":"легкий","Время готовки":"10 минут"}' --format json
```

Use `userfields` to answer which custom fields can exist on an entity. Use `userfields-get` to answer which values are set on a specific object. Use `userfields-set` when the user explicitly asks to set or update custom field values. For recipes, use `--entity recipes`; for products, use `--entity products`.

`userfields-set` accepts either `--object-id` or `--object-name`. For chat workflows, prefer `--object-name` when the object has a unique name. Values can be passed as a JSON object through `--values`; keys can be custom field technical names or captions. For a single field, use `--field` and `--value`.

Examples:

```bash
node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Быстрые блины" --field "Время готовки" --value "10 минут" --format json
node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Быстрые блины" --values '{"difficulty":"легкий","cook_time":"10 минут"}' --format json
```

For chat agents: if the user asks to update custom fields, use `userfields-set`. Do not call Grocy directly with `curl`, inline Python, or `fetch` for this. If a field name is unclear, inspect configured fields first with `userfields --entity <entity> --format table`.

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

Show a compact stock monitoring summary:

```bash
node bin/grocy-openclaw.js stock-summary --format text
node bin/grocy-openclaw.js stock-summary --format json
```

`stock-summary` is read-only. It reports the number of active, own-stock products configured in Grocy, how many are currently in or out of stock, and Grocy-native counts for products below minimum stock, due soon, overdue, and expired. It also returns the nearest meaningful due date when one exists. Grocy's default due-soon window is 5 days, and the never-expiring sentinel date is excluded from the nearest-date result.

Use `stock` for the exact product-by-product inventory and `stock-summary` for a compact monitoring overview.

Show products below their configured minimum stock:

```bash
node bin/grocy-openclaw.js stock-low --format text
node bin/grocy-openclaw.js stock-low --format table
node bin/grocy-openclaw.js stock-low --format json
```

`stock-low` is read-only and uses Grocy's native `missing_products` classification. Text output is compact Russian text for chat; table and JSON output include product id, name, missing amount, stock unit, configured minimum stock amount, and whether some stock is still available.

Show stock with approaching or passed due dates:

```bash
node bin/grocy-openclaw.js stock-expiring --days 7 --format text
node bin/grocy-openclaw.js stock-expiring --days 7 --format table
node bin/grocy-openclaw.js stock-expiring --days 7 --format json
```

`stock-expiring` is read-only. `--days` controls Grocy's due-soon window, accepts a non-negative integer, and defaults to 5. Output keeps Grocy's `due_soon`, `overdue`, and `expired` categories distinct and includes product id, name, current amount, stock unit, and due date. JSON also includes the selected window and category counts.

Add a purchased product amount to stock and record the latest purchase price:

```bash
node bin/grocy-openclaw.js stock-add --product "Молоко" --amount 1 --unit "л" --price 2.49 --format json
```

`stock-add` modifies Grocy. Use it only when the user explicitly asks to add purchased products to stock. It does not parse receipts and does not create products automatically; OpenClaw should first identify the product, amount, unit, and price, then call this command.

The JSON output includes `transaction_ids` when Grocy returns stock log entries. Keep those ids when a newly added stock transaction may need to be reversed.

Supported `stock-add` options:

- `--product` or `--product-id`: required product selector; prefer `--product` for chat
- `--amount`: required positive amount, in the product stock unit
- `--unit` or `--unit-id`: optional check that the supplied amount uses the product stock unit; prefer `--unit` for chat
- `--price`: optional non-negative latest purchase price
- `--best-before-date`: optional best-before date in `YYYY-MM-DD` format
- `--transaction-type`: optional Grocy stock transaction type, defaults to `purchase`; allowed values are `purchase`, `consume`, `inventory-correction`, and `product-opened`
- `--format json`: required output format

For chat agents: if the user asks to add purchases to stock and the product is not found, search existing products first with `product-search --name "<name>" --format table`; if the result is still ambiguous, ask which existing product to use. Do not create a missing product unless the user explicitly asks for product creation. If the supplied unit differs from the product stock unit, ask the user to convert the amount to the stock unit before running `stock-add`.

Undo a stock transaction created by `stock-add`:

```bash
node bin/grocy-openclaw.js stock-transaction-undo --transaction-id "abc123" --format json
```

`stock-transaction-undo` modifies Grocy. Use it only after the user confirms undoing that exact stock transaction id. Prefer this command over consuming an equivalent amount when correcting a mistaken `stock-add`, because it targets the original Grocy transaction.

Supported `stock-transaction-undo` options:

- `--transaction-id`: required Grocy stock transaction id, normally copied from `stock-add` output
- `--format json`: required output format

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

Automated tests must not depend on or modify the configured Grocy instance.

## Security Notes

- Never commit `.env` or real secrets.
- Treat a configured `.env` as pointing to real Grocy data unless the user explicitly says otherwise.
- Never expose `GROCY_API_KEY`, Telegram bot tokens, OpenClaw gateway tokens, private IPs, or private hostnames.
- Error output must not include `GROCY_API_KEY`.
- Read commands are read-only.
- Read-only commands do not require confirmation.
- Every Grocy data manipulation requires explicit user confirmation immediately before execution.
- Do not run write commands as smoke tests against the real Grocy instance unless the user confirms the exact write test and cleanup plan.
- Temporary live test records must use obvious unique names, should capture created ids, and must be deleted or reversed immediately after the test.
- `product-create` modifies Grocy and must only be run after the user explicitly confirms creating the product.
- `product-update` modifies Grocy and must only be run after the user explicitly confirms the exact product correction.
- `product-delete` modifies Grocy and must only be run after especially clear confirmation of the exact product id; prefer `product-update --active false` when deletion is unsafe.
- `unit-create` modifies Grocy and must only be run after existing units were considered and the user confirms that a new unit should be created.
- `unit-update` modifies Grocy and must only be run after the user explicitly confirms the exact unit correction.
- `unit-delete` modifies Grocy and must only be run after especially clear confirmation of the exact unit id; delete only unused units.
- `recipe-create` modifies Grocy and may create missing products only when `--create-missing-products true` is used after explicit confirmation; run it only after the user confirms creating the recipe.
- `recipe-update` modifies Grocy and must only be run after the user explicitly confirms the exact recipe correction.
- `recipe-delete` modifies Grocy and must only be run after especially clear confirmation of the exact recipe; use `--delete-ingredients true` only when the user also confirmed deleting the recipe's ingredient rows.
- `recipe-ingredient-add` modifies Grocy by adding an ingredient row to an existing recipe; run it only after the user confirms adding that ingredient.
- `recipe-ingredient-update` modifies Grocy by updating an existing ingredient row; run it only after the user confirms the correction.
- `recipe-ingredient-delete` modifies Grocy by deleting one ingredient row; run it only after the user confirms removing that exact row.
- `userfields-create` modifies Grocy and must only be run after the user confirms creating the custom field.
- `userfields-update` modifies Grocy and must only be run after the user confirms the exact definition changes.
- `userfields-delete` modifies Grocy and must only be run after the user confirms the exact field deletion; populated values require separate confirmation with `--delete-values true`.
- `userfields-set` modifies Grocy and must only be run after the user confirms setting or updating custom field values.
- `stock-add` modifies Grocy by adding a purchased product amount to stock and may record `price`; run it only after the user confirms adding those purchases or stock entries.
- `stock-transaction-undo` modifies Grocy by undoing a stock transaction; run it only after the user confirms the exact transaction id to undo.
- Future write commands must be separate from read commands and require explicit user confirmation.
- Future write commands must document their confirmation requirement.
- Write command design must cover the full lifecycle where possible: create/add, update/edit, and delete/remove/cancel. This lets OpenClaw correct or undo records it just created instead of creating duplicates or requiring direct API calls.

## API Documentation Workflow

Before adding or changing any Grocy API command, run:

```bash
node bin/grocy-openclaw.js api-docs --format text
```

Use the version-specific OpenAPI link first, because `master` can describe a different Grocy version than the installed server. Verify the endpoint, entity name, query parameters, response shape, and request payload fields against that OpenAPI document before implementing the command.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the current implementation status, planned commands, and verification notes.

Current status: read commands, stock summary, low-stock, and expiring-stock monitoring, product search, product create/update/delete, unit create/update/delete, recipe create/update/delete, recipe ingredient add/update/delete, custom-field create/update/delete and value setting, stock add, and stock transaction undo are implemented. Planned work includes shopping list write commands, recipe read commands, and menu planning helpers.
