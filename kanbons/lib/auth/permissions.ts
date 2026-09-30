export type AppRole = "admin" | "staff";

export type Permission = "warehouse.use" | "stock.override";

const permissions: Record<AppRole, readonly Permission[]> = {
  staff: ["warehouse.use"],
  admin: ["warehouse.use", "stock.override"],
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return value === "admin" || value === "staff";
}

export function roleAllows(
  role: AppRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return permissions[role].includes(permission);
}
