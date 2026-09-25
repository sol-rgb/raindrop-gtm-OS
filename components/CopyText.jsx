"use client";

import { useState } from "react";

// The update as it will be pasted, and one button to copy it. Plain text,
// with blank lines between paragraphs, which is what Slack and email both
// keep as written.
export default function CopyText({ text }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and some embedded views: select the text instead.
      const el = document.getElementById("comms-text");
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  return (
    <div>
      <div className="flex justify-end border-b border-hair bg-head px-6 py-3">
        <button
          type="button"
          onClick={copy}
          className={`btn border px-4 py-1.5 text-[13px] ${done ? "border-accent bg-accent-soft text-accent" : "border-strong bg-surface text-ink"}`}
        >
          {done ? "Copied" : "Copy update"}
        </button>
      </div>
      <div id="comms-text" className="whitespace-pre-wrap px-6 py-6 text-[15px] leading-[1.7] text-ink">
        {text}
      </div>
    </div>
  );
}
