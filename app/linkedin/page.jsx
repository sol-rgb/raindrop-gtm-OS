import Link from "next/link";
import { Shell, PageHead, Panel, Th, Td, Badge, Note } from "../../components/UI";
import Controls, { readControls } from "../../components/Controls";
import SourceBanner from "../../components/SourceBanner";
import { Columns } from "../../components/Charts";
import { dataset } from "../../lib/model";
import { CHANNELS, signalByKey } from "../../lib/data/signals";
import { prepare, windowFor, funnel, series, byCampaign, fmt, pct, rate } from "../../lib/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "LinkedIn | Raindrop GTM OS" };

const COLOR = CHANNELS.linkedin.color;

// Benchmarks from the plan: about 27% of connection requests accepted, and
// about 9% of accepted connections replying.
export default async function LinkedInPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const { range, grain } = readControls(sp);
  const ds = await dataset();
  const p = prepare(ds);
  const w = windowFor(range);
  const f = funnel(p, w, { channel: "linkedin" });
  const s = series(p, w, grain, { channel: "linkedin" });
  const camps = byCampaign(p, w, { channel: "linkedin" });
  const senders = [...new Set(p.campaigns.filter((c) => c.channel === "linkedin").map((c) => c.sender ?? "Unknown"))].sort();

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead
          title="LinkedIn."
          sub="HeyReach, one workspace per sender. A reply rate on LinkedIn is replies over accepted connections, since a request nobody accepted cannot be replied to."
        >
          <Controls path="/linkedin" sp={sp} range={range} grain={grain} />
        </PageHead>

        <Panel title="By sender" flush>
          <div className="scroll-box overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-hair">
                  <Th>Sender</Th>
                  <Th align="center">Requests</Th>
                  <Th align="center">Accepted</Th>
                  <Th align="center">
                    <Note text="Plan benchmark about 27%." width={200}>Acceptance</Note>
                  </Th>
                  <Th align="center">Replies</Th>
                  <Th align="center">
                    <Note text="Replies over accepted connections. Plan benchmark about 9%." width={220}>Reply rate</Note>
                  </Th>
                  <Th align="center">Positive</Th>
                </tr>
              </thead>
              <tbody className="rows">
                {[...senders, "All"].map((who) => {
                  const x = who === "All" ? f : funnel(p, w, { channel: "linkedin", sender: who });
                  const acc = rate(x.connectionsAccepted, x.connectionsSent);
                  const rr = rate(x.replied, x.connectionsAccepted);
                  return (
                    <tr key={who} className={`border-b border-hair ${who === "All" ? "bg-head font-semibold" : ""}`}>
                      <Td className="text-ink">{who}</Td>
                      <Td align="center" className="text-text">{fmt(x.connectionsSent)}</Td>
                      <Td align="center" className="text-text">{fmt(x.connectionsAccepted)}</Td>
                      <Td align="center" className={acc != null && acc < 0.2 ? "text-warn" : "text-text"}>{pct(acc)}</Td>
                      <Td align="center" className="text-text">{fmt(x.replied)}</Td>
                      <Td align="center" className={rr != null && rr < 0.06 ? "text-warn" : "text-text"}>{pct(rr, 1)}</Td>
                      <Td align="center" className="text-text">{fmt(x.positive)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mt-12" title="Over time">
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
            <Columns title="Connection requests" total={fmt(f.connectionsSent)} color={COLOR} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.connectionsSent }))} />
            <Columns title="Accepted" total={fmt(f.connectionsAccepted)} color={COLOR} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.connectionsAccepted }))} />
            <Columns title="Replies" total={fmt(f.replied)} color={COLOR} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.replied }))} />
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
                  <Th align="center">Requests</Th>
                  <Th align="center">Accepted</Th>
                  <Th align="center">Replies</Th>
                  <Th align="center">Reply rate</Th>
                  <Th align="center">Positive</Th>
                </tr>
              </thead>
              <tbody className="rows">
                {camps.map((c) => (
                  <tr key={c.id} className="border-b border-hair">
                    <Td>
                      <span className="text-ink">{c.name}</span>
                      <span className="mt-0.5 block text-[11px] text-faint">{c.sender}</span>
                    </Td>
                    <Td>
                      {c.signal === "unmapped" ? (
                        <Badge tone="bad">unmapped</Badge>
                      ) : (
                        <Link href={`/signals/${c.signal}?range=${range}`} className="mono-link text-muted">
                          {signalByKey(c.signal).name}
                        </Link>
                      )}
                    </Td>
                    <Td><Badge tone={c.status === "active" || c.status === "in progress" ? "good" : "default"}>{c.status}</Badge></Td>
                    <Td align="center" className="text-text">{fmt(c.connectionsSent)}</Td>
                    <Td align="center" className="text-text">{fmt(c.connectionsAccepted)}</Td>
                    <Td align="center" className="text-text">{fmt(c.replied)}</Td>
                    <Td align="center" className="text-text">{pct(rate(c.replied, c.connectionsAccepted), 1)}</Td>
                    <Td align="center" className="text-text">{fmt(c.positive)}</Td>
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
