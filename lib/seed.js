// Invented data, in exactly the shape the sync writes, so every page can be
// argued with before a single integration is live. The pages say so on every
// screen. Deterministic: the same numbers on every render and every deploy.
//
// Volumes follow what the plan says is sitting behind each signal and the
// weekly tracking in the rolling doc (roughly 2,000 emails a week from W37,
// 150 LinkedIn requests a week), with reply and meeting rates at the plan's
// benchmarks. They are there to make the shape readable, not to predict.

import { SIGNALS } from "./data/signals.js";

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMPANIES = [
  "Sierra", "Decagon", "Cresta", "Lindy", "Retell AI", "Bland AI", "Harvey", "Legora", "Robin AI",
  "Paxton AI", "Norm Ai", "DraftWise", "Crosby", "Phonely", "Thoughtly", "11x", "Accrete", "Arini",
  "Artificio", "Arva AI", "AstraQ", "AtlasPro AI", "Asteroid", "Rosie", "Samedy AI", "Marveri",
  "Eudia", "Lawhive", "Wordsmith", "Genie AI", "LegalFly", "Solve Intelligence", "Ivo", "Albert",
  "Almanax", "Agent23", "Anova", "Applied Labs", "ArcellAI", "Assembo",
];
const FIRST = ["Maya", "Leo", "Priya", "Sam", "Ana", "Jonah", "Ines", "Theo", "Noor", "Eli", "Rosa", "Kai"];
const LAST = ["Chen", "Okafor", "Patel", "Reyes", "Novak", "Kim", "Silva", "Haddad", "Brooks", "Lund"];

const SNIPPETS = {
  positive: [
    "Timing is good, we have been chasing agent regressions all month. Happy to chat next week.",
    "Interesting. Can you send a couple of times Thursday or Friday?",
    "We are evaluating tools for this right now, loop in our Head of Eng.",
  ],
  neutral: [
    "What does pricing look like for a team our size?",
    "Not me, try our platform lead.",
    "We use Langfuse today, how is this different?",
  ],
  negative: ["Not a priority this quarter.", "Please take me off the list."],
};

// Campaign plan: which signal runs where, from which sender, how hard.
const PLAN = [
  ["instantly", "Hiring · Email", "hiring", "Zubin", 180],
  ["instantly", "New agent launch · Email", "agent-launch", "Zubin", 240],
  ["instantly", "Funding · Email", "funding", "Zubin", 110],
  ["instantly", "Wide net · Email", "wide-net", "Zubin", 520],
  ["instantly", "Competitor stack · Email", "competitor-stack", "Zubin", 360],
  ["instantly", "Enterprise · Email", "enterprise", "Zubin", 60],
  ["heyreach", "New agent launch · LinkedIn", "agent-launch", "Zubin", 55],
  ["heyreach", "Website visitors · LinkedIn", "website-visitors", "Zubin", 25],
  ["heyreach", "Product sign-ups · LinkedIn", "product-signups", "Zubin", 30],
  ["heyreach", "Enterprise · LinkedIn", "enterprise", "Zubin", 20],
  ["heyreach", "AE whitespace T1 · LinkedIn", "ae-whitespace", "Michael", 18],
  ["heyreach", "Cal.com warm · LinkedIn", "calcom-warm", "Michael", 14],
];

const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString();

