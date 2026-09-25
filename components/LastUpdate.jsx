import { dataset } from "../lib/model";

// Top right, every page: when the numbers were last true.
export default async function LastUpdate() {
  const ds = await dataset();
  const t = ds.sync?.lastRun?.finishedAt;
  const label = ds.seed
    ? "seed data"
    : t
      ? `synced ${new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })} PT`
      : "not synced yet";
  return (
    <span className="pointer-events-auto flex items-center gap-2 border border-hair bg-surface px-3 py-1.5 font-mono text-[11px] text-muted">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: ds.seed ? "#96702c" : "#4f7a54" }}
        aria-hidden
      />
      {label}
    </span>
  );
}
