import type { MatchProduct } from "./products";

export type { MatchProduct };

export type Address = {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type PurchaseOrderLine = {
  asWritten: string;
  itemCode: string | null;
  altCode?: string | null;
  yardsPieces: number | null;
  unit: number | null;
  productId: number | null;
};

export type PurchaseOrderInput = {
  customerId: number;
  customerPo: string;
  date: string | null;
  shipDate: string | null;
  shipTo: Address;
  billTo: Address;
  lines: PurchaseOrderLine[];
};

export type PackingSlipLine = {
  lineId?: number;
  asWritten: string;
  productId: number | null;
  sku: string | null;
  productName: string | null;
  yardsPieces: number | null;
  unit: number | null;
  preUni: number | null;
  matched: boolean;
};

export type PackingSlip = {
  id?: number;
  numPl: number;
  status: "draft" | "confirmed" | "dispatched";
  customerId: number;
  customerName: string;
  customerCode: string | null;
  customerPo: string;
  date: string | null;
  shipDate: string | null;
  shipTo: Address;
  billTo: Address;
  lines: PackingSlipLine[];
};

export type MatchMapping = {
  client_name: string;
  kanbons_name: string | null;
  item_code: string | null;
  product_id: number | null;
  company: string | null;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isWoodhaven(
  company?: string | null,
  name?: string | null
): boolean {
  if (company === "Woodhaven") return true;
  return (name ?? "").toUpperCase().includes("WOODHAVEN");
}

function mappingsForCatalog(
  mappings: MatchMapping[],
  woodhaven: boolean
): MatchMapping[] {
  if (woodhaven) {
    return mappings.filter((mapping) => mapping.company === "Woodhaven");
  }
  return mappings.filter((mapping) => !mapping.company);
}

export function asWrittenOptions(
  mappings: MatchMapping[],
  woodhaven = false
): string[] {
  const names = new Set<string>();
  for (const mapping of mappingsForCatalog(mappings, woodhaven)) {
    if (mapping.product_id == null) continue;
    const name = mapping.client_name.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function exactMappingId(
  needle: string,
  mappings: MatchMapping[],
  field: "item_code" | "name"
): number | null {
  const hit = mappings.find((mapping) => {
    if (mapping.product_id == null) return false;
    if (field === "item_code") return norm(mapping.item_code) === needle;
    return (
      norm(mapping.client_name) === needle ||
      norm(mapping.kanbons_name) === needle
    );
  });
  return hit?.product_id ?? null;
}

function fuzzyProductId(
  needle: string,
  products: MatchProduct[],
  mappings: MatchMapping[],
  woodhaven: boolean
): number | null {
  if (!needle) return null;
  const catalog = mappingsForCatalog(mappings, woodhaven);
  const byItem = exactMappingId(needle, catalog, "item_code");
  if (byItem != null) return byItem;
  const bySku = products.find((product) => norm(product.num) === needle);
  if (bySku) return bySku.id;
  const byClient = exactMappingId(needle, catalog, "name");
  if (byClient != null) return byClient;
  const byName = products.find((product) => norm(product.product) === needle);
  if (byName) return byName.id;
  if (needle.length < 4) return null;
  const close = catalog.filter((mapping) => {
    if (mapping.product_id == null) return false;
    const client = norm(mapping.client_name);
    const ours = norm(mapping.kanbons_name);
    const code = norm(mapping.item_code);
    return (
      (client.length >= 4 && (client.includes(needle) || needle.includes(client))) ||
      (ours.length >= 4 && (ours.includes(needle) || needle.includes(ours))) ||
      (code.length >= 4 && (code.includes(needle) || needle.includes(code)))
    );
  });
  if (close.length === 1) return close[0].product_id;
  const closeProduct = products.filter((product) => {
    const name = norm(product.product);
    const sku = norm(product.num);
    return (
      (name.length >= 4 && (name.includes(needle) || needle.includes(name))) ||
      (sku.length >= 4 && (sku.includes(needle) || needle.includes(sku)))
    );
  });
  if (closeProduct.length === 1) return closeProduct[0].id;
  return null;
}

export function resolveProductId(
  line: PurchaseOrderLine,
  products: MatchProduct[],
  mappings: MatchMapping[],
  woodhaven = false
): number | null {
  if (line.productId != null) return line.productId;
  for (const needle of [line.itemCode, line.altCode, line.asWritten]) {
    const hit = fuzzyProductId(norm(needle), products, mappings, woodhaven);
    if (hit != null) return hit;
  }
  return null;
}

export function catalogItemCode(
  line: PurchaseOrderLine,
  products: MatchProduct[],
  mappings: MatchMapping[],
  woodhaven = false
): string {
  const existing = (line.itemCode ?? "").trim();
  if (existing) return existing;
  const productId = resolveProductId(line, products, mappings, woodhaven);
  if (productId == null) return "";
  const scoped = mappingsForCatalog(mappings, woodhaven);
  const alt = norm(line.altCode);
  if (alt) {
    const fromAlt = scoped.find(
      (mapping) =>
        mapping.product_id === productId && norm(mapping.item_code) === alt
    );
    if (fromAlt?.item_code?.trim()) return fromAlt.item_code.trim();
  }
  const codes = [
    ...new Set(
      scoped
        .filter((mapping) => mapping.product_id === productId)
        .map((mapping) => (mapping.item_code ?? "").trim())
        .filter(Boolean)
    ),
  ];
  if (codes.length === 1) return codes[0];
  return (products.find((product) => product.id === productId)?.num ?? "").trim();
}

export function packingSlipFromParts(input: {
  numPl: number;
  status?: PackingSlip["status"];
  customerId: number;
  customerName: string;
  customerCode?: string | null;
  customerPo: string;
  date: string | null;
  shipDate: string | null;
  shipTo: Address;
  billTo: Address;
  lines: PurchaseOrderLine[];
  products: MatchProduct[];
  mappings: MatchMapping[];
  company?: string | null;
}): PackingSlip {
  const woodhaven = isWoodhaven(input.company, input.customerName);
  const byId = new Map(input.products.map((product) => [product.id, product]));
  const lines: PackingSlipLine[] = [];
  for (const line of input.lines) {
    if (
      !line.asWritten &&
      line.productId == null &&
      line.unit == null &&
      !line.itemCode
    ) {
      continue;
    }
    const productId = resolveProductId(
      line,
      input.products,
      input.mappings,
      woodhaven
    );
    const product = productId == null ? null : byId.get(productId) ?? null;
    lines.push({
      asWritten: line.asWritten,
      productId,
      sku: product?.num ?? null,
      productName: product?.product ?? null,
      yardsPieces: line.yardsPieces,
      unit: line.unit,
      preUni: product?.pre_uni ?? null,
      matched: productId != null,
    });
  }
  return {
    numPl: input.numPl,
    status: input.status ?? "draft",
    customerId: input.customerId,
    customerName: input.customerName,
    customerCode: input.customerCode ?? null,
    customerPo: input.customerPo,
    date: input.date,
    shipDate: input.shipDate,
    shipTo: input.shipTo,
    billTo: input.billTo,
    lines,
  };
}