export function seedDataset(now = Date.now()) {
  const r = rng(20260925);
  const pick = (a) => a[Math.floor(r() * a.length)];
  // Stochastic rounding. Plain rounding turns 0.4 replies a day into zero
  // replies forever, which is how LinkedIn read as dead in the first draft.
  const sr = (x) => Math.floor(x) + (r() < x - Math.floor(x) ? 1 : 0);
  const start = Date.UTC(2026, 7, 17); // Aug 17, the first week of sends
  const today = Math.floor(now / DAY) * DAY;
  const days = Math.round((today - start) / DAY) + 1;

  const campaigns = PLAN.map(([source, name, signal, sender], i) => ({
    source,
    id: `${source}-${i + 1}`,
    name,
    status: "active",
    channel: source === "instantly" ? "email" : "linkedin",
    sender: source === "heyreach" ? sender : null,
    openTracking: source === "instantly" ? i % 2 === 0 : null,
  }));

  const daily = [];
  const threads = [];
  const meetings = [];
  const deals = [];
  const leads = [];
  let n = 0;

  PLAN.forEach(([source, , signal, sender, perWeek], i) => {
    const cp = campaigns[i];
    const email = source === "instantly";
    for (let d = 0; d < days; d++) {
      const t = start + d * DAY;
      const dow = new Date(t).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      // Ramp: sends start small in W34 and reach plan volume by W37.
      const ramp = Math.min(1, 0.15 + d / 24);
      const contacted = sr((perWeek / 5) * ramp * (0.7 + r() * 0.6));
      const replyRate = email ? 0.021 : 0.09 * 0.3;
      const replied = sr(contacted * replyRate * (0.5 + r()));
      const accepted = email ? 0 : sr(contacted * (0.2 + r() * 0.15));
      daily.push({
        source,
        campaignId: cp.id,
        day: iso(t).slice(0, 10),
        contacted,
        sent: email ? Math.round(contacted * 1.8) : contacted + accepted,
        opened: email && cp.openTracking ? Math.round(contacted * (0.35 + r() * 0.2)) : 0,
        replied,
        opportunities: 0,
        connectionsSent: email ? 0 : contacted,
        connectionsAccepted: accepted,
        messagesStarted: email ? 0 : sr(accepted * 0.55),
      });

      for (let k = 0; k < replied; k++) {
        n++;
        const roll = r();
        const kind = roll < 0.34 ? "positive" : roll < 0.8 ? "neutral" : "negative";
        const receivedAt = t + (9 + r() * 9) * 3_600_000;
        const age = now - receivedAt;
        // Most get answered within hours. The last few days carry a queue.
        const waiting = age < 4 * DAY && r() < 0.45;
        const answeredAt = waiting ? null : receivedAt + (0.3 + r() ** 2 * 40) * 3_600_000;
        const company = pick(COMPANIES);
        const name = `${pick(FIRST)} ${pick(LAST)}`;
        threads.push({
          source,
          threadId: `t${n}`,
          channel: email ? "email" : "linkedin",
          campaignId: cp.id,
          sender: email ? "zubin@raindrop.ai" : sender,
          leadName: name,
          leadCompany: company,
          status: kind === "positive" ? "interested" : kind === "negative" ? "not interested" : "unlabelled",
          positive: kind === "positive",
          receivedAt: iso(receivedAt),
          answeredAt: answeredAt && answeredAt < now ? iso(answeredAt) : null,
          lastFrom: answeredAt && answeredAt < now ? "us" : "them",
          lastAt: iso(answeredAt && answeredAt < now ? answeredAt : receivedAt),
          snippet: pick(SNIPPETS[kind]),
          url: null,
          owner: email ? "Zubin" : sender,
          done: false,
        });

        if (kind === "positive" && r() < 0.8 && answeredAt) {
          const bookedAt = answeredAt + (2 + r() * 30) * 3_600_000;
          if (bookedAt > now) continue;
          const startAt = bookedAt + (1 + r() * 7) * DAY;
          const past = startAt < now;
          const outcome = !past ? "scheduled" : r() < 0.75 ? "completed" : "no show";
          meetings.push({
            id: `m${n}`,
            company,
            signal,
            bookedAt: iso(bookedAt),
            startAt: iso(startAt),
            outcome,
          });
          if (outcome === "completed" && r() < 0.7) {
            deals.push({
              id: `d${n}`,
              company,
              signal,
              stage: "qualified",
              amount: null,
              createdAt: iso(startAt + 3_600_000),
              qualified: true,
            });
          }
        }
      }
    }
  });

  // Leads Clay qualified: a little ahead of what got contacted, per signal.
  for (const s of SIGNALS) {
    const plan = PLAN.filter((p) => p[2] === s.key).reduce((a, p) => a + p[4], 0);
    for (let d = 0; d < days; d += 1) {
      const t = start + d * DAY;
      const count = Math.round((plan / 7) * 1.1 * Math.min(1, 0.2 + d / 20) * (0.6 + r() * 0.8));
      for (let k = 0; k < count; k++) {
        leads.push({ id: `${s.key}-${d}-${k}`, signal: s.key, company: pick(COMPANIES), enteredAt: iso(t + r() * DAY) });
      }
    }
  }

  return {
    seed: true,
    campaigns,
    daily,
    leads,
    threads,
    meetings,
    deals,
    signalMap: [],
    sync: { lastRun: null, sources: [] },
  };
}
