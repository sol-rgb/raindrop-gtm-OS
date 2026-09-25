import { cfg } from "../../../../lib/config";
import { dbConfigured, query } from "../../../../lib/db";
import { secretOk, sha } from "../../../../lib/secret";
import { heyreach } from "../../../../lib/adapters/heyreach";
import { upsertThreads } from "../../../../lib/sync/run";
import { datasetChanged } from "../../../../lib/freshness";
import { daysAgo } from "../../../../lib/adapters/http";

// HeyReach posts here on EVERY_MESSAGE_REPLY_RECEIVED, one webhook per
// sender workspace, with ?sender=<Name> so we know which key to read with.
// Like the Instantly hook, the payload is a nudge: the inbox is re-read for
// the last two days and the queue is rebuilt from that.
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

  const key = `heyreach:${await sha(raw)}`;
  const fresh = await query(
    `insert into webhook_events (source, event_type, dedupe_key, payload) values ('heyreach', $1, $2, $3)
     on conflict (dedupe_key) do nothing returning id`,
    [String(body.eventType ?? body.event_type ?? "unknown"), key, raw ? JSON.stringify(body) : "{}"],
  );
  if (!fresh.length) return Response.json({ ok: true, duplicate: true });

  const want = (url.searchParams.get("sender") ?? "").toLowerCase();
  const k = c.heyreach.find((x) => x.label.toLowerCase() === want) ?? (c.heyreach.length === 1 ? c.heyreach[0] : null);
  if (k) {
    try {
      const threads = await heyreach(k.key, k.label).conversations(daysAgo(2));
      await upsertThreads(threads);
    } catch (e) {
      console.error("[webhook heyreach]", e.message);
    }
  }
  datasetChanged();
  return Response.json({ ok: true });
}
