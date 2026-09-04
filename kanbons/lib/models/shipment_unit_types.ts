export const SHIPMENT_UNIT_TYPES = [
  "yards",
  "pieces",
  "sets",
  "boxes",
  "bundles",
] as const;

export type ShipmentUnitType = (typeof SHIPMENT_UNIT_TYPES)[number];
