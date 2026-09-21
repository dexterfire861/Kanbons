#!/usr/bin/env python3
"""Customer PO → purchase order → packing list + pick PDF if ready.

    .venv/bin/python PO-ingestion/process.py "training_data/B084-035 Kanbons PO-1.pdf"
"""

from __future__ import annotations

import json
import math
import os
import re
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


def _norm(value: str | None) -> str:
    return "".join(ch for ch in (value or "").upper() if ch.isalnum())


def _token_key(value: str | None) -> str | None:
    parts = set(re.findall(r"[A-Z0-9]+", (value or "").upper()))
    if len(parts) < 2:
        return None
    return " ".join(sorted(parts))


def _cell(row: dict, ending: str) -> str:
    want = ending.casefold()
    for key, value in row.items():
        name = str(key).strip().casefold()
        if (
            name == want
            or name.endswith("." + want)
            or name.endswith(" " + want)
            or name.startswith(want + " ")
            or name.startswith(want + ".")
        ):
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
        first = cleaned.split()[0]
        try:
            return float(first)
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


def _deliver_block(text: str) -> str:
    lines = text.splitlines()
    stop = ("contact", "phone", "fax", "ship via", "payment")
    for index, line in enumerate(lines):
        if "Deliver To" not in line:
            continue
        parts = [line.split("Deliver To", 1)[1].strip().lstrip(":").strip()]
        for nxt in lines[index + 1 :]:
            low = nxt.strip().casefold()
            if not low:
                continue
            if any(low.startswith(word) for word in stop):
                break
            parts.append(nxt.strip())
            if len([p for p in parts if p]) >= 3:
                break
        return " ".join(p for p in parts if p)
    return ""


def _fill_ship_to(po: PurchaseOrder, deliver: str) -> None:
    words = deliver.replace(",", " ").split()
    zip_at = next(
        (i for i, word in enumerate(words) if word.isdigit() and len(word) == 5),
        None,
    )
    street_at = next(
        (i for i, word in enumerate(words) if word.isdigit() and len(word) >= 3),
        None,
    )
    if zip_at is not None and zip_at >= 2 and len(words[zip_at - 1]) == 2:
        po.ship_to_zip = words[zip_at]
        po.ship_to_state = words[zip_at - 1].upper()
        po.ship_to_city = words[zip_at - 2].title()
        if street_at is not None and street_at < zip_at - 2:
            po.ship_to_address = " ".join(words[street_at : zip_at - 2])
            po.ship_to_name = " ".join(words[:street_at]) or None
            return
    if street_at is not None:
        po.ship_to_address = " ".join(words[street_at:])
        po.ship_to_name = " ".join(words[:street_at]) or None
        return
    po.ship_to_name = deliver or None


def _customer_rank(po: PurchaseOrder, customer: dict) -> int:
    pieces = {
        "name": _fold(po.ship_to_name),
        "address": _norm(po.ship_to_address),
        "city": _fold(po.ship_to_city),
        "zip": _fold(po.ship_to_zip),
    }
    fields = {
        "name": [_fold(customer.get("name")), _fold(customer.get("point_of_contact"))],
        "address": [_norm(customer.get("address"))],
        "city": [_fold(customer.get("city"))],
        "zip": [_fold(customer.get("zip_code"))],
    }
    score = 0
    addr = pieces["address"]
    cust_addr = fields["address"][0]
    if addr and cust_addr and (addr == cust_addr or addr in cust_addr or cust_addr in addr):
        score = max(score, 3)
    if pieces["zip"] and pieces["zip"] in fields["zip"]:
        score = max(score, 2)
    if pieces["name"] and pieces["name"] in fields["name"]:
        score = max(score, 2)
    if pieces["city"] and pieces["city"] in fields["city"]:
        score = max(score, 1)
    return score


_DUMMY_CONTACTS = {"no", "n/a", "na", "none", "yes", "xx", "pending"}


def _person_name(*values) -> str | None:
    for value in values:
        text = (value or "").strip()
        if text and text.casefold() not in _DUMMY_CONTACTS and not text.isdigit():
            return text
    return None


