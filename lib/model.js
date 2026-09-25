// The one read path for every page. Reads Postgres when it is configured and
// has something in it, and the seed otherwise, and says which it did: a page
// showing invented numbers under a "connected" badge is the failure this
// exists to prevent.

import { cache } from "react";
import { dbConfigured, query } from "./db.js";
import { seedDataset } from "./seed.js";

const iso = (v) => (v == null ? null : new Date(v).toISOString());

async function fromDb() {
  const [campaigns, daily, leads, threads, meetings, deals, signalMap, runs, sources] =
    await Promise.all([
      query("select * from campaigns"),
      query("select * from campaign_daily where day >= current_date - 120"),
      query("select id, signal, company, entered_at from leads where entered_at >= now() - interval '120 days'"),
      query("select * from replies where received_at >= now() - interval '120 days'"),
      query("select * from meetings"),
      query("select * from deals"),
      query("select * from signal_map"),
      query("select * from run_log order by started_at desc limit 20"),
      query("select * from sync_state order by source"),
    ]);

  return {
    seed: false,
    campaigns: campaigns.map((c) => ({
      source: c.source, id: c.id, name: c.name, status: c.status, channel: c.channel,
      sender: c.sender, openTracking: c.open_tracking,
    })),
    daily: daily.map((r) => ({
      source: r.source, campaignId: r.campaign_id, day: iso(r.day).slice(0, 10),
      contacted: r.contacted, sent: r.sent, opened: r.opened, replied: r.replied,
      opportunities: r.opportunities, connectionsSent: r.connections_sent,
      connectionsAccepted: r.connections_accepted,
    })),
    leads: leads.map((l) => ({ id: l.id, signal: l.signal, company: l.company, enteredAt: iso(l.entered_at) })),
    threads: threads.map((t) => ({
      source: t.source, threadId: t.thread_id, channel: t.channel, campaignId: t.campaign_id,
      sender: t.sender, leadName: t.lead_name, leadCompany: t.lead_company, status: t.status,
      positive: t.positive, receivedAt: iso(t.received_at), answeredAt: iso(t.answered_at),
      lastFrom: t.last_from, lastAt: iso(t.last_at), snippet: t.snippet, url: t.url,
      owner: t.owner, done: t.done,
    })),
    meetings: meetings.map((m) => ({
      id: m.id, company: m.company, signal: m.signal, bookedAt: iso(m.booked_at),
      startAt: iso(m.start_at), outcome: m.outcome,
    })),
    deals: deals.map((d) => ({
      id: d.id, company: d.company, signal: d.signal, stage: d.stage,
      amount: d.amount == null ? null : Number(d.amount), createdAt: iso(d.created_at),
      qualified: d.qualified,
    })),
    signalMap: signalMap.map((s) => ({ source: s.source, campaignId: s.campaign_id, signal: s.signal })),
    sync: {
      lastRun: runs[0]
        ? { startedAt: iso(runs[0].started_at), finishedAt: iso(runs[0].finished_at), ok: runs[0].ok }
        : null,
      runs: runs.map((r) => ({
        id: r.id, trigger: r.trigger, startedAt: iso(r.started_at), finishedAt: iso(r.finished_at),
        ok: r.ok, detail: r.detail,
      })),
      sources: sources.map((s) => ({
        source: s.source, lastOkAt: iso(s.last_ok_at), lastError: s.last_error,
        lastErrorAt: iso(s.last_error_at), counts: s.counts,
      })),
    },
  };
}

// Cached per request, so four components on one page read the database once.
export const dataset = cache(async () => {
  if (!dbConfigured()) return { ...seedDataset(), why: "No database connected yet." };
  try {
    const ds = await fromDb();
    // Connected but never synced reads as seed, with the reason. An empty
    // dashboard looks like a dead pipeline, which is a worse lie.
    if (!ds.campaigns.length && !ds.leads.length) {
      return { ...seedDataset(), sync: ds.sync, why: "Database connected, first sync has not landed yet." };
    }
    return ds;
  } catch (e) {
    return { ...seedDataset(), why: `Cannot read the database: ${e.message}`, error: true };
  }
});
