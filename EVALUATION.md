# Kanbons evaluation

Read `PHILOSOPHY.md` first. Then score every criterion below. End with **ship** or **block**.

## How to evaluate

1. Read this file and `PHILOSOPHY.md`.
2. Follow `.cursor/skills/kanbons-test/SKILL.md`. Run the harness. Failures are **block**.
3. Follow `.cursor/skills/kanbons-philosophy/SKILL.md`. Score each criterion **pass** or **violate** with file:line. Any violate is **block**.
4. Do not claim ship without the harness result. If the harness cannot start, say `operator-assisted` and stop. Do not invent a mock.

## Harness

```bash
cd kanbons && npx playwright test
```

Precondition: local Supabase is running, and `kanbons/.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Playwright starts Next only.

If a criterion here has no smoke, add the smoke. Do not add a unit-test pyramid.

## Criteria

| ID | Criterion | Verify |
| --- | --- | --- |
| E1 | Nav shows Home, Customers, Products, Name matches, Stock, Incoming containers, Packing lists, Warehouse check. Each listed route (and Home) loads with that heading. Home shows the Kanbons navy bar and logo. | `operator-assisted` — Playwright |
| E2 | Customers Add has no `name="id"` field. Warehouse check has no page-level Save. The comparison table is not a form. Adjust count is a dialog that writes through Stock. | `operator-assisted` — Playwright |
| E3 | Packing-list and shipment lines are not on the list pages. `/packing-lists/[id]` and `/shipments/[id]` show the Yards / pieces column even when the live DB started empty (seed in Playwright setup). | `operator-assisted` — Playwright |
| E4 | Packing-list inline add does not ask the worker to type a generated number. | `operator-assisted` — Playwright (`Assigned on save`) |
| E5 | No `debugLog`, `127.0.0.1:7252`, `NavTiming`, or `#region agent log` under `kanbons/`. | `autonomous` — grep |
| E6 | No `.from(` in `kanbons/app/**`. Every table has `supabase/schemas/NN_*.sql` and `kanbons/lib/models/<table>.ts`. | `autonomous` — grep |
| E7 | PageIntro and nav do not leak developer column names (`num_pl`, `id_cust`). | `felt` — philosophy skill, file:line |
| E8 | `PurchaseOrder` means the `purchase_orders` row. Form DTOs use `PurchaseOrderInput`. One `MatchProduct` type. | `autonomous` — grep |
| E9 | `po_ingest_runs` is written through `kanbons/lib/models/po_ingest_runs.ts` (extracted vs confirmed diffs). No `.from("po_ingest_runs")` in `app/**`. | `autonomous` — grep |
| E10 | `/health` returns JSON `{ ok, database }`. New packing slip shows Last reads. Health is not in the nav. | `operator-assisted` — Playwright |
| E11 | `/metrics` is Prometheus text with `kanbons_database_up`. Nav has no Metrics, Prometheus, or Grafana. | `operator-assisted` — Playwright |

## Verdict

- Harness red → **block**
- Any violate → **block**
- Harness green and every criterion pass → **ship**
