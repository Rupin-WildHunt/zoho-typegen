# zoho-typegen

> Generate TypeScript interfaces from Zoho CRM module metadata — including subforms, custom fields and picklist union types.

> **Unofficial community tool. Not affiliated with or endorsed by Zoho Corporation.**

---

## Why

Zoho's own TypeScript SDK doesn't generate types for custom fields or picklist values as union literals. This tool calls the Zoho CRM Metadata API, reads every module's field definitions, and writes per-module `.ts` files with accurate interfaces. Including Subforms!

For example, a picklist field becomes a proper union type — not just `string`:

```ts
Lead_Source?: 'Cold Call' | 'Employee Referral' | 'Online Store' | 'Partner' | 'Web Site' | 'Word of Mouth' | 'Other';
```

Custom fields are included automatically. No manual type maintenance.

---

## Installation

**npx (no install needed):**

```bash
npx zoho-typegen
```

**Global:**

```bash
npm install -g zoho-typegen
zoho-typegen
```

**Project devDependency:**

```bash
npm install --save-dev zoho-typegen
npx zoho-typegen
```

---

## Quick Start

**1. Create a config file** in your project root:

```bash
# Copy the example from the package
cp node_modules/zoho-typegen/zoho-typegen.config.example.ts zoho-typegen.config.js
```

Edit `zoho-typegen.config.js`:

```js
export default {
  getToken: () => process.env.ZOHO_ACCESS_TOKEN,
  outputDir: './src/types/zoho',
};
```

**2. Run:**

```bash
npx zoho-typegen
```

That's it. Per-module `.ts` files and a barrel `index.ts` are written to `outputDir`.

---

## Token & Auth

`getToken` is a **function**, not a string — because Zoho access tokens are short-lived (~1 hour) and typically live in a database, not an env file. You implement the function; the tool calls it.

```js
// From an environment variable (simple scripts)
getToken: () => process.env.ZOHO_ACCESS_TOKEN,

// From a file written by your token-refresh cron
getToken: () => fs.readFileSync('.zoho_token', 'utf-8').trim(), // requires: import fs from 'fs'

// From a SQL database (async is fine)
getToken: async () => {
  const row = await db.query('SELECT value FROM tokens WHERE key = $1', ['zoho']);
  return row.value;
},

// From MongoDB in a Meteor app
getToken: () => Settings.findOne({ key: 'zoho_access_token' })?.value,
```

> **The tool does not handle token refresh.** Pass a valid, already-refreshed token. If `getToken()` returns an expired token mid-run, some modules will fail with `INVALID_TOKEN` — just re-run after refreshing.

### Required OAuth Scopes

When creating your Zoho OAuth client, make sure the token has at least these scopes:

```
ZohoCRM.settings.modules.READ
ZohoCRM.settings.fields.READ
```

Or the single combined scope:

```
ZohoCRM.settings.READ
```

These are read-only metadata scopes — the tool never reads, writes, or modifies any CRM records.

---

## Config File Reference

Create `zoho-typegen.config.js` (ESM) or `zoho-typegen.config.ts` in your project root. See `zoho-typegen.config.example.ts` (included in the package) for a full copy-paste template.

| Option                | Type                              | Default                   | Description                                    |
| --------------------- | --------------------------------- | ------------------------- | ---------------------------------------------- |
| `getToken`            | `() => string \| Promise<string>` | **required**              | Returns a valid Zoho CRM access token          |
| `outputDir`           | `string`                          | `'./zoho-typegen-output'` | Where to write the generated `.ts` files       |
| `picklistValues`      | `'display' \| 'actual'`           | `'display'`               | Which picklist value to use for union literals |
| `excludeModules`      | `string[]`                        | `[]`                      | Module `api_name`s to always skip              |
| `includeModules`      | `string[]`                        | `[]` (all)                | Only generate these modules                    |
| `includeUserHidden`   | `boolean`                         | `false`                   | Include `user_hidden` modules                  |
| `includeSystemHidden` | `boolean`                         | `false`                   | Include `system_hidden` modules                |

---

## CLI Reference

### `zoho-typegen generate` (default command)

Fetch all module fields and write TypeScript interface files.

```
zoho-typegen [generate] [options]

Options:
  --modules <names...>      Only generate these modules (space-separated api_names)
  --exclude <names...>      Skip these modules (space-separated api_names)
  --output <dir>            Output directory (overrides config outputDir)
  --picklist <mode>         Picklist value mode: display (default) or actual
  --include-user-hidden     Include user_hidden modules (Tasks, Events, etc.)
  --include-system-hidden   Include system_hidden modules (Notes, Attachments, etc.)
  -h, --help                Display help
```

**Examples:**

```bash
# Generate all modules (reads config file)
npx zoho-typegen

# Generate only Leads and Contacts
npx zoho-typegen --modules Leads Contacts

# Regenerate one module after a field change
npx zoho-typegen --modules CustomModule12

# Skip a known-broken module
npx zoho-typegen --exclude Approvals

# Write to a custom output directory
npx zoho-typegen --output ./generated/crm-types
```

CLI flags override config file values.

---

### `zoho-typegen list`

List all modules in your CRM org with their API flags. Use this to see which modules will be included or skipped before running `generate`.

