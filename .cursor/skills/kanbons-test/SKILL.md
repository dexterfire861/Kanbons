---
name: kanbons-test
description: Adds and runs Playwright smoke tests for the Kanbons Next.js warehouse UI. Use when Kanbons UI routes, Server Actions, or models change, or when the user mentions tests, Playwright, QA, or smoke tests.
---

# Kanbons tests

App root: `kanbons/` (Next.js). Tests live in `kanbons/e2e/`.

## What to cover

- Nav uses warehouse labels: Customers, Products, Stock, Incoming containers, Packing lists, Warehouse check.
- Each of those routes (and Home) returns 200 with the page heading visible.
- Customers Add form has no `name="id"` field.
- Packing list lines and shipment lines appear only on `/packing-lists/[id]` and `/shipments/[id]`, not as a full dump on the list page.
- Warehouse check (`/contador`) has no Save / submit for the computed view.

## How to run

From `kanbons/`:

```bash
npx playwright test
```

Requires local Next (`npm run dev`) and local Supabase. If the suite is missing, add Playwright (`@playwright/test`), a `playwright.config.ts` with `baseURL` `http://localhost:3000`, and smokes above. Fix failures before claiming done.

Do not add a large unit-test pyramid. Smokes that a warehouse worker could click are enough.
