// The one Slack message a day: today, then this week so far, by signal.
//
// Built from the same prepared dataset the pages use, so the numbers match
// the dashboard. It goes out in the Pacific evening, just after the UTC day
// closes (5pm PT in summer, 4pm in winter), so "today" is the UTC day that
// just ended, which covers Raindrop's sending hours. Called earlier in the
// day, the same day reads as "Yesterday".

import { signalByKey } from "./data/signals.js";
import { byCampaign, mondayOf, shortDate } from "./derive.js";

const DAY = 86_400_000;
const n = (x) => Math.round(x ?? 0).toLocaleString("en-US");
const ymd = (t) => new Date(t).toISOString().slice(0, 10);

function bySignal(camps, key, firstDay, w, markNew) {
  const groups = new Map();
  for (const c of camps) {
    if (!c[key]) continue;
    const g = groups.get(c.signal) ?? { signal: c.signal, total: 0, isNew: markNew };
    g.total += c[key];
    // A signal counts as new when none of its campaigns sent before this window.
    const first = firstDay.get(`${c.source}:${c.id}`);
    if (!first || Date.parse(first) < w.from) g.isNew = false;
    groups.set(c.signal, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

function block(p, w, title, firstDay, markNew) {
  const email = byCampaign(p, w, { channel: "email" });
  const linkedin = byCampaign(p, w, { channel: "linkedin" });
  const sub = (g) => {
    const name = g.signal === "unmapped" ? "Other campaigns" : signalByKey(g.signal)?.name ?? g.signal;
    return `      ◦ ${n(g.total)} ${name}${g.isNew && g.signal !== "unmapped" ? " (new this week)" : ""}`;
  };
  return [
    `*${title}*`,
    `• *${n(email.reduce((s, c) => s + c.sent, 0))}* emails`,
    ...bySignal(email, "sent", firstDay, w, markNew).map(sub),
    `• *${n(linkedin.reduce((s, c) => s + c.connectionsSent, 0))}* LinkedIn requests`,
    ...bySignal(linkedin, "connectionsSent", firstDay, w, markNew).map(sub),
  ];
}

export function dailyUpdate(p, { now = Date.now(), url = "" } = {}) {
  const day = Math.floor(now / DAY) * DAY - DAY;
  const ptToday = new Date(now).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const dayLabel = `${ymd(day) === ptToday ? "Today" : "Yesterday"} (${shortDate(day)})`;
  const today = { from: day, to: day + DAY };
  const week = { from: mondayOf(day), to: day + DAY };

  const firstDay = new Map();
  for (const r of p.daily) {
    if (!(r.contacted || r.sent || r.connectionsSent)) continue;
    const k = `${r.source}:${r.campaignId}`;
    if (!firstDay.has(k) || r.day < firstDay.get(k)) firstDay.set(k, r.day);
  }

  const lines = block(p, today, `${dayLabel}, we've sent:`, firstDay, false);
  // On a Monday the week so far is just today, so it is left out.
  if (week.from < today.from) {
    lines.push("", ...block(p, week, `This week so far (${shortDate(week.from)} to ${shortDate(day)}):`, firstDay, true));
  }
  if (url) lines.push("", `<${url}|Open the dashboard>`);
  return { text: lines.join("\n"), today, week };
}
