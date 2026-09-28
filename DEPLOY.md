# Deploying

The same arrangement as Raindrop OS: one web service, a Supabase database,
and scheduled syncs (Vercel Cron daily, GitHub Actions roughly hourly).

## 1. Supabase

Create a **new** project (kept apart from Raindrop OS so recruiting and GTM
data never share a database). Connect, then Session pooler, and copy the URI
with the password filled in. Session pooler, for the same reasons as Raindrop
OS: IPv4, prepared statements, and the keepalive settings in `lib/db.js`.

## 2. Repository secret

Every secret lives in Vercel. GitHub needs one, so the hourly workflow can
ask the live app to sync: Settings, Secrets and variables, Actions, New
repository secret, named `CRON_SECRET`, with the same value as in Vercel.
Without it the hourly job skips with a note rather than failing.

The manual **Apply migrations** and **Probe keys** workflows still read
`DATABASE_URL` and the API keys from a `production` environment, for the day
someone wants to run them from GitHub. Schema changes have so far been
applied through Supabase directly.

## 3. Web service (Railway or Vercel)

Railway detects Next.js and needs nothing beyond variables. Set:

```
DATABASE_URL
SITE_PASSWORD
CLAY_INGEST_SECRET          any long random string
WEBHOOK_SECRET              another one
INSTANTLY_API_KEY           the webhooks re-read one thread with it
HEYREACH_API_KEY_ZUBIN
HEYREACH_API_KEY_MICHAEL
```

Healthcheck path `/api/healthz`, which is outside the password gate on
purpose.

## 3b. The sync on Vercel (what is live today)

The sync also runs inside the web app, so all secrets can live in Vercel
alone: `/api/cron/sync` runs daily at 13:07 UTC through Vercel Cron
(`vercel.json`), and **Sync now** on `/system` runs it on demand. Add
`CRON_SECRET` in Vercel so the cron call is authenticated. For roughly hourly
syncs without a Pro plan, the GitHub **Hourly sync** workflow calls the same
route; it needs the `CRON_SECRET` repository secret from step 2.

## 4. Clay and webhooks

The `/system` page has the exact URL, header and body for the Clay HTTP
column and both reply webhooks, filled in with the live domain.
