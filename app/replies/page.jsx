import Link from "next/link";
import { Shell, PageHead, Panel, Th, Td, Badge, Note, Empty } from "../../components/UI";
import Controls, { readControls, Tab } from "../../components/Controls";
import SourceBanner from "../../components/SourceBanner";
import { Columns, Bands } from "../../components/Charts";
import { dataset } from "../../lib/model";
import { cfg } from "../../lib/config";
import { CHANNELS, signalByKey } from "../../lib/data/signals";
import { prepare, windowFor, queue, responseTimes, hrs, fmt } from "../../lib/derive";
import { markDone } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Replies | Raindrop GTM OS" };

// Where to answer. Instantly has one Unibox; HeyReach threads open on the
// lead's profile, which is as deep as its API links go.
const openUrl = (t) => (t.channel === "email" ? "https://app.instantly.ai/app/unibox" : t.url ?? "https://app.heyreach.io/");

export default async function RepliesPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const { range, grain } = readControls(sp);
  const owner = sp.owner ?? "all";
  const c = cfg();
  const ds = await dataset();
  const p = prepare(ds);
  const w = windowFor(range);

  const all = queue(p);
  const owners = [...new Set(all.map((t) => t.owner ?? "Unassigned"))].sort();
  const waiting = owner === "all" ? all : all.filter((t) => (t.owner ?? "Unassigned") === owner);
  const late = waiting.filter((t) => t.waitingHours > c.replySlaHours);
  const rt = responseTimes(p, w, grain);
  const keep = { range, grain };

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead
          title="Replies."
          sub={`Every conversation where the lead spoke last and nobody has answered, longest waiting first. The target is an answer inside ${c.replySlaHours} hours.`}
        >
          <Controls path="/replies" sp={sp} range={range} grain={grain} extra={owner !== "all" ? { owner } : undefined} />
        </PageHead>

        <div className="grid border-l border-t border-hair bg-surface sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Waiting on us", fmt(all.length), "right now, across both inboxes", all.length ? "text-ink" : "text-good"],
            [`Over ${c.replySlaHours}h`, fmt(all.filter((t) => t.waitingHours > c.replySlaHours).length), "past the target", all.some((t) => t.waitingHours > c.replySlaHours) ? "text-bad" : "text-ink"],
            ["Median time to answer", hrs(rt.median), `${fmt(rt.count)} answered in this window`, rt.median > c.replySlaHours ? "text-warn" : "text-ink"],
            ["Positive waiting", fmt(all.filter((t) => t.positive).length), "interested and unanswered", all.some((t) => t.positive) ? "text-bad" : "text-ink"],
          ].map(([label, v, sub, tone]) => (
            <div key={label} className="border-b border-r border-hair p-6">
              <div className="text-[15px] text-ink">{label}</div>
              <div className={`display mt-5 text-[30px] leading-none ${tone}`}>{v}</div>
              <div className="mt-3 font-mono text-[11px] text-faint">{sub}</div>
            </div>
          ))}
        </div>

        <Panel
          className="mt-12"
          title="Waiting on us"
          note="Built from the Instantly Unibox and each HeyReach inbox. A thread leaves the queue when someone answers it in the tool, or is marked done here. Not interested, wrong person and out of office never enter it."
          right={
            <div className="flex flex-wrap gap-2">
              <Tab on={owner === "all"} href={`/replies?${new URLSearchParams(keep)}`}>Everyone</Tab>
              {owners.map((o) => (
                <Tab key={o} on={owner === o} href={`/replies?${new URLSearchParams({ ...keep, owner: o })}`}>{o}</Tab>
              ))}
            </div>
          }
          flush
        >
          {waiting.length ? (
            <div className="scroll-box overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-hair">
                    <Th>Lead</Th>
                    <Th>Said</Th>
                    <Th>Signal</Th>
                    <Th>Owner</Th>
                    <Th align="center">Waiting</Th>
                    <Th align="right"> </Th>
                  </tr>
                </thead>
                <tbody className="rows">
                  {waiting.map((t) => (
                    <tr key={`${t.source}:${t.threadId}`} className="border-b border-hair align-top">
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: CHANNELS[t.channel].color }} title={CHANNELS[t.channel].label} />
                          <span className="h-row">{t.leadName ?? "Unknown"}</span>
                        </span>
                        <span className="mt-0.5 block pl-4 text-[11.5px] text-faint">
                          {t.leadCompany ?? ""} · {CHANNELS[t.channel].label}
                        </span>
                      </Td>
                      <Td>
                        <span className="line-clamp-2 block max-w-[380px] text-[12.5px] leading-snug text-text">{t.snippet}</span>
                        {t.positive ? <span className="mt-1.5 inline-block"><Badge tone="good">interested</Badge></span> : null}
                      </Td>
                      <Td className="text-[12px] text-muted">{signalByKey(t.signal)?.name ?? "Unmapped"}</Td>
                      <Td className="text-text">{t.owner ?? "Unassigned"}</Td>
                      <Td align="center">
                        <Badge tone={t.waitingHours > 24 ? "bad" : t.waitingHours > c.replySlaHours ? "warn" : "default"}>
                          {hrs(t.waitingHours)}
                        </Badge>
                      </Td>
                      <Td align="right">
                        <span className="flex items-center justify-end gap-4">
                          <a href={openUrl(t)} target="_blank" rel="noreferrer" className="mono-link text-muted">answer ↗</a>
                          {!ds.seed ? (
                            <form action={markDone}>
                              <input type="hidden" name="source" value={t.source} />
                              <input type="hidden" name="thread" value={t.threadId} />
                              <button type="submit" className="mono-link text-faint">done</button>
                            </form>
                          ) : null}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nobody is waiting on us.</Empty>
          )}
        </Panel>

        <div className="mt-12 mb-32 grid gap-6 lg:grid-cols-2">
          <Panel
            title="Time to answer"
            note="From their first reply to our first answer in the same thread, for threads that started in this window. Measured on the timestamp each tool stored the message, on both sides."
          >
            <Columns
              title={`Median by ${grain}`}
              total={hrs(rt.median)}
              data={rt.trend.map((b) => ({ label: b.label, sub: b.sub, value: b.median ?? 0 }))}
              format={(v) => hrs(v)}
              goal={c.replySlaHours}
              goalLabel={`target ${c.replySlaHours}h`}
              color="#4b7d88"
            />
          </Panel>

          <Panel title="How fast, how often">
            <Bands rows={rt.bands.map((b, i) => ({ label: b.label, value: b.count, tone: i < 2 ? "#4b7d88" : i === 2 ? "#18211f" : "#96702c" }))} />
            <div className="mt-8 border-t border-hair pt-5">
              <div className="h-field mb-3">By owner</div>
              <div className="rows">
                {rt.owners.map((o) => (
                  <div key={o.owner} className="flex items-center justify-between py-2.5 text-[13px]">
                    <span className="text-ink">{o.owner}</span>
                    <span className="font-mono text-[12px] text-muted">
                      median {hrs(o.median)} · {fmt(o.count)} answered
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </Shell>
    </>
  );
}
