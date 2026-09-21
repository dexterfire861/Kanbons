#!/usr/bin/env python3
"""Group repeated OCR corrections into proposals.

Does not edit the reader and does not replay a correction onto the next PDF.
"""

from __future__ import annotations

import json
import os

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
)


def main() -> int:
    wrote = 0
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        rows = conn.execute(
            """
            select id, kind, diff_json
            from public.ocr_documents
            where status = 'saved'
              and diff_json is not null
            """
        ).fetchall()
        groups: dict[tuple[str, str, str, str], list[int]] = {}
        for row in rows:
            diff = row["diff_json"] or {}
            if isinstance(diff, str):
                diff = json.loads(diff)
            if not isinstance(diff, dict) or not diff:
                continue
            for path, change in diff.items():
                if not isinstance(change, dict):
                    continue
                key = (
                    str(row["kind"]),
                    str(path),
                    json.dumps(change.get("from"), sort_keys=True),
                    json.dumps(change.get("to"), sort_keys=True),
                )
                groups.setdefault(key, []).append(int(row["id"]))
        for (kind, path, _src, _dst), ids in groups.items():
            document_ids = sorted(set(ids))
            if len(document_ids) < 2:
                continue
            summary = (
                f"{kind}: {path} was changed the same way on "
                f"{len(document_ids)} documents. Review before changing the reader."
            )
            existing = conn.execute(
                """
                select id from public.ocr_proposals
                where kind = %s and summary = %s and status = 'proposed'
                """,
                (kind, summary),
            ).fetchone()
            if existing:
                continue
            conn.execute(
                """
                insert into public.ocr_proposals (kind, summary, document_ids, status)
                values (%s, %s, %s::jsonb, 'proposed')
                """,
                (kind, summary, json.dumps(document_ids)),
            )
            wrote += 1
        conn.commit()
    print(json.dumps({"proposals": wrote}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
