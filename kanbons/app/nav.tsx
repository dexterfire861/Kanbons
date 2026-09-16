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
    <header className="hero">
      <div className="hero-brand">
        <img src="/kanbons-logo.svg" alt="Kanbons" className="hero-logo" />
        <span className="hero-name">Kanbons</span>
      </div>
      <nav>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={current(pathname, item.href) ? "nav-current" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
