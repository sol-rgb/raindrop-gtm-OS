"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Mark from "./Mark";
import Icon from "./Icon";

// One word each, the same rule as Raindrop OS. If a section needs two, the
// section is doing too much.
const LINKS = [
  { href: "/", icon: "pipeline", label: "Pipeline" },
  { href: "/signals", icon: "signals", label: "Signals" },
  { href: "/email", icon: "email", label: "Email" },
  { href: "/linkedin", icon: "linkedin", label: "LinkedIn" },
  { href: "/replies", icon: "replies", label: "Replies" },
  { href: "/comms", icon: "comms", label: "Comms" },
];

const SYSTEM_LINKS = [{ href: "/system", icon: "system", label: "System" }];

const isActive = (href, path) => (href === "/" ? path === "/" : path.startsWith(href));

export default function Rail() {
  const path = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[var(--rail-w)] flex-col border-r border-hair bg-rail py-4 md:flex">
        <div className="mb-7 flex items-center px-[10px]">
          <Link href="/" aria-label="Raindrop" className="flex h-9 w-9 shrink-0 items-center justify-center">
            <Mark size={18} className="text-ink" />
          </Link>
          <span className="ml-1 text-[15px] font-medium tracking-tight text-ink">raindrop</span>
          <span className="badge ml-2">gtm</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-[10px]">
          {LINKS.map((l) => (
            <RailLink key={l.href} {...l} on={isActive(l.href, path)} />
          ))}
        </nav>

        <div className="flex flex-col gap-1 px-[10px]">
          {SYSTEM_LINKS.map((l) => (
            <RailLink key={l.href} {...l} on={isActive(l.href, path)} dot />
          ))}
        </div>
      </aside>

      <div
        className="fixed inset-x-0 top-0 z-50 flex h-[52px] items-center gap-1 border-b border-hair px-3 backdrop-blur md:hidden"
        style={{ background: "#fcfbf9ed" }}
      >
        <Link href="/" aria-label="Raindrop" className="shrink-0 px-2">
          <Mark size={17} className="text-ink" />
        </Link>
        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {[...LINKS, ...SYSTEM_LINKS].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap px-2.5 py-1.5 text-[13px] transition-colors ${
                isActive(l.href, path) ? "text-ink" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

function RailLink({ href, icon, label, on, dot }) {
  return (
    <Link
      href={href}
      className={`flex h-9 items-center rounded-md transition-[background-color,color,box-shadow] duration-100 ${
        on
          ? "bg-surface-2 text-ink"
          : "text-faint hover:bg-surface-2 hover:text-ink hover:shadow-[var(--shadow-rest)]"
      }`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <Icon name={icon} />
        {dot ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "#4b7d88" }} />
        ) : null}
      </span>
      <span className="whitespace-nowrap text-[13px]">{label}</span>
    </Link>
  );
}
