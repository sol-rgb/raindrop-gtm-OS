// Pure functions from a dataset to what the pages show. No database, no
// fetch: the same input always gives the same numbers, and the selftest can
// run them without anything connected.

import { SIGNALS, UNMAPPED, signalFor, signalByKey } from "./data/signals.js";

const DAY = 86_400_000;
export const PLAN_START = "2026-08-17";

// ---------------------------------------------------------------- windows --

export const RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "4w", label: "Last 4 weeks" },
  { key: "mtd", label: "Month to date" },
  { key: "all", label: "Since Aug 17" },
];
export const GRAINS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const startOfDay = (t) => Math.floor(t / DAY) * DAY;

// Weeks start on Monday, the way the rolling doc counts them (W37 = Sep 8).
export function mondayOf(t) {
  const d = new Date(startOfDay(t));
  const dow = (d.getUTCDay() + 6) % 7;
  return d.getTime() - dow * DAY;
}

export function isoWeek(t) {
  const d = new Date(startOfDay(t));
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - jan4) / DAY - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

export function windowFor(rangeKey, now = Date.now()) {
  const end = startOfDay(now) + DAY; // exclusive
  const planStart = Date.parse(PLAN_START);
  let from;
  if (rangeKey === "7d") from = end - 7 * DAY;
  else if (rangeKey === "mtd") from = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
  else if (rangeKey === "all") from = planStart;
  else from = mondayOf(now) - 3 * 7 * DAY; // 4w: this week and the three before
  return { from: Math.max(from, planStart), to: end, key: rangeKey };
}

const inWin = (ts, w) => {
  if (!ts) return false;
  const t = typeof ts === "number" ? ts : Date.parse(ts);
  return t >= w.from && t < w.to;
};

// ---------------------------------------------------------------- filing ---

// Give every campaign, campaign-day, thread, meeting and deal a signal and a
// channel, once, so every function below can filter on them.
export function prepare(ds) {
  const overrides = new Map(ds.signalMap.map((m) => [`${m.source}:${m.campaignId}`, m.signal]));
  const campaigns = ds.campaigns.map((c) => ({ ...c, signal: signalFor(c, overrides) }));
  const byId = new Map(campaigns.map((c) => [`${c.source}:${c.id}`, c]));
  const of = (source, id) => byId.get(`${source}:${id}`);

  const toKey = (s) => {
    if (!s) return UNMAPPED.key;
    if (signalByKey(s)) return s;
    // HubSpot stores the dropdown label; accept either.
    const hit = SIGNALS.find((x) => x.name.toLowerCase() === String(s).toLowerCase());
    return hit ? hit.key : UNMAPPED.key;
  };

  return {
    ...ds,
    campaigns,
    daily: ds.daily.map((r) => {
      const c = of(r.source, r.campaignId);
      return { ...r, signal: c?.signal ?? UNMAPPED.key, channel: c?.channel ?? (r.source === "instantly" ? "email" : "linkedin"), sender: c?.sender ?? null };
    }),
    threads: ds.threads.map((t) => ({ ...t, signal: of(t.source, t.campaignId)?.signal ?? UNMAPPED.key })),
    meetings: ds.meetings.map((m) => ({ ...m, signal: toKey(m.signal) })),
    deals: ds.deals.map((d) => ({ ...d, signal: toKey(d.signal) })),
    leads: ds.leads.map((l) => ({ ...l, signal: toKey(l.signal) })),
  };
}

const matches = (row, f = {}) =>
  (!f.signal || row.signal === f.signal) &&
  (!f.channel || row.channel === f.channel) &&
  (!f.source || row.source === f.source) &&
  (!f.sender || row.sender === f.sender);

// ---------------------------------------------------------------- funnel ---

export const STAGES = [
  { key: "entered", label: "Leads entered", how: "Rows Clay qualified into a signal's table, sent over by the HTTP column." },
  { key: "contacted", label: "Contacted", how: "New leads emailed by Instantly plus LinkedIn connection requests sent by HeyReach." },
  { key: "replied", label: "Replied", how: "Unique replies on email, auto-replies excluded, plus LinkedIn message replies." },
  { key: "positive", label: "Positive", how: "Replies marked interested: Instantly's interest status or HeyReach's Interested tag." },
  { key: "booked", label: "Meeting booked", how: "HubSpot meetings created in the window." },
  { key: "held", label: "Meeting held", how: "HubSpot meetings in the window whose outcome is Completed. Only as good as reps marking outcomes." },
  { key: "qualified", label: "Qualified", how: "HubSpot deals created in the window and not closed lost." },
];

