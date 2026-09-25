// Columns drawn in HTML rather than SVG, so the type stays at its real size
// at every width and the hover note is a plain element with the app's own
// tooltip styling.
//
// One measure per chart and one axis per chart, always. "Meetings as bars
// with sends as a line" is two measures on two scales, and a second axis
// makes whichever is drawn smaller look like it is failing. So the page
// stacks small charts on one shared time axis instead, and the eye reads
// down a column to compare weeks.

const INK = "#18211f";

function niceMax(v) {
  // Never below 2, so the half-way gridline is a whole number and an empty
  // chart does not label both lines "1".
  if (v <= 2) return 2;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

const show = (v, format) => (format ? format(v) : Math.round(v ?? 0).toLocaleString("en-US"));

export function Columns({
  title,
  total,
  data,
  color = INK,
  goal,
  goalLabel,
  format,
  height = 120,
  note,
}) {
  const top = niceMax(Math.max(goal ?? 0, ...data.map((d) => d.value ?? 0)));
  const dense = data.length > 16;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium text-ink">{title}</span>
        {total != null ? <span className="display text-[20px] leading-none text-ink">{total}</span> : null}
      </div>
      {note ? <div className="mt-1 font-mono text-[11px] text-faint">{note}</div> : null}

      <div className="relative mt-4" style={{ height }}>
        {/* Recessive gridlines at half and full, labelled at the right. */}
        {[0.5, 1].map((f) => (
          <div
            key={f}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-hair"
            style={{ bottom: `${f * 100}%` }}
          >
            <span className="absolute -top-2 right-0 font-mono text-[10px] leading-none text-faint">
              {show(top * f, format)}
            </span>
          </div>
        ))}

        {goal != null ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-accent"
            style={{ bottom: `${(goal / top) * 100}%` }}
          >
            <span className="absolute -top-[18px] left-0 bg-surface pr-1 font-mono text-[10px] text-accent">
              {goalLabel ?? `goal ${show(goal, format)}`}
            </span>
          </div>
        ) : null}

        <div className="absolute inset-y-0 left-0 right-9 flex items-end border-b border-strong" style={{ gap: dense ? 2 : 6 }}>
          {data.map((d, i) => {
            const h = d.value ? Math.max(1.5, (d.value / top) * 100) : 0;
            return (
              <div key={i} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                {/* The hit target is the whole column, not the bar. */}
                <div
                  className="w-full max-w-[36px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                  style={{ height: `${h}%`, background: color }}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-strong bg-surface px-2.5 py-1.5 text-[12px] text-text group-hover:block"
                  style={{ boxShadow: "var(--shadow-hover)" }}
                >
                  <span className="text-ink">{show(d.value, format)}</span>
                  <span className="ml-1.5 text-faint">{d.sub ? `${d.label}, ${d.sub}` : d.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mr-9 mt-1.5 flex" style={{ gap: dense ? 2 : 6 }}>
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] text-faint">
            {dense && i % Math.ceil(data.length / 8) ? "" : d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Two series side by side per bucket: email and LinkedIn. Legend always, and
// the colours are the two validated channel colours, never reused.
export function Paired({ title, data, series, format, height = 120 }) {
  const top = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] ?? 0))));
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium text-ink">{title}</span>
        <span className="flex gap-4">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[12px] text-muted">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
      </div>

      <div className="relative mt-4" style={{ height }}>
        {[0.5, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-hair" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 right-0 font-mono text-[10px] leading-none text-faint">{show(top * f, format)}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 left-0 right-9 flex items-end gap-3 border-b border-strong">
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]">
              {series.map((s) => (
                <div
                  key={s.key}
                  className="w-full max-w-[18px] rounded-t-[4px] group-hover:opacity-80"
                  style={{ height: `${d[s.key] ? Math.max(1.5, (d[s.key] / top) * 100) : 0}%`, background: s.color }}
                />
              ))}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-strong bg-surface px-2.5 py-1.5 text-[12px] text-text group-hover:block"
                style={{ boxShadow: "var(--shadow-hover)" }}
              >
                <span className="block text-faint">{d.sub ? `${d.label}, ${d.sub}` : d.label}</span>
                {series.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                    {s.label} <span className="text-ink">{show(d[s.key], format)}</span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mr-9 mt-1.5 flex gap-3">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] text-faint">
            {data.length > 16 && i % Math.ceil(data.length / 8) ? "" : d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// A distribution as horizontal hairline bars. Used for response-time bands.
export function Bands({ rows, color = INK, format }) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[110px_1fr_48px] items-center gap-3">
          <span className="text-[13px] text-text">{r.label}</span>
          <div className="h-[6px] w-full bg-surface-2">
            <div className="h-full rounded-r-[3px]" style={{ width: `${(r.value / top) * 100}%`, background: r.tone ?? color }} />
          </div>
          <span className="text-right font-mono text-[12px] text-ink">{show(r.value, format)}</span>
        </div>
      ))}
    </div>
  );
}
