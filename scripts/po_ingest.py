#!/usr/bin/env python3
"""Customer PO file → Docling → Pydantic → packing list.

Skeleton only. Fill extract_purchase_order after you research Docling.
Failures are always saved to po_ingest_runs (training data). A full match
saves a confirmed packing list and returns print/detail URLs. Never dispatch.

Stages
------
1. extract_purchase_order   Docling DocumentExtractor → ExtractedPurchaseOrder
2. resolve_against_catalog  same matching rules as packing_slip_match.ts
3. persist_run              always write po_ingest_runs + files on disk
4. save_packing_list_if_matched  packing_lists + lines, status=confirmed only

Packing-list inserts must stay aligned with persistDraft / confirmPackingSlip
in kanbons/lib/models/packing_slip.ts. Do not decrement stock here.

Usage: python scripts/po_ingest.py /path/to/po.pdf
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any

try:
    from pydantic import BaseModel, Field
except ImportError:
    sys.stderr.write("Install pydantic: pip install pydantic\n")
    raise

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Jsonb
except ImportError:
    sys.stderr.write("Install seed deps: pip install 'psycopg[binary]'\n")
    raise

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "po_ingest"
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
)
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000").rstrip("/")

# ---------------------------------------------------------------------------
# Pydantic — OCR-facing (Docling template)
# ---------------------------------------------------------------------------


class ExtractedAddress(BaseModel):
    name: str | None = Field(default=None, examples=["Acme Manufacturing"])
    address: str | None = Field(default=None, examples=["100 Industrial Way"])
    city: str | None = Field(default=None, examples=["Dalton"])
    state: str | None = Field(default=None, examples=["GA"])
    zip: str | None = Field(default=None, examples=["30721"])


class ExtractedLine(BaseModel):
    as_written: str | None = Field(
        default=None, examples=["RIB STOP 210D BLACK"]
    )
    item_code: str | None = Field(default=None, examples=["RS-210-BLK"])
    yards_pieces: float | None = Field(default=None, examples=[500])
    unit: int | None = Field(default=None, examples=[10])


class ExtractedPurchaseOrder(BaseModel):
    """Template passed to Docling DocumentExtractor.extract(..., template=...)."""

    customer_name: str | None = Field(default=None, examples=["Acme Manufacturing"])
    customer_code: str | None = Field(default=None, examples=["ACME"])
    customer_po: str | None = Field(default=None, examples=["PO-10482"])
    date: str | None = Field(default=None, examples=["2026-09-01"])
    ship_date: str | None = Field(default=None, examples=["2026-09-15"])
    ship_to: ExtractedAddress = Field(default_factory=ExtractedAddress)
    bill_to: ExtractedAddress = Field(default_factory=ExtractedAddress)
    lines: list[ExtractedLine] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pydantic — catalog-facing (mirrors packing_slip_match.ts PurchaseOrder)
# ---------------------------------------------------------------------------


class Address(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None


class ResolvedLine(BaseModel):
    as_written: str
    item_code: str | None = None
    yards_pieces: float | None = None
    unit: int | None = None
    product_id: int | None = None
    pre_uni: float | None = None


class ResolvedPurchaseOrder(BaseModel):
    customer_id: int | None = None
    customer_name: str = ""
    customer_code: str | None = None
    customer_po: str = ""
    date: str | None = None
    ship_date: str | None = None
    ship_to: Address = Field(default_factory=Address)
    bill_to: Address = Field(default_factory=Address)
    lines: list[ResolvedLine] = Field(default_factory=list)
    unmatched: list[str] = Field(default_factory=list)

    def is_complete(self) -> bool:
        if self.customer_id is None:
            return False
        if not self.customer_po:
            return False
        if not self.lines:
            return False
        if any(line.product_id is None for line in self.lines):
            return False
        return len(self.unmatched) == 0

    def failure_reason(self) -> str:
        return "; ".join(self.unmatched) if self.unmatched else "Incomplete match"


class PipelineResult(BaseModel):
    run_id: int | None = None
    status: str
    original_path: str | None = None
    extracted_json_path: str | None = None
    resolved_json_path: str | None = None
    failure_reason: str | None = None
    packing_list_id: int | None = None
    num_pl: int | None = None
    print_url: str | None = None
    detail_url: str | None = None


# ---------------------------------------------------------------------------
# 1. Extract — RESEARCH stub
# ---------------------------------------------------------------------------


def extract_purchase_order(path: Path) -> ExtractedPurchaseOrder:
    """Pull typed PO fields from a PDF or image.

    RESEARCH: Docling structured extraction (beta).
    https://docling-project.github.io/docling/_generated/examples/extraction/

        from docling.datamodel.base_models import InputFormat
        from docling.document_extractor import DocumentExtractor

        extractor = DocumentExtractor(
            allowed_formats=[InputFormat.PDF, InputFormat.IMAGE]
        )
        result = extractor.extract(
            source=str(path),
            template=ExtractedPurchaseOrder,
        )
        page = result.pages[0]
        return ExtractedPurchaseOrder.model_validate(page.extracted_data)

    Needs a VLM extra (pip install with extract/VLM extras). On Mac, CPU vs
    MPS/GPU memory is a known issue — try CPU if extract OOMs.

    Fallback research: DocumentConverter → tables/markdown, then map cells
    into ExtractedPurchaseOrder by hand if DocumentExtractor is too heavy.
    """
    raise NotImplementedError(
        "Fill extract_purchase_order with Docling DocumentExtractor.extract("
        "source=..., template=ExtractedPurchaseOrder). See the docstring."
    )


# ---------------------------------------------------------------------------
# 2. Resolve — same rules as kanbons/lib/models/packing_slip_match.ts
# ---------------------------------------------------------------------------


def _norm(value: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


def _fuzzy_product_id(
    needle: str,
    products: list[dict[str, Any]],
    mappings: list[dict[str, Any]],
) -> int | None:
    if not needle:
        return None
    for product in products:
        if _norm(product["num"]) == needle:
            return int(product["id"])
    for mapping in mappings:
        if _norm(mapping["item_code"]) == needle and mapping["product_id"]:
            return int(mapping["product_id"])
    for product in products:
        if _norm(product["product"]) == needle:
            return int(product["id"])
    for mapping in mappings:
        if (
            _norm(mapping["client_name"]) == needle
            or _norm(mapping["kanbons_name"]) == needle
        ) and mapping["product_id"]:
            return int(mapping["product_id"])
    if len(needle) < 4:
        return None
    close = []
    for mapping in mappings:
        if mapping["product_id"] is None:
            continue
        client = _norm(mapping["client_name"])
        ours = _norm(mapping["kanbons_name"])
        if (len(client) >= 4 and (client.find(needle) >= 0 or needle.find(client) >= 0)) or (
            len(ours) >= 4 and (ours.find(needle) >= 0 or needle.find(ours) >= 0)
        ):
            close.append(int(mapping["product_id"]))
    close = list(dict.fromkeys(close))
    if len(close) == 1:
        return close[0]
    close_product = []
    for product in products:
        name = _norm(product["product"])
        sku = _norm(product["num"])
        if (len(name) >= 4 and (name.find(needle) >= 0 or needle.find(name) >= 0)) or (
            len(sku) >= 4 and (sku.find(needle) >= 0 or needle.find(sku) >= 0)
        ):
            close_product.append(int(product["id"]))
    close_product = list(dict.fromkeys(close_product))
    if len(close_product) == 1:
        return close_product[0]
    return None


def _resolve_product_id(
    line: ExtractedLine,
    products: list[dict[str, Any]],
    mappings: list[dict[str, Any]],
) -> int | None:
    from_code = _fuzzy_product_id(_norm(line.item_code), products, mappings)
    if from_code is not None:
        return from_code
    return _fuzzy_product_id(_norm(line.as_written), products, mappings)


def _resolve_customer(
    extracted: ExtractedPurchaseOrder,
    customers: list[dict[str, Any]],
) -> dict[str, Any] | None:
    code = _norm(extracted.customer_code)
    if code:
        hits = [c for c in customers if _norm(c["id_cust"]) == code]
        if len(hits) == 1:
            return hits[0]
    name = _norm(extracted.customer_name)
    if name:
        exact = [c for c in customers if _norm(c["name"]) == name]
        if len(exact) == 1:
            return exact[0]
        if len(name) >= 4:
            close = []
            for customer in customers:
                other = _norm(customer["name"])
                if len(other) >= 4 and (
                    other.find(name) >= 0 or name.find(other) >= 0
                ):
                    close.append(customer)
            if len(close) == 1:
                return close[0]
    return None


def _address_from_customer(customer: dict[str, Any] | None) -> Address:
    if not customer:
        return Address()
    return Address(
        name=customer["name"],
        address=customer.get("address"),
        city=customer.get("city"),
        state=customer.get("state"),
        zip=customer.get("zip_code"),
    )


def _filled_address(extracted: ExtractedAddress, fallback: Address) -> Address:
    return Address(
        name=extracted.name or fallback.name,
        address=extracted.address or fallback.address,
        city=extracted.city or fallback.city,
        state=extracted.state or fallback.state,
        zip=extracted.zip or fallback.zip,
    )


def resolve_against_catalog(
    extracted: ExtractedPurchaseOrder,
    conn: psycopg.Connection,
) -> ResolvedPurchaseOrder:
    customers = conn.execute(
        "select id, name, id_cust, address, city, state, zip_code from public.customers"
    ).fetchall()
    products = conn.execute(
        "select id, num, product, pre_uni from public.products"
    ).fetchall()
    mappings = conn.execute(
        "select client_name, kanbons_name, item_code, product_id from public.product_mappings"
    ).fetchall()

    customer_rows = [dict(r) for r in customers]
    product_rows = [dict(r) for r in products]
    mapping_rows = [dict(r) for r in mappings]
    by_id = {int(p["id"]): p for p in product_rows}

    unmatched: list[str] = []
    customer = _resolve_customer(extracted, customer_rows)
    if customer is None:
        unmatched.append(
            f"No customer match for {extracted.customer_name or extracted.customer_code or '(blank)'}"
        )

    customer_po = (extracted.customer_po or "").strip()
    if not customer_po:
        unmatched.append("Purchase order number is missing")

    fallback = _address_from_customer(customer)
    lines: list[ResolvedLine] = []
    for raw in extracted.lines:
        if not raw.as_written and raw.unit is None:
            continue
        as_written = (raw.as_written or "").strip()
        product_id = _resolve_product_id(raw, product_rows, mapping_rows)
        product = by_id.get(product_id) if product_id is not None else None
        if product_id is None:
            unmatched.append(f"No name match for: {as_written or raw.item_code or 'blank'}")
        pre_uni = product["pre_uni"] if product else None
        lines.append(
            ResolvedLine(
                as_written=as_written,
                item_code=raw.item_code,
                yards_pieces=raw.yards_pieces,
                unit=raw.unit,
                product_id=product_id,
                pre_uni=float(pre_uni) if pre_uni is not None else None,
            )
        )
    if not lines:
        unmatched.append("No product lines")

    return ResolvedPurchaseOrder(
        customer_id=int(customer["id"]) if customer else None,
        customer_name=customer["name"] if customer else (extracted.customer_name or ""),
        customer_code=customer["id_cust"] if customer else extracted.customer_code,
        customer_po=customer_po,
        date=extracted.date,
        ship_date=extracted.ship_date,
        ship_to=_filled_address(extracted.ship_to, fallback),
        bill_to=_filled_address(extracted.bill_to, fallback),
        lines=lines,
        unmatched=unmatched,
    )


# ---------------------------------------------------------------------------
# 3. Persist run — always, including failures (training data)
# ---------------------------------------------------------------------------


def persist_run(
    conn: psycopg.Connection,
    source: Path,
    status: str,
    extracted: ExtractedPurchaseOrder | None,
    resolved: ResolvedPurchaseOrder | None,
    failure_reason: str | None,
    packing_list_id: int | None,
) -> tuple[int, Path, Path | None, Path | None]:
    """Insert po_ingest_runs, copy the original PO, write JSON sidecars.

    gold_json stays null until a human corrects the extract for training.
    """
    extracted_dump = extracted.model_dump(mode="json") if extracted else None
    resolved_dump = resolved.model_dump(mode="json") if resolved else None
    row = conn.execute(
        """
        insert into public.po_ingest_runs
          (source_filename, source_path, extracted_json, resolved_json,
           status, failure_reason, packing_list_id)
        values
          (%s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (
            source.name,
            str(source.resolve()),
            Jsonb(extracted_dump) if extracted_dump is not None else None,
            Jsonb(resolved_dump) if resolved_dump is not None else None,
            status,
            failure_reason,
            packing_list_id,
        ),
    ).fetchone()
    assert row is not None
    run_id = int(row["id"])

    dest_dir = DATA_DIR / str(run_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    original = dest_dir / f"original{source.suffix or '.bin'}"
    shutil.copy2(source, original)

    extracted_path: Path | None = None
    resolved_path: Path | None = None
    if extracted_dump is not None:
        extracted_path = dest_dir / "extracted.json"
        extracted_path.write_text(json.dumps(extracted_dump, indent=2) + "\n")
    if resolved_dump is not None:
        resolved_path = dest_dir / "resolved.json"
        resolved_path.write_text(json.dumps(resolved_dump, indent=2) + "\n")

    conn.execute(
        "update public.po_ingest_runs set source_path = %s where id = %s",
        (str(original), run_id),
    )
    return run_id, original, extracted_path, resolved_path


# ---------------------------------------------------------------------------
# 4. Save packing list if everything matched — never dispatch
# ---------------------------------------------------------------------------


def packing_list_files(packing_list_id: int) -> dict[str, str]:
    """URLs a warehouse worker needs. Print is still the HTML 3-copy page.

    RESEARCH later: fill Packing_Slip_Template_2026_V3.xlsx or emit PDF.
    Do not generate those files in this skeleton.
    """
    return {
        "detail_url": f"{APP_BASE_URL}/packing-lists/{packing_list_id}",
        "print_url": f"{APP_BASE_URL}/packing-lists/{packing_list_id}/print",
    }


def save_packing_list_if_matched(
    conn: psycopg.Connection,
    resolved: ResolvedPurchaseOrder,
) -> tuple[int, int] | None:
    """Insert header + lines as confirmed. Returns (id, num_pl) or None.

    Mirrors persistDraft fields, then confirmed (createAndConfirmFromPoAction).
    Never sets dispatched / dispatched_at.
    """
    if not resolved.is_complete():
        return None

    next_num = conn.execute(
        "select coalesce(max(num_pl), 0) + 1 as n from public.packing_lists"
    ).fetchone()
    assert next_num is not None
    num_pl = int(next_num["n"])

    header = conn.execute(
        """
        insert into public.packing_lists (
          num_pl, customer_id, customer, customer_po, date, ship_date, state,
          status,
          ship_to_name, ship_to_address, ship_to_city, ship_to_state, ship_to_zip,
          bill_to_name, bill_to_address, bill_to_city, bill_to_state, bill_to_zip
        )
        values (
          %s, %s, %s, %s, %s, %s, %s,
          'confirmed',
          %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s
        )
        returning id, num_pl
        """,
        (
            num_pl,
            resolved.customer_id,
            resolved.customer_name,
            resolved.customer_po,
            resolved.date,
            resolved.ship_date,
            resolved.ship_to.state,
            resolved.ship_to.name,
            resolved.ship_to.address,
            resolved.ship_to.city,
            resolved.ship_to.state,
            resolved.ship_to.zip,
            resolved.bill_to.name,
            resolved.bill_to.address,
            resolved.bill_to.city,
            resolved.bill_to.state,
            resolved.bill_to.zip,
        ),
    ).fetchone()
    assert header is not None
    packing_list_id = int(header["id"])

    for line in resolved.lines:
        conn.execute(
            """
            insert into public.packing_list_lines (
              packing_list_id, product_id, product, yards_pieces, unit,
              type_of_unit, pre_uni
            )
            values (%s, %s, %s, %s, %s, null, %s)
            """,
            (
                packing_list_id,
                line.product_id,
                line.as_written,
                line.yards_pieces,
                line.unit,
                line.pre_uni,
            ),
        )
    return packing_list_id, num_pl


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def run(path: Path) -> PipelineResult:
    source = path.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(source)

    extracted: ExtractedPurchaseOrder | None = None
    resolved: ResolvedPurchaseOrder | None = None
    status = "failed"
    failure_reason: str | None = None
    packing_list_id: int | None = None
    num_pl: int | None = None

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        try:
            extracted = extract_purchase_order(source)
        except Exception as exc:
            status = "failed"
            failure_reason = str(exc)

        if extracted is not None:
            try:
                resolved = resolve_against_catalog(extracted, conn)
                with conn.transaction():
                    saved = save_packing_list_if_matched(conn, resolved)
                if saved is not None:
                    packing_list_id, num_pl = saved
                    status = "saved"
                    failure_reason = None
                else:
                    status = "unmatched"
                    failure_reason = resolved.failure_reason()
            except Exception as exc:
                status = "failed"
                failure_reason = str(exc)

        run_id, original, extracted_path, resolved_path = persist_run(
            conn,
            source=source,
            status=status,
            extracted=extracted,
            resolved=resolved,
            failure_reason=failure_reason,
            packing_list_id=packing_list_id,
        )
        conn.commit()

    files = packing_list_files(packing_list_id) if packing_list_id else {}
    return PipelineResult(
        run_id=run_id,
        status=status,
        original_path=str(original),
        extracted_json_path=str(extracted_path) if extracted_path else None,
        resolved_json_path=str(resolved_path) if resolved_path else None,
        failure_reason=failure_reason,
        packing_list_id=packing_list_id,
        num_pl=num_pl,
        print_url=files.get("print_url"),
        detail_url=files.get("detail_url"),
    )


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        sys.stderr.write("Usage: python scripts/po_ingest.py <po-file>\n")
        return 2
    result = run(Path(argv[1]))
    print(result.model_dump_json(indent=2))
    return 0 if result.status == "saved" else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