export function funnel(p, w, f = {}) {
  const sum = (k) => p.daily.filter((r) => matches(r, f) && inWin(r.day, w)).reduce((n, r) => n + (r[k] ?? 0), 0);
  // Meetings, deals and leads carry a signal but no channel. Filtering them by
  // channel would silently drop all of them, so a channel filter leaves them be.
  const sig = (r) => !f.signal || r.signal === f.signal;
  const qualified = p.deals.filter((d) => sig(d) && d.qualified && inWin(d.createdAt, w));

  return {
    entered: p.leads.filter((l) => sig(l) && inWin(l.enteredAt, w)).length,
    contacted: sum("contacted"),
    sent: sum("sent"),
    opened: sum("opened"),
    replied: sum("replied"),
    connectionsSent: sum("connectionsSent"),
    connectionsAccepted: sum("connectionsAccepted"),
    messaged: sum("messagesStarted"),
    positive: p.threads.filter((t) => matches(t, f) && t.positive && inWin(t.receivedAt, w)).length,
    booked: p.meetings.filter((m) => sig(m) && inWin(m.bookedAt, w)).length,
    held: p.meetings.filter((m) => sig(m) && m.outcome === "completed" && inWin(m.startAt, w)).length,
    noShow: p.meetings.filter((m) => sig(m) && m.outcome === "no show" && inWin(m.startAt, w)).length,
    qualified: qualified.length,
    qualifiedAmount: qualified.reduce((n, d) => n + (d.amount ?? 0), 0),
    qualifiedWithAmount: qualified.filter((d) => d.amount != null).length,
  };
}

export const rate = (a, b) => (b ? a / b : null);

// Meetings booked per 1,000 contacted, the efficiency number the weekly
// growth call reports. Plan benchmark: 2.4 to 4.8.
export const perThousand = (fn) => (fn.contacted ? (fn.booked / fn.contacted) * 1000 : null);
export const PER_THOUSAND_PLAN = [2.4, 4.8];

// What happens after a reply, as Gonz's prototype drew it: each step keeps
// some and drops the rest, and the dropped side is named for what it means.
export function flow(fn) {
  const steps = [
    ["replied", "positive", "Positive", "Not positive"],
    ["positive", "booked", "Meeting booked", "No meeting yet"],
    ["booked", "held", "Meeting held", "No-show or upcoming"],
    ["held", "qualified", "Qualified", "Not qualified"],
  ];
  return steps.map(([from, to, kept, dropped]) => {
    const total = fn[from];
    const k = Math.min(fn[to], total);
    return { from, to, total, kept: k, dropped: Math.max(0, total - k), keptLabel: kept, droppedLabel: dropped, rate: rate(k, total) };
  });
}

// A signal's state, read from its campaigns: live beats paused beats draft.
export function signalStatus(campaigns) {
  const st = campaigns.map((c) => c.status ?? "");
  if (st.some((s) => /active|in progress|running/.test(s))) return { label: "Live", tone: "good" };
  if (st.some((s) => /paused/.test(s))) return { label: "Paused", tone: "warn" };
  if (st.some((s) => /draft|starting|scheduled/.test(s))) return { label: "Draft", tone: "default" };
  if (st.length) return { label: "Finished", tone: "default" };
  return { label: "Not started", tone: "warn" };
}

// Pipeline in dollars: real deal amounts where HubSpot has them, the
// estimated ACV for the rest.
export const pipelineValue = (fn, acv) =>
  fn.qualifiedAmount + (fn.qualified - fn.qualifiedWithAmount) * acv;

// ---------------------------------------------------------------- series ---

export function buckets(w, grain) {
  const out = [];
  if (grain === "day") {
    for (let t = w.from; t < w.to; t += DAY) out.push({ from: t, to: t + DAY, label: shortDate(t) });
  } else if (grain === "month") {
    let d = new Date(w.from);
    let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    while (t < w.to) {
      d = new Date(t);
      const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      out.push({ from: Math.max(t, w.from), to: Math.min(next, w.to), label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) });
      t = next;
    }
  } else {
    for (let t = mondayOf(w.from); t < w.to; t += 7 * DAY) {
      out.push({ from: Math.max(t, w.from), to: Math.min(t + 7 * DAY, w.to), label: `W${isoWeek(t)}`, sub: shortDate(t) });
    }
  }
  return out;
}

export function series(p, w, grain, f = {}) {
  return buckets(w, grain).map((b) => ({ ...b, ...funnel(p, b, f) }));
}

