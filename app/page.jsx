import Link from "next/link";
import { Shell, PageHead, Panel, Th, Td, Badge, Note } from "../components/UI";
import Controls, { readControls } from "../components/Controls";
import SourceBanner from "../components/SourceBanner";
import Funnel from "../components/Funnel";
import { Columns, Paired } from "../components/Charts";
import { dataset } from "../lib/model";
import { cfg } from "../lib/config";
import { CHANNELS } from "../lib/data/signals";
import {
  prepare, windowFor, funnel, series, pipelineValue, rate, fmt, pct, money, mondayOf,
} from "../lib/derive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline | Raindrop GTM OS" };

export default async function PipelinePage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const { range, grain } = readControls(sp);
  const c = cfg();
  const ds = await dataset();
  const p = prepare(ds);
  const w = windowFor(range);
  const f = funnel(p, w);
  const s = series(p, w, grain);
  const value = pipelineValue(f, c.estimatedAcv);

  // This week against the plan's fifteen held, counted Monday to now.
  const now = Date.now();
  const thisWeek = funnel(p, { from: mondayOf(now), to: now + 1 });
  const weekly = series(p, windowFor("all"), "week");

  const email = funnel(p, w, { channel: "email" });
  const linkedin = funnel(p, w, { channel: "linkedin" });

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead
          title="Pipeline."
          sub="Where outbound turns into pipeline: leads Clay qualified, who we contacted, who replied, who was positive, meetings booked and held, and what qualified."
        >
          <Controls path="/" sp={sp} range={range} grain={grain} />
        </PageHead>

        <Funnel
          f={f}
          extra={
            <div className="border-b border-r border-hair bg-head p-5">
              <div className="text-[14px] leading-tight text-ink">
                <Note
                  width={280}
                  text={`Qualified deals at their HubSpot amount, or at the estimated ACV of ${money(c.estimatedAcv)} where the deal has no amount yet.`}
                >
                  Pipeline created
                </Note>
              </div>
              <div className="display mt-5 text-[28px] leading-none text-accent">{money(value)}</div>
              <div className="mt-[30px] font-mono text-[11px] text-faint">
                {f.qualified} qualified
                {f.qualifiedWithAmount < f.qualified ? `, ${f.qualified - f.qualifiedWithAmount} at est. ACV` : ""}
              </div>
            </div>
          }
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel
            title="Against the plan"
            note={`The plan asks for ${c.goalMeetingsPerWeek} discovery calls held a week. Each column is one week since sends began on Aug 17.`}
          >
            <Columns
              title="Meetings held, by week"
              data={weekly.map((b) => ({ label: b.label, sub: b.sub, value: b.held }))}
              goal={c.goalMeetingsPerWeek}
              goalLabel={`plan ${c.goalMeetingsPerWeek} a week`}
              color="#4b7d88"
              height={230}
            />
          </Panel>

          <div className="grid border-l border-t border-hair bg-surface">
            {[
              ["Held this week", thisWeek.held, `of ${c.goalMeetingsPerWeek} planned`, thisWeek.held >= c.goalMeetingsPerWeek ? "text-good" : "text-ink"],
              ["Booked this week", thisWeek.booked, "created in HubSpot since Monday", "text-ink"],
              ["Positive this week", thisWeek.positive, "replies marked interested", "text-ink"],
            ].map(([label, v, sub, tone]) => (
              <div key={label} className="border-b border-r border-hair px-6 py-5">
                <div className="text-[14px] text-ink">{label}</div>
                <div className={`display mt-3 text-[30px] leading-none ${tone}`}>{fmt(v)}</div>
                <div className="mt-2 font-mono text-[11px] text-faint">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <Panel
          className="mt-16"
          title="Stage by stage"
          note="One chart per stage on the same time axis, so a week can be read straight down. Each has its own scale: contacted runs in the thousands and meetings in single digits."
        >
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            <Columns title="Contacted" total={fmt(f.contacted)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.contacted }))} />
            <Columns title="Replies" total={fmt(f.replied)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.replied }))} />
            <Columns title="Positive" total={fmt(f.positive)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.positive }))} />
            <Columns title="Meetings booked" total={fmt(f.booked)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.booked }))} />
            <Columns title="Meetings held" total={fmt(f.held)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.held }))} color="#4b7d88" />
            <Columns title="Qualified" total={fmt(f.qualified)} data={s.map((b) => ({ label: b.label, sub: b.sub, value: b.qualified }))} color="#4b7d88" />
          </div>
        </Panel>

        <Panel
          className="mt-16 mb-32"
          title="By channel"
          note="Contacted means a new lead emailed, or a LinkedIn connection request sent. Replies on LinkedIn are counted against accepted connections, because a request nobody accepted cannot be replied to."
          flush
        >
          <div className="px-6 pb-2 pt-6">
            <Paired
              title="Positive replies"
              data={s.map((b) => ({
                label: b.label,
                sub: b.sub,
                email: funnel(p, b, { channel: "email" }).positive,
                linkedin: funnel(p, b, { channel: "linkedin" }).positive,
              }))}
              series={[
                { key: "email", label: "Email", color: CHANNELS.email.color },
                { key: "linkedin", label: "LinkedIn", color: CHANNELS.linkedin.color },
              ]}
            />
          </div>
          <div className="scroll-box mt-6 overflow-x-auto border-t border-hair">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-hair">
                  <Th>Channel</Th>
                  <Th align="center">Contacted</Th>
                  <Th align="center">Replies</Th>
                  <Th align="center">Reply rate</Th>
                  <Th align="center">Positive</Th>
                  <Th align="center">Positive rate</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody className="rows">
                {[
                  ["email", email, rate(email.replied, email.contacted), "/email"],
                  ["linkedin", linkedin, rate(linkedin.replied, linkedin.connectionsAccepted), "/linkedin"],
                ].map(([key, x, rr, href]) => (
                  <tr key={key} className="border-b border-hair">
                    <Td>
                      <span className="flex items-center gap-2 text-ink">
                        <span className="h-2 w-2 rounded-[2px]" style={{ background: CHANNELS[key].color }} />
                        {CHANNELS[key].label}
                        <span className="text-[11px] text-faint">{CHANNELS[key].tool}</span>
                      </span>
                    </Td>
                    <Td align="center" className="text-text">{fmt(x.contacted)}</Td>
                    <Td align="center" className="text-text">{fmt(x.replied)}</Td>
                    <Td align="center" className="text-text">
                      {pct(rr, 1)}
                      {key === "linkedin" ? <span className="block text-[11px] text-faint">of accepted</span> : null}
                    </Td>
                    <Td align="center" className="text-text">{fmt(x.positive)}</Td>
                    <Td align="center" className="text-text">{pct(rate(x.positive, x.replied))}</Td>
                    <Td align="right">
                      <Link href={href} className="mono-link text-muted">open {"⟶"}</Link>
                    </Td>
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
