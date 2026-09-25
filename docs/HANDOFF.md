# Raindrop GTM OS: handoff

Context for any new session picking this up.

## What we're building
A GTM dashboard for Raindrop outbound, requested by Gonz (Carrara). Sections:
1. Pipeline: leads entered, contacted, replied, positive, meeting booked, meeting held, qualified. By day, week, month.
2. Signals: results per signal (Hiring, New Agent Launch, Funding, WideNet, Competitor Stack, Enterprise, Website Visitors, Product Signups, AE Whitespace, Cal.com Warm).
3. Email (Instantly) and LinkedIn (HeyReach) channel views.
4. Response manager and response time (later phase, Gonz said "later").

Prototype: https://claude.ai/artifact/MLDsPCEE1vjRiTMqbpwmSW

## Design
Replicate exactly the branding and design system of https://github.com/sol-rgb/raindrop-OS
(Next.js 16, Tailwind, Supabase via pg, Railway web + worker, GitHub Actions, app/globals.css tokens, Alpha Lyrae font, components/*).

## Access status (2026-09-25)
| Tool | Status | Env var |
|---|---|---|
| Instantly | Hypergrowth plan, API key received (webhooks available) | INSTANTLY_API_KEY |
| HeyReach | Keys for Zubin and Michael (AE) | HEYREACH_API_KEY_ZUBIN, HEYREACH_API_KEY_MICHAEL |
| Clay | Sol added, Growth plan (HTTP API column + webhooks available) | none |
| HubSpot | Pending: Service Key via Gonz (read contacts, companies, deals) | HUBSPOT_SERVICE_KEY |
| RB2B | Nothing needed, already feeds Clay | none |

Network note (2026-09-25): the "Sol" environment created Sep 25 has the three keys set, but its network policy blocks api.instantly.ai and api.heyreach.io (proxy returns 403 on CONNECT). Add both hosts to the allowed domains before testing.

## Verified API facts
- Instantly v2: GET /api/v2/campaigns/analytics, /analytics/daily, /analytics/overview, /analytics/steps; GET /api/v2/emails (20 req/min cap); lead lt_interest_status; webhooks on Hypergrowth+ (reply_received, lead_interested, ...). Scope all:read.
- HeyReach: base https://api.heyreach.io/api/public, header X-API-KEY, 300 req/min. POST /stats/GetOverallStats (byDayStats), /stats/GetOverallStatsByCampaign, /campaign/GetAll, GetConversationsV3. Keys are per workspace; check whether both keys hit the same workspace.
- Clay: no need for read API; add an HTTP API column (1 Action per row, "Only run if") posting each lead to our endpoint.
- HubSpot: Service Key (legacy private apps sunset Oct 26, 2026). Meetings read with crm.objects.contacts.read. hs_meeting_outcome for held vs booked. Add custom "Source signal" dropdown on Contact and Deal.

## Build status
The app is built (see README.md): Pipeline, Signals, Email, LinkedIn, Replies,
System, on seed data until a database is connected. Sync worker, Clay ingest
endpoint and reply webhooks are written against the verified API shapes.
`npm run probe` checks the keys read-only; `npm run selftest` checks the math.
Clay workspace map: docs/CLAY.md.

## Next steps
1. Run `npm run probe` with the keys; rename or map any Unmapped campaign.
2. Create a new Supabase project; follow DEPLOY.md.
3. HubSpot Service Key from Gonz, plus the Source signal property.
4. Confirm the Clay map with Pranav; add the HTTP columns.