def _apply_customer(po: PurchaseOrder, customer: dict) -> None:
    po.customer_id = int(customer["id"])
    po.ship_to_name = _person_name(
        customer.get("point_of_contact"), customer.get("name"), po.ship_to_name
    )
    po.ship_to_address = customer.get("address") or po.ship_to_address
    po.ship_to_city = customer.get("city") or po.ship_to_city
    po.ship_to_state = customer.get("state") or po.ship_to_state
    po.ship_to_zip = customer.get("zip_code") or po.ship_to_zip


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


def _has_item_key(keys: list[str]) -> bool:
    return any(
        name == "item" or name.endswith(".item") or name.endswith(" item")
        for name in (str(key).strip().casefold() for key in keys)
    )


def _promote_header_row(rows: list) -> list[dict]:
    dict_rows = [row for row in rows if isinstance(row, dict)]
    if not dict_rows:
        return []
    first = dict_rows[0]
    keys = [str(key) for key in first.keys()]
    values = ["" if value is None else str(value).strip() for value in first.values()]
    if not any(value.casefold() == "item" for value in values) or _has_item_key(keys):
        return dict_rows
    seen: dict[str, int] = {}
    new_keys: list[str] = []
    for old, value in zip(keys, values):
        name = " ".join((value or old or "col").split())
        folded = name.casefold()
        n = seen.get(folded, 0)
        seen[folded] = n + 1
        new_keys.append(name if n == 0 else f"{name}.{n}")
    promoted = []
    for row in dict_rows[1:]:
        mapped = {}
        old_vals = list(row.values())
        for index, key in enumerate(new_keys):
            mapped[key] = old_vals[index] if index < len(old_vals) else ""
        promoted.append(mapped)
    return promoted


_PART_HEADER = re.compile(
    r"^(\d{3})\s+(\S+)\s+([\d,.]+)\s+EA\b",
    re.IGNORECASE,
)
_PART_ROW = re.compile(
    r"^(?P<no>\d{3})\s+(?P<body>.*)\s+(?P<qty>[\d,.]+)\s+EA\b",
    re.IGNORECASE,
)
_PART_NBR = re.compile(r"your part nbr\s*:?\s*(\S+)", re.IGNORECASE)
_CUST_BEFORE = re.compile(r"(\S+)\s+your part nbr", re.IGNORECASE)


def _plain_line(line: str) -> str:
    text = line.strip().strip("|").strip()
    text = re.sub(r"^[-*#]+\s*", "", text)
    text = text.replace("**", "")
    text = re.sub(r"\s*\|\s*", " ", text)
    return " ".join(text.split())


def _dedupe_repeat(text: str) -> str:
    words = text.split()
    if len(words) >= 2 and len(words) % 2 == 0:
        mid = len(words) // 2
        if words[:mid] == words[mid:]:
            return " ".join(words[:mid])
    return text


def _leftover_name(text: str) -> str | None:
    cleaned = _PART_NBR.sub(" ", text)
    cleaned = re.sub(r"\bMU[A-Z0-9-]+\b", " ", cleaned, flags=re.I)
    cleaned = _dedupe_repeat(" ".join(cleaned.split()))
    return cleaned or None


def _part_and_alt(text: str) -> tuple[str | None, str | None]:
    part_hit = _PART_NBR.search(text)
    part = part_hit.group(1).rstrip(".,;") if part_hit else None
    alt_hit = _CUST_BEFORE.search(text)
    alt = alt_hit.group(1) if alt_hit else None
    if not alt:
        mu = re.search(r"\b(MU[A-Z0-9-]+)\b", text, re.I)
        alt = mu.group(1) if mu else None
    return part, alt


def _tables_as_text(tables: list) -> str:
    lines: list[str] = []
    for table in tables:
        for row in table.get("rows") or []:
            if not isinstance(row, dict):
                continue
            cells: list[str] = []
            for value in row.values():
                text = "" if value is None else str(value).strip()
                if text and text not in cells:
                    cells.append(text)
            if cells:
                lines.append(" ".join(cells))
    return "\n".join(lines)


def _assign_wrapped_names(records: list[dict]) -> None:
    descriptions: list[str | None] = [None] * len(records)
    for index, rec in enumerate(records):
        if rec.get("own"):
            descriptions[index] = rec["own"]
        if index > 0 and rec.get("leftover") and descriptions[index - 1] is None:
            descriptions[index - 1] = rec["leftover"]
    if records and records[0].get("leftover") and descriptions[0] is None:
        descriptions[0] = records[0]["leftover"]
    for index, rec in enumerate(records):
        if descriptions[index] is None:
            descriptions[index] = rec.get("leftover") or rec.get("own")
        rec["description"] = descriptions[index]


