import { cfg } from "../../../../lib/config";
import { secretOk } from "../../../../lib/secret";
import { dataset } from "../../../../lib/model";
import { prepare } from "../../../../lib/derive";
import { dailyUpdate } from "../../../../lib/daily-update";
import { post } from "../../../../lib/slack";
import { dbConfigured } from "../../../../lib/db";
import { runSync } from "../../../../lib/sync/run";
import { datasetChanged } from "../../../../lib/freshness";

// The daily Slack update. Vercel Cron calls it once each weekday evening
// (Pacific) with the CRON_SECRET bearer. It syncs first, so today's numbers
// are complete. Anyone with the webhook secret can call it too; ?dry=1
// returns the message without syncing or posting.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHANNEL = process.env.SLACK_UPDATE_CHANNEL || "C0C7LPU935M";

export async function GET(req) {
  const url = new URL(req.url);
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const allowed = secretOk(bearer, process.env.CRON_SECRET) || secretOk(url.searchParams.get("secret"), cfg().webhookSecret);
  if (!allowed) return Response.json({ ok: false }, { status: 401 });

  const dry = Boolean(url.searchParams.get("dry"));
  if (!dry && dbConfigured()) {
    await runSync({ trigger: "daily-update", log: () => {} });
    datasetChanged();
  }

  const ds = await dataset();
  if (ds.seed) return Response.json({ ok: false, error: "No database, only seed data. Not posting." }, { status: 503 });

  const { text } = dailyUpdate(prepare(ds), { url: url.origin });
  if (dry) return Response.json({ ok: true, sent: false, text });

  const out = await post({ channel: CHANNEL, text });
  return Response.json({ ok: true, ...out });
}
