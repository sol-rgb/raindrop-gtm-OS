"use client";

import { useState } from "react";

// A number on its own invites the question "how is that counted?". Rather
// than answering it in a paragraph nobody reads, the answer sits under the
// number and comes out on hover.
export default function Tip({ children, text, align = "left" }) {
  const [on, setOn] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
    >
      <span
        tabIndex={0}
        onFocus={() => setOn(true)}
        onBlur={() => setOn(false)}
        className="cursor-help border-b border-dashed border-[#00000026] outline-none focus-visible:border-accent"
      >
        {children}
      </span>

      {on ? (
        <span
          role="tooltip"
          className={`absolute bottom-full z-50 mb-2.5 block w-[248px] border border-strong p-3.5 text-[12px] leading-relaxed text-text ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{ background: "#ffffff" }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