def _records_to_lines(
    records: list[dict],
) -> tuple[list[PurchaseOrderLine], list[str]]:
    _assign_wrapped_names(records)
    lines: list[PurchaseOrderLine] = []
    issues: list[str] = []
    for rec in records:
        part = rec.get("part")
        if not part:
            issues.append(
                f"Could not read line: {rec.get('line_no')} {rec.get('alt') or ''}".strip()
            )
            continue
        if rec.get("quantity") is None:
            issues.append(
                f"Could not read quantity for: {rec.get('line_no')} {rec.get('alt') or part}"
            )
        lines.append(
            PurchaseOrderLine(
                item_code=part,
                alt_code=rec.get("alt"),
                description=rec.get("description"),
                quantity=rec.get("quantity"),
                um="EA",
            )
        )
    return lines, issues


def _parse_part_nbr_lines(markdown: str) -> tuple[list[PurchaseOrderLine], list[str]]:
    records: list[dict] = []
    raw = [_plain_line(item) for item in markdown.splitlines()]
    index = 0
    while index < len(raw):
        text = raw[index]
        row = _PART_ROW.match(text)
        compact = _PART_HEADER.match(text)
        if row and _PART_NBR.search(text):
            body = _dedupe_repeat(row.group("body"))
            part, alt = _part_and_alt(body)
            hit = _PART_NBR.search(body)
            leftover = _leftover_name(body[: hit.start()] if hit else body)
            own = _leftover_name(body[hit.end() :] if hit else "")
            records.append(
                {
                    "line_no": row.group("no"),
                    "part": part,
                    "alt": alt,
                    "quantity": _as_number(row.group("qty")),
                    "leftover": leftover,
                    "own": own,
                }
            )
            index += 1
            continue
        if not compact or _PART_NBR.search(text):
            index += 1
            continue
        line_no = compact.group(1)
        customer_code = compact.group(2)
        quantity = _as_number(compact.group(3))
        part = None
        description = None
        cursor = index + 1
        while cursor < len(raw):
            nxt = raw[cursor]
            if not nxt:
                cursor += 1
                continue
            if _PART_HEADER.match(nxt) or _PART_ROW.match(nxt):
                break
            if nxt.casefold().startswith("line item total"):
                break
            part_hit = _PART_NBR.match(nxt) or _PART_NBR.search(nxt)
            if part_hit and part is None:
                part = part_hit.group(1).rstrip(".,;")
                cursor += 1
                continue
            if description is None:
                description = nxt
            cursor += 1
            if part and description:
                break
        records.append(
            {
                "line_no": line_no,
                "part": part,
                "alt": customer_code,
                "quantity": quantity,
                "leftover": None,
                "own": description,
            }
        )
        index = cursor
    return _records_to_lines(records)


def _parse_line_rows(rows: list[dict]) -> tuple[list[PurchaseOrderLine], list[str]]:
    lines: list[PurchaseOrderLine] = []
    issues: list[str] = []
    for row in rows:
        item = _cell(row, "item")
        if not (item.isdigit() and len(item) == 3):
            continue
        blob = _cell(row, "part number description") or _cell(row, "description")
        item_code, description = _split_code_and_name(blob)
        quantity = _as_number(_cell(row, "quantity"))
        if not item_code:
            issues.append(f"Could not read line: {item} {blob}")
            continue
        if quantity is None:
            issues.append(f"Could not read quantity for: {item} {blob}")
        lines.append(
            PurchaseOrderLine(
                item_code=item_code,
                description=description,
                quantity=quantity,
                um=_cell(row, "um") or None,
            )
        )
    return lines, issues


