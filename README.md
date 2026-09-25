# Raindrop GTM OS

Outbound in one place: the pipeline, the signals feeding it, each channel,
and the replies waiting on us. The GTM counterpart to
[Raindrop OS](https://github.com/sol-rgb/raindrop-OS), on the same stack and
the same design system.

Built by Carrara.

## The shape

```
Signals        Clay tables (job posts, news and funding, named accounts, lists)
                    |  HTTP column, one row per qualified lead
Send           Instantly (email)          HeyReach (LinkedIn, one workspace per sender)
                    |  hourly sync + reply webhooks
Meetings       HubSpot meetings and deals, tagged with a source signal
                    |
The OS         Pipeline · Signals · Email · LinkedIn · Replies · System
```

## The surfaces

| Route | What it answers |
|---|---|
| `/` | Pipeline. Leads entered to qualified, pipeline created, meetings held against the plan's 15 a week. |
| `/signals` | Every signal in the plan, what it produced, and what it was expected to produce. |
| `/signals/[key]` | One signal: its funnel, its Clay source, its campaigns. |
| `/email` | Instantly. Sends, reply rate against the 2 to 3% plan, positive rate, every campaign. |
| `/linkedin` | HeyReach, by sender. Acceptance against ~27%, reply rate on accepted against ~9%. |
| `/replies` | Who is waiting on us, longest first, and how long we take to answer. |
| `/system` | What is connected, when it last answered, and the Clay setup. |

## How a campaign finds its signal

By name. Every campaign in Instantly and HeyReach should be named
`<Signal> · <Channel>`, for example `Hiring · Email` or `Wide net · LinkedIn`.
Existing names are matched by the patterns in `lib/data/signals.js`, and
anything that matches nothing shows up as **Unmapped** on `/signals` rather
than disappearing. A row in the `signal_map` table overrides the name.

## Current state

Nothing is connected in production yet, so every page runs on seed data and
says so. The seed is deterministic and follows the plan's volumes and
benchmarks, so the shape can be argued with before the plumbing is live.

## Local

```
npm install
SITE_PASSWORD=dev npm run dev      # seed data, no database needed
npm run selftest                   # the numbers, checked
npm run probe                      # read-only check of every API key in the env
```

See `DEPLOY.md` to take it live and `docs/CLAY.md` for the Clay side.
