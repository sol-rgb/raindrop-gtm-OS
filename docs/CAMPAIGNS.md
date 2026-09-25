# Campaigns and their signals

Snapshot from `npm run probe` on 2026-09-25, read only. Every Instantly and
HeyReach campaign, its last 60 days, and the signal it lands under today by
the name patterns in `lib/data/signals.js`.

Instantly names that contain a long dash are shown here with a plain hyphen.

## How to read the numbers

- **Contacted**, Instantly: new leads contacted (`new_leads_contacted`).
- **Contacted**, HeyReach: connection requests plus InMails sent.
- **Replies**, Instantly: unique replies. HeyReach: message plus InMail replies.
- Instantly campaigns send from a shared inbox pool, so the sender is the pool, not a person.

## Every campaign

| Tool | Sender | Campaign | Status | Contacted (60d) | Replies (60d) | Signal today |
|---|---|---|---|---:|---:|---|
| Instantly | Inbox pool | Wide Net (US .ai) - agent name enriched | paused | 1,203 | 17 | Wide net |
| Instantly | Inbox pool | Test campaign | completed | 3 | 3 | **Unmapped** |
| Instantly | Inbox pool | Test campaign (copy) | completed | 2 | 1 | **Unmapped** |
| Instantly | Inbox pool | Test campaign (copy) | completed | 1 | 1 | **Unmapped** |
| Instantly | Inbox pool | New Agent Launch (Named Agent) - .ai wide net split | draft | 0 | 0 | New agent launch |
| Instantly | Inbox pool | New Agent Launch - shell (copy pending approval) | draft | 0 | 0 | New agent launch |
| Instantly | Inbox pool | Braintrust Followers | draft | 0 | 0 | Competitor stack |
| Instantly | Inbox pool | Langfuse Followers | draft | 0 | 0 | Competitor stack |
| Instantly | Inbox pool | Website Visitors - Email 1 (approved) | draft | 0 | 0 | Website visitors |
| Instantly | Inbox pool | Wide Net (YC US/CA) - 4-angle split test | draft | 0 | 0 | Wide net |
| Instantly | Inbox pool | Wide Net (US .ai) - 4-angle split test | draft | 0 | 0 | Wide net |
| Instantly | Inbox pool | Hiring Signal (YC US/CA) - AI devs, 2-angle split | draft | 0 | 0 | Hiring |
| Instantly | Inbox pool | Raindrop - MISFITS PARKED, do not send (2026-09-25) | draft | 0 | 0 | **Unmapped** |
| HeyReach | Michael | Raindrop AI Wide Net - Grade A - Michael | paused | 68 | 2 | Wide net |
| HeyReach | Michael | Raindrop AE Tier 1 Outbound | finished | 39 | 0 | AE whitespace T1 |
| HeyReach | Michael | AE Tier 1 follow-ups | finished | 0 | 0 | AE whitespace T1 |
| HeyReach | Zubin | AI 60-Day Announce - ZK Copy B | paused | 75 | 8 | **Unmapped** |
| HeyReach | Zubin | AI 60-Day Announce - ZK Copy A | paused | 72 | 7 | **Unmapped** |
| HeyReach | Zubin | CAT/CARRARA: Hiring outbound | finished | 51 | 3 | Hiring |
| HeyReach | Zubin | Zubin Outbound Updated Final | paused | 48 | 0 | **Unmapped** |
| HeyReach | Zubin | AI announcement in the last 60 days A version | paused | 40 | 6 | **Unmapped** |
| HeyReach | Zubin | AI announcement in the last 60 days B version | paused | 6 | 1 | **Unmapped** |
| HeyReach | Zubin | Website Visitor campaign | paused | 4 | 0 | Website visitors |
| HeyReach | Zubin | Accepted Not Messaged - Follow Up | finished | 0 | 9 | **Unmapped** |
| HeyReach | Zubin | AI Announcement in the last 60 days | paused | 0 | 0 | **Unmapped** |
| HeyReach | Zubin | Follow-up campaign for non-DMs sent | draft | 0 | 0 | **Unmapped** |
| HeyReach | Zubin | CEO Copy (ZK) - Draft | draft | 0 | 0 | **Unmapped** |
| HeyReach | Zubin | Test | draft | 0 | 0 | **Unmapped** |
| HeyReach | Zubin | TESTING SLACK CHANNEL | draft | 0 | 0 | **Unmapped** |
| HeyReach | Zubin | Test campaign | finished | 0 | 0 | **Unmapped** |