def parse_purchase_order(dump: dict, source: Path) -> PurchaseOrder:
    markdown = dump.get("markdown") or ""
    po = PurchaseOrder(source_path=str(source.resolve()), ocr_markdown=markdown)

    vendor = _after_label(markdown, "Vendor")
    deliver = _deliver_block(markdown) or _after_label(markdown, "Deliver To")
    if "Deliver To" in vendor:
        vendor, deliver = [part.strip() for part in vendor.split("Deliver To", 1)]
    po.customer_po = _after_label(markdown, "Order Number") or None
    po.date = _as_date(_after_label(markdown, "Order Date"))
    po.ship_date = po.date
    po.vendor_name = vendor.lstrip(":").strip() or None
    _fill_ship_to(po, deliver.lstrip(":").strip())

    tables = dump.get("tables") or []
    best_lines: list[PurchaseOrderLine] = []
    parse_issues: list[str] = []
    for table in tables:
        rows = _promote_header_row(table.get("rows") or [])
        lines, issues = _parse_line_rows(rows)
        if len(lines) > len(best_lines):
            best_lines = lines
            parse_issues = issues
        elif not best_lines and issues and not parse_issues:
            parse_issues = issues
    part_lines, part_issues = _parse_part_nbr_lines(markdown)
    table_lines, table_issues = _parse_part_nbr_lines(_tables_as_text(tables))
    if len(table_lines) > len(part_lines):
        part_lines, part_issues = table_lines, table_issues
    if len(part_lines) > len(best_lines):
        best_lines = part_lines
        parse_issues = part_issues
    po.lines = best_lines
    _apply_wraps(po.lines)
    po.issues = parse_issues
    return po


def _exact_product_id(needle: str, catalog: list[tuple[str, int]]) -> int | None:
    folded = _norm(needle)
    if not folded:
        return None
    hits = [pid for name, pid in catalog if name == folded]
    hits = list(dict.fromkeys(hits))
    return hits[0] if len(hits) == 1 else None


def _token_set_product_id(needle: str, catalog: list[tuple[str, int]]) -> int | None:
    want = _token_key(needle)
    if not want:
        return None
    hits = [pid for name, pid in catalog if _token_key(name) == want]
    hits = list(dict.fromkeys(hits))
    return hits[0] if len(hits) == 1 else None


def _contains_product_id(blob: str, catalog: list[tuple[str, int]]) -> int | None | str:
    folded = _norm(blob)
    if not folded:
        return None
    hits = [
        pid
        for name, pid in catalog
        if len(name) >= 4 and (name in folded or (len(folded) >= 4 and folded in name))
    ]
    hits = list(dict.fromkeys(hits))
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        return "many"
    return None


def _mapping_catalog(rows: list[dict], fields: tuple[str, ...]) -> list[tuple[str, int]]:
    catalog: list[tuple[str, int]] = []
    for mapping in rows:
        pid = int(mapping["product_id"])
        for field in fields:
            value = mapping.get(field)
            if value:
                catalog.append((_norm(str(value)), pid))
    return catalog


def _raw_catalog(rows: list[dict], fields: tuple[str, ...]) -> list[tuple[str, int]]:
    catalog: list[tuple[str, int]] = []
    for mapping in rows:
        pid = int(mapping["product_id"])
        for field in fields:
            value = mapping.get(field)
            if value:
                catalog.append((str(value), pid))
    return catalog


