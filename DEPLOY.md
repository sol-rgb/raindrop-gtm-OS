# Deploying

The same arrangement as Raindrop OS: one web service, a Supabase database,
and the hourly sync on GitHub Actions.

## 1. Supabase

Create a **new** project (kept apart from Raindrop OS so recruiting and GTM
data never share a database). Connect, then Session pooler, and copy the URI
with the password filled in. Session pooler, for the same reasons as Raindrop
OS: IPv4, prepared statements, and the keepalive settings in `lib/db.js`.

## 2. Repository secrets

Settings, Secrets and variables, Actions, in an environment named
`production`:

```
DATABASE_URL
INSTANTLY_API_KEY
HEYREACH_API_KEY_ZUBIN
HEYREACH_API_KEY_MICHAEL
HUBSPOT_SERVICE_KEY          (when Gonz has it)
```

Then run **Actions, Apply migrations**, then **Actions, Probe keys** to see
every campaign each key can read, then **Actions, Hourly sync** once by hand.

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
`CRON_SECRET` in Vercel so the cron call is authenticated. On a Pro plan the
schedule in `vercel.json` can be made hourly.

## 4. Clay and webhooks

The `/system` page has the exact URL, header and body for the Clay HTTP
column and both reply webhooks, filled in with the live domain.
