"use client";

import { useEffect } from "react";

// Show six rows, then scroll.
//
// The first attempt at this was a max-height in CSS, and a fixed height
// cannot express "six rows" when a row in one list is 52px and a row in
// another is 143px. The pipeline strip fits four searches and got a
// scrollbar after two and a half of them. So the height is measured from
// the rows themselves: find the sixth, take its bottom edge, and cap the
// box there. Fewer than six rows and the box is left alone entirely.
//
// Mounted once in the layout rather than wrapped around each list, so it
// covers every table on the site including the ones nobody has written yet.
// Anything marked .rows or .scroll-box is in scope; .rows-open opts out,
// for the lists whose rows open a hover note that would be clipped.

const MIN_ROWS = 6;
const SELECTOR = "div.rows:not(.rows-open), .scroll-box";

export default function RowScroll({ minRows = MIN_ROWS }) {
  useEffect(() => {
    // A table's rows live in the tbody, and the thead above them is part of
    // what the box has to be tall enough to hold. Measuring from the
    // container covers it, because offsetTop is relative to the container.
    const rowsOf = (el) => {
      const body = el.querySelector("tbody");
      return [...(body ? body.children : el.children)];
    };

    const fit = (el) => {
      const rows = rowsOf(el);

      if (rows.length <= minRows) {
        if (el.style.maxHeight) {
          el.style.maxHeight = "";
          el.style.overflowY = "";
        }
        return;
      }

      const last = rows[minRows - 1];
      const height = last.offsetTop + last.offsetHeight;
      // Nothing has been laid out yet. Leave it; a later pass will catch it.
      if (!height) return;

      const next = `${Math.ceil(height)}px`;
      // Only write when the value actually changes, or the resize observer
      // below reacts to its own effect forever.
      if (el.style.maxHeight === next) return;
      el.style.maxHeight = next;
      el.style.overflowY = "auto";
      el.style.overscrollBehavior = "contain";
    };

    let queued = false;
    const fitAll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        document.querySelectorAll(SELECTOR).forEach(fit);
      });
    };

    fitAll();

    // Rows reflow when the window changes width, because a long headline
    // wraps to two lines and every row below it moves.
    const ro = new ResizeObserver(fitAll);
    ro.observe(document.body);

    // Panels open, filters change, queues re-render. New rows need measuring
    // and removed ones need the cap recomputed.
    const mo = new MutationObserver(fitAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [minRows]);

  return null;
}