def match_catalog(po: PurchaseOrder, conn) -> list[str]:
    products = [
        dict(r)
        for r in conn.execute(
            "select id, num, product, pre_uni, unit_pack from public.products"
        ).fetchall()
    ]
    mappings = [
        dict(r)
        for r in conn.execute(
            "select client_name, kanbons_name, item_code, product_id, company "
            "from public.product_mappings"
        ).fetchall()
    ]
    customers = [
        dict(r)
        for r in conn.execute(
            "select id, name, address, city, state, zip_code, "
            "point_of_contact, company from public.customers"
        ).fetchall()
    ]
    ranked = [(_customer_rank(po, customer), customer) for customer in customers]
    ranked = [item for item in ranked if item[0] > 0]
    ranked.sort(key=lambda item: item[0], reverse=True)
    if ranked and (len(ranked) == 1 or ranked[0][0] > ranked[1][0]):
        _apply_customer(po, ranked[0][1])

    company = None
    if po.customer_id:
        for customer in customers:
            if int(customer["id"]) == po.customer_id:
                name = customer.get("name") or ""
                company = customer.get("company")
                if company != "Woodhaven" and "WOODHAVEN" in name.upper():
                    company = "Woodhaven"
                break

    linked = [m for m in mappings if m["product_id"] is not None]
    woodhaven = company == "Woodhaven"
    branded = [m for m in linked if m.get("company") == "Woodhaven"] if woodhaven else []
    unscoped = [m for m in linked if not m.get("company")]
    catalog_maps = branded if woodhaven else unscoped
    company_codes = _mapping_catalog(catalog_maps, ("item_code",))
    company_names = _mapping_catalog(catalog_maps, ("client_name", "kanbons_name"))
    skus = [(_norm(p["num"]), int(p["id"])) for p in products if p["num"]]
    product_names = [
        (_norm(p["product"]), int(p["id"])) for p in products if p["product"]
    ]
    by_id = {int(p["id"]): p for p in products}

    extra: list[str] = []
    for line in po.lines:
        needles = [line.item_code, getattr(line, "alt_code", None), line.description]
        blob = " ".join(part for part in needles if part)
        product_id = None
        for catalog in (company_codes, skus, company_names, product_names):
            for needle in needles:
                product_id = _exact_product_id(needle or "", catalog)
                if product_id is not None:
                    break
            if product_id is not None:
                break
        if product_id is None:
            name_catalog = _raw_catalog(catalog_maps, ("client_name", "kanbons_name"))
            name_catalog.extend(
                (p["product"], int(p["id"])) for p in products if p.get("product")
            )
            for needle in needles:
                product_id = _token_set_product_id(needle or "", name_catalog)
                if product_id is not None:
                    break
        if product_id is None:
            contained: int | None | str = None
            for catalog in (
                company_codes + company_names,
                skus + product_names,
            ):
                for needle in needles + [blob]:
                    contained = _contains_product_id(needle or "", catalog)
                    if contained is not None:
                        break
                if contained is not None:
                    break
            if contained == "many":
                extra.append(f"Too many matches in: {blob}")
            elif isinstance(contained, int):
                product_id = contained
        line.product_id = product_id
        product = by_id.get(product_id) if product_id else None
        if product:
            line.sku = product["num"]
            line.product_name = product["product"]
            if not (line.description or "").strip():
                line.description = product["product"]
    return extra


