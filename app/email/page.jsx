import Link from "next/link";
import { Shell, PageHead, Panel, Th, Td, Badge, Note } from "../../components/UI";
import Controls, { readControls } from "../../components/Controls";
import SourceBanner from "../../components/SourceBanner";
import { Columns } from "../../components/Charts";
import { dataset } from "../../lib/model";
import { CHANNELS, signalByKey } from "../../lib/data/signals";
import { prepare, windowFor, funnel, series, byCampaign, fmt, pct, rate } from "../../lib/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email | Raindrop GTM OS" };

const COLOR = CHANNELS.email.color;

export default async function EmailPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const { range, grain } = readControls(sp);
  const ds = await dataset();
  const p = prepare(ds);
  const w = windowFor(range);
  const f = funnel(p, w, { channel: "email" });
  const s = series(p, w, grain, { channel: "email" });
  const camps = byCampaign(p, w, { channel: "email" });
  const tracking = camps.filter((c) => c.openTracking);
  const openBase = tracking.reduce((n, c) => n + c.contacted, 0);
  const opened = tracking.reduce((n, c) => n + c.opened, 0);

  const stats = [
    ["Emails sent", fmt(f.sent), "every step of every sequence", null],
    ["New leads contacted", fmt(f.contacted), "first email to a lead", null],
    ["Reply rate", pct(rate(f.replied, f.contacted), 1), "plan 2 to 3%", rate(f.replied, f.contacted) < 0.015 ? "warn" : null],
    ["Positive of replies", pct(rate(f.positive, f.replied)), "plan 20%", rate(f.positive, f.replied) < 0.15 ? "warn" : null],
  ];

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead
          title="Email."
          sub="Instantly, every campaign. Replies are unique replies with auto-replies taken out, which is Instantly's own definition."
        >
          <Controls path="/email" sp={sp} range={range} grain={grain} />
        </PageHead>

        <div className="grid border-l border-t border-hair bg-surface sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, v, sub, tone]) => (
            <div key={label} className="border-b border-r border-hair p-6">
              <div className="text-[15px] text-ink">{label}</div>
              <div className={`display mt-5 text-[30px] leading-none ${tone === "warn" ? "text-warn" : "text-ink"}`}>{v}</div>
              <div className="mt-3 font-mono text-[11px] text-faint">{sub}</div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
          <Note
            width={340}
            text="Opens only exist where open tracking is switched on for the campaign, and Apple Mail privacy and corporate scanners open emails nobody read. Read the figure as a trend, never as people."
          >
            Opens
          </Note>
          {tracking.length
            ? `: ${pct(rate(opened, openBase))} on the ${tracking.length} of ${camps.length} campaigns with tracking on. Directional only.`
            : ": no campaign has open tracking on, so there is no open rate to show."}
        </p>

        <Panel className="mt-12" title="Over time">
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
            <Columns title="New leads contacted" total={fmt(f.contacted)} color={COLOR} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.contacted }))} />
            <Columns title="Replies" total={fmt(f.replied)} color={COLOR} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.replied }))} />
            <Columns title="Positive" total={fmt(f.positive)} color={COLOR} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.positive }))} />
          </div>
        </Panel>

        <Panel className="mt-12 mb-32" title="Campaigns" flush>
          <div className="scroll-box overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-hair">
                  <Th>Campaign</Th>
                  <Th>Signal</Th>
                  <Th>Status</Th>
                  <Th align="center">Contacted</Th>
                  <Th align="center">Sent</Th>
                  <Th align="center">Replies</Th>
                  <Th align="center">Reply rate</Th>
                  <Th align="center">Positive</Th>
                  <Th align="center">Opens</Th>
                </tr>
              </thead>
              <tbody className="rows">
                {camps.map((c) => (
                  <tr key={c.id} className="border-b border-hair">
                    <Td className="text-ink">{c.name}</Td>
                    <Td>
                      {c.signal === "unmapped" ? (
                        <Badge tone="bad">unmapped</Badge>
                      ) : (
                        <Link href={`/signals/${c.signal}?range=${range}`} className="mono-link text-muted">
                          {signalByKey(c.signal).name}
                        </Link>
                      )}
                    </Td>
                    <Td><Badge tone={c.status === "active" ? "good" : "default"}>{c.status}</Badge></Td>
                    <Td align="center" className="text-text">{fmt(c.contacted)}</Td>
                    <Td align="center" className="text-text">{fmt(c.sent)}</Td>
                    <Td align="center" className="text-text">{fmt(c.replied)}</Td>
                    <Td align="center" className={rate(c.replied, c.contacted) >= 0.02 ? "text-accent" : "text-text"}>
                      {pct(rate(c.replied, c.contacted), 1)}
                    </Td>
                    <Td align="center" className="text-text">{fmt(c.positive)}</Td>
                    <Td align="center" className="text-faint">{c.openTracking ? pct(rate(c.opened, c.contacted)) : "off"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Shell>
    </>
  );
}
