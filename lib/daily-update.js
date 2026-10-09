// The one Slack message a day: what went out this week so far, by signal.
//
// Built from the same prepared dataset the pages use, so the numbers match
// the dashboard. Days are UTC, and the message goes out after the morning
// sync, so "so far" runs Monday through yesterday. On a Monday that would be
// empty, so it reports last week instead.

import { signalByKey } from "./data/signals.js";
import { byCampaign, mondayOf, shortDate } from "./derive.js";

const DAY = 86_400_000;
const n = (x) => Math.round(x ?? 0).toLocaleString("en-US");

function bySignal(camps, key, firstDay, w) {
  const groups = new Map();
  for (const c of camps) {
    if (!c[key]) continue;
    const g = groups.get(c.signal) ?? { signal: c.signal, total: 0, isNew: true };
    g.total += c[key];
    // A signal counts as new when none of its campaigns sent before this window.
    const first = firstDay.get(`${c.source}:${c.id}`);
    if (!first || Date.parse(first) < w.from) g.isNew = false;
    groups.set(c.signal, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

export function dailyUpdate(p, { now = Date.now(), url = "" } = {}) {
  const today = Math.floor(now / DAY) * DAY;
  let w = { from: mondayOf(now), to: today };
  let label = `This week so far (${shortDate(w.from)} to ${shortDate(w.to - DAY)})`;
  if (w.to <= w.from) {
    w = { from: w.from - 7 * DAY, to: w.from };
    label = `Last week (${shortDate(w.from)} to ${shortDate(w.to - DAY)})`;
  }
  if (w.to - w.from === DAY) label = `Yesterday (${shortDate(w.from)})`;

  const firstDay = new Map();
  for (const r of p.daily) {
    if (!(r.contacted || r.sent || r.connectionsSent)) continue;
    const k = `${r.source}:${r.campaignId}`;
    if (!firstDay.has(k) || r.day < firstDay.get(k)) firstDay.set(k, r.day);
  }

  const email = byCampaign(p, w, { channel: "email" });
  const linkedin = byCampaign(p, w, { channel: "linkedin" });
  const sent = email.reduce((s, c) => s + c.sent, 0);
  const requests = linkedin.reduce((s, c) => s + c.connectionsSent, 0);

  const sub = (g) => {
    const name = g.signal === "unmapped" ? "Other campaigns" : signalByKey(g.signal)?.name ?? g.signal;
    return `      ◦ ${n(g.total)} ${name}${g.isNew && g.signal !== "unmapped" ? " (new this week)" : ""}`;
  };

  const lines = [`*${label}, we've sent:*`];
  lines.push(`• *${n(sent)}* emails`, ...bySignal(email, "sent", firstDay, w).map(sub));
  lines.push(`• *${n(requests)}* LinkedIn requests`, ...bySignal(linkedin, "connectionsSent", firstDay, w).map(sub));
  if (url) lines.push("", `<${url}|Open the dashboard>`);
  return { text: lines.join("\n"), window: w, sent, requests };
}
