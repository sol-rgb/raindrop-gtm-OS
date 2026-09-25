// HeyReach public API. Read only: nothing here writes to HeyReach.
//
// Base https://api.heyreach.io/api/public, key in the X-API-KEY header,
// 300 requests a minute shared across every endpoint. Endpoints from the
// official Postman collection:
//   POST /campaign/GetAll                    campaigns, 100 a page
//   POST /stats/GetOverallStatsByCampaign    per campaign, per day
//   POST /inbox/GetConversationsV3           conversations, cursor paged
//
// A key belongs to one workspace. Raindrop has one per sender, so every call
// here runs once per key and the sender label comes from the key's name.

import { call } from "./http.js";

const BASE = "https://api.heyreach.io/api/public";

// The AI auto-tag HeyReach launched in May 2026. "Interested" is the one
// that counts as a positive reply.
const POSITIVE_TAGS = /^interested$/i;

export function heyreach(apiKey, sender) {
  const post = (path, body) =>
    call("heyreach", `${BASE}${path}`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body,
    });

  return {
    sender,

    async check() {
      return call("heyreach", `${BASE}/auth/CheckApiKey`, {
        headers: { "X-API-KEY": apiKey },
      });
    },

    async campaigns() {
      const out = [];
      for (let offset = 0; ; offset += 100) {
        const page = await post("/campaign/GetAll", { offset, limit: 100 });
        for (const c of page.items ?? []) {
          out.push({
            source: "heyreach",
            id: String(c.id),
            name: c.name,
            status: (c.status ?? "unknown").toLowerCase().replace(/_/g, " "),
            channel: "linkedin",
            sender,
            openTracking: null,
          });
        }
        if (!page.items?.length || out.length >= Number(page.totalCount ?? 0)) break;
      }
      return out;
    },

    // byDayStats is keyed by an ISO midnight, with one entry per campaign.
    // Contacted on LinkedIn means a connection request or a first message to
    // an existing connection, which is what "totalMessageStarted" counts.
    async daily(from, to) {
      const res = await post("/stats/GetOverallStatsByCampaign", {
        accountIds: [],
        campaignIds: [],
        startDate: new Date(from).toISOString(),
        endDate: new Date(to).toISOString(),
      });
      const out = [];
      for (const [iso, list] of Object.entries(res?.byDayStats ?? {})) {
        for (const r of list ?? []) {
          out.push({
            source: "heyreach",
            campaignId: String(r.campaignId),
            day: iso.slice(0, 10),
            contacted: (r.connectionsSent ?? 0) + (r.inmailMessagesSent ?? 0),
            sent: (r.messagesSent ?? 0) + (r.inmailMessagesSent ?? 0),
            opened: 0,
            replied: (r.totalMessageReplies ?? 0) + (r.totalInmailReplies ?? 0),
            opportunities: 0,
            connectionsSent: r.connectionsSent ?? 0,
            connectionsAccepted: r.connectionsAccepted ?? 0,
          });
        }
      }
      return out;
    },

    // Conversations whose last message falls in the window. V3 rather than
    // V2: V2's offset paging breaks down on a large inbox.
    async conversations(since) {
      const out = [];
      let cursor = null;
      do {
        const page = await post("/inbox/GetConversationsV3", {
          limit: 100,
          cursor,
          from: new Date(since).toISOString(),
          to: new Date().toISOString(),
          filters: { linkedInAccountIds: [], campaignIds: [], tags: [], latestAutoTagNames: [], seen: null },
        });
        out.push(...(page.items ?? []));
        cursor = page.nextCursor ?? null;
        if (!page.items?.length) break;
      } while (cursor);
      return out.map((c) => threadFromConversation(c, sender)).filter(Boolean);
    },
  };
}

export function threadFromConversation(c, sender) {
  const msgs = [...(c.messages ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const theirs = msgs.filter((m) => m.sender !== "ME");
  if (!theirs.length) return null;

  const first = theirs[0];
  const last = msgs[msgs.length - 1];
  const answer = msgs.find((m) => m.sender === "ME" && m.createdAt > first.createdAt);
  const p = c.correspondentProfile ?? {};
  const tags = [...(p.autoTags ?? []).map((t) => t.name), ...(p.tags ?? [])];
  const auto = (p.autoTags ?? []).at(-1)?.name ?? null;

  return {
    source: "heyreach",
    threadId: String(c.id),
    channel: "linkedin",
    campaignId: c.campaignId != null ? String(c.campaignId) : null,
    sender,
    leadName: [p.firstName, p.lastName].filter(Boolean).join(" ") || null,
    leadCompany: p.companyName ?? null,
    leadEmail: null,
    status: auto ? auto.toLowerCase() : "unlabelled",
    positive: tags.some((t) => POSITIVE_TAGS.test(t)),
    receivedAt: first.createdAt,
    answeredAt: answer?.createdAt ?? null,
    lastFrom: last.sender === "ME" ? "us" : "them",
    lastAt: last.createdAt,
    snippet: (theirs[theirs.length - 1].body ?? "").slice(0, 240),
    url: p.profileUrl ?? null,
  };
}
