// Instantly API v2. Read only: nothing here writes to Instantly.
//
// Endpoints, from the live OpenAPI spec at api.instantly.ai/openapi/api_v2.json:
//   GET /api/v2/campaigns                    paged by starting_after
//   GET /api/v2/campaigns/analytics/daily    per campaign, per UTC day
//   GET /api/v2/emails                       the Unibox; capped at 20 req/min
//
// The key needs read scopes only. all:read covers every call below.

import { call, ymd } from "./http.js";

const BASE = "https://api.instantly.ai/api/v2";

// Instantly's campaign status enum, from the spec.
const STATUS = {
  0: "draft",
  1: "active",
  2: "paused",
  3: "completed",
  4: "running subsequences",
  [-1]: "accounts unhealthy",
  [-2]: "bounce protect",
  [-99]: "suspended",
};

// Lead interest status. The number rides on every email as i_status. Only
// the positive end of the scale counts as a positive reply.
export const INTEREST = {
  1: "interested",
  2: "meeting booked",
  3: "meeting completed",
  4: "won",
  0: "out of office",
  [-1]: "not interested",
  [-2]: "wrong person",
  [-3]: "lost",
  [-4]: "no show",
};
export const isPositive = (i) => i != null && Number(i) >= 1;

// The emails endpoint allows 20 requests a minute, a third of a second
// apart would trip it inside one page of results. Three seconds keeps a
// full backfill under the cap with room for the webhook traffic.
const EMAIL_GAP_MS = 3_100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function instantly(apiKey) {
  const get = (path, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString();
    return call("instantly", `${BASE}${path}${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  };

  return {
    async campaigns() {
      const out = [];
      let after;
      do {
        const page = await get("/campaigns", { limit: 100, starting_after: after });
        for (const c of page.items ?? []) {
          out.push({
            source: "instantly",
            id: c.id,
            name: c.name,
            status: STATUS[c.status] ?? String(c.status),
            channel: "email",
            sender: null,
            openTracking: c.open_tracking ?? null,
          });
        }
        after = page.next_starting_after;
        if (!page.items?.length) break;
      } while (after);
      return out;
    },

    // One row per campaign per day. Unique replies rather than replies: a
    // lead who writes back three times is one reply for a funnel, and the
    // unique count already excludes auto-replies.
    async daily(campaignId, from, to) {
      const rows = await get("/campaigns/analytics/daily", {
        campaign_id: campaignId,
        start_date: ymd(from),
        end_date: ymd(to),
      });
      return (rows ?? []).map((r) => ({
        source: "instantly",
        campaignId,
        day: r.date,
        contacted: r.new_leads_contacted ?? r.contacted ?? 0,
        sent: r.sent ?? 0,
        opened: r.unique_opened ?? 0,
        replied: r.unique_replies ?? 0,
        opportunities: r.unique_opportunities ?? 0,
        connectionsSent: 0,
        connectionsAccepted: 0,
      }));
    },

    // One lead's emails, for the reply webhook: a single call rather than a
    // sweep of the whole Unibox.
    async leadEmails(lead) {
      const page = await get("/emails", { limit: 50, lead, preview_only: true });
      return page.items ?? [];
    },

    // Every email in the window that is either theirs (received) or ours
    // typed by a person (manual). Campaign sends are left out: they are the
    // bulk of the volume and none of them is a conversation.
    async conversationEmails(since) {
      const out = [];
      for (const email_type of ["received", "manual"]) {
        let after;
        do {
          const page = await get("/emails", {
            limit: 100,
            email_type,
            min_timestamp_created: new Date(since).toISOString(),
            starting_after: after,
            preview_only: true,
          });
          out.push(...(page.items ?? []));
          after = page.next_starting_after;
          if (!page.items?.length) break;
          await sleep(EMAIL_GAP_MS);
        } while (after);
      }
      return out;
    },
  };
}

// Emails into threads. One thread is one conversation with one lead, and
// the question for each is simple: who spoke last, and how long did we take
// the first time they wrote.
//
// timestamp_created on both sides, never timestamp_email: the spec warns the
// server timestamp can be wrong, and mixing the two would produce negative
// response times on exactly the threads that matter.
export function threadsFromEmails(emails) {
  const by = new Map();
  for (const e of emails) {
    const key = e.thread_id ?? e.id;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(e);
  }

  const threads = [];
  for (const [threadId, list] of by) {
    list.sort((a, b) => a.timestamp_created.localeCompare(b.timestamp_created));
    const theirs = list.filter((e) => e.ue_type === 2 && !e.is_auto_reply);
    if (!theirs.length) continue;

    const first = theirs[0];
    const last = list[list.length - 1];
    const ourFirstAnswer = list.find(
      (e) => e.ue_type === 3 && e.timestamp_created > first.timestamp_created,
    );
    const status = [...list].reverse().find((e) => e.i_status != null)?.i_status ?? null;

    threads.push({
      source: "instantly",
      threadId,
      channel: "email",
      campaignId: first.campaign_id ?? null,
      sender: first.eaccount ?? null,
      leadName: first.lead ?? null,
      leadCompany: first.lead ? first.lead.split("@")[1] ?? null : null,
      leadEmail: first.lead ?? null,
      status: INTEREST[status] ?? (status == null ? "unlabelled" : String(status)),
      positive: isPositive(status),
      receivedAt: first.timestamp_created,
      answeredAt: ourFirstAnswer?.timestamp_created ?? null,
      lastFrom: last.ue_type === 2 ? "them" : "us",
      lastAt: last.timestamp_created,
      snippet: (theirs[theirs.length - 1].content_preview ?? "").slice(0, 240),
    });
  }
  return threads;
}
