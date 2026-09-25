import Link from "next/link";

export function Shell({ children, className = "" }) {
  return (
    <div className={`mx-auto max-w-shell px-6 sm:px-10 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Prose that is not on the page until you ask for it.
 *
 * Almost every heading in this app used to carry a paragraph under it saying
 * how the thing below was counted. All of it was true and almost none of it
 * was being read, because by the third visit you already know. So the
 * heading keeps a dashed underline and the paragraph comes out on hover.
 *
 * No hooks: this renders from server components, and it sits inside buttons
 * (the disclosure rows), where a second focusable element would be wrong.
 * The parent is already focusable, so keyboard users get it on focus through
 * the group-focus-within rule rather than a tabstop of its own.
 */
export function Note({ children, text, align = "left", className = "", width = 320 }) {
  if (!text) return children;

  return (
    <span className={`group/note note-anchor inline-block ${className}`}>
      <span className="has-note">{children}</span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-50 mt-2 hidden max-w-[80vw] whitespace-normal border border-strong p-3.5 text-left font-sans text-[12px] font-normal leading-relaxed tracking-normal text-text group-hover/note:block group-focus-within/note:block ${
          align === "right" ? "right-0" : "left-0"
        }`}
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-hover)", width }}
      >
        {text}
      </span>
    </span>
  );
}

// An AlphaLyrae headline in sentence case with a full stop.
//
// `sub` is no longer a paragraph. A page opens with its name and its numbers,
// and the sentence explaining what the page is for hangs off the title on
// hover, where it is available the once you need it and invisible the
// hundred times you do not.
export function PageHead({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 pb-12 pt-16">
      <div className="min-w-0 flex-1">
        <h1 className="display text-[34px] text-ink sm:text-[42px]">
          <Note text={sub}>{title}</Note>
        </h1>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

// Tones are inline rather than utility classes.
//
// The .badge rule in globals.css sets its own border and colour, and it is
// plain CSS rather than a Tailwind layer, so it won the cascade against
// text-bad and border-bad and every toned badge in the app rendered grey.
// "At risk" in the same grey as "answered" is worse than no colour at all,
// because it reads as a label rather than a warning. Inline wins outright
// and cannot quietly stop working again.
const TONES = {
  default: null,
  accent: { fg: "#4b7d88", bg: "#eef4f5", edge: "#4b7d8855" },
  good: { fg: "#40643f", bg: "#eef3ee", edge: "#4f7a5455" },
  warn: { fg: "#7d5c22", bg: "#f7f1e5", edge: "#96702c55" },
  bad: { fg: "#8c4034", bg: "#f8edeb", edge: "#9e4b3d55" },
};

export function Badge({ children, tone = "default" }) {
  const t = TONES[tone];
  return (
    <span
      className="badge"
      style={
        t
          ? { color: t.fg, background: t.bg, borderColor: t.edge }
          : undefined
      }
    >
      {children}
    </span>
  );
}

// The grid block, built from shared hairlines so the whole section reads as
// one object rather than a row of separate boxes.
export function Grid({ cols = 2, children, className = "" }) {
  return (
    <div
      className={`grid border-l border-t border-hair bg-surface ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function Cell({ children, className = "" }) {
  return (
    <div className={`border-b border-r border-hair p-6 ${className}`}>
      {children}
    </div>
  );
}

// Their product stacks these label first, number second, with a chart under
// it (see the Overview card on the Raindrop dashboard). The bar is the same
// idea at hairline scale: it gives the number a shape without inventing a
// trend line we do not have data for.
const STAT_TONES = {
  ink: { text: "text-ink", bar: "#18211f" },
  accent: { text: "text-accent", bar: "#4b7d88" },
  warn: { text: "text-warn", bar: "#96702c" },
  bad: { text: "text-bad", bar: "#9e4b3d" },
};

export function Stat({ label, value, unit, note, bar, tone = "ink" }) {
  const t = STAT_TONES[tone] ?? STAT_TONES.ink;

  return (
    <div>
      <div className="text-[16px] leading-tight text-ink">
        {label}
      </div>

      <div className="mt-6 flex items-end gap-1.5">
        <span className={`display text-[30px] leading-none ${t.text}`}>
          {value}
        </span>
        {unit ? (
          <span className="pb-1 text-[14px] text-muted">{unit}</span>
        ) : null}
      </div>

      {bar != null ? (
        <div className="mt-5 h-[3px] w-full bg-surface-2">
          <div
            className="h-full"
            style={{
              width: `${Math.max(2, Math.min(100, bar * 100))}%`,
              background: t.bar,
            }}
          />
        </div>
      ) : null}

      {note ? (
        <div className="mt-3 font-mono text-[11px] text-faint">{note}</div>
      ) : null}
    </div>
  );
}

export function MonoLink({ href, children, external }) {
  const arrow = external ? "↗" : "⟶";
  if (!href) {
    return (
      <span className="mono-link cursor-default text-faint">
        {children} {arrow}
      </span>
    );
  }
  return (
    <Link href={href} className="mono-link text-muted">
      {children} {arrow}
    </Link>
  );
}

// A subsection, drawn as a card.
//
// Pages here run four or five subsections deep, and they were separated by
// nothing but vertical space and a heading, so on a long page it was not
// obvious where the sources on a search ended and the live candidates began.
// A hairline box with a filled header makes each one an object: the title is
// on the fill, the content is inside the box, and the gap between boxes is
// the page rather than more section.
//
// flush drops the body padding, for a row list or a table that should run
// edge to edge under the header.
export function Panel({ title, note, right, children, className = "", flush = false }) {
  return (
    <section className={`border border-hair bg-surface ${className}`}>
      {title ? (
        <div className="flex items-end justify-between gap-4 border-b border-hair bg-head px-6 py-4">
          <h2 className="display text-[20px] text-ink">
            <Note text={note}>{title}</Note>
          </h2>
          {right}
        </div>
      ) : null}
      <div className={flush ? "" : "px-6 py-5"}>{children}</div>
    </section>
  );
}

export function SectionTitle({ children, right, note }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="display text-[22px] text-ink">
        <Note text={note}>{children}</Note>
      </h2>
      {right}
    </div>
  );
}

// Table header styling from their dashboards: small, tracked out, grey.
// Numeric columns centre, and their headers centre with them, so the eye has
// one line to run down instead of two.
const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// The header row of every table in the app.
//
// It used to be 11px mono in --faint, two steps lighter and smaller than the
// data under it, which put the least legible type on the row you read first
// to work out what the other rows mean. Now it is the same size as the cells,
// bold, in ink, on a light fill: the fill is what separates the header from
// the data without a heavy rule, and the weight is what makes it read as a
// label rather than another row.
//
// Every table goes through this component, so this is the only place the
// treatment is defined.
export function Th({ children, align = "left", className = "" }) {
  return (
    <th
      className={`whitespace-nowrap bg-head px-4 py-2.5 text-[13px] font-semibold text-ink ${ALIGN[align]} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className = "" }) {
  return (
    <td
      className={`px-4 py-3.5 align-middle text-[13px] ${ALIGN[align]} ${className}`}
    >
      {children}
    </td>
  );
}

// SeedBanner lived here. It read SEED_MODE, which is derived from a
// server-only environment variable, so inside a client bundle it always read
// "not seed" regardless of the truth. SourceBanner replaced it on every page
// that shows candidates, and it reads the resolved pipeline instead.

export function Empty({ children }) {
  return (
    <div className="px-4 py-10 text-center text-[13px] text-faint">
      {children}
    </div>
  );
}
