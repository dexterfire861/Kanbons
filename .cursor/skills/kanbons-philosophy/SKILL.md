---
name: kanbons-philosophy
description: Reviews Kanbons product and code changes against PHILOSOPHY.md. Use when implementing or reviewing Kanbons UI, schema, models, or workflows, or when the user mentions philosophy, PHILOSOPHY.md, alignment, warehouse workers, or overengineering.
---

# Kanbons philosophy review

Read `PHILOSOPHY.md` at the inner project root (`Kanbons/PHILOSOPHY.md` or `./PHILOSOPHY.md`) before judging anything.

## Output

List each finding as **pass** or **violate**. Violations must include file:line and the PHILOSOPHY.md sentence that was broken. End with **ship** or **block**.

## Fail if

- Extra page chrome: dashboard cards, icon soup, component libraries (shadcn, etc.), decorative widgets.
- Warehouse-unfriendly copy (`id_cust` as a label instead of “Customer code”; developer table names in the nav).
- Untyped `any` table access, or Supabase queries inlined in `app/**` pages/actions instead of `lib/models/<table>.ts`.
- Selecting all `packing_list_lines` (or other huge line tables) without a parent filter.
- Add forms that ask the user to type a generated primary key.
- Building OCR, login, print, or PO pipelines unless the user asked for that workflow now.

## Pass when

- One SQL file per table remains the database truth; one typed model module per table is the app truth.
- Pages are thin: Server Actions call model functions; OCR can later import those same functions.
- Contador is read-only; warehouse counts are edited on Stock.
