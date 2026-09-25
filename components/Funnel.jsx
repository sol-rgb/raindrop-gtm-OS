import { Note } from "./UI";
import { STAGES, pct, fmt, rate } from "../lib/derive";

// The funnel as a strip of cells, one per stage, each with the share of the
// stage before it. Widths proportional to volume would make every stage
// after "contacted" a sliver, since 2% reply is the healthy number. So the
// bar under each stage is the pass-through from the previous one, which is
// the number that tells you where the leak is.
//
// Benchmarks from the plan: 2 to 3% reply on email, 20% of replies
// positive, 60 to 80% of positives to a meeting.
const BENCH = {
  replied: 0.02,
  positive: 0.2,
  booked: 0.6,
  held: 0.7,
  qualified: 0.5,
};

export default function Funnel({ f, extra }) {
  const cells = STAGES.map((s, i) => {
    const prev = i ? f[STAGES[i - 1].key] : null;
    // Above 100% means the stage before it is not being counted yet (leads
    // entered before the Clay column is live), not a real conversion.
    const raw = i ? rate(f[s.key], prev) : null;
    const over = raw != null && raw > 1;
    const through = over ? null : raw;
    const bench = BENCH[s.key];
    const low = through != null && bench != null && through < bench * 0.75;
    return { ...s, value: f[s.key], through, bench, low, over, first: i === 0, empty: i > 0 && !prev };
  });

  return (
    <div
      className="grid grid-cols-2 border-l border-t border-hair bg-surface sm:grid-cols-4"
    >
      {cells.map((c) => (
        <div key={c.key} className="border-b border-r border-hair p-5">
          <div className="text-[14px] leading-tight text-ink">
            <Note text={c.how} width={260}>{c.label}</Note>
          </div>
          <div className={`display mt-5 text-[28px] leading-none ${c.low ? "text-warn" : "text-ink"}`}>
            {fmt(c.value)}
          </div>
          <div className="mt-4 h-[3px] w-full bg-surface-2">
            {c.through != null ? (
              <div
                className="h-full"
                style={{
                  width: `${Math.max(2, Math.min(100, c.through * 100))}%`,
                  background: c.low ? "#96702c" : "#18211f",
                }}
              />
            ) : null}
          </div>
          <div className="mt-2.5 font-mono text-[11px] text-faint">
            {c.first
              ? "top of funnel"
              : c.over
                ? "previous stage not counted yet"
                : c.empty
                  ? "nothing in the stage before"
                  : `${pct(c.through, c.through < 0.1 ? 1 : 0)} of previous`}
            {c.bench != null ? <span className="block">plan {pct(c.bench)}</span> : null}
          </div>
        </div>
      ))}
      {extra}
    </div>
  );
}
