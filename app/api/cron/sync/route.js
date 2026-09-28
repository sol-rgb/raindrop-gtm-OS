import { cfg } from "../../../../lib/config";
import { dbConfigured } from "../../../../lib/db";
import { secretOk } from "../../../../lib/secret";
import { runSync } from "../../../../lib/sync/run";
import { datasetChanged } from "../../../../lib/freshness";

// The sync, run inside the web app on Vercel, so every secret lives in one
// place. Vercel Cron calls it with "Authorization: Bearer <CRON_SECRET>";
// anything else (a GitHub Action, a curl) can call it with
// ?secret=<WEBHOOK_SECRET>. The GitHub Action in .github/workflows/hourly.yml
// calls this same route with the CRON_SECRET bearer and ?source=github.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req) {
  const c = cfg();
  const url = new URL(req.url);
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const allowed =
    secretOk(bearer, process.env.CRON_SECRET) || secretOk(url.searchParams.get("secret"), c.webhookSecret);
  if (!allowed) return Response.json({ ok: false }, { status: 401 });
  if (!dbConfigured()) return Response.json({ ok: false, error: "DATABASE_URL is not set" }, { status: 503 });

  // Label the run by who asked, so /system shows Vercel's daily run apart
  // from the GitHub hourly one.
  const trigger =
    url.searchParams.get("source") === "github" ? "github-hourly" : bearer ? "vercel-cron" : "api";
  const lines = [];
  const out = await runSync({ trigger, log: (l) => lines.push(l) });
  datasetChanged();
  return Response.json({ ...out, log: lines }, { status: out.ok ? 200 : 500 });
}
