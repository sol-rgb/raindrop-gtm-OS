import { Shell } from "../components/UI";

// Shown the instant a navigation starts, so a click never looks ignored while
// the next page streams in.
export default function Loading() {
  return (
    <Shell>
      <div className="pb-32 pt-16">
        <div className="h-[42px] w-[210px] animate-pulse bg-surface-2" />
        <div className="mt-12 grid gap-px border-l border-t border-hair sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-b border-r border-hair p-7">
              <div className="h-[46px] w-[64px] animate-pulse bg-surface-2" />
              <div className="mt-4 h-[13px] w-[96px] animate-pulse bg-surface-2" />
            </div>
          ))}
        </div>
        <div className="mt-20 space-y-px border-t border-hair">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-hair py-6">
              <div className="h-[16px] w-[180px] animate-pulse bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
