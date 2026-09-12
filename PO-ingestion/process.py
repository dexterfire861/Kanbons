#!/usr/bin/env python3
"""Customer PO → purchase order → packing list + pick PDF if ready.

    .venv/bin/python PO-ingestion/process.py "training_data/B084-035 Kanbons PO-1.pdf"
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from models import PurchaseOrder, PurchaseOrderLine
from ocr import OUT_DIR, document_dump, make_converter, ocr_document, save_dump

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
)


def _fold(value: str | None) -> str:
    return (value or "").strip().casefold()


def _cell(row: dict, ending: str) -> str:
    want = ending.casefold()
    for key, value in row.items():
        name = str(key).strip().casefold()
        if name == want or name.endswith("." + want) or name.endswith(" " + want):
            if value not in (None, ""):
                return str(value).strip()
    return ""


def _as_number(text: str) -> float | None:
    cleaned = text.replace(",", "").strip()
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _as_date(text: str) -> str | None:
    parts = text.replace("-", "/").split("/")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        return None
    month, day, year = parts
    if len(year) != 4:
        return None
    return f"{year}-{int(month):02d}-{int(day):02d}"


def _after_label(text: str, label: str) -> str:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if label not in line:
            continue
        rest = line.split(label, 1)[1].strip().lstrip(":").strip()
        if rest:
            return rest
        for nxt in lines[index + 1 :]:
            if nxt.strip():
                return nxt.strip()
    return ""


def _split_code_and_name(blob: str) -> tuple[str | None, str | None]:
    text = blob.strip()
    if not text:
        return None, None
    sep = "\n" if "\n" in text else " "
    first, _, rest = text.partition(sep)
    return first.strip() or None, rest.replace("\n", " ").strip() or None


def _is_part_number(word: str) -> bool:
    return bool(word) and word[0].isdigit() and "-" in word


def _peel_wrap(blob: str) -> tuple[str | None, str | None]:
    words = blob.split()
    for index, word in enumerate(words):
        if _is_part_number(word):
            before = " ".join(words[:index]).strip()
            after = " ".join(words[index:]).strip()
            if before and after:
                return before, after
            return None, None
    return None, None


def _apply_wraps(lines: list[PurchaseOrderLine]) -> None:
    for index, line in enumerate(lines[:-1]):
        if line.description:
            continue
        nxt = lines[index + 1]
        blob = f"{nxt.item_code or ''} {nxt.description or ''}".strip()
        stolen, rest = _peel_wrap(blob)
        if not stolen or not rest:
            continue
        line.description = stolen
        nxt.item_code, nxt.description = _split_code_and_name(rest)


def parse_purchase_order(dump: dict, source: Path) -> PurchaseOrder:
    markdown = dump.get("markdown") or ""
    po = PurchaseOrder(source_path=str(source.resolve()), ocr_markdown=markdown)

    vendor = _after_label(markdown, "Vendor")
    deliver = _after_label(markdown, "Deliver To")
    if "Deliver To" in vendor:
        vendor, deliver = [part.strip() for part in vendor.split("Deliver To", 1)]
    po.customer_po = _after_label(markdown, "Order Number") or None
    po.date = _as_date(_after_label(markdown, "Order Date"))
    po.ship_date = po.date
    po.vendor_name = vendor.lstrip(":").strip() or None
    po.ship_to_name = deliver.lstrip(":").strip() or None

    parse_issues: list[str] = []
    tables = dump.get("tables") or []
    rows = tables[0].get("rows") if tables else []
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        item = _cell(row, "item")
        if not (item.isdigit() and len(item) == 3):
            continue
        blob = _cell(row, "part number description") or _cell(row, "description")
        item_code, description = _split_code_and_name(blob)
        quantity = _as_number(_cell(row, "quantity"))
        if not item_code or quantity is None:
            parse_issues.append(f"Could not read line: {item} {blob}")
            continue
        po.lines.append(
            PurchaseOrderLine(
                item_code=item_code,
                description=description,
                quantity=quantity,
                um=_cell(row, "um") or None,
            )
        )
    _apply_wraps(po.lines)
    po.issues = parse_issues
    return po


def _exact_product_id(needle: str, catalog: list[tuple[str, int]]) -> int | None:
    folded = _fold(needle)
    if not folded:
        return None
    hits = [pid for name, pid in catalog if name == folded]
    return hits[0] if len(hits) == 1 else None


def _contains_product_id(blob: str, catalog: list[tuple[str, int]]) -> int | None | str:
    folded = _fold(blob)
    if len(folded) < 20:
        return None
    hits = [
        pid
        for name, pid in catalog
        if len(name) >= 4 and name in folded
    ]
    hits = list(dict.fromkeys(hits))
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        return "many"
    return None


def match_catalog(po: PurchaseOrder, conn) -> list[str]:
    products = [
        dict(r)
        for r in conn.execute(
            "select id, num, product, pre_uni from public.products"
        ).fetchall()
    ]
    mappings = [
        dict(r)
        for r in conn.execute(
            "select client_name, kanbons_name, product_id from public.product_mappings"
        ).fetchall()
    ]
    skus = [(_fold(p["num"]), int(p["id"])) for p in products if p["num"]]
    names = [(_fold(p["product"]), int(p["id"])) for p in products if p["product"]]
    for mapping in mappings:
        if mapping["product_id"] is None:
            continue
        pid = int(mapping["product_id"])
        if mapping["client_name"]:
            names.append((_fold(mapping["client_name"]), pid))
        if mapping["kanbons_name"]:
            names.append((_fold(mapping["kanbons_name"]), pid))
    catalog = skus + names
    by_id = {int(p["id"]): p for p in products}

    extra: list[str] = []
    for line in po.lines:
        blob = f"{line.item_code or ''} {line.description or ''}".strip()
        product_id = _exact_product_id(line.item_code or "", skus)
        if product_id is None:
            product_id = _exact_product_id(line.description or "", names)
        if product_id is None:
            contained = _contains_product_id(blob, catalog)
            if contained == "many":
                extra.append(f"Too many matches in: {blob}")
            elif isinstance(contained, int):
                product_id = contained
        line.product_id = product_id
        product = by_id.get(product_id) if product_id else None
        if product:
            line.sku = product["num"]
            line.product_name = product["product"]

    customers = [
        dict(r)
        for r in conn.execute("select id, name from public.customers").fetchall()
    ]
    ship = _fold(po.ship_to_name)
    hits = [c for c in customers if _fold(c["name"]) == ship]
    if len(hits) == 1:
        po.customer_id = int(hits[0]["id"])
    return extra


def save_purchase_order(conn, po: PurchaseOrder) -> int:
    row = conn.execute(
        """
        insert into public.purchase_orders (
          customer_po, customer_id, date, ship_date, vendor_name,
          ship_to_name, ship_to_address, ship_to_city, ship_to_state, ship_to_zip,
          source_path, ocr_markdown, status, issues
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (
            po.customer_po,
            po.customer_id,
            po.date,
            po.ship_date,
            po.vendor_name,
            po.ship_to_name,
            None,
            None,
            None,
            None,
            po.source_path,
            po.ocr_markdown,
            po.status,
            "; ".join(po.issues) if po.issues else None,
        ),
    ).fetchone()
    assert row is not None
    po_id = int(row["id"])
    for line in po.lines:
        conn.execute(
            """
            insert into public.purchase_order_lines (
              purchase_order_id, description, item_code, quantity, um,
              unit_price, ext_amount, product_id
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                po_id,
                line.description,
                line.item_code,
                line.quantity,
                line.um,
                line.unit_price,
                line.ext_amount,
                line.product_id,
            ),
        )
    return po_id


def save_packing_list(conn, po: PurchaseOrder) -> tuple[int, int]:
    nxt = conn.execute(
        "select coalesce(max(num_pl), 0) + 1 as n from public.packing_lists"
    ).fetchone()
    assert nxt is not None
    num_pl = int(nxt["n"])
    customer_name = po.ship_to_name
    if po.customer_id:
        row = conn.execute(
            "select name from public.customers where id = %s", (po.customer_id,)
        ).fetchone()
        if row:
            customer_name = row["name"]
    header = conn.execute(
        """
        insert into public.packing_lists (
          num_pl, customer_id, customer, customer_po, date, ship_date, state,
          status, ship_to_name
        )
        values (%s, %s, %s, %s, %s, %s, %s, 'confirmed', %s)
        returning id, num_pl
        """,
        (
            num_pl,
            po.customer_id,
            customer_name,
            po.customer_po,
            po.date,
            po.ship_date,
            None,
            po.ship_to_name,
        ),
    ).fetchone()
    assert header is not None
    packing_list_id = int(header["id"])
    for line in po.lines:
        pre_uni = None
        if line.product_id:
            product = conn.execute(
                "select pre_uni from public.products where id = %s",
                (line.product_id,),
            ).fetchone()
            pre_uni = product["pre_uni"] if product else None
        conn.execute(
            """
            insert into public.packing_list_lines (
              packing_list_id, product_id, product, yards_pieces, unit,
              type_of_unit, pre_uni
            )
            values (%s, %s, %s, %s, null, %s, %s)
            """,
            (
                packing_list_id,
                line.product_id,
                line.description,
                line.quantity,
                line.um,
                pre_uni,
            ),
        )
    return packing_list_id, num_pl


def write_pick_pdf(path: Path, po: PurchaseOrder, num_pl: int) -> Path:
    dest = OUT_DIR / path.stem
    dest.mkdir(parents=True, exist_ok=True)
    lines = [
        f"Warehouse pick — packing list {num_pl}",
        f"PO {po.customer_po or '—'}",
        "",
        f"{'SKU':<16} {'Our name':<40} {'Qty':>10}",
        "-" * 70,
    ]
    for line in po.lines:
        lines.append(
            f"{(line.sku or ''):<16} {(line.product_name or '')[:40]:<40} {line.quantity or 0:>10}"
        )
    (dest / "pick.txt").write_text("\n".join(lines) + "\n")
    pdf_path = dest / "pick.pdf"
    _simple_pdf(pdf_path, lines)
    return pdf_path


def _simple_pdf(path: Path, lines: list[str]) -> None:
    def escape(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    y = 720
    commands = ["BT", "/F1 11 Tf"]
    for line in lines[:48]:
        commands.append(f"1 0 0 1 40 {y} Tm ({escape(line)}) Tj")
        y -= 16
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1", errors="replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    ]
    out = bytearray(b"%PDF-1.1\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{index} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode())
    out.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    path.write_bytes(out)


def finish_issues(po: PurchaseOrder, extra: list[str]) -> None:
    parse_issues = list(po.issues)
    po.apply_issues()
    too_many = [item for item in extra if item.startswith("Too many matches in: ")]
    skip_desc = {item.split(": ", 1)[1] for item in too_many}
    kept = [
        issue
        for issue in po.issues
        if not (
            issue.startswith("No name match for: ")
            and issue.split(": ", 1)[1] in skip_desc
        )
    ]
    po.issues = parse_issues + extra + kept
    po.status = "ready" if not po.issues else "needs_review"


def process(path: Path) -> PurchaseOrder:
    import psycopg
    from psycopg.rows import dict_row

    source = path.expanduser().resolve()
    dump = document_dump(ocr_document(source, make_converter()))
    dest = save_dump(source, dump)
    po = parse_purchase_order(dump, source)
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        extra = match_catalog(po, conn)
        finish_issues(po, extra)
        po_id = save_purchase_order(conn, po)
        packing_list_id = None
        num_pl = None
        pick = None
        if po.status == "ready":
            packing_list_id, num_pl = save_packing_list(conn, po)
            conn.execute(
                "update public.purchase_orders set packing_list_id = %s where id = %s",
                (packing_list_id, po_id),
            )
            pick = write_pick_pdf(source, po, num_pl)
        conn.commit()
    (dest / "parsed.json").write_text(po.model_dump_json(indent=2) + "\n")
    print(
        json.dumps(
            {
                "purchase_order_id": po_id,
                "status": po.status,
                "issues": po.issues,
                "packing_list_id": packing_list_id,
                "num_pl": num_pl,
                "pick_pdf": str(pick) if pick else None,
                "dump": str(dest),
            },
            indent=2,
        )
    )
    if po.issues:
        print("\nNeeds manual intervention:")
        for issue in po.issues:
            print(f"  - {issue}")
    return po


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        sys.stderr.write("Usage: python PO-ingestion/process.py <po-file>\n")
        return 2
    source = Path(argv[1])
    if not source.is_file():
        sys.stderr.write(f"File not found: {source}\n")
        return 2
    po = process(source)
    return 0 if po.status == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
