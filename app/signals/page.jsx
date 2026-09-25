import Link from "next/link";
import { Shell, PageHead, Panel, Th, Td, Badge, Note } from "../../components/UI";
import Controls, { readControls } from "../../components/Controls";
import SourceBanner from "../../components/SourceBanner";
import { dataset } from "../../lib/model";
import { TIERS, CHANNELS } from "../../lib/data/signals";
import { prepare, windowFor, bySignal, fmt, pct, rate } from "../../lib/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signals | Raindrop GTM OS" };

// Every signal from the plan, in the plan's own order: warm, cold,
// enterprise, one-off. Held a week sits next to what the plan expects a
// week, which is the comparison this page exists for.
export default async function SignalsPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const { range } = readControls(sp);
  const ds = await dataset();
  const p = prepare(ds);
  const w = windowFor(range);
  const rows = bySignal(p, w);

  const groups = [
    ...TIERS.map((t) => ({ ...t, rows: rows.filter((r) => r.tier === t.key) })),
    { key: "unmapped", label: "Unmapped", rows: rows.filter((r) => r.key === "unmapped") },
  ].filter((g) => g.rows.length);

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead
          title="Signals."
          sub="Every signal in the plan: what fires it, which channel carries it, how much it has produced, and what it was expected to produce. A campaign is filed under a signal by its name, so the naming convention is '<Signal> · <Channel>'."
        >
          <Controls path="/signals" sp={sp} range={range} showGrain={false} />
        </PageHead>

        <div className="mb-32 space-y-12">
          {groups.map((g) => (
            <Panel key={g.key} title={g.label} flush>
              {/* Scrolls sideways only on small screens. On desktop the table
                  fits, and leaving overflow visible lets the hover notes on
                  the names show in full instead of being clipped. */}
              <div className="overflow-x-auto lg:overflow-visible">
                <table className="w-full min-w-[980px] table-fixed border-collapse">
                  {/* Fixed widths, so the columns line up from one tier's
                      table to the next and the page reads as one table. */}
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <col key={i} style={{ width: "7.4%" }} />
                    ))}
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "13.2%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-hair">
                      <Th>Signal</Th>
                      <Th>Channel</Th>
                      <Th align="center" className="!px-1.5">Entered</Th>
                      <Th align="center" className="!px-1.5">Contacted</Th>
                      <Th align="center" className="!px-1.5">Replied</Th>
                      <Th align="center" className="!px-1.5">Positive</Th>
                      <Th align="center" className="!px-1.5">Booked</Th>
                      <Th align="center" className="!px-1.5">Held</Th>
                      <Th align="center" className="!px-1.5">
                        <Note text="Meetings booked per 1,000 contacted. Plan 2.4 to 4.8." width={220} align="right">
                          Per 1,000
                        </Note>
                      </Th>
                      <Th align="center" className="!px-1.5">
                        <Note text="Meetings held a week in this window, against what the plan expects a week. One-off lists carry a total instead." width={260} align="right">
                          Held a week
                        </Note>
                      </Th>
                      <Th>Next</Th>
                    </tr>
                  </thead>
                  <tbody className="rows">
                    {g.rows.map((r) => {
                      const behind = r.expectedPerWeek > 0 && r.heldPerWeek < r.expectedPerWeek * 0.5;
                      return (
                        <tr key={r.key} className="lift-row border-b border-hair">
                          <Td>
                            <Link href={`/signals/${r.key}?range=${range}`} className="block">
                              {/* Just the name. Status, campaigns and sender
                                  come out on hover, so the table reads as
                                  numbers first. */}
                              <Note
                                width={240}
                                text={[
                                  r.status.label,
                                  r.campaigns.length
                                    ? `${r.campaigns.length} campaign${r.campaigns.length > 1 ? "s" : ""}`
                                    : "No campaign yet",
                                  r.sender,
                                ].filter(Boolean).join(" · ")}
                              >
                                <span className="h-row">{r.name}</span>
                              </Note>
                            </Link>
                          </Td>
                          <Td>
                            <span className="flex flex-wrap gap-1.5">
                              {r.channels.map((c) => (
                                <span key={c} className="flex items-center gap-1.5 text-[12px] text-text">
                                  <span className="h-2 w-2 rounded-[2px]" style={{ background: CHANNELS[c].color }} />
                                  {CHANNELS[c].label}
                                </span>
                              ))}
                            </span>
                          </Td>
                          <Td align="center" className="text-text">{fmt(r.funnel.entered)}</Td>
                          <Td align="center" className="text-text">{fmt(r.funnel.contacted)}</Td>
                          <Td align="center" className="text-text">
                            {r.funnel.contacted ? (
                              <Note text={`${pct(rate(r.funnel.replied, r.funnel.contacted), 1)} of contacted`} width={160}>
                                {fmt(r.funnel.replied)}
                              </Note>
                            ) : (
                              fmt(r.funnel.replied)
                            )}
                          </Td>
                          <Td align="center" className="text-text">{fmt(r.funnel.positive)}</Td>
                          <Td align="center" className="text-text">{fmt(r.funnel.booked)}</Td>
                          <Td align="center" className="text-ink">{fmt(r.funnel.held)}</Td>
                          <Td align="center" className={r.perThousand != null && r.perThousand < 2.4 && r.funnel.contacted > 200 ? "text-warn" : "text-text"}>
                            {r.perThousand != null ? r.perThousand.toFixed(1) : "\u2013"}
                          </Td>
                          <Td align="center">
                            {r.expectedTotal ? (
                              <span className="text-[12px] text-muted">{r.expectedTotal}</span>
                            ) : (
                              <span className={behind ? "text-warn" : "text-text"}>
                                {r.heldPerWeek.toFixed(1)}
                                <span className="text-faint"> / {r.expectedPerWeek}</span>
                              </span>
                            )}
                          </Td>
                          <Td>
                            {r.key === "unmapped" ? (
                              <Badge tone="bad">rename</Badge>
                            ) : (
                              <span className="block max-w-[220px] text-[12px] leading-snug text-muted">{r.next}</span>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </div>
      </Shell>
    </>
  );
}
