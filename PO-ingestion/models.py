"""Pydantic shapes that match purchase_orders / purchase_order_lines."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PurchaseOrderLine(BaseModel):
    description: str | None = None
    item_code: str | None = None
    alt_code: str | None = None
    quantity: float | None = None
    um: str | None = None
    unit_price: float | None = None
    ext_amount: float | None = None
    product_id: int | None = None
    sku: str | None = None
    product_name: str | None = None


class PurchaseOrder(BaseModel):
    customer_po: str | None = None
    customer_id: int | None = None
    date: str | None = None
    ship_date: str | None = None
    vendor_name: str | None = Field(default=None, description="Us (Kanbons)")
    ship_to_name: str | None = None
    ship_to_address: str | None = None
    ship_to_city: str | None = None
    ship_to_state: str | None = None
    ship_to_zip: str | None = None
    bill_to_name: str | None = None
    bill_to_address: str | None = None
    bill_to_city: str | None = None
    bill_to_state: str | None = None
    bill_to_zip: str | None = None
    source_path: str | None = None
    ocr_markdown: str | None = None
    status: str = "needs_review"
    issues: list[str] = Field(default_factory=list)
    lines: list[PurchaseOrderLine] = Field(default_factory=list)
    gold_json: dict | None = None

    def collect_issues(self) -> list[str]:
        issues: list[str] = []
        if not (self.customer_po or "").strip():
            issues.append("Missing order number")
        if not (
            (self.ship_to_name or "").strip()
            or (self.ship_to_address or "").strip()
            or (self.ship_to_city or "").strip()
        ):
            issues.append("Deliver To is empty")
        if not self.lines:
            issues.append("No product lines")
        for index, line in enumerate(self.lines, start=1):
            if not (line.description or "").strip():
                issues.append(f"Line {index} missing Description")
            if line.quantity is None or line.quantity <= 0:
                issues.append(f"Line {index} missing Quantity")
            if line.product_id is None and (line.description or "").strip():
                issues.append(f"No name match for: {line.description}")
        return issues

    def apply_issues(self) -> None:
        self.issues = self.collect_issues()
        self.status = "ready" if not self.issues else "needs_review"
