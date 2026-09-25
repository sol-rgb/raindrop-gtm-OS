// The hourly tick: pull every connected source, write what it said, and
// record that it ran. Each source is pulled on its own, so HubSpot being
// down never stops Instantly from refreshing.
//
// Everything is an upsert over a trailing window. Re-running the same hour
// twice writes the same rows twice and changes nothing.

import { cfg } from "../config.js";
import { query, one } from "../db.js";
import { daysAgo } from "../adapters/http.js";
import { instantly, threadsFromEmails } from "../adapters/instantly.js";
import { heyreach } from "../adapters/heyreach.js";
import { hubspot } from "../adapters/hubspot.js";

// Stats are re-pulled over the last 45 days every run, because a reply can
// land weeks after the send it belongs to. Conversations go back 30.
const STATS_DAYS = 45;
const THREAD_DAYS = 30;

async function upsertCampaigns(rows) {
  for (const c of rows) {
    await query(
      `insert into campaigns (source, id, name, status, channel, sender, open_tracking, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7, now())
       on conflict (source, id) do update set
         name = excluded.name, status = excluded.status, channel = excluded.channel,
         sender = coalesce(excluded.sender, campaigns.sender),
         open_tracking = excluded.open_tracking, updated_at = now()`,
      [c.source, c.id, c.name, c.status, c.channel, c.sender, c.openTracking],
    );
  }
}

async function upsertDaily(rows) {
  for (const r of rows) {
    await query(
      `insert into campaign_daily (source, campaign_id, day, contacted, sent, opened, replied,
         opportunities, connections_sent, connections_accepted, messages_started)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (source, campaign_id, day) do update set
         contacted = excluded.contacted, sent = excluded.sent, opened = excluded.opened,
         replied = excluded.replied, opportunities = excluded.opportunities,
         connections_sent = excluded.connections_sent,
         connections_accepted = excluded.connections_accepted,
         messages_started = excluded.messages_started`,
      [r.source, r.campaignId, r.day, r.contacted, r.sent, r.opened, r.replied,
       r.opportunities, r.connectionsSent, r.connectionsAccepted, r.messagesStarted ?? 0],
    );
  }
}

export async function upsertThreads(rows) {
  for (const t of rows) {
    await query(
      `insert into replies (source, thread_id, channel, campaign_id, sender, lead_name, lead_company,
         lead_email, status, positive, received_at, answered_at, last_from, last_at, snippet, url,
         owner, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
       on conflict (source, thread_id) do update set
         campaign_id = coalesce(excluded.campaign_id, replies.campaign_id),
         status = excluded.status, positive = excluded.positive,
         answered_at = coalesce(replies.answered_at, excluded.answered_at),
         last_from = excluded.last_from, last_at = excluded.last_at,
         snippet = excluded.snippet, updated_at = now(),
         -- A new message from them reopens a thread somebody marked done.
         done = case when excluded.last_at > replies.last_at and excluded.last_from = 'them'
                     then false else replies.done end`,
      [t.source, t.threadId, t.channel, t.campaignId, t.sender, t.leadName, t.leadCompany,
       t.leadEmail, t.status, t.positive, t.receivedAt, t.answeredAt, t.lastFrom, t.lastAt,
       t.snippet, t.url ?? null, t.owner ?? t.sender ?? null],
    );
  }
}

async function mark(source, fn) {
  try {
    const counts = await fn();
    await query(
      `insert into sync_state (source, last_ok_at, counts) values ($1, now(), $2)
       on conflict (source) do update set last_ok_at = now(), counts = $2`,
      [source, JSON.stringify(counts)],
    );
    return { source, ok: true, ...counts };
  } catch (e) {
    await query(
      `insert into sync_state (source, last_error, last_error_at) values ($1, $2, now())
       on conflict (source) do update set last_error = $2, last_error_at = now()`,
      [source, e.message.slice(0, 500)],
    );
    return { source, ok: false, error: e.message };
  }
}

export async function runSync({ trigger = "cron", log = console.log } = {}) {
  const c = cfg();
  const run = await one("insert into run_log (trigger) values ($1) returning id", [trigger]);
  const results = [];
  const to = new Date();

  if (c.instantlyApiKey) {
    results.push(
      await mark("instantly", async () => {
        const api = instantly(c.instantlyApiKey);
        const campaigns = await api.campaigns();
        await upsertCampaigns(campaigns);
        let days = 0;
        for (const cp of campaigns) {
          const rows = await api.daily(cp.id, daysAgo(STATS_DAYS), to);
          await upsertDaily(rows);
          days += rows.length;
        }
        const threads = threadsFromEmails(await api.conversationEmails(daysAgo(THREAD_DAYS)));
        // Email replies are owned by whoever the mailbox sends as. Raindrop's
        // cold email all goes out as Zubin.
        await upsertThreads(threads.map((t) => ({ ...t, owner: "Zubin" })));
        log(`instantly: ${campaigns.length} campaigns, ${days} campaign-days, ${threads.length} threads`);
        return { campaigns: campaigns.length, days, threads: threads.length };
      }),
    );
  }

  for (const k of c.heyreach) {
    results.push(
      await mark(`heyreach:${k.label.toLowerCase()}`, async () => {
        const api = heyreach(k.key, k.label);
        const campaigns = await api.campaigns();
        await upsertCampaigns(campaigns);
        const daily = await api.daily(daysAgo(STATS_DAYS), to);
        await upsertDaily(daily);
        const threads = await api.conversations(daysAgo(THREAD_DAYS));
        await upsertThreads(threads);
        log(`heyreach ${k.label}: ${campaigns.length} campaigns, ${daily.length} campaign-days, ${threads.length} threads`);
        return { campaigns: campaigns.length, days: daily.length, threads: threads.length };
      }),
    );
  }

  if (c.hubspotKey) {
    results.push(
      await mark("hubspot", async () => {
        const api = hubspot(c.hubspotKey);
        const meetings = await api.meetings(daysAgo(90));
        for (const m of meetings) {
          await query(
            `insert into meetings (id, contact_id, company, signal, title, booked_at, start_at, outcome)
             values ($1,$2,$3,$4,$5,$6,$7,$8)
             on conflict (id) do update set company = excluded.company, signal = excluded.signal,
               title = excluded.title, start_at = excluded.start_at, outcome = excluded.outcome`,
            [m.id, m.contactId, m.company, m.signal, m.title, m.bookedAt, m.startAt, m.outcome],
          );
        }
        const deals = await api.deals(daysAgo(180));
        for (const d of deals) {
          await query(
            `insert into deals (id, company, signal, stage, amount, created_at, qualified)
             values ($1,$2,$3,$4,$5,$6,$7)
             on conflict (id) do update set company = excluded.company, signal = excluded.signal,
               stage = excluded.stage, amount = excluded.amount, qualified = excluded.qualified`,
            [d.id, d.company, d.signal, d.stage, d.amount, d.createdAt, d.qualified],
          );
        }
        log(`hubspot: ${meetings.length} meetings, ${deals.length} deals`);
        return { meetings: meetings.length, deals: deals.length };
      }),
    );
  }

  const ok = results.every((r) => r.ok);
  await query("update run_log set finished_at = now(), ok = $2, detail = $3 where id = $1", [
    run.id, ok, JSON.stringify({ results }),
  ]);
  return { ok, results };
}
