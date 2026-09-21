---
name: kanbons-test
description: Adds and runs Playwright smoke tests for the Kanbons Next.js warehouse UI. Use when Kanbons UI routes, Server Actions, or models change, or when the user mentions tests, Playwright, QA, or smoke tests.
---

# Kanbons tests

App root: `kanbons/` (Next.js). Tests live in `kanbons/e2e/`.

Read `EVALUATION.md` at the repo root first. If the suite is green but a criterion there has no test, **add the smoke**. Do not skip.

## What to cover

- Nav uses warehouse labels: Home, Customers, Products, Name matches, Stock, Incoming containers, Packing lists, Warehouse check.
- Home shows the Kanbons navy bar with the logo. Health, Metrics, Prometheus, and Grafana are not in the nav.
- Each of those routes (and Home) returns 200 with the page heading visible. Failed navigation fails the test.
- `/product-mappings` loads with heading Name matches, has Add name match, and a Find a name field.
- Stock has Find a product and Change stock.
- Incoming containers shows country tiles, not a dump of shipment lines. Open a container to see Yards / pieces.
- `/changes` loads with heading Change history and is not in the nav.
- `/metrics` includes `kanbons_database_up`, `kanbons_po_runs`, and `kanbons_po_extracted`. `/eval` returns JSON with `po.extracted`. Health, Metrics, Prometheus, and Grafana are not in the nav.
- Customers Add form has no `name="id"` field.
- Packing list add does not ask for a generated number (`Assigned on save`).
- Packing list lines and shipment lines appear only on `/packing-lists/[id]` and `/shipments/[id]`, not as a full dump on the list page. Always open a detail page (seed one header if the DB is empty).
- Warehouse check (`/contador`) has Find a product. No page-level Save for the comparison table. Adjust count lives in a dialog.

## How to run

From `kanbons/`:

```bash
npx playwright test
```

Requires local Next (`npm run dev`) and local Supabase plus `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Playwright starts Next only; `e2e/global-setup.ts` seeds one packing list and one shipment if those tables are empty. If the harness cannot start, report `operator-assisted` and stop. Fix failures before claiming done.

Do not add a large unit-test pyramid. Smokes that a warehouse worker could click are enough.
