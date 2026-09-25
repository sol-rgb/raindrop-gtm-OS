# Clay

What is in the Raindrop Clay workspace (read from screenshots, Sep 25, 2026)
and what the OS needs from it.

## What is there

| Workbook | What it is | Signal |
|---|---|---|
| Track job posts | The 670-company ICP list (raindrop_ai_list_all_prime_strong, all tier PRIME) into a Job posting signal, biweekly and **paused**, into a person table (87 rows) | Hiring |
| Track news articles | The same 670 list into a News and fundraising signal, biweekly and **paused**, into a person table (5 rows) | Funding, New agent launch |
| raindrop_account_list_114, Single Company Search | 116 named accounts: tier 1 frontier labs and agent companies | Enterprise |
| Raindrop, Linkedin outbound, and Zubin LinkedIn outbound (50 net-new) | 50 companies (Legal, Voice verticals) into 146 founder contacts | Likely the LinkedIn batch Gonz's table lists as 221 sent, New agent launch or Wide net: to confirm |
| Custom signal | LinkedIn professional posts, 6 rows | Test, ignored |
| Clay Starter Table | Clay's demo table | Ignored |

No table has an Instantly or HeyReach "add to campaign" column, and none
carries which signal a row came from. Leads look to be moving to the sending
tools by CSV.

## What the OS needs

1. **Confirm the map above with Pranav**, especially which signal the 50-company
   LinkedIn batch is, and whether the two paused signals are meant to be on.
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
   `ae-whitespace`, `calcom-warm`.

   Growth plan includes HTTP API columns. Each call costs one Action. Use
   "Only run if" on a filled domain so each row is sent once; a re-send
   updates the row rather than double counting.
3. **Later:** if leads keep moving by CSV, the native Clay "Add lead to
   campaign" actions for Instantly and HeyReach would remove that step. Not
   needed for the dashboard.