def packs_for(quantity, unit_pack) -> int | None:
    if quantity is None or unit_pack is None:
        return None
    try:
        qty = float(quantity)
        pack = float(unit_pack)
    except (TypeError, ValueError):
        return None
    if qty <= 0 or pack <= 0:
        return None
    return math.ceil(qty / pack)


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
            po.ship_to_state,
            po.ship_to_name,
        ),
    ).fetchone()
    assert header is not None
    packing_list_id = int(header["id"])
    for line in po.lines:
        pre_uni = None
        unit = None
        if line.product_id:
            product = conn.execute(
                "select pre_uni, unit_pack from public.products where id = %s",
                (line.product_id,),
            ).fetchone()
            if product:
                pre_uni = product["pre_uni"]
                unit = packs_for(line.quantity, product["unit_pack"])
        conn.execute(
            """
            insert into public.packing_list_lines (
              packing_list_id, product_id, product, yards_pieces, unit,
              type_of_unit, pre_uni
            )
            values (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                packing_list_id,
                line.product_id,
                line.description,
                line.quantity,
                unit,
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


def review_payload(po: PurchaseOrder) -> dict:
    return {
        "customer_id": po.customer_id,
        "customer_po": po.customer_po,
        "date": po.date,
        "ship_date": po.ship_date,
        "ship_to_name": po.ship_to_name,
        "ship_to_address": po.ship_to_address,
        "ship_to_city": po.ship_to_city,
        "ship_to_state": po.ship_to_state,
        "ship_to_zip": po.ship_to_zip,
        "bill_to_name": po.bill_to_name or po.ship_to_name,
        "bill_to_address": po.bill_to_address or po.ship_to_address,
        "bill_to_city": po.bill_to_city or po.ship_to_city,
        "bill_to_state": po.bill_to_state or po.ship_to_state,
        "bill_to_zip": po.bill_to_zip or po.ship_to_zip,
        "lines": [
            {
                "description": line.description,
                "item_code": line.item_code,
                "alt_code": line.alt_code,
                "quantity": line.quantity,
                "um": line.um,
                "product_id": line.product_id,
                "sku": line.sku,
            }
            for line in po.lines
        ],
        "issues": list(po.issues),
        "ocr_markdown": po.ocr_markdown,
        "source_path": po.source_path,
        "status": po.status,
    }


def review(path: Path) -> dict:
    import psycopg
    from psycopg.rows import dict_row

    source = path.expanduser().resolve()
    # Docling / RapidOCR print warnings to stdout. Keep that off the JSON pipe.
    saved = sys.stdout
    sys.stdout = sys.stderr
    try:
        dump = document_dump(ocr_document(source, make_converter()))
        po = parse_purchase_order(dump, source)
        try:
            with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
                extra = match_catalog(po, conn)
            finish_issues(po, extra)
        except Exception as exc:
            po.issues = list(po.issues) + ["Could not match names in the catalog"]
            po.status = "needs_review"
            sys.stderr.write(f"match_catalog failed: {exc}\n")
    finally:
        sys.stdout = saved
    return review_payload(po)


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


def _supplier_lines(dump: dict) -> list[dict]:
    lines = []
    for table in dump.get("tables") or []:
        for row in table.get("rows") or []:
            if not isinstance(row, dict):
                continue
            description = ""
            code = ""
            qty = None
            for key, value in row.items():
                name = str(key).casefold()
                text = str(value).strip()
                if not text:
                    continue
                if any(word in name for word in ("desc", "product", "item", "fabric", "goods", "name")):
                    description = description or text
                elif any(word in name for word in ("code", "sku", "part")):
                    code = code or text
                elif any(word in name for word in ("qty", "quantity", "yard", "pcs", "piece")):
                    qty = _as_number(text)
            if not description and not code:
                texts = [str(value).strip() for value in row.values() if str(value).strip()]
                if texts:
                    description = texts[0]
                for value in row.values():
                    number = _as_number(str(value))
                    if number is not None:
                        qty = number
                        break
            if description or code:
                lines.append(
                    {
                        "description": description or code,
                        "item_code": code,
                        "quantity": qty,
                    }
                )
    return lines


def parse_supplier(dump: dict, source: Path) -> dict:
    text = dump.get("text") or dump.get("markdown") or ""
    invoice = (
        _after_label(text, "Invoice No")
        or _after_label(text, "Invoice #")
        or _after_label(text, "Invoice")
    )
    country = _after_label(text, "Country") or _after_label(text, "Origin")
    departure = _as_date(
        _after_label(text, "Departure") or _after_label(text, "ETD") or ""
    )
    arrival = _as_date(_after_label(text, "Arrival") or _after_label(text, "ETA") or "")
    lines = _supplier_lines(dump)
    issues = []
    if not lines:
        issues.append("No product lines")
    return {
        "invoice_number": invoice,
        "country": country,
        "departure_date": departure,
        "arrival_date": arrival,
        "lines": lines,
        "issues": issues,
        "ocr_markdown": dump.get("markdown") or "",
        "source_path": source.name,
    }


def supplier_review(path: Path) -> dict:
    source = path.expanduser().resolve()
    saved = sys.stdout
    sys.stdout = sys.stderr
    try:
        dump = document_dump(ocr_document(source, make_converter()))
        return parse_supplier(dump, source)
    finally:
        sys.stdout = saved


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[1] == "--review":
        if len(argv) < 3:
            sys.stderr.write(
                "Usage: python PO-ingestion/process.py --review <po-file>\n"
            )
            return 2
        source = Path(argv[2])
        if not source.is_file():
            sys.stderr.write(f"File not found: {source}\n")
            return 2
        sys.stdout.write(json.dumps(review(source)) + "\n")
        sys.stdout.flush()
        # RapidOCR/ONNX aborts while tearing down threads on macOS (exit 134).
        os._exit(0)
    if len(argv) >= 2 and argv[1] == "--supplier":
        if len(argv) < 3:
            sys.stderr.write(
                "Usage: python PO-ingestion/process.py --supplier <pdf>\n"
            )
            return 2
        source = Path(argv[2])
        if not source.is_file():
            sys.stderr.write(f"File not found: {source}\n")
            return 2
        sys.stdout.write(json.dumps(supplier_review(source)) + "\n")
        sys.stdout.flush()
        os._exit(0)
    if len(argv) < 2:
        sys.stderr.write(
            "Usage: python PO-ingestion/process.py <po-file>\n"
            "       python PO-ingestion/process.py --review <po-file>\n"
            "       python PO-ingestion/process.py --supplier <pdf>\n"
        )
        return 2
    source = Path(argv[1])
    if not source.is_file():
        sys.stderr.write(f"File not found: {source}\n")
        return 2
    po = process(source)
    return 0 if po.status == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
