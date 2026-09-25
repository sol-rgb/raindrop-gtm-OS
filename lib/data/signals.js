// The signal catalogue, lifted from the growth plan as written: what each
// signal is, which channel carries it, what volume sits behind it and how
// many discovery calls it is expected to produce a week.
//
// `match` is how a campaign finds its signal. Campaign names are the only
// thing Instantly, HeyReach and Clay all share, so the rule is a naming
// convention, "<Signal> · <Channel>", and these patterns are the fallback for
// the names that already exist. A campaign that matches nothing lands in
// "Unmapped" on /signals rather than being quietly dropped.
//
// Order matters: the first pattern that matches wins, so the narrow ones
// (AE whitespace, Cal.com) sit above the broad ones (wide net).

export const TIERS = [
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
  { key: "enterprise",
    clay: "raindrop_account_list_114 and the Single Company Search table: 116 named accounts, tier 1 frontier labs and agent companies.", label: "Enterprise" },
  { key: "oneoff", label: "One-off" },
];

export const SIGNALS = [
  {
    key: "website-visitors",
    name: "Website visitors",
    tier: "warm",
    strategy: "RB2B identifies the visitor, Clay qualifies and enriches, Slack, then LinkedIn from Zubin three days later.",
    channels: ["linkedin"],
    sender: "Zubin",
    volume: "Traffic dependent",
    expectedPerWeek: 2,
    next: "Approve copy",
    match: /visitor|rb2b|website/i,
  },
  {
    key: "product-signups",
    name: "Product sign-ups",
    tier: "warm",
    strategy: "Product to HubSpot, Clay enriches, Slack, then LinkedIn.",
    channels: ["linkedin"],
    sender: "Zubin",
    volume: "Traffic dependent",
    expectedPerWeek: 3.5,
    next: "Michael to send the sign-up list and Slack connects for exclusion",
    match: /sign.?up|product/i,
  },
  {
    key: "ae-whitespace",
    name: "AE whitespace T1",
    tier: "oneoff",
    strategy: "Michael's list of accounts worth chasing.",
    channels: ["linkedin"],
    sender: "Michael",
    volume: "64 accounts",
    expectedTotal: "3 to 6 meetings total",
    expectedPerWeek: 0,
    next: "Copy approval from Ben and Alexis",
    match: /white.?space|tier.?1|\bt1\b/i,
  },
  {
    key: "calcom-warm",
    name: "Cal.com warm",
    tier: "oneoff",
    strategy: "Prior meetings that went dark.",
    channels: ["linkedin"],
    sender: "Michael",
    volume: "58 contacts",
    expectedTotal: "6 to 12 meetings total",
    expectedPerWeek: 0,
    next: "Approve copy",
    match: /cal\.?com|went dark|re.?engage/i,
  },
  {
    key: "hiring",
    clay: "Track job posts: job posting signal on the 670-company ICP list, into a person table (87 rows). Signal paused.",
    name: "Hiring",
    tier: "cold",
    strategy: "Open eval and agent-reliability roles.",
    channels: ["email"],
    sender: "Zubin",
    volume: "~600 in backlog, ~50 net new a month",
    expectedPerWeek: 1,
    next: "Copy approval",
    match: /hiring|job|role/i,
  },
  {
    key: "agent-launch",
    clay: "Track news articles: news and fundraising signal on the 670-company ICP list (shared with Funding). Signal paused. The 50-company LinkedIn batch (Raindrop, Linkedin outbound) also looks like this signal.",
    name: "New agent launch",
    tier: "cold",
    strategy: "Just launched or expanded a production agent in the last 60 days.",
    channels: ["email", "linkedin"],
    sender: "Zubin",
    volume: "~1,800 in backlog, ~100 net new a month",
    expectedPerWeek: 1,
    next: "Shift to email when ready, expand the list, then make it evergreen",
    match: /launch|new agent/i,
  },
  {
    key: "funding",
    clay: "Track news articles: news and fundraising signal on the 670-company ICP list, into a person table (5 rows). Signal paused.",
    name: "Funding",
    tier: "cold",
    strategy: "Raising for an agent product.",
    channels: ["email"],
    sender: "Zubin",
    volume: "~1,800 in backlog, ~100 net new a month",
    expectedPerWeek: 0.5,
    next: "Copy approval",
    match: /fund|rais|series|seed round/i,
  },
  {
    key: "competitor-stack",
    name: "Competitor stack",
    tier: "cold",
    strategy: "Visible LangSmith, Braintrust or Langfuse users, via LinkedIn page followers.",
    channels: ["email"],
    sender: "Zubin",
    volume: "~1,000 to 2,000, ~50 net new a month",
    expectedPerWeek: 6,
    next: "Copy",
    match: /competitor|langsmith|braintrust|langfuse|stack/i,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tier: "enterprise",
    strategy: "Named accounts with an ABM strategy: personalised outbound, dinners, gifting.",
    channels: ["email", "linkedin"],
    sender: "Zubin",
    volume: "~200 to 300, fixed",
    expectedPerWeek: 1,
    next: "To discuss",
    match: /enterprise|abm|named account/i,
  },
  {
    key: "wide-net",
    name: "Wide net",
    tier: "cold",
    strategy: "Any qualified production-agent company (legal, AI companions and so on), not signal gated.",
    channels: ["email", "linkedin"],
    sender: "Zubin",
    volume: "~2,000+",
    expectedPerWeek: 3.75,
    next: "Approve copy to go out by email",
    match: /wide.?net|widenet|evergreen/i,
  },
];

export const UNMAPPED = {
  key: "unmapped",
  name: "Unmapped",
  tier: null,
  strategy: "Campaigns whose name matches no signal. Rename them or map them in the signal_map table.",
  channels: [],
  expectedPerWeek: 0,
  match: null,
};

export const signalByKey = (k) =>
  SIGNALS.find((s) => s.key === k) ?? (k === UNMAPPED.key ? UNMAPPED : null);

// Explicit overrides beat the name. `overrides` is a Map of campaign id to
// signal key, read from the signal_map table.
export function signalFor(campaign, overrides) {
  const forced = overrides?.get?.(`${campaign.source}:${campaign.id}`);
  if (forced && signalByKey(forced)) return forced;
  const hit = SIGNALS.find((s) => s.match && s.match.test(campaign.name ?? ""));
  return hit ? hit.key : UNMAPPED.key;
}

export const CHANNELS = {
  email: { key: "email", label: "Email", tool: "Instantly", color: "#00809e" },
  linkedin: { key: "linkedin", label: "LinkedIn", tool: "HeyReach", color: "#b56f22" },
};
