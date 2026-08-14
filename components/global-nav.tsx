"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/", label: "Home" },
  { href: "/memories", label: "Memories" },
  { href: "/circles", label: "Circles" },
  { href: "/schedule", label: "Schedule" },
  { href: "/conversations", label: "Conversations" }
];

export default function GlobalNav() {
  const pathname = usePathname();
  return (
    <nav className="globalNav" aria-label="Primary navigation">
      {destinations.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} className={active ? "active" : ""}>{label}</Link>;
      })}
    </nav>
  );
}
