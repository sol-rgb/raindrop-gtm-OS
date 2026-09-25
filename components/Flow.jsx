import { fmt, pct } from "../lib/derive";
import { Note } from "./UI";

// What happens after a reply, the part of Gonz's prototype drawn as a
// Sankey. Here each step is one hairline row: the bar is everyone who
// reached the step, the dark part went on, the light part stopped, and both
// halves are named for what they mean. Same numbers as the funnel above,
// read as where people fall out rather than how many are left.
export default function Flow({ steps }) {
  return (
    <div className="rows">
      {steps.map((s) => (
        <div key={s.to} className="grid gap-3 py-4 md:grid-cols-[170px_1fr] md:items-center">
          <div>
            <Note width={200} text={s.rate != null ? `${pct(s.rate)} of ${fmt(s.total)} moved on.` : "Nothing to count yet."}>
              <span className="h-row">{s.keptLabel}</span>
            </Note>
          </div>
          <div>
            <div className="flex h-[22px] w-full overflow-hidden bg-surface-2">
              {s.total ? (
                <>
                  <div
                    className="flex h-full items-center justify-end pr-2 font-mono text-[11px] text-bg"
                    style={{ width: `${(s.kept / s.total) * 100}%`, background: "#18211f", minWidth: s.kept ? 26 : 0 }}
                  >
                    {s.kept ? fmt(s.kept) : ""}
                  </div>
                  <div className="flex h-full flex-1 items-center pl-2 font-mono text-[11px] text-muted">
                    {s.dropped ? fmt(s.dropped) : ""}
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px]">
              <span className="text-text">{s.keptLabel}</span>
              <span className="text-faint">{s.droppedLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
