import Link from "next/link";
import { RANGES, GRAINS, PLAN_START, customRange, parseCustom, windowFor } from "../lib/derive";

const DAY = 86_400_000;
const ymd = (t) => new Date(t).toISOString().slice(0, 10);

// The range and grain live in the URL, not in state, so a view can be
// linked to Gonz as it is and the page stays a server component: nothing
// but the numbers travels to the browser. A custom range comes in from the
// date form as from/to and is folded into the same range param.
export function readControls(sp = {}) {
  const custom = customRange(sp.from, sp.to) ?? (parseCustom(sp.range) ? sp.range : null);
  const range = custom ?? (RANGES.some((r) => r.key === sp.range) ? sp.range : "4w");
  const w = windowFor(range);
  const short = range === "7d" || (custom && w.to - w.from <= 14 * DAY);
  const grain = GRAINS.some((g) => g.key === sp.grain) ? sp.grain : short ? "day" : "week";
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

// Plain GET form, so it works without any client JavaScript: submitting it
// reloads the page with from and to in the URL. The grain is left out so
// a short custom range picks days on its own.
function DateRange({ path, keep, range }) {
  const w = windowFor(range);
  const on = !!parseCustom(range);
  const today = ymd(Date.now());
  const field = "rounded-full border border-hair bg-transparent px-3 py-1 text-[13px] text-ink";
  return (
    <form action={path} className="flex flex-wrap items-center justify-end gap-2">
      {Object.entries(keep)
        .filter(([k, v]) => k !== "range" && k !== "grain" && v != null)
        .map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <span className={`text-[13px] ${on ? "text-ink" : "text-muted"}`}>Custom</span>
      <input type="date" name="from" defaultValue={ymd(w.from)} min={PLAN_START} max={today} className={field} aria-label="From" />
      <span className="text-[13px] text-muted">to</span>
      <input type="date" name="to" defaultValue={ymd(w.to - DAY)} min={PLAN_START} max={today} className={field} aria-label="To" />
      <button
        type="submit"
        className={`btn rounded-full border px-4 py-1.5 text-[13px] ${
          on ? "border-strong bg-surface text-ink" : "border-hair bg-transparent text-muted hover:text-ink"
        }`}
      >
        Apply
      </button>
    </form>
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
      <DateRange path={path} keep={keep} range={range} />
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
