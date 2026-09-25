import Link from "next/link";
import { RANGES, GRAINS } from "../lib/derive";

// The range and grain live in the URL, not in state, so a view can be
// linked to Gonz as it is and the page stays a server component: nothing
// but the numbers travels to the browser.
export function readControls(sp = {}) {
  const range = RANGES.some((r) => r.key === sp.range) ? sp.range : "4w";
  const grain = GRAINS.some((g) => g.key === sp.grain) ? sp.grain : range === "7d" ? "day" : "week";
  return { range, grain };
}

function href(path, sp, patch) {
  const q = new URLSearchParams({ ...sp, ...patch });
  return `${path}?${q}`;
}

export function Tab({ on, href: to, children }) {
  return (
    <Link
      href={to}
      scroll={false}
      // Fully prefetched: the data is cached, so rendering every filter
      // view ahead of the click is cheap, and the click is then instant.
      prefetch={true}
      className={`btn rounded-full border px-4 py-1.5 text-[13px] ${
        on ? "border-strong bg-surface text-ink" : "border-hair bg-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Controls({ path, sp, range, grain, extra, showGrain = true }) {
  const keep = { range, grain, ...(extra ?? {}) };
  return (
    <div className="flex flex-col items-end gap-2.5">
      <div className="flex flex-wrap justify-end gap-2">
        {RANGES.map((r) => (
          <Tab key={r.key} on={range === r.key} href={href(path, keep, { range: r.key })}>
            {r.label}
          </Tab>
        ))}
      </div>
      {showGrain ? (
        <div className="flex flex-wrap justify-end gap-2">
          {GRAINS.map((g) => (
            <Tab key={g.key} on={grain === g.key} href={href(path, keep, { grain: g.key })}>
              {g.label}
            </Tab>
          ))}
        </div>
      ) : null}
    </div>
  );
}