### Totals, last 60 days

| Tool | Sender | Contacted | Replies | Of which Unmapped |
|---|---|---:|---:|---|
| Instantly | Inbox pool | 1,209 | 22 | 6 contacted, 5 replies (all test sends) |
| HeyReach | Michael | 107 | 2 | none |
| HeyReach | Zubin | 296 | 34 | 241 contacted, 31 replies |

The headline: on Zubin's LinkedIn, 31 of 34 replies sit in Unmapped. Nearly
all of it is the "AI announcement in the last 60 days" family, which is the
New agent launch signal under another name. Until those are renamed or
mapped, `/signals` will under-report that signal and over-report Unmapped.

## Unmapped or misfiled, with a suggested fix

Suggested names follow `<Signal> · <Channel>`. A suffix in brackets keeps
split tests apart and still matches the pattern.

### Should be New agent launch (currently Unmapped)

The pattern for New agent launch is `launch|new agent`, and these say
"announce" instead.

| Campaign | Suggested name |
|---|---|
| AI 60-Day Announce - ZK Copy A | New agent launch · LinkedIn (ZK copy A) |
| AI 60-Day Announce - ZK Copy B | New agent launch · LinkedIn (ZK copy B) |
| AI announcement in the last 60 days A version | New agent launch · LinkedIn (A) |
| AI announcement in the last 60 days B version | New agent launch · LinkedIn (B) |
| AI Announcement in the last 60 days | New agent launch · LinkedIn |

Alternative to renaming five campaigns: add `announce` to the New agent
launch pattern in `lib/data/signals.js`. Not done here, pending a yes.

### Needs a decision from Zubin

| Campaign | What it looks like | Suggested name |
|---|---|---|
| Zubin Outbound Updated Final | 48 requests, close to the 50-company LinkedIn batch that `signals.js` already notes looks like New agent launch | New agent launch · LinkedIn, if confirmed |
| Accepted Not Messaged - Follow Up | Follow-up to people who accepted in other campaigns. 9 replies with no new requests, so the replies belong to whichever campaign sourced the lead | Map in `signal_map` to the parent signal (likely New agent launch), or leave Unmapped |
| Follow-up campaign for non-DMs sent | Draft follow-up, same question as above | Same as above |
| CEO Copy (ZK) - Draft | Draft copy test, no sends | Rename once the target signal is known, e.g. New agent launch · LinkedIn (CEO copy) |

### Possibly misfiled

| Campaign | Filed under | Concern | Suggestion |
|---|---|---|---|
| CAT/CARRARA: Hiring outbound | Hiring | "Hiring" in the name could mean recruiting (Carrara) rather than the Hiring sales signal. The plan also runs Hiring by email only | If it is sales outreach to companies with open roles: Hiring · LinkedIn. If it is recruiting: move it out of the GTM view with `signal_map` or rename so it matches nothing |
| New Agent Launch (Named Agent) - .ai wide net split | New agent launch | The list is the .ai wide net list, not launch-gated. The first matching pattern wins, so "launch" beats "wide net" | Wide net · Email (named agent) if it is not gated on launch news, otherwise New agent launch · Email |
| Website Visitors - Email 1 (approved) | Website visitors | Mapping is right, but the plan runs this signal on LinkedIn only | Keep as Website visitors · Email and update the plan, or move it to HeyReach |
| Raindrop AI Wide Net - Grade A - Michael | Wide net | Mapping is right. The plan lists Zubin as the Wide net sender, this one runs from Michael | No rename needed: Wide net · LinkedIn (Michael) if you want the convention |

### Tests and parked lists (fine as Unmapped)

Instantly: Test campaign, Test campaign (copy) twice, Raindrop - MISFITS
PARKED. HeyReach Zubin: Test, TESTING SLACK CHANNEL, Test campaign.
Suggest archiving the tests so they drop out of the Unmapped bucket. The three
Instantly tests did send 6 emails and got 5 replies, which will show up in the
email totals until they are archived or excluded.

## Are the two HeyReach keys separate workspaces?

Yes. The Zubin key and the Michael key each see a different workspace
(different organization unit IDs), each with exactly one LinkedIn account
(Zubin Koticha and Michael Moran respectively), and no campaign shows up
under both. The sync can safely add the two together without double
counting.

## API check

Every call the probe makes succeeded against the live APIs: Instantly
campaigns and daily analytics, HeyReach campaigns and stats by campaign, for
both keys. The response fields match what the adapters in `lib/adapters/`
read, so no adapter changes were needed.
