import { headers } from "next/headers";
import { Shell, PageHead, Panel, Badge, Th, Td } from "../../components/UI";
import SourceBanner from "../../components/SourceBanner";
import { dataset } from "../../lib/model";
import { cfg } from "../../lib/config";
import { dbConfigured } from "../../lib/db";
import { SIGNALS } from "../../lib/data/signals";
import { syncNow } from "./actions";

export const dynamic = "force-dynamic";
// Sync now runs the whole pull inside this page's server action.
export const maxDuration = 300;
export const metadata = { title: "System | Raindrop GTM OS" };

function ago(ts) {
  if (!ts) return "never";
  const m = Math.round((Date.now() - Date.parse(ts)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

// How it is wired, what is connected, and the one setup step that happens
// inside Clay rather than here.
export default async function SystemPage() {
  const c = cfg();
  const ds = await dataset();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "your-app"}`;
  const state = new Map((ds.sync?.sources ?? []).map((s) => [s.source, s]));

  const sources = [
    { name: "Database", env: "DATABASE_URL", on: dbConfigured(), what: "Supabase Postgres, session pooler URI." },
    { name: "Instantly", env: "INSTANTLY_API_KEY", on: Boolean(c.instantlyApiKey), what: "Email campaigns, daily stats, the Unibox. Read scope all:read.", key: "instantly" },
    ...(c.heyreach.length
      ? c.heyreach.map((k) => ({ name: `HeyReach, ${k.label}`, env: k.env, on: true, what: "LinkedIn campaigns, daily stats, inbox.", key: `heyreach:${k.label.toLowerCase()}` }))
      : [{ name: "HeyReach", env: "HEYREACH_API_KEY_<SENDER>", on: false, what: "One key per sender workspace." }]),
    { name: "HubSpot", env: "HUBSPOT_SERVICE_KEY", on: Boolean(c.hubspotKey), what: "Meetings and deals. Service Key with contacts, companies and deals read.", key: "hubspot" },
    { name: "Clay", env: "CLAY_INGEST_SECRET", on: Boolean(c.clayIngestSecret), what: "Leads entered, pushed by an HTTP column on each signal table." },
    { name: "Reply webhooks", env: "WEBHOOK_SECRET", on: Boolean(c.webhookSecret), what: "Instantly reply_received and HeyReach every-reply events, so the queue moves between syncs." },
    { name: "Password", env: "SITE_PASSWORD", on: Boolean(c.sitePassword), what: "The shared team password on every page." },
  ];

  const clayBody = `{
  "id": "{{Clay row id}}",
  "signal": "<signal key, see below>",
  "company": "{{Company}}",
  "domain": "{{Domain}}",
  "person": "{{Full name}}",
  "email": "{{Email}}",
  "linkedin": "{{LinkedIn URL}}"
}`;

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead title="System." sub="What feeds the OS, whether each piece is connected, and when it last answered.">
          {dbConfigured() ? (
            <form action={syncNow}>
              <button type="submit" className="btn border border-strong bg-surface px-4 py-2 text-[13px] text-ink hover:border-accent">
                Sync now
              </button>
            </form>
          ) : null}
        </PageHead>

        <Panel title="Sources" flush>
          <div className="scroll-box overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="border-b border-hair">
                  <Th>Source</Th>
                  <Th>Variable</Th>
                  <Th>State</Th>
                  <Th>Last answered</Th>
                  <Th>What it gives</Th>
                </tr>
              </thead>
              <tbody className="rows">
                {sources.map((s) => {
                  const st = s.key ? state.get(s.key) : null;
                  const failing = st?.lastErrorAt && (!st.lastOkAt || st.lastErrorAt > st.lastOkAt);
                  return (
                    <tr key={s.name} className="border-b border-hair align-top">
                      <Td className="text-ink">{s.name}</Td>
                      <Td className="font-mono text-[11.5px] text-muted">{s.env}</Td>
                      <Td>
                        {failing ? <Badge tone="bad">failing</Badge> : s.on ? <Badge tone="good">set</Badge> : <Badge tone="warn">missing</Badge>}
                      </Td>
                      <Td className="text-[12px] text-muted">
                        {st ? ago(st.lastOkAt) : "–"}
                        {failing ? <span className="mt-1 block max-w-[260px] text-[11px] text-bad">{st.lastError}</span> : null}
                      </Td>
                      <Td className="text-[12.5px] text-muted">{s.what}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mt-12" title="Clay, the HTTP column">
          <ol className="list-decimal space-y-3 pl-5 text-[13px] leading-relaxed text-text">
            <li>Open the last table of a signal (for Hiring, the job posting person table under Track job posts).</li>
            <li>Add column, then HTTP API. Method POST, URL below.</li>
            <li>
              Add a header <span className="font-mono text-ink">x-clay-secret</span> with the value of CLAY_INGEST_SECRET.
            </li>
            <li>Paste the body below and replace the signal key with the one for that table.</li>
            <li>Under run settings, turn on auto-run and set "Only run if" to a filled company or domain, so each row is sent once.</li>
          </ol>
          <div className="mt-5 border border-hair bg-head px-4 py-3 font-mono text-[12px] text-ink">POST {origin}/api/clay</div>
          <pre className="mt-3 overflow-x-auto border border-hair bg-head px-4 py-3 font-mono text-[12px] leading-relaxed text-text">{clayBody}</pre>
          <div className="mt-5 flex flex-wrap gap-2">
            {SIGNALS.map((s) => (
              <span key={s.key} className="badge">{s.key}</span>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-faint">Each call costs one Clay Action. Re-sending a row updates it rather than counting it twice.</p>
        </Panel>

        <Panel className="mt-12" title="Reply webhooks">
          <div className="space-y-3 text-[13px] leading-relaxed text-text">
            <p>Optional. The hourly sync already rebuilds the queue; these make a new reply show up within a minute instead of within the hour.</p>
            <p>
              Instantly (Hypergrowth, Settings, Webhooks), event <span className="font-mono">reply_received</span>:
              <span className="mt-1 block border border-hair bg-head px-3 py-2 font-mono text-[12px]">{origin}/api/webhooks/instantly?secret=WEBHOOK_SECRET</span>
            </p>
            <p>
              HeyReach (Settings, Integrations, Webhooks, one per workspace), event <span className="font-mono">EVERY_MESSAGE_REPLY_RECEIVED</span>:
              <span className="mt-1 block border border-hair bg-head px-3 py-2 font-mono text-[12px]">{origin}/api/webhooks/heyreach?secret=WEBHOOK_SECRET&amp;sender=Zubin</span>
            </p>
          </div>
        </Panel>

        <Panel className="mt-12 mb-32" title="Recent runs" flush>
          {ds.sync?.runs?.length ? (
            <div className="rows">
              {ds.sync.runs.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-3 text-[13px]">
                  <Badge tone={r.ok ? "good" : r.ok === false ? "bad" : "warn"}>{r.ok ? "ok" : r.ok === false ? "failed" : "running"}</Badge>
                  <span className="text-ink">{new Date(r.startedAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PT</span>
                  <span className="font-mono text-[11px] text-faint">{r.trigger}</span>
                  <span className="text-[12px] text-muted">
                    {(r.detail?.results ?? []).map((x) => `${x.source} ${x.ok ? "ok" : "failed"}`).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-8 text-[13px] text-muted">No sync has run yet. Press Sync now above, or wait for the daily run at 6am PT.</p>
          )}
        </Panel>
      </Shell>
    </>
  );
}
