#!/usr/bin/env node
// The numbers the pages show, checked against the seed without a browser or
// a database. Run before every push: npm run selftest
import assert from "node:assert/strict";
import { seedDataset } from "../lib/seed.js";
import { prepare, funnel, windowFor, series, bySignal, queue, responseTimes, isoWeek, byCampaign } from "../lib/derive.js";

const now = Date.parse("2026-09-25T18:00:00Z");
const p = prepare(seedDataset(now));
const all = windowFor("all", now);

assert.equal(isoWeek(Date.parse("2026-09-08")), 37, "W37 starts Sep 8, as in the rolling doc");

const f = funnel(p, all);
assert.ok(f.contacted > 0 && f.replied > 0, "seed produces volume");
assert.ok(f.replied <= f.contacted, "replies never exceed contacted");
assert.ok(f.held <= f.booked + 5, "held tracks booked");

// Channel split adds back up to the whole.
const e = funnel(p, all, { channel: "email" });
const l = funnel(p, all, { channel: "linkedin" });
assert.equal(e.contacted + l.contacted, f.contacted, "email + linkedin = total contacted");

// Signal split adds back up to the whole.
const s = bySignal(p, all);
assert.equal(s.reduce((n, x) => n + x.funnel.contacted, 0), f.contacted, "signals sum to total contacted");
assert.equal(s.reduce((n, x) => n + x.funnel.booked, 0), f.booked, "signals sum to total booked");

// Weekly buckets add up to the window.
const w = series(p, all, "week");
assert.equal(w.reduce((n, b) => n + b.contacted, 0), f.contacted, "weeks sum to the window");
const d = series(p, windowFor("4w", now), "day");
assert.equal(d.reduce((n, b) => n + b.replied, 0), funnel(p, windowFor("4w", now)).replied, "days sum to the window");

// Nothing unmapped in the seed: every seed campaign follows the convention.
assert.ok(p.campaigns.every((c) => c.signal !== "unmapped"), "seed campaigns all map to a signal");

const q = queue(p, now);
assert.ok(q.every((t) => t.lastFrom === "them"), "queue holds only threads waiting on us");
assert.ok(q.every((t, i) => !i || q[i - 1].waitingHours >= t.waitingHours), "queue is longest-waiting first");

const rt = responseTimes(p, all);
assert.equal(rt.bands.reduce((n, b) => n + b.count, 0), rt.count, "response bands cover every answered thread");

assert.equal(
  byCampaign(p, all, { channel: "email" }).reduce((n, c) => n + c.contacted, 0),
  e.contacted,
  "email campaigns sum to email contacted",
);

console.log(`selftest ok: ${f.contacted} contacted, ${f.replied} replied, ${f.positive} positive, ${f.booked} booked, ${f.held} held, ${f.qualified} qualified, ${q.length} waiting`);

// ---- adapters: payloads in the shape the docs specify ----------------------
import { threadsFromEmails } from "../lib/adapters/instantly.js";
import { threadFromConversation } from "../lib/adapters/heyreach.js";
import { signalFor } from "../lib/data/signals.js";

const emails = [
  { id: "1", thread_id: "T", ue_type: 1, timestamp_created: "2026-09-20T10:00:00Z", lead: "a@acme.ai", campaign_id: "C" },
  { id: "2", thread_id: "T", ue_type: 2, timestamp_created: "2026-09-21T10:00:00Z", lead: "a@acme.ai", campaign_id: "C", i_status: 1, content_preview: "Sure, Thursday?" },
  { id: "3", thread_id: "T", ue_type: 3, timestamp_created: "2026-09-21T12:30:00Z", lead: "a@acme.ai" },
  { id: "4", thread_id: "U", ue_type: 2, timestamp_created: "2026-09-22T09:00:00Z", lead: "b@beta.io", campaign_id: "C", is_auto_reply: 1 },
  { id: "5", thread_id: "V", ue_type: 2, timestamp_created: "2026-09-23T09:00:00Z", lead: "c@gamma.io", campaign_id: "C", i_status: -1 },
];
const th = threadsFromEmails(emails);
assert.equal(th.length, 2, "auto-reply-only threads are dropped");
const t = th.find((x) => x.threadId === "T");
assert.equal(t.positive, true, "i_status 1 is positive");
assert.equal(t.lastFrom, "us", "our manual answer was last");
assert.equal((Date.parse(t.answeredAt) - Date.parse(t.receivedAt)) / 3_600_000, 2.5, "answer time from timestamp_created");
assert.equal(th.find((x) => x.threadId === "V").status, "not interested");

const conv = threadFromConversation(
  {
    id: "X", campaignId: 12345, lastMessageSender: "CORRESPONDENT",
    correspondentProfile: { firstName: "Ana", lastName: "Reyes", companyName: "Sierra", profileUrl: "https://linkedin.com/in/ana", autoTags: [{ name: "Interested" }] },
    messages: [
      { createdAt: "2026-09-20T10:00:00Z", sender: "ME", body: "Hi" },
      { createdAt: "2026-09-22T10:00:00Z", sender: "CORRESPONDENT", body: "Tell me more" },
    ],
  },
  "Zubin",
);
assert.equal(conv.positive, true, "HeyReach Interested auto-tag is positive");
assert.equal(conv.lastFrom, "them", "their message was last, so it waits on us");
assert.equal(conv.campaignId, "12345");
assert.equal(threadFromConversation({ id: "Y", messages: [{ createdAt: "2026-09-20T10:00:00Z", sender: "ME" }] }, "Zubin"), null, "no reply, no thread");

// Existing names from the HeyReach screenshot file under the right signal.
assert.equal(signalFor({ name: "Raindrop AI Wide Net - Grade A - Michael" }), "wide-net");
assert.equal(signalFor({ name: "Raindrop AE Tier 1 Outbound" }), "ae-whitespace");
assert.equal(signalFor({ name: "AE Tier 1 follow-ups" }), "ae-whitespace");
console.log("adapter selftest ok");
// Zubin's live LinkedIn names say "announce", not "launch" (docs/CAMPAIGNS.md).
assert.equal(signalFor({ name: "AI 60-Day Announce - ZK Copy B" }), "agent-launch");
assert.equal(signalFor({ name: "AI announcement in the last 60 days A version" }), "agent-launch");
console.log("live-name selftest ok");
import { flow } from "../lib/derive.js";
for (const s of flow(f)) assert.equal(s.kept + s.dropped, s.total, `flow ${s.to}: kept + dropped = reached`);
console.log("flow selftest ok");
import { buildUpdate } from "../lib/comms.js";
const upd = buildUpdate(p, { now, hubspot: true }).text;
assert.ok(upd.startsWith("Hey team"), "update opens casually");
assert.ok(!/—|–| - /.test(upd), "no dashes between words in the update");
assert.ok(upd.length < 1400, "update stays short");
console.log("comms selftest ok");
