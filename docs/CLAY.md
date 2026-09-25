# Clay

What is in the Raindrop Clay workspace (read from screenshots, Sep 25, 2026)
and what the OS needs from it.

## What is there

The live setup is the **Raindrop_building** folder (Sep 2026). The workbooks at
the top level of the workspace (Track job posts, Track news articles, the
Zubin LinkedIn outbound tables) are earlier versions of the same thing.

| Workbook | What it is | Signal |
|---|---|---|
| ICP Fit Masterfile | RAINDROP_ICP_MASTER_LIST, 5,339 companies, feeding three Clay signals: Job posting (biweekly, 1,419 people), New hire (monthly, 292 people), News and fundraising (monthly, 59 people) | Hiring (job posting and new hire), Funding and New agent launch (news) |
| ICP Fit social listening | RAINDROP_ICP_MASTER_LIST_NA, 2,848 North American companies with vertical, ICP tier and a `source` column: `competitor_followers` or `yc` | Competitor stack, YC |
| Linkedin Campaign 24.08, last 60 days trigger | The LinkedIn send Gonz's table lists as 221 sent | New agent launch |
| Website visitors tracking | RB2B webhook, AI fit checks, then **Add lead to campaign** and a Slack message. 558 rows received, 11 pass the filters | Website visitors |
| Wide net .ai campaign / US + CA | 5,710 companies into 10,894 leadership contacts | Wide net |
| YC companies | Two YC lists (1,528 and 1,198 companies) into 2,715 executive contacts | YC |
| DNC folder | DNCs: people (1,334), companies (2,281), HeyReach exclude list (1,398), fuzzy match review (56), rebrand review (60). Hubspot: BIG DNC (8,037) and 21 DAYS (221), both refreshed daily from HubSpot | Exclusions, not a signal |
| raindrop_account_list_114 (top level) | 116 named accounts | Enterprise |

Only Website visitors pushes straight into a sending tool. The rest reach
Instantly and HeyReach some other way (CSV or a column not in the
screenshots), and none carries which signal a row came from.

## What the OS needs

1. **Confirm the map above with Pranav**, especially how leads get from each
   final table into Instantly or HeyReach, and whether New hire belongs under
   Hiring.
2. **One HTTP API column on the last table of each signal.** Instructions with
   the live URL are on `/system`. Body:

   ```json
   {
     "id": "{{row id}}",
     "signal": "hiring",
     "company": "{{Company}}",
     "domain": "{{Domain}}",
     "person": "{{Full name}}",
     "email": "{{Email}}",
     "linkedin": "{{LinkedIn URL}}"
   }
   ```

   Signal keys: `website-visitors`, `product-signups`, `hiring`,
   `agent-launch`, `funding`, `competitor-stack`, `wide-net`, `enterprise`,
   `ae-whitespace`, `calcom-warm`, `yc`.

   Growth plan includes HTTP API columns. Each call costs one Action. Use
   "Only run if" on a filled domain so each row is sent once; a re-send
   updates the row rather than double counting.
3. **Later:** if leads keep moving by CSV, the native Clay "Add lead to
   campaign" actions for Instantly and HeyReach would remove that step. Not
   needed for the dashboard.
