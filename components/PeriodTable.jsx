import { Th, Td } from "./UI";

// The same numbers as the charts above it, as a table: for anyone who
// cannot tell the bars apart, and for anyone pasting a week into the
// Monday update.
export default function PeriodTable({ rows, cols }) {
  return (
    <div className="scroll-box overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse">
        <thead>
          <tr className="border-b border-hair">
            <Th>Period</Th>
            {cols.map((c) => (
              <Th key={c.label} align="center">{c.label}</Th>
            ))}
          </tr>
        </thead>
        <tbody className="rows">
          {[...rows].reverse().map((r) => (
            <tr key={r.from} className="border-b border-hair">
              <Td className="text-ink">
                {r.label}
                {r.sub ? <span className="ml-2 text-[11px] text-faint">{r.sub}</span> : null}
              </Td>
              {cols.map((c) => (
                <Td key={c.label} align="center" className="text-text">{c.value(r)}</Td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
