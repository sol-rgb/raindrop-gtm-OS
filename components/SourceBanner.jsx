import Link from "next/link";
import { Shell, Badge } from "./UI";

// What is on the screen, and where it came from. Read from the rows, not
// from an environment variable: a variable describes the build, this
// describes the data.
function ago(ts) {
  if (!ts) return "never";
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(ts)) / 60000));
  if (mins < 1) return "a moment ago";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export default function SourceBanner({ ds }) {
  if (ds.seed) {
    return (
      <Strip tone={ds.error ? "bad" : null}>
        <Badge tone={ds.error ? "bad" : "warn"}>Seed data</Badge>
        <span className="text-muted">
          Every number here is invented. {ds.why}
        </span>
        <Link href="/system" className="mono-link text-muted">
          what is connected {"⟶"}
        </Link>
      </Strip>
    );
  }

  const failing = ds.sync.sources.filter((s) => s.lastErrorAt && (!s.lastOkAt || s.lastErrorAt > s.lastOkAt));
  const last = ds.sync.lastRun?.finishedAt ?? ds.sync.lastRun?.startedAt;
  const stale = last && Date.now() - Date.parse(last) > 3 * 3_600_000;

  if (failing.length || stale) {
    return (
      <Strip>
        <Badge tone="warn">{failing.length ? "Not refreshing" : "Stale"}</Badge>
        <span className="text-muted">
          {failing.length
            ? `${failing.map((s) => s.source).join(", ")} failed on the last run. Showing the last good read.`
            : `Last sync ${ago(last)}.`}
        </span>
        <Link href="/system" className="mono-link text-muted">
          why {"⟶"}
        </Link>
      </Strip>
    );
  }
  return null;
}

function Strip({ children, tone }) {
  return (
    <div className={`border-b border-hair ${tone === "bad" ? "bg-[#f8edeb]" : "bg-head"}`}>
      <Shell>
        <div className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">{children}</div>
      </Shell>
    </div>
  );
}
