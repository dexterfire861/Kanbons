export type StockOnHand = { productId: number; quantity: number };

export function stockOnHand(
  stock: StockOnHand[],
  productId: number | null | undefined
): number {
  if (productId == null) return 0;
  return stock.find((row) => row.productId === productId)?.quantity ?? 0;
}

export function lineFitsStock(
  stock: StockOnHand[],
  productId: number | null | undefined,
  quantity: number | null | undefined
): { ok: boolean; have: number } {
  const have = stockOnHand(stock, productId);
  if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
    return { ok: true, have };
  }
  return { ok: quantity <= have, have };
}