export function shortDate(t) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ---------------------------------------------------------------- signals --

export function bySignal(p, w) {
  const weeks = Math.max(1, (w.to - w.from) / (7 * DAY));
  const keys = [...SIGNALS.map((s) => s.key), UNMAPPED.key];
  return keys
    .map((k) => {
      const s = signalByKey(k);
      const fn = funnel(p, w, { signal: k });
      const camps = p.campaigns.filter((c) => c.signal === k);
      return {
        ...s,
        match: undefined,
        funnel: fn,
        campaigns: camps.map((c) => ({ source: c.source, id: c.id, name: c.name, channel: c.channel, status: c.status, sender: c.sender })),
        live: camps.some((c) => c.status === "active" || c.status === "in progress"),
        status: signalStatus(camps),
        perThousand: perThousand(fn),
        heldPerWeek: fn.held / weeks,
        bookedPerWeek: fn.booked / weeks,
      };
    })
    .filter((s) => s.key !== UNMAPPED.key || s.campaigns.length || s.funnel.booked);
}

// ------------------------------------------------------------- campaigns ---

export function byCampaign(p, w, f = {}) {
  return p.campaigns
    .filter((c) => matches(c, f))
    .map((c) => {
      const rows = p.daily.filter((r) => r.source === c.source && r.campaignId === c.id && inWin(r.day, w));
      const sum = (k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
      const positive = p.threads.filter((t) => t.source === c.source && t.campaignId === c.id && t.positive && inWin(t.receivedAt, w)).length;
      return {
        ...c,
        contacted: sum("contacted"),
        sent: sum("sent"),
        opened: sum("opened"),
        replied: sum("replied"),
        connectionsSent: sum("connectionsSent"),
        connectionsAccepted: sum("connectionsAccepted"),
        messaged: sum("messagesStarted"),
        positive,
      };
    })
    .sort((a, b) => b.contacted - a.contacted);
}

// --------------------------------------------------------------- replies ---

const NOT_WAITING = /not interested|wrong person|out of office|unsubscrib/i;

// Who is waiting on us, longest first. A thread waits when they spoke last,
// nobody marked it done, and it is not a no.
export function queue(p, now = Date.now()) {
  return p.threads
    .filter((t) => t.lastFrom === "them" && !t.done && !NOT_WAITING.test(t.status ?? ""))
    .map((t) => ({ ...t, waitingHours: (now - Date.parse(t.lastAt)) / 3_600_000 }))
    .sort((a, b) => b.waitingHours - a.waitingHours);
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const hoursToAnswer = (t) =>
  t.answeredAt ? (Date.parse(t.answeredAt) - Date.parse(t.receivedAt)) / 3_600_000 : null;

export const RESPONSE_BANDS = [
  { key: "1h", label: "Under 1h", max: 1 },
  { key: "4h", label: "1 to 4h", max: 4 },
  { key: "24h", label: "4 to 24h", max: 24 },
  { key: "3d", label: "1 to 3 days", max: 72 },
  { key: "more", label: "Over 3 days", max: Infinity },
];

export function responseTimes(p, w, grain = "week") {
  const answered = p.threads
    .filter((t) => inWin(t.receivedAt, w))
    .map((t) => ({ ...t, hours: hoursToAnswer(t) }))
    .filter((t) => t.hours != null && t.hours >= 0);

  const bands = RESPONSE_BANDS.map((b, i) => {
    const lo = i ? RESPONSE_BANDS[i - 1].max : 0;
    return { ...b, count: answered.filter((t) => t.hours >= lo && t.hours < b.max).length };
  });

  const owners = [...new Set(answered.map((t) => t.owner ?? "Unassigned"))].sort().map((o) => {
    const mine = answered.filter((t) => (t.owner ?? "Unassigned") === o);
    return { owner: o, count: mine.length, median: median(mine.map((t) => t.hours)) };
  });

  const trend = buckets(w, grain).map((b) => {
    const xs = answered.filter((t) => inWin(t.receivedAt, b)).map((t) => t.hours);
    return { ...b, median: median(xs), count: xs.length };
  });

  return { count: answered.length, median: median(answered.map((t) => t.hours)), bands, owners, trend };
}

// --------------------------------------------------------------- format ----

export const fmt = (n) => (n == null ? "–" : Math.round(n).toLocaleString("en-US"));
export const pct = (n, digits = 0) => (n == null ? "–" : `${(n * 100).toFixed(digits)}%`);
export const money = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;
export function hrs(h) {
  if (h == null) return "–";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}
