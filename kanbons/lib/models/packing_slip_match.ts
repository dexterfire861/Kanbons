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
  yardsPieces: number | null;
  unit: number | null;
  productId: number | null;
};

export type PurchaseOrder = {
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

export type MatchProduct = {
  id: number;
  num: string;
  product: string;
  pre_uni: number | null;
};

export type MatchMapping = {
  client_name: string;
  kanbons_name: string | null;
  item_code: string | null;
  product_id: number | null;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function asWrittenOptions(mappings: MatchMapping[]): string[] {
  const names = new Set<string>();
  for (const mapping of mappings) {
    if (mapping.product_id == null) continue;
    const name = mapping.client_name.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function fuzzyProductId(
  needle: string,
  products: MatchProduct[],
  mappings: MatchMapping[]
): number | null {
  if (!needle) return null;
  const bySku = products.find((product) => norm(product.num) === needle);
  if (bySku) return bySku.id;
  const byItem = mappings.find((mapping) => norm(mapping.item_code) === needle);
  if (byItem?.product_id) return byItem.product_id;
  const byName = products.find((product) => norm(product.product) === needle);
  if (byName) return byName.id;
  const byClient = mappings.find(
    (mapping) =>
      norm(mapping.client_name) === needle ||
      norm(mapping.kanbons_name) === needle
  );
  if (byClient?.product_id) return byClient.product_id;
  if (needle.length < 4) return null;
  const close = mappings.filter((mapping) => {
    if (mapping.product_id == null) return false;
    const client = norm(mapping.client_name);
    const ours = norm(mapping.kanbons_name);
    return (
      (client.length >= 4 && (client.includes(needle) || needle.includes(client))) ||
      (ours.length >= 4 && (ours.includes(needle) || needle.includes(ours)))
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
  mappings: MatchMapping[]
): number | null {
  if (line.productId != null) return line.productId;
  const fromCode = fuzzyProductId(norm(line.itemCode), products, mappings);
  if (fromCode != null) return fromCode;
  return fuzzyProductId(norm(line.asWritten), products, mappings);
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
}): PackingSlip {
  const byId = new Map(input.products.map((product) => [product.id, product]));
  const lines: PackingSlipLine[] = [];
  for (const line of input.lines) {
    if (!line.asWritten && line.productId == null && line.unit == null) continue;
    const productId = resolveProductId(line, input.products, input.mappings);
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
