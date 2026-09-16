#!/usr/bin/env python3
"""Load the Excel workbook into local Postgres (header + lines)."""

from __future__ import annotations

import math
import os
import re
import sys
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

try:
    import psycopg
except ImportError:
    sys.stderr.write("Install seed deps: pip install 'psycopg[binary]'\n")
    raise

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
EXCEL_EPOCH = date(1899, 12, 30)

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
HOURS = Path("/Volumes/HOURS")
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
)


def first_existing(*paths: Path) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


WORKBOOKS = [
    path
    for path in (
        first_existing(HOURS / "rml-system.xlsm", WORKSPACE / "rml-system 2.xlsm"),
        first_existing(HOURS / "rml-system WOODHAVEN.xlsm"),
    )
    if path is not None
]
TEMPLATES = [
    path
    for path in (
        first_existing(
            HOURS / "Packing_Slip_Template_MATTRESS.xlsx",
            WORKSPACE / "Packing_Slip_Template_2026_V3.xlsx",
        ),
    )
    if path is not None
]


def col_row(cell_ref: str) -> tuple[int, int]:
    col, row = "", ""
    for ch in cell_ref:
        if ch.isalpha():
            col += ch
        else:
            row += ch
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n, int(row) if row else 0


def load_sst(z: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    strings = []
    for si in root.findall("m:si", NS):
        texts = [t.text or "" for t in si.findall(".//m:t", NS)]
        strings.append("".join(texts))
    return strings


def sheet_paths(z: zipfile.ZipFile) -> dict[str, str]:
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {
        "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    }
    out = {}
    for s in wb.findall("m:sheets/m:sheet", ns):
        name = s.attrib["name"]
        rid = s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        target = rid_to_target[rid]
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        out[name] = target
    return out


def cell_val(elem: ET.Element, sst: list[str]):
    t = elem.attrib.get("t")
    v = elem.find("m:v", NS)
    if t == "s" and v is not None and v.text is not None:
        return sst[int(v.text)]
    if t == "inlineStr":
        is_el = elem.find("m:is", NS)
        if is_el is not None:
            texts = [
                n.text or ""
                for n in is_el.findall(
                    ".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
                )
            ]
            return "".join(texts)
    if t == "b" and v is not None:
        return v.text == "1"
    if v is not None:
        return v.text
    return None


def iter_sheet_rows(z: zipfile.ZipFile, path: str, sst: list[str], max_col: int):
    rows: dict[int, dict[int, object]] = defaultdict(dict)
    context = ET.iterparse(z.open(path), events=("end",))
    last_row = 0
    for _event, elem in context:
        if not elem.tag.endswith("}c"):
            continue
        ref = elem.attrib.get("r", "")
        if not ref:
            elem.clear()
            continue
        c, r = col_row(ref)
        if c > max_col:
            elem.clear()
            continue
        if r != last_row and last_row and last_row in rows:
            yield last_row, rows.pop(last_row)
        last_row = r
        rows[r][c] = cell_val(elem, sst)
        elem.clear()
    for r in sorted(rows):
        yield r, rows[r]


def as_text(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "none":
        return None
    if re.fullmatch(r"-?\d+\.0", s):
        s = s[:-2]
    return s


SHIPMENT_UNIT_TYPES = {"yards", "pieces", "sets", "boxes", "bundles"}
SHIPMENT_UNIT_ALIASES = {
    "yard": "yards",
    "yd": "yards",
    "yds": "yards",
    "piece": "pieces",
    "pc": "pieces",
    "pcs": "pieces",
    "set": "sets",
    "box": "boxes",
    "bundle": "bundles",
}


def shipment_unit(v) -> str | None:
    raw = as_text(v)
    if raw is None:
        return None
    key = raw.lower()
    if key in SHIPMENT_UNIT_TYPES:
        return key
    return SHIPMENT_UNIT_ALIASES.get(key)


def as_int(v) -> int | None:
    s = as_text(v)
    if s is None:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def as_num(v):
    s = as_text(v)
    if s is None:
        return None
    try:
        n = float(s)
    except ValueError:
        return None
    if math.isnan(n) or math.isinf(n):
        return None
    return n


def as_date(v) -> date | None:
    s = as_text(v)
    if s is None:
        return None
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return date.fromisoformat(s)
    try:
        n = float(s)
    except ValueError:
        return None
    if n < 20000 or n > 80000:
        return None
    return EXCEL_EPOCH + timedelta(days=int(n))


def norm(s: str | None) -> str:
    if not s:
        return ""
    s = s.strip().upper()
    s = s.replace("MATRESS", "MATTRESS")
    s = re.sub(r"[.,'()]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s


def load_workbook_sheets(path: Path, wanted: list[str], max_col: int = 16):
    data: dict[str, list[dict[int, object]]] = {name: [] for name in wanted}
    with zipfile.ZipFile(path) as z:
        sst = load_sst(z)
        paths = sheet_paths(z)
        for name in wanted:
            if name not in paths:
                continue
            for r, row in iter_sheet_rows(z, paths[name], sst, max_col=max_col):
                if r == 1:
                    continue
                if not any(as_text(v) for v in row.values()):
                    continue
                data[name].append(row)
    return data


STATE_ABBR = {
    "ALABAMA": "AL",
    "ARIZONA": "AZ",
    "CONNECTICUT": "CT",
    "FLORIDA": "FL",
    "GEORGIA": "GA",
    "ILLINOIS": "IL",
    "INDIANA": "IN",
    "KENTUCKY": "KY",
    "LOUISIANA": "LA",
    "MASSACHUSETTS": "MA",
    "MASSACHUSETS": "MA",
    "NORTH CAROLINA": "NC",
    "NORTH CAROLINE": "NC",
    "OHIO": "OH",
    "PENNSYLVANIA": "PA",
    "PENSSYLVANIA": "PA",
    "SOUTH CAROLINA": "SC",
    "SOUTH CAROLINE": "SC",
    "TENNESSEE": "TN",
    "TEXAS": "TX",
    "WASHINGTON": "WA",
}


def state_abbr(s: str | None) -> str:
    n = norm(s)
    if not n:
        return ""
    if len(n) <= 3:
        return n
    return STATE_ABBR.get(n, n)


def plant_token(name: str | None) -> str:
    hit = re.search(r"\bP\d+\b", (name or "").upper())
    return hit.group(0) if hit else ""


def apply_contact_id_cust(customers: list[dict], contact_rows: list[dict]) -> None:
    """Packing-slip Contact.Code2 wins over RML Customers.ID_Cust."""

    def find_customer(
        names_label: str, company: str, state: str, city: str | None
    ) -> dict | None:
        st = state_abbr(state)
        plant = plant_token(names_label)
        label = norm(names_label)
        if plant and "WOODHAVEN" in names_label.upper():
            for c in customers:
                if (
                    plant_token(c.get("name")) == plant
                    and "WOODHAVEN" in (c.get("name") or "").upper()
                ):
                    return c
        for c in customers:
            if st and state_abbr(c.get("state")) != st:
                continue
            if city and c.get("city") and norm(c["city"]) != norm(city):
                continue
            cn = norm(c["name"]).replace("CORCICANA", "CORSICANA")
            cc = label.replace("CORCICANA", "CORSICANA")
            co = norm(company).replace("CORCICANA", "CORSICANA")
            if cn == cc or cn in cc or cc in cn:
                return c
            if co and (cn == co or cn in co or co in cn):
                return c
            co_first = (co or cc).split()[0] if (co or cc) else ""
            if st and co_first and cn == f"{co_first} {st}":
                return c
            if st and co_first and cn.endswith(f" {st}") and cn.startswith(co_first):
                return c
        return None

    for row in contact_rows:
        names_label = as_text(row.get(1)) or ""
        code = as_text(row.get(2))
        company = as_text(row.get(3)) or names_label
        state = as_text(row.get(4))
        city = as_text(row.get(7))
        if not code:
            continue
        match = find_customer(names_label, company, state or "", city)
        if match is None:
            new_id = max(c["id"] for c in customers) + 1
            customers.append(
                {
                    "id": new_id,
                    "name": names_label or company,
                    "address": as_text(row.get(6)),
                    "city": city,
                    "state": state,
                    "zip_code": as_text(row.get(9)),
                    "point_of_contact": as_text(row.get(5)),
                    "id_cust": code,
                    "email_contact": None,
                    "company": company_of(names_label or company),
                }
            )
            print(f"  added customer from Contact: {code} ({names_label or company})")
            continue
        old = match.get("id_cust")
        if old == code:
            continue
        match["id_cust"] = code
        print(f"  id_cust {old or '(none)'} -> {code}  ({match['name']})")


def apply_woodhaven_code(customers: list[dict], contact_rows: list[dict]) -> None:
    whfi = None
    for row in contact_rows:
        blob = " ".join(
            part
            for part in (as_text(row.get(1)), as_text(row.get(3)))
            if part
        )
        code = as_text(row.get(2))
        if code and "WOODHAVEN" in blob.upper():
            whfi = code
            break
    if not whfi:
        return
    for customer in customers:
        if customer.get("company") != "Woodhaven":
            continue
        old = customer.get("id_cust")
        if old == whfi:
            continue
        customer["id_cust"] = whfi
        print(f"  id_cust {old or '(none)'} -> {whfi}  ({customer['name']})")


def match_customer(label: str | None, customers: list[dict], aliases: dict[str, int]) -> int | None:
    key = norm(label)
    if not key:
        return None
    if key in aliases:
        return aliases[key]
    compact = key.replace(" ", "")
    if compact in aliases:
        return aliases[compact]
    # "SOLSTICE TX" -> look for id_cust SOLTX or name containing both tokens
    parts = key.split()
    if len(parts) >= 2 and len(parts[-1]) <= 3:
        code = "".join(p[:3] if i == 0 else p for i, p in enumerate(parts))[:8]
        # try first-3-letters of first word + last token: SOL + TX
        guess = (parts[0][:3] + parts[-1]).replace(" ", "")
        if guess in aliases:
            return aliases[guess]
    for c in customers:
        n = norm(c["name"])
        if n and (n == key or n in key or key in n):
            return c["id"]
        if c.get("id_cust") and norm(c["id_cust"]) == key:
            return c["id"]
    return None


def match_product(
    name: str | None,
    sku: str | None,
    by_num: dict[str, int],
    by_name: dict[str, int],
    map_client: dict[str, int],
    map_kanbons: dict[str, int],
) -> int | None:
    if sku:
        s = as_text(sku)
        if s and s in by_num and s != "1":
            return by_num[s]
    key = norm(name)
    if not key:
        return None
    if key in by_name:
        return by_name[key]
    if key in map_client:
        return map_client[key]
    if key in map_kanbons:
        return map_kanbons[key]
    return None


def company_of(name: str | None) -> str | None:
    if "WOODHAVEN" in (name or "").upper():
        return "Woodhaven"
    return None


def parse_customers(rows: list[dict[int, object]]) -> list[dict]:
    customers = []
    seen_id_cust: set[str] = set()
    seen_ids: set[int] = set()
    for row in rows:
        cid = as_int(row.get(1))
        name = as_text(row.get(2))
        if cid is None or not name:
            continue
        if cid in seen_ids:
            cid = max(seen_ids) + 1
        seen_ids.add(cid)
        id_cust = as_text(row.get(8))
        if id_cust and id_cust in seen_id_cust:
            id_cust = None
        if id_cust:
            seen_id_cust.add(id_cust)
        customers.append(
            {
                "id": cid,
                "name": name,
                "address": as_text(row.get(3)),
                "city": as_text(row.get(4)),
                "state": as_text(row.get(5)),
                "zip_code": as_text(row.get(6)),
                "point_of_contact": as_text(row.get(7)),
                "id_cust": id_cust,
                "email_contact": as_text(row.get(9)),
                "company": company_of(name),
            }
        )
    return customers


def merge_customers(groups: list[list[dict]]) -> list[dict]:
    by_id: dict[int, dict] = {}
    by_cust: dict[str, dict] = {}

    def next_id() -> int:
        return max(by_id) + 1 if by_id else 1

    for group in groups:
        for raw in group:
            customer = dict(raw)
            customer["company"] = company_of(customer.get("name"))
            code = customer.get("id_cust")
            if code and code in by_cust:
                existing = by_cust[code]
                incoming_wh = customer["company"] == "Woodhaven"
                existing_wh = existing.get("company") == "Woodhaven"
                if incoming_wh or not existing_wh:
                    keep_id = existing["id"]
                    existing.update(customer)
                    existing["id"] = keep_id
                    existing["company"] = company_of(existing.get("name"))
                continue
            cid = customer["id"]
            if cid in by_id:
                customer["id"] = next_id()
                cid = customer["id"]
                print(
                    f"  reassigned customer id to {cid} ({customer['name']})"
                )
            by_id[cid] = customer
            if code:
                by_cust[code] = customer
    return [by_id[cid] for cid in sorted(by_id)]


def parse_products(
    product_rows: list[dict[int, object]],
    stock_rows: list[dict[int, object]],
    seen_sku: set[str],
) -> tuple[list[dict], list[dict[int, object]]]:
    products = []
    for row in product_rows:
        sku = as_text(row.get(1))
        pname = as_text(row.get(2))
        if not sku or not pname or sku in seen_sku:
            continue
        seen_sku.add(sku)
        products.append(
            {
                "num": sku,
                "product": pname,
                "unit_pack": as_int(row.get(3)),
                "type_of_unit": as_text(row.get(4)),
                "type_of_unit_customer": as_text(row.get(5)),
                "unit_of_measurement": as_text(row.get(6)),
                "pre_uni": as_num(row.get(7)),
            }
        )
    kept_stock = []
    for row in stock_rows:
        sku = as_text(row.get(1))
        pname = as_text(row.get(2))
        if not sku:
            continue
        kept_stock.append(row)
        if sku not in seen_sku and pname:
            seen_sku.add(sku)
            products.append(
                {
                    "num": sku,
                    "product": pname,
                    "unit_pack": as_int(row.get(3)),
                    "type_of_unit": as_text(row.get(4)),
                    "type_of_unit_customer": None,
                    "unit_of_measurement": None,
                    "pre_uni": None,
                }
            )
    return products, kept_stock


def seed() -> None:
    if not WORKBOOKS:
        raise SystemExit("Missing rml-system workbook")
    if not TEMPLATES:
        raise SystemExit("Missing packing slip template")

    print("Reading Excel…")
    for path in WORKBOOKS:
        print(f"  workbook {path}")
    for path in TEMPLATES:
        print(f"  template {path}")

    mains = [
        load_workbook_sheets(
            path,
            ["Customers", "Product", "Stock", "Shipping", "Packing List"],
            max_col=16,
        )
        for path in WORKBOOKS
    ]
    tmpls = [
        load_workbook_sheets(path, ["Reconciliation", "Contact"], max_col=9)
        for path in TEMPLATES
    ]

    customers = merge_customers([parse_customers(main["Customers"]) for main in mains])
    contact_rows: list[dict[int, object]] = []
    recon_rows: list[dict[int, object]] = []
    for tmpl in tmpls:
        contact_rows.extend(tmpl["Contact"])
        recon_rows.extend(tmpl["Reconciliation"])
    apply_contact_id_cust(customers, contact_rows)
    for customer in customers:
        customer["company"] = company_of(customer.get("name"))
    apply_woodhaven_code(customers, contact_rows)

    seen_sku: set[str] = set()
    products: list[dict] = []
    stock_rows: list[dict[int, object]] = []
    for main in mains:
        parsed, stock = parse_products(main["Product"], main["Stock"], seen_sku)
        products.extend(parsed)
        stock_rows.extend(stock)

    print(
        f"Parsed customers={len(customers)} products={len(products)} "
        f"stock={len(stock_rows)} shipping_lines="
        f"{sum(len(main['Shipping']) for main in mains)} packing_lines="
        f"{sum(len(main['Packing List']) for main in mains)} "
        f"mappings={len(recon_rows)}"
    )

    conn = psycopg.connect(DATABASE_URL, autocommit=False)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                truncate table
                  public.packing_list_lines,
                  public.packing_lists,
                  public.shipment_lines,
                  public.shipments,
                  public.stock,
                  public.product_mappings,
                  public.products,
                  public.customers
                restart identity cascade
                """
            )

            cur.executemany(
                """
                insert into public.customers
                  (id, name, address, city, state, zip_code, point_of_contact,
                   id_cust, email_contact, company)
                values
                  (%(id)s, %(name)s, %(address)s, %(city)s, %(state)s, %(zip_code)s,
                   %(point_of_contact)s, %(id_cust)s, %(email_contact)s, %(company)s)
                """,
                customers,
            )

            cur.execute(
                """
                select setval(
                  pg_get_serial_sequence('public.customers', 'id'),
                  coalesce((select max(id) from public.customers), 1)
                )
                """
            )

            cur.executemany(
                """
                insert into public.products
                  (num, product, unit_pack, type_of_unit, type_of_unit_customer,
                   unit_of_measurement, pre_uni)
                values
                  (%(num)s, %(product)s, %(unit_pack)s, %(type_of_unit)s,
                   %(type_of_unit_customer)s, %(unit_of_measurement)s, %(pre_uni)s)
                """,
                products,
            )

            cur.execute("select id, num, product from public.products")
            by_num: dict[str, int] = {}
            by_name: dict[str, int] = {}
            for pid, num, product in cur.fetchall():
                by_num[num] = pid
                by_name[norm(product)] = pid

            aliases: dict[str, int] = {}
            for c in customers:
                aliases[norm(c["name"])] = c["id"]
                if c["id_cust"]:
                    aliases[norm(c["id_cust"])] = c["id"]
                    aliases[c["id_cust"].replace(" ", "").upper()] = c["id"]
            for row in contact_rows:
                code = as_text(row.get(1))
                company = as_text(row.get(2))
                state = as_text(row.get(3))
                cid = match_customer(company, customers, aliases)
                if cid is None and company and state:
                    cid = match_customer(f"{company} {state}", customers, aliases)
                if code and cid:
                    aliases[norm(code)] = cid
                    aliases[code.replace(" ", "").upper()] = cid
                    if state:
                        # SOLSTICE TX style
                        words = norm(company).split()
                        if words:
                            aliases[f"{words[0]} {norm(state)}"] = cid
                            aliases[norm(f"{words[0]} {state}")] = cid

            map_client: dict[str, int] = {}
            map_kanbons: dict[str, int] = {}
            mapping_rows = []
            mapping_keys: set[tuple] = set()
            for row in recon_rows:
                client = as_text(row.get(1))
                kanbons = as_text(row.get(2))
                item_code = as_text(row.get(3))
                if not client:
                    continue
                pid = None
                if item_code and item_code in by_num:
                    pid = by_num[item_code]
                if pid is None:
                    pid = by_name.get(norm(kanbons))
                if pid is None:
                    pid = by_name.get(norm(client))
                if pid:
                    map_client[norm(client)] = pid
                    if kanbons:
                        map_kanbons[norm(kanbons)] = pid
                key = (None, norm(client), item_code or "")
                if key in mapping_keys:
                    continue
                mapping_keys.add(key)
                mapping_rows.append(
                    {
                        "client_name": client,
                        "kanbons_name": kanbons,
                        "item_code": item_code,
                        "product_id": pid,
                        "company": None,
                    }
                )

            counted_at = datetime.now(timezone.utc)
            stock_insert = []
            seen_stock: set[int] = set()
            for row in stock_rows:
                sku = as_text(row.get(1))
                pid = by_num.get(sku) if sku else None
                if pid is None or pid in seen_stock:
                    continue
                seen_stock.add(pid)
                physical = as_num(row.get(6))  # Tot_Unit
                stock_insert.append(
                    {
                        "product_id": pid,
                        "quantity": as_int(row.get(5)),
                        "contador_physical": physical,
                        "contador_counted_at": counted_at if physical is not None else None,
                    }
                )
            if stock_insert:
                cur.executemany(
                    """
                    insert into public.stock
                      (product_id, quantity, contador_physical, contador_counted_at)
                    values
                      (%(product_id)s, %(quantity)s, %(contador_physical)s, %(contador_counted_at)s)
                    """,
                    stock_insert,
                )

            # Shipments: one header per shipping number *per workbook*
            shipment_headers: list[dict] = []
            ship_lines = []
            unmatched_ship_products = 0
            for _source, main in enumerate(mains):
                by_number: dict[int, int] = {}
                for row in main["Shipping"]:
                    number = as_int(row.get(1))
                    if number is None:
                        continue
                    if number not in by_number:
                        by_number[number] = len(shipment_headers)
                        shipment_headers.append(
                            {
                                "number": number,
                                "country": as_text(row.get(2)),
                                "invoice_number": as_text(row.get(3)),
                                "arrival_date": as_date(row.get(5)),
                                "departure_date": as_date(row.get(6)),
                            }
                        )
                    sku = as_text(row.get(4))
                    pname = as_text(row.get(7))
                    pid = match_product(
                        pname, sku, by_num, by_name, map_client, map_kanbons
                    )
                    if pid is None:
                        unmatched_ship_products += 1
                    ship_lines.append(
                        {
                            "header_index": by_number[number],
                            "product_id": pid,
                            "sku": sku,
                            "product": pname,
                            "yards_pcs": as_num(row.get(8)),
                            "unit": as_int(row.get(9)),
                            "type_of_unit": shipment_unit(row.get(10)),
                        }
                    )

            for header in shipment_headers:
                cur.execute(
                    """
                    insert into public.shipments
                      (number, country, invoice_number, arrival_date, departure_date)
                    values
                      (%(number)s, %(country)s, %(invoice_number)s,
                       %(arrival_date)s, %(departure_date)s)
                    returning id
                    """,
                    header,
                )
                header["id"] = cur.fetchone()[0]
            for line in ship_lines:
                line["shipment_id"] = shipment_headers[line["header_index"]]["id"]
            if ship_lines:
                cur.executemany(
                    """
                    insert into public.shipment_lines
                      (shipment_id, product_id, sku, product, yards_pcs, unit, type_of_unit)
                    values
                      (%(shipment_id)s, %(product_id)s, %(sku)s, %(product)s, %(yards_pcs)s,
                       %(unit)s, %(type_of_unit)s)
                    """,
                    ship_lines,
                )

            # Packing lists: group by source + num_pl + customer
            headers: dict[tuple, dict] = {}
            header_order: list[tuple] = []
            pl_lines = []
            unmatched_customers: dict[str, int] = defaultdict(int)
            unmatched_pl_products = 0
            matched_customers = 0
            company_by_id = {c["id"]: c.get("company") for c in customers}
            sku_by_id = {pid: num for num, pid in by_num.items()}
            name_by_id = {
                by_num[p["num"]]: p["product"] for p in products if p["num"] in by_num
            }

            for source, main in enumerate(mains):
                for row in main["Packing List"]:
                    num_pl = as_int(row.get(3))
                    customer = as_text(row.get(2))
                    if num_pl is None:
                        continue
                    key = (source, num_pl, customer)
                    if key not in headers:
                        cid = match_customer(customer, customers, aliases)
                        if cid:
                            matched_customers += 1
                        elif customer:
                            unmatched_customers[customer] += 1
                        headers[key] = {
                            "key": key,
                            "num_pl": num_pl,
                            "customer_id": cid,
                            "customer": customer,
                            "company": company_of(customer)
                            or (company_by_id.get(cid) if cid else None),
                            "date": as_date(row.get(4)),
                            "ship_date": as_date(row.get(5)),
                            "customer_po": as_text(row.get(6)),
                            "state": as_text(row.get(13)),
                        }
                        header_order.append(key)
                    pname = as_text(row.get(7))
                    pid = match_product(
                        pname, None, by_num, by_name, map_client, map_kanbons
                    )
                    if pid is None:
                        unmatched_pl_products += 1
                    pl_lines.append(
                        {
                            "key": key,
                            "product_id": pid,
                            "product": pname,
                            "yards_pieces": as_num(row.get(8)),
                            "unit": as_int(row.get(9)),
                            "type_of_unit": as_text(row.get(10)),
                            "pre_uni": as_num(row.get(11)),
                        }
                    )

            header_rows = [headers[k] for k in header_order]
            for header in header_rows:
                cur.execute(
                    """
                    insert into public.packing_lists
                      (num_pl, customer_id, customer, date, ship_date, customer_po, state, status)
                    values
                      (%(num_pl)s, %(customer_id)s, %(customer)s, %(date)s, %(ship_date)s,
                       %(customer_po)s, %(state)s, 'dispatched')
                    returning id
                    """,
                    header,
                )
                header["id"] = cur.fetchone()[0]
            for line in pl_lines:
                line["packing_list_id"] = headers[line["key"]]["id"]

            chunk = 1000
            sql = """
                insert into public.packing_list_lines
                  (packing_list_id, product_id, product, yards_pieces, unit, type_of_unit, pre_uni)
                values
                  (%(packing_list_id)s, %(product_id)s, %(product)s, %(yards_pieces)s,
                   %(unit)s, %(type_of_unit)s, %(pre_uni)s)
            """
            for i in range(0, len(pl_lines), chunk):
                cur.executemany(sql, pl_lines[i : i + chunk])
                print(f"  packing list lines {min(i + chunk, len(pl_lines))}/{len(pl_lines)}")

            for line in pl_lines:
                header = headers[line["key"]]
                company = header.get("company")
                pname = line.get("product")
                pid = line.get("product_id")
                if company != "Woodhaven" or not pname or pid is None:
                    continue
                key = (company, norm(pname), sku_by_id.get(pid) or "")
                if key in mapping_keys:
                    continue
                mapping_keys.add(key)
                mapping_rows.append(
                    {
                        "client_name": pname,
                        "kanbons_name": name_by_id.get(pid),
                        "item_code": sku_by_id.get(pid),
                        "product_id": pid,
                        "company": company,
                    }
                )
            if mapping_rows:
                cur.executemany(
                    """
                    insert into public.product_mappings
                      (client_name, kanbons_name, item_code, product_id, company)
                    values
                      (%(client_name)s, %(kanbons_name)s, %(item_code)s, %(product_id)s,
                       %(company)s)
                    """,
                    mapping_rows,
                )

            cur.execute(
                """
                select
                  (select count(*) from public.customers) as customers,
                  (select count(*) from public.products) as products,
                  (select count(*) from public.product_mappings) as mappings,
                  (select count(*) from public.stock) as stock,
                  (select count(*) from public.shipments) as shipments,
                  (select count(*) from public.shipment_lines) as shipment_lines,
                  (select count(*) from public.packing_lists) as packing_lists,
                  (select count(*) from public.packing_list_lines) as packing_list_lines,
                  (select count(*) from public.packing_lists where customer_id is not null) as pl_with_customer,
                  (select count(*) from public.packing_list_lines where product_id is not null) as pll_with_product,
                  (select count(*) from public.shipment_lines where product_id is not null) as sl_with_product,
                  (select count(*) from public.customers where company is not null) as customers_with_company,
                  (select count(*) from public.product_mappings where company is not null) as mappings_with_company
                """
            )
            counts = cur.fetchone()
            labels = [
                "customers",
                "products",
                "mappings",
                "stock",
                "shipments",
                "shipment_lines",
                "packing_lists",
                "packing_list_lines",
                "pl_with_customer",
                "pll_with_product",
                "sl_with_product",
                "customers_with_company",
                "mappings_with_company",
            ]
            print("Loaded:")
            for label, n in zip(labels, counts):
                print(f"  {label}: {n}")

            print(f"Unmatched shipping product lines: {unmatched_ship_products}")
            print(f"Unmatched packing-list product lines: {unmatched_pl_products}")
            print(f"Packing-list headers with customer match: {matched_customers}")
            if unmatched_customers:
                top = sorted(unmatched_customers.items(), key=lambda x: -x[1])[:15]
                print("Unmatched packing-list customer labels (top):")
                for name, n in top:
                    print(f"  {n:5d}  {name}")

        conn.commit()
        print("Done.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