```bash
npx zoho-typegen list
```

**Example output:**

```
Found 52 modules:

api_name                                      api_supported   viewable   status          generated_type
───────────────────────────────────────────── ─────────────── ────────── ─────────────── ──────────────
Leads                                         true            true       visible         default
Contacts                                      true            true       visible         default
Deals                                         true            true       visible         default
Accounts                                      true            true       visible         default
Tasks                                         true            true       user_hidden     default
Events                                        true            true       user_hidden     default
Notes                                         true            true       system_hidden   default
Approvals                                     false           true       visible         default
...
```

---

## Generated Output

Each included module gets its own `.ts` file. A barrel `index.ts` re-exports everything.

**`src/types/zoho/Leads.ts`:**

```ts
// Generated by zoho-typegen. Do not edit.

export interface ZohoLeads {
  id: string;
  First_Name?: string;
  Last_Name: string;
  Email?: string;
  Phone?: string;
  Lead_Source?:
    | 'Cold Call'
    | 'Employee Referral'
    | 'Online Store'
    | 'Partner'
    | 'Public Relations'
    | 'Web Site'
    | 'Word of Mouth'
    | 'Other';
  Rating?: 'Acquired' | 'Active' | 'Market Failed' | 'Project Cancelled' | 'Shut Down';
  Annual_Revenue?: number;
  No_of_Employees?: number;
  Created_Time?: string;
  Modified_Time?: string;

  // Custom fields
  Budget?: number;
  Referral_Source?: string;
  Custom_Status?: 'New' | 'Reviewed' | 'In Progress' | 'Closed';
  Invoiced_Items?: Array<{
    id: string;
    Product_Name?: string;
    Quantity?: number;
    Unit_Price?: number;
    Total?: number;
  }>;
}
```

**`src/types/zoho/index.ts`:**

```ts
export type { ZohoLeads } from './Leads.js';
export type { ZohoContacts } from './Contacts.js';
export type { ZohoDeals } from './Deals.js';
// ...
```

**Import in your app:**

```ts
import type { ZohoLeads, ZohoContacts } from './types/zoho';

function processLead(lead: ZohoLeads) {
  if (lead.Lead_Source === 'Web Site') { ... }
}
```

---

## Module Filtering

The tool uses Zoho's own API flags to decide which modules to include — no hardcoded module names.

| Flag                      | Default behavior                                    | Override                  |
| ------------------------- | --------------------------------------------------- | ------------------------- |
| `api_supported: false`    | **Skipped** — Zoho returns `NOT_SUPPORTED`          | Not overridable           |
| `viewable: false`         | **Skipped** — Zoho returns `NO_PERMISSION`          | Not overridable           |
| `status: 'user_hidden'`   | **Skipped** (Tasks, Events, old deprecated modules) | `--include-user-hidden`   |
| `status: 'system_hidden'` | **Skipped** (Notes, Attachments)                    | `--include-system-hidden` |

Only modules with `generated_type: 'default'` or `'custom'` are included. Linking modules, and web modules are excluded. Subforms types will be included within the attached module.

---

## Picklist Values: `display` vs `actual`

Zoho picklist fields have two values: `display_value` (the label shown in the UI) and `actual_value` (an internal key).

**`display` (default):** Uses the label the user sees in the CRM.

```ts
Lead_Source?: 'Cold Call' | 'Employee Referral' | 'Online Store' | ...
```

**`actual`:** Uses the internal Zoho key. Avoid this — if a picklist option is ever renamed in the CRM UI, the `actual_value` stays stale while `display_value` updates to match. Using `actual` also breaks for any org where options were created with generic keys like `option1`, `option2`.

```ts
Lead_Source?: 'Cold_Call' | 'Employee_Referral' | 'Online_Store' | ...
```

Use `actual` only if your integration reads `actual_value` from the API response and the values in your org are meaningful (not Zoho placeholders like `option1`, `option2`).

> **Note:** `-None-` is always stripped from picklist unions. It's represented by the field being optional (`?`) instead.

---

## Known Issues

**`Approvals` module** — Returns invalid JSON from Zoho's settings API in most orgs (a Zoho-side bug). Add it to `excludeModules` if you see parse errors:

```js
excludeModules: ['Approvals'],
```

**`Actions_Performed`, `Home`, `Workqueues`** — Similar issue. Gracefully skipped with a warning in the console.

---

## Programmatic API

You can import and call the core functions directly if you prefer not to use the CLI:

```ts
import { fetchModules, fetchAllModuleFields, writeModuleFiles } from 'zoho-typegen';

const token = await getYourToken();
const baseUrl = 'https://www.zohoapis.com/crm/v8';

const allModules = await fetchModules(token, baseUrl);
const results = await fetchAllModuleFields(token, baseUrl, allModules, 500);
writeModuleFiles('./src/types/zoho', results, { picklistValues: 'display' });
```

---

## Requirements

- Node.js 18+
- A valid Zoho CRM access token with metadata read permissions

---

## License

MIT © Rupin Wildhunt

---

> **Disclaimer:** This is an unofficial community tool. It is not affiliated with, endorsed by, or officially supported by Zoho Corporation. Zoho and Zoho CRM are trademarks of Zoho Corporation Pvt. Ltd.
