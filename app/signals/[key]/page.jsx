import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, PageHead, Panel, Th, Td, Badge, MonoLink, Note } from "../../../components/UI";
import Controls, { readControls } from "../../../components/Controls";
import SourceBanner from "../../../components/SourceBanner";
import Funnel from "../../../components/Funnel";
import { Columns } from "../../../components/Charts";
import { dataset } from "../../../lib/model";
import { signalByKey, CHANNELS, TIERS } from "../../../lib/data/signals";
import { prepare, windowFor, funnel, series, byCampaign, fmt, pct, rate, money, pipelineValue } from "../../../lib/derive";
import { cfg } from "../../../lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { key } = await params;
  return { title: `${signalByKey(key)?.name ?? "Signal"} | Raindrop GTM OS` };
}

export default async function SignalPage({ params, searchParams }) {
  const { key } = await params;
  const sig = signalByKey(key);
  if (!sig) notFound();

  const sp = (await searchParams) ?? {};
  const { range, grain } = readControls(sp);
  const ds = await dataset();
  const p = prepare(ds);
  const w = windowFor(range);
  const f = funnel(p, w, { signal: key });
  const s = series(p, w, grain, { signal: key });
  const camps = byCampaign(p, w).filter((c) => c.signal === key);

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <div className="pt-10">
          <MonoLink href={`/signals?range=${range}`}>all signals</MonoLink>
        </div>
        <PageHead title={`${sig.name}.`} sub={sig.strategy}>
          <Controls path={`/signals/${key}`} sp={sp} range={range} grain={grain} />
        </PageHead>

        <div className="-mt-6 mb-10 flex flex-wrap gap-x-10 gap-y-3 text-[13px]">
          {[
            ["Tier", TIERS.find((t) => t.key === sig.tier)?.label ?? "None"],
            ["Channel", sig.channels.map((c) => CHANNELS[c].label).join(" and ") || "None"],
            ["Sender", sig.sender ?? "None"],
            ["Volume", sig.volume ?? "Unknown"],
            ["Plan", sig.expectedTotal ?? `${sig.expectedPerWeek} meeting${sig.expectedPerWeek === 1 ? "" : "s"} a week`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="font-mono text-[11px] text-faint">{k}</div>
              <div className="mt-0.5 text-ink">{v}</div>
            </div>
          ))}
        </div>

        <Funnel
          f={f}
          extra={
            <div className="border-b border-r border-hair bg-head p-5">
              <div className="text-[14px] leading-tight text-ink">Pipeline created</div>
              <div className="display mt-5 text-[28px] leading-none text-accent">
                <Note text={`${f.qualified} qualified.`} width={160}>{money(pipelineValue(f, cfg().estimatedAcv))}</Note>
              </div>
            </div>
          }
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <Panel title="Over time">
            <div className="grid gap-10">
              <Columns title="Contacted" total={fmt(f.contacted)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.contacted }))} height={100} />
              <Columns title="Meetings held" total={fmt(f.held)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.held }))} color="#4b7d88" height={100} />
            </div>
          </Panel>

          <Panel title="Where it comes from">
            <dl className="space-y-5 text-[13px]">
              <div>
                <dt className="h-field">In Clay</dt>
                <dd className="body-text mt-1">{sig.clay ?? "No Clay table mapped yet."}</dd>
              </div>
              <div>
                <dt className="h-field">Next action</dt>
                <dd className="body-text mt-1">{sig.next ?? "None"}</dd>
              </div>
              <div>
                <dt className="h-field">Leads from Clay in this window</dt>
                <dd className="body-text mt-1">
                  {f.entered
                    ? `${fmt(f.entered)} row${f.entered === 1 ? "" : "s"} sent by the HTTP column.`
                    : "None yet. The HTTP column on this signal's Clay table is what fills this in."}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>

        <Panel className="mt-16 mb-32" title="Campaigns" flush>
          {camps.length ? (
            <div className="scroll-box overflow-x-auto lg:overflow-visible">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-hair">
                    <Th>Campaign</Th>
                    <Th>Status</Th>
                    <Th align="center">Contacted</Th>
                    <Th align="center">Replied</Th>
                    <Th align="center">Reply rate</Th>
                    <Th align="center">Positive</Th>
                  </tr>
                </thead>
                <tbody className="rows">
                  {camps.map((c) => (
                    <tr key={`${c.source}:${c.id}`} className="border-b border-hair">
                      <Td>
                        <span className="flex items-center gap-2 text-ink">
                          <span className="h-2 w-2 rounded-[2px]" style={{ background: CHANNELS[c.channel].color }} />
                          <Note text={`${CHANNELS[c.channel].tool}${c.sender ? ` · ${c.sender}` : ""}`} width={180}>
                            {c.name}
                          </Note>
                        </span>
                      </Td>
                      <Td><Badge tone={c.status === "active" || c.status === "in progress" ? "good" : "default"}>{c.status}</Badge></Td>
                      <Td align="center" className="text-text">{fmt(c.contacted)}</Td>
                      <Td align="center" className="text-text">{fmt(c.replied)}</Td>
                      <Td align="center" className="text-text">
                        {pct(rate(c.replied, c.channel === "linkedin" ? c.connectionsAccepted : c.contacted), 1)}
                      </Td>
                      <Td align="center" className="text-text">{fmt(c.positive)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-8 text-[13px] text-muted">
              No campaign in Instantly or HeyReach is named for this signal yet. Name it
              <span className="mx-1 font-mono text-ink">{sig.name} · Email</span>
              or
              <span className="mx-1 font-mono text-ink">{sig.name} · LinkedIn</span>
              and it lands here on the next sync.
            </p>
          )}
        </Panel>
      </Shell>
    </>
  );
}
