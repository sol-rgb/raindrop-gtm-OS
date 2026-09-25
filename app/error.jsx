"use client";

import { Shell, PageHead, Badge } from "../components/UI";

// The catch-all. A page that renders nothing reads exactly like a page that
// is still loading, and both read as "the tool is broken". Say what happened.
export default function GlobalError({ error, reset }) {
  return (
    <Shell>
      <PageHead title="Something broke." />
      <div className="border border-hair bg-surface p-6">
        <Badge tone="bad">Error</Badge>
        <p className="mt-4 text-[14px] leading-relaxed text-text">
          This page did not render. Nothing was written and nothing was sent, so
          there is nothing to undo.
        </p>
        {error?.message ? (
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">
            {error.message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            onClick={reset}
            className="border border-strong px-4 py-2 text-[13px] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Try again
          </button>
          <a href="/system" className="mono-link text-muted">
            what is connected {"⟶"}
          </a>
        </div>
      </div>
    </Shell>
  );
}
