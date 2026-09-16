import type { MatchProduct } from "./products";

export type { MatchProduct };

export function packsFor(
  quantity: number | null | undefined,
  unitPack: number | null | undefined
): number | null {
  if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }
  if (unitPack == null || !Number.isFinite(unitPack) || unitPack <= 0) {
    return null;
  }
  return Math.ceil(quantity / unitPack);
}

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

function customerPart(slip: Pick<PackingSlip, "customerCode" | "customerName">): string {
  return slip.customerCode?.trim() || slip.customerName?.trim() || "";
}

function alreadyPrefixed(po: string, prefix: string): boolean {
  const upperPo = po.toUpperCase();
  const upperPrefix = prefix.toUpperCase();
  return upperPo === upperPrefix || upperPo.startsWith(`${upperPrefix}-`);
}

export function listNumber(
  slip: Pick<PackingSlip, "customerCode" | "customerName" | "customerPo" | "numPl">
): string {
  const part = customerPart(slip);
  const po = slip.customerPo?.trim() ?? "";
  if (part && po) {
    return alreadyPrefixed(po, part) ? po : `${part}-${po}`;
  }
  if (po) return po;
  if (part) return part;
  return String(slip.numPl);
}

export function invoiceNumber(
  slip: Pick<PackingSlip, "customerCode" | "customerName" | "customerPo" | "numPl">,
  split?: number
): string {
  const po = slip.customerPo?.trim();
  if (!po) return "";
  const part = customerPart(slip);
  if (!part) return "";
  const list = alreadyPrefixed(po, part) ? po : `${part}-${po}`;
  const base = `INV-${list}`;
  if (split != null && split >= 2) return `${base}-${split}`;
  return base;
}

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

function tokenKey(value: string | null | undefined): string | null {
  const parts = [
    ...new Set((value ?? "").toUpperCase().match(/[A-Z0-9]+/g) ?? []),
  ];
  if (parts.length < 2) return null;
  return parts.sort().join(" ");
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

function uniqueTokenHit(
  raw: string,
  products: MatchProduct[],
  mappings: MatchMapping[]
): number | null {
  const want = tokenKey(raw);
  if (!want) return null;
  const hits = new Set<number>();
  for (const mapping of mappings) {
    if (mapping.product_id == null) continue;
    if (
      tokenKey(mapping.client_name) === want ||
      tokenKey(mapping.kanbons_name) === want
    ) {
      hits.add(mapping.product_id);
    }
  }
  for (const product of products) {
    if (tokenKey(product.product) === want) hits.add(product.id);
  }
  return hits.size === 1 ? [...hits][0] : null;
}

function fuzzyProductId(
  raw: string | null | undefined,
  products: MatchProduct[],
  mappings: MatchMapping[],
  woodhaven: boolean
): number | null {
  const needle = norm(raw);
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
  const byTokens = uniqueTokenHit(raw ?? "", products, catalog);
  if (byTokens != null) return byTokens;
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
    const hit = fuzzyProductId(needle, products, mappings, woodhaven);
    if (hit != null) return hit;
  }
  return null;
}

export type ProposedNameMatch = {
  client_name: string;
  kanbons_name: string | null;
  item_code: string | null;
  product_id: number;
  company: string | null;
};

function hasExactWording(wording: string, catalog: MatchMapping[]): boolean {
  const needle = norm(wording);
  if (!needle) return true;
  return catalog.some(
    (mapping) =>
      mapping.product_id != null &&
      (norm(mapping.client_name) === needle || norm(mapping.item_code) === needle)
  );
}

export function proposeNameMatches(input: {
  lines: PurchaseOrderLine[];
  ocrLines?: { asWritten: string; itemCode?: string | null }[] | null;
  products: MatchProduct[];
  mappings: MatchMapping[];
  woodhaven?: boolean;
}): ProposedNameMatch[] {
  const woodhaven = input.woodhaven ?? false;
  const catalog = mappingsForCatalog(input.mappings, woodhaven);
  const company = woodhaven ? "Woodhaven" : null;
  const byId = new Map(input.products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  const out: ProposedNameMatch[] = [];

  function add(
    wording: string,
    itemCode: string | null | undefined,
    productId: number
  ) {
    const name = wording.trim();
    if (!name) return;
    if (hasExactWording(name, catalog)) return;
    const key = `${norm(name)}|${productId}|${company ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const product = byId.get(productId);
    out.push({
      client_name: name,
      kanbons_name: product?.product ?? null,
      item_code: itemCode?.trim() || null,
      product_id: productId,
      company,
    });
  }

  for (let index = 0; index < input.lines.length; index++) {
    const line = input.lines[index];
    const productId = resolveProductId(
      line,
      input.products,
      input.mappings,
      woodhaven
    );
    if (productId == null) continue;
    add(line.asWritten, line.itemCode, productId);
    const ocrName = input.ocrLines?.[index]?.asWritten ?? "";
    if (ocrName.trim() && ocrName.trim() !== line.asWritten.trim()) {
      add(ocrName, line.itemCode, productId);
    }
  }
  return out;
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
      unit: line.unit ?? packsFor(line.yardsPieces, product?.unit_pack),
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
