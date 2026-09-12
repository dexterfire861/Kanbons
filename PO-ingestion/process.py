#!/usr/bin/env python3
"""OCR a PO, map it to Pydantic, save it, and create a packing list if ready.

    .venv/bin/python PO-ingestion/process.py "training_data/B084-035 Kanbons PO-1.pdf"
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from models import PurchaseOrder, PurchaseOrderLine
from ocr import OUT_DIR, document_dump, make_converter, ocr_document, save_dump

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
)


def _norm(value: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


def _as_float(value: object) -> float | None:
    if value is None:
        return None
    text = str(value).replace(",", "").replace("$", "").strip()
    if not text:
        return None
    match = re.search(r"\d+(?:\.\d+)?", text)
    return float(match.group()) if match else None


def _excel_or_print_date(value: str | None) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", text):
        return text[:10]
    for fmt in (r"(\d{1,2})/(\d{1,2})/(\d{4})",):
        match = re.search(fmt, text)
        if match:
            month, day, year = match.groups()
            return f"{year}-{int(month):02d}-{int(day):02d}"
    return None


def _row_get(row: dict, *names: str) -> str:
    """Pick a cell by column suffix (Docling often prefixes headers)."""
    items = [(str(k).strip().lower(), v) for k, v in row.items()]
    for name in names:
        for key, value in items:
            if key == name or key.endswith("." + name) or key.endswith(" " + name):
                if value not in (None, ""):
                    return str(value).strip()
    return ""


def _split_part_and_desc(blob: str) -> tuple[str | None, str | None]:
    text = blob.strip()
    if not text:
        return None, None
    match = re.match(r"^([0-9][0-9A-Z./-]{4,})\s+(.+)$", text)
    if match:
        return match.group(1), match.group(2).strip()
    if re.match(r"^[0-9][0-9A-Z./-]{4,}$", text):
        return text, None
    return None, text


def _lines_from_tables(tables: list[dict]) -> list[PurchaseOrderLine]:
    lines: list[PurchaseOrderLine] = []
    for table in tables:
        for row in table.get("rows") or []:
            if not isinstance(row, dict):
                continue
            joined = " ".join(str(v) for v in row.values() if v not in (None, ""))
            if re.search(r"part number|description|quantity|item #", joined, re.I):
                continue
            if re.match(r"^\s*\d{3}\s*$", joined):
                continue
            part_blob = _row_get(
                row, "part number description", "part number", "item code", "description"
            )
            item_code, description = _split_part_and_desc(part_blob)
            if not description:
                description = _row_get(row, "description") or description
            if not item_code:
                item_code = _row_get(row, "part number", "item code") or item_code
            qty_blob = _row_get(row, "quantity", "qty")
            um = None
            qty_um = re.match(
                r"^\s*([\d,]+(?:\.\d+)?)\s*([A-Za-z]{1,6})?\s*$", qty_blob
            )
            quantity = _as_float(qty_um.group(1) if qty_um else qty_blob)
            if qty_um and qty_um.group(2):
                um = qty_um.group(2)
            um = um or _row_get(row, "um", "uom") or None
            if not description and not item_code and quantity is None:
                continue
            if quantity is None:
                continue
            if description and (
                len(description) > 160
                or re.search(
                    r"purchase order|line item total|order value|comments:",
                    description,
                    re.I,
                )
            ):
                continue
            lines.append(
                PurchaseOrderLine(
                    description=description,
                    item_code=item_code,
                    quantity=quantity,
                    um=um,
                    unit_price=_as_float(
                        _row_get(row, "unit price/per", "unit price", "price")
                    ),
                    ext_amount=_as_float(
                        _row_get(row, "ext. amt", "ext", "amount")
                    ),
                )
            )
    return lines


def _lines_from_text(text: str) -> list[PurchaseOrderLine]:
    lines: list[PurchaseOrderLine] = []
    pattern = re.compile(
        r"^\s*(?:\d{3}\s+)?([0-9][0-9A-Z.-]{5,})\s+(\d[\d,]*(?:\.\d+)?)\s+([A-Za-z]{1,6})?\b",
        re.M,
    )
    for match in pattern.finditer(text):
        rest = text[match.end() : match.end() + 160]
        desc = re.search(r"\n([A-Z0-9][^\n]{2,50})\n", rest)
        lines.append(
            PurchaseOrderLine(
                item_code=match.group(1),
                quantity=_as_float(match.group(2)),
                um=match.group(3),
                description=desc.group(1).strip() if desc else None,
            )
        )
    return lines


def _header_from_text(text: str, po: PurchaseOrder) -> None:
    po_match = re.search(r"\b(B\d{3}-\d{3})\b", text, re.I)
    if po_match:
        po.customer_po = po_match.group(1).upper()
    dates = re.findall(r"\b(\d{1,2}/\d{1,2}/\d{4})\b", text)
    if dates:
        po.date = _excel_or_print_date(dates[0])
        po.ship_date = _excel_or_print_date(dates[1] if len(dates) > 1 else dates[0])
    if re.search(r"KANBONS", text, re.I):
        po.vendor_name = "KANBONS LLC"
    city = re.search(r"\b(CAIRO)\s+(GA)\s+(\d{5})\b", text, re.I)
    if city:
        po.ship_to_city = city.group(1).title()
        po.ship_to_state = city.group(2).upper()
        po.ship_to_zip = city.group(3)
    addr = re.search(r"\b(\d{3,5}\s+20TH ST SE)\b", text, re.I)
    if addr:
        po.ship_to_address = addr.group(1).title().replace("Se", "SE")
    deliver = re.search(
        r"Deliver To:\s*([^\n]+)", text, re.I
    )
    if deliver:
        name = deliver.group(1).strip()
        if name and not re.search(r"contact|phone", name, re.I):
            po.ship_to_name = name.split("  ")[0].strip()
    if not po.ship_to_name and re.search(r"WOODHAVEN|UPHOLSTERY-CAIRO", text, re.I):
        po.ship_to_name = "Woodhaven Furniture"


def parse_purchase_order(dump: dict, source: Path) -> PurchaseOrder:
    po = PurchaseOrder(
        source_path=str(source.resolve()),
        ocr_markdown=dump.get("markdown") or "",
    )
    blob = "\n".join(
        [
            dump.get("markdown") or "",
            dump.get("text") or "",
        ]
    )
    _header_from_text(blob, po)
    lines = _lines_from_tables(dump.get("tables") or [])
    if not lines:
        lines = _lines_from_text(blob)
    po.lines = lines
    return po


def _fuzzy_product_id(
    needle: str,
    products: list[dict],
    mappings: list[dict],
) -> int | None:
    if not needle:
        return None
    for product in products:
        if _norm(product["num"]) == needle or _norm(product["product"]) == needle:
            return int(product["id"])
    for mapping in mappings:
        if mapping["product_id"] is None:
            continue
        if (
            _norm(mapping["item_code"]) == needle
            or _norm(mapping["client_name"]) == needle
            or _norm(mapping["kanbons_name"]) == needle
        ):
            return int(mapping["product_id"])
    if len(needle) < 4:
        return None
    close = []
    for mapping in mappings:
        if mapping["product_id"] is None:
            continue
        client = _norm(mapping["client_name"])
        ours = _norm(mapping["kanbons_name"])
        if (len(client) >= 4 and (needle in client or client in needle)) or (
            len(ours) >= 4 and (needle in ours or ours in needle)
        ):
            close.append(int(mapping["product_id"]))
    close = list(dict.fromkeys(close))
    return close[0] if len(close) == 1 else None


def match_catalog(po: PurchaseOrder, conn) -> None:
    products = [
        dict(r)
        for r in conn.execute(
            "select id, num, product, pre_uni from public.products"
        ).fetchall()
    ]
    mappings = [
        dict(r)
        for r in conn.execute(
            "select client_name, kanbons_name, item_code, product_id from public.product_mappings"
        ).fetchall()
    ]
    by_id = {int(p["id"]): p for p in products}
    for line in po.lines:
        product_id = _fuzzy_product_id(_norm(line.item_code), products, mappings)
        if product_id is None:
            product_id = _fuzzy_product_id(_norm(line.description), products, mappings)
        line.product_id = product_id
        product = by_id.get(product_id) if product_id else None
        if product:
            line.sku = product["num"]
            line.product_name = product["product"]
    customers = [
        dict(r)
        for r in conn.execute("select id, name from public.customers").fetchall()
    ]
    needle = _norm(po.ship_to_name)
    if needle:
        hits = [c for c in customers if _norm(c["name"]) == needle]
        if len(hits) == 1:
            po.customer_id = int(hits[0]["id"])
        elif len(needle) >= 4:
            close = [
                c
                for c in customers
                if len(_norm(c["name"])) >= 4
                and (needle in _norm(c["name"]) or _norm(c["name"]) in needle)
            ]
            if len(close) == 1:
                po.customer_id = int(close[0]["id"])


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
            po.ship_to_address,
            po.ship_to_city,
            po.ship_to_state,
            po.ship_to_zip,
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
    next_num = conn.execute(
        "select coalesce(max(num_pl), 0) + 1 as n from public.packing_lists"
    ).fetchone()
    assert next_num is not None
    num_pl = int(next_num["n"])
    customer_name = None
    if po.customer_id:
        row = conn.execute(
            "select name from public.customers where id = %s", (po.customer_id,)
        ).fetchone()
        customer_name = row["name"] if row else None
    header = conn.execute(
        """
        insert into public.packing_lists (
          num_pl, customer_id, customer, customer_po, date, ship_date, state,
          status,
          ship_to_name, ship_to_address, ship_to_city, ship_to_state, ship_to_zip
        )
        values (%s, %s, %s, %s, %s, %s, %s, 'confirmed', %s, %s, %s, %s, %s)
        returning id, num_pl
        """,
        (
            num_pl,
            po.customer_id,
            customer_name or po.ship_to_name,
            po.customer_po,
            po.date,
            po.ship_date,
            po.ship_to_state,
            po.ship_to_name,
            po.ship_to_address,
            po.ship_to_city,
            po.ship_to_state,
            po.ship_to_zip,
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
    pdf_path = dest / "pick.pdf"
    lines = [
        f"Warehouse pick — packing list {num_pl}",
        f"PO {po.customer_po or '—'}",
        "",
        f"{'SKU':<16} {'Our name':<40} {'Qty':>10}",
        "-" * 70,
    ]
    unmatched = []
    for line in po.lines:
        if line.product_id and line.sku:
            lines.append(
                f"{line.sku:<16} {(line.product_name or '')[:40]:<40} {line.quantity or 0:>10}"
            )
        else:
            unmatched.append(line.description or line.item_code or "blank")
    if unmatched:
        lines.append("")
        lines.append("Needs a Name match:")
        lines.extend(f"  - {name}" for name in unmatched)
    (dest / "pick.txt").write_text("\n".join(lines) + "\n")
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


def process(path: Path) -> PurchaseOrder:
    import psycopg
    from psycopg.rows import dict_row

    source = path.expanduser().resolve()
    dump = document_dump(ocr_document(source, make_converter()))
    dest = save_dump(source, dump)
    po = parse_purchase_order(dump, source)
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        match_catalog(po, conn)
        po.apply_issues()
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
    print(json.dumps(
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
    ))
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
