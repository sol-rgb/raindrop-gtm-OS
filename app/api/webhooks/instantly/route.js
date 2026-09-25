import { cfg } from "../../../../lib/config";
import { dbConfigured, query } from "../../../../lib/db";
import { secretOk, sha } from "../../../../lib/secret";
import { instantly, threadsFromEmails } from "../../../../lib/adapters/instantly";
import { upsertThreads } from "../../../../lib/sync/run";

// Instantly posts here on reply_received (Hypergrowth and above). The event
// is recorded once, then the lead's own emails are re-read so the queue shows
// the reply now rather than at the next hourly sync. The payload is treated
// as a nudge, never as the record: the Unibox is the record.
export const dynamic = "force-dynamic";

export async function POST(req) {
  const c = cfg();
  const url = new URL(req.url);
  if (!secretOk(url.searchParams.get("secret"), c.webhookSecret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!dbConfigured()) return Response.json({ ok: false, error: "no database" }, { status: 503 });

  const raw = await req.text();
  let body = {};
  try {
    body = JSON.parse(raw);
  } catch {}

  const key = `instantly:${await sha(raw)}`;
  const fresh = await query(
    `insert into webhook_events (source, event_type, dedupe_key, payload) values ('instantly', $1, $2, $3)
     on conflict (dedupe_key) do nothing returning id`,
    [String(body.event_type ?? "unknown"), key, raw ? JSON.stringify(body) : "{}"],
  );
  if (!fresh.length) return Response.json({ ok: true, duplicate: true });

  const lead = body.lead_email ?? body.email ?? null;
  if (lead && c.instantlyApiKey && /reply|lead_/.test(String(body.event_type ?? ""))) {
    try {
      const api = instantly(c.instantlyApiKey);
      const emails = await api.leadEmails(lead);
      await upsertThreads(threadsFromEmails(emails).map((t) => ({ ...t, owner: "Zubin" })));
    } catch (e) {
      // The event is saved; the hourly sync will pick the thread up anyway.
      console.error("[webhook instantly]", e.message);
    }
  }
  return Response.json({ ok: true });
}
