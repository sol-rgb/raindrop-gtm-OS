// The weekly note to the Raindrop team, written from the numbers every time
// the page loads. No model and no template service: plain sentences picked
// by what actually happened, so it is the same every time for the same data
// and never says something the dashboard cannot back up.
//
// House style, from Sol's writing rules: casual, short, contractions, no
// dashes between words, no marketing words, specific numbers over adjectives.

import { signalByKey } from "./data/signals.js";
import { funnel, queue, responseTimes, rate, median, shortDate, byCampaign, perThousand, pipelineValue, PER_THOUSAND_PLAN } from "./derive.js";

const DAY = 86_400_000;
const n = (x) => Math.round(x ?? 0).toLocaleString("en-US");
const p1 = (x) => (x == null ? null : `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`);
const plural = (k, one, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;

// "Sierra, Decagon and Lindy", or "Sierra, Decagon, Lindy and 2 others".
function names(list, max = 3) {
  const u = [...new Set(list.filter(Boolean))];
  if (!u.length) return null;
  if (u.length <= max) return u.length === 1 ? u[0] : `${u.slice(0, -1).join(", ")} and ${u.at(-1)}`;
  const rest = u.length - max;
  return `${u.slice(0, max).join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

function change(now, before, prevLabel) {
  if (!before) return "";
  const d = (now - before) / before;
  if (Math.abs(d) < 0.1) return `, about the same as ${prevLabel}`;
  return d > 0 ? `, up from ${n(before)} ${prevLabel}` : `, down from ${n(before)} ${prevLabel}`;
}

// Company for a thread: the company name if the tool has one, else the
// email domain, tidied.
const company = (t) =>
  t.leadCompany ? t.leadCompany.replace(/^www\./, "").replace(/\.(com|ai|io|co|so|app)$/i, (m) => m) : null;

export function buildUpdate(p, { days = 7, now = Date.now(), hubspot = false, acv = 25_000 } = {}) {
  const end = Math.floor(now / DAY) * DAY + DAY;
  const w = { from: end - days * DAY, to: end };
  const prev = { from: w.from - days * DAY, to: w.from };
  const f = funnel(p, w);
  const fp = funnel(p, prev);
  const email = funnel(p, w, { channel: "email" });
  const li = funnel(p, w, { channel: "linkedin" });
  const inWin = (ts) => ts && Date.parse(ts) >= w.from && Date.parse(ts) < w.to;

  const span = `${shortDate(w.from)} to ${shortDate(w.to - DAY)}`;
  const label = days === 7 ? "the last week" : `the last ${days} days`;
  const prevLabel = days === 7 ? "the week before" : `the ${days} days before`;
  const thisSpan = days === 7 ? "this week" : `in the last ${days} days`;
  const out = [];

  out.push(`Hey team, quick update on how outbound went over ${label} (${span}).`);

  // --- volume and replies ---------------------------------------------------
  if (!f.contacted && !f.replied) {
    out.push("Nothing went out in this window, so there's no new data to share yet.");
  } else if (!f.contacted) {
    const pos = p.threads.filter((t) => t.positive && inWin(t.receivedAt));
    const who = names(pos.map(company));
    out.push(
      `No new sends went out while campaigns were paused, but replies kept coming in: ${plural(f.replied, "person", "people")} replied` +
        (f.positive ? ` and ${n(f.positive)} ${f.positive === 1 ? "was" : "were"} interested${who ? ` (${who})` : ""}.` : "."),
    );
  } else {
    const parts = [];
    if (email.contacted) parts.push(`${n(email.contacted)} by email`);
    if (li.contacted) parts.push(`${n(li.contacted)} on LinkedIn`);
    let s = `We reached ${n(f.contacted)} new people${parts.length > 1 ? ` (${parts.join(" and ")})` : parts.length ? ` ${parts[0]}` : ""}${change(f.contacted, fp.contacted, prevLabel)}.`;
    if (f.replied) {
      const pos = p.threads.filter((t) => t.positive && inWin(t.receivedAt));
      const who = names(pos.map(company));
      s += ` ${plural(f.replied, "person", "people")} replied`;
      const pr = rate(f.positive, f.replied);
      s += f.positive
        ? `, and ${n(f.positive)} ${f.positive === 1 ? "was" : "were"} interested${who ? `: ${who}` : ""}.` +
          (f.replied >= 10 ? ` That's ${p1(pr)} of replies positive, against a 20% benchmark.` : "")
        : ", none of them a clear yes yet.";
    } else {
      s += " No replies yet.";
    }
    out.push(s);
  }

  // --- channel notes ------------------------------------------------------
  const notes = [];
  const er = rate(email.replied, email.contacted);
  if (email.contacted >= 100 && er != null) {
    notes.push(
      er >= 0.02
        ? `Email is replying at ${p1(er)}, inside the 2 to 3% we're aiming for.`
        : `Email is replying at ${p1(er)}, under the 2 to 3% we're aiming for, so copy and deliverability are next on our list.`,
    );
  }
  const senders = [...new Set(p.campaigns.filter((c) => c.channel === "linkedin").map((c) => c.sender).filter(Boolean))];
  const liParts = [];
  for (const who of senders) {
    const x = funnel(p, w, { channel: "linkedin", sender: who });
    if (x.connectionsSent < 10) continue;
    const acc = rate(x.connectionsAccepted, x.connectionsSent);
    const rr = rate(x.replied, x.connectionsAccepted);
    liParts.push(
      `${who} sent ${n(x.connectionsSent)} requests (${p1(acc)} accepted` +
        (x.connectionsAccepted ? `, ${p1(rr)} of those replied)` : ")"),
    );
  }
  if (liParts.length) {
    let t = `On LinkedIn, ${names(liParts, 4)}.`;
    const pa = rate(li.positive, li.connectionsAccepted);
    if (li.connectionsAccepted >= 30 && pa != null) {
      t += ` ${p1(pa)} of accepted connections turned positive, ${pa > 0.04 ? "above" : pa >= 0.02 ? "in line with" : "below"} the 2 to 4% we'd expect.`;
    }
    notes.push(t);
  }
  if (notes.length) out.push(notes.join(" "));

  // --- what's working ---------------------------------------------------------
  // Best campaign by reply rate, among those with enough volume to mean
  // something, and the signal behind most of the interest.
  const working = [];
  const camps = byCampaign(p, w)
    .filter((c) => c.signal !== "unmapped")
    .map((c) => {
      const base = c.channel === "linkedin" ? c.connectionsAccepted : c.contacted;
      return { ...c, base, rr: rate(c.replied, base) };
    })
    .filter((c) => c.base >= (c.channel === "linkedin" ? 25 : 150) && c.rr != null)
    .sort((a, b) => b.rr - a.rr);
  if (camps.length >= 2) {
    const top = camps[0];
    working.push(
      `Best performer was ${signalByKey(top.signal).name} on ${top.channel === "email" ? "email" : "LinkedIn"}, ` +
        `with a ${p1(top.rr)} reply rate on ${n(top.base)} ${top.channel === "email" ? "contacted" : "accepted connections"}.`,
    );
  }
  const bySig = new Map();
  for (const t of p.threads) {
    if (t.positive && inWin(t.receivedAt) && t.signal !== "unmapped") bySig.set(t.signal, (bySig.get(t.signal) ?? 0) + 1);
  }
  const lead = [...bySig.entries()].sort((a, b) => b[1] - a[1])[0];
  if (lead && f.positive >= 4 && lead[1] >= 2) {
    working.push(`${signalByKey(lead[0]).name} drove the most interest (${n(lead[1])} of ${n(f.positive)} positive replies).`);
  }
  if (working.length) out.push(working.join(" "));

  // --- what launched --------------------------------------------------------
  const firstDay = new Map();
  for (const r of p.daily) {
    if (!(r.contacted || r.sent)) continue;
    const k = `${r.source}:${r.campaignId}`;
    if (!firstDay.has(k) || r.day < firstDay.get(k)) firstDay.set(k, r.day);
  }
  // Only campaigns filed under a signal: test sends and one-off follow-ups
  // are not news to the Raindrop team.
  const launched = p.campaigns.filter(
    (c) => c.signal !== "unmapped" && inWin(firstDay.get(`${c.source}:${c.id}`)),
  );
  if (launched.length) {
    const list = [
      ...new Set(
        launched.map((c) => `${signalByKey(c.signal).name} on ${c.channel === "email" ? "email" : "LinkedIn"}`),
      ),
    ];
    out.push(`New ${thisSpan}: we started ${names(list, 4)}.`);
  }

  // --- meetings (only once HubSpot is connected) ----------------------------
  if (hubspot && (f.booked || f.held)) {
    const held = p.meetings.filter((m) => m.outcome === "completed" && inWin(m.startAt));
    out.push(
      `${plural(f.booked, "meeting")} booked and ${n(f.held)} held` +
        (held.length ? ` (${names(held.map((m) => m.company))})` : "") +
        `, against the plan of 15 held a week.` +
        (perThousand(f) != null && f.contacted >= 200
          ? ` That's ${perThousand(f).toFixed(1)} meetings per 1,000 contacted (plan ${PER_THOUSAND_PLAN[0]} to ${PER_THOUSAND_PLAN[1]})` +
            (f.qualified ? ` and about $${Math.round(pipelineValue(f, acv) / 1000)}k in new pipeline.` : ".")
          : ""),
    );
  }

  // --- replies waiting ------------------------------------------------------
  const waiting = queue(p, now);
  const rt = responseTimes(p, w);
  if (waiting.length || rt.count) {
    const hot = waiting.filter((t) => t.positive);
    let s = waiting.length
      ? `${plural(waiting.length, "reply", "replies")} ${waiting.length === 1 ? "is" : "are"} waiting on us${hot.length ? `, ${n(hot.length)} of them interested (${names(hot.map(company))})` : ""}.`
      : "Every reply has been answered.";
    if (rt.median != null) {
      const h = rt.median;
      const fast = rt.bands.filter((b) => b.max <= 4).reduce((k, b) => k + b.count, 0);
      s += ` ${p1(fast / rt.count)} of answered replies got a response within 4 hours.`;
      s += ` When we did answer, the median time was ${h < 1 ? `${Math.max(1, Math.round(h * 60))} minutes` : h < 48 ? `${Math.round(h)} hours` : `${Math.round(h / 24)} days`}${h > 4 ? ", and we want that under 4 hours" : ""}.`;
    }
    out.push(s);
  }

  // --- what's next ------------------------------------------------------------
  const pending = p.campaigns.filter((c) => /draft/.test(c.status ?? ""));
  const nextSignals = [...new Set(pending.map((c) => c.signal).filter((k) => k !== "unmapped"))]
    .map((k) => signalByKey(k))
    .filter(Boolean);
  if (nextSignals.length) {
    out.push(
      `Up next: ${names(nextSignals.map((s) => s.name), 4)} ${nextSignals.length === 1 ? "is" : "are"} drafted and waiting on copy approval.`,
    );
  }

  out.push("Happy to go deeper on any of this.");
  return { text: out.join("\n\n"), window: w, span };
}
