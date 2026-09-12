"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Home" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/product-mappings", label: "Name matches" },
  { href: "/stock", label: "Stock" },
  { href: "/shipments", label: "Incoming containers" },
  { href: "/packing-lists", label: "Packing lists" },
  { href: "/contador", label: "Warehouse check" },
];

function current(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 border-b border-zinc-200 bg-white px-6 py-3 text-sm">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            current(pathname, item.href) ? "nav-current" : "hover:underline"
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
