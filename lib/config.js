// Every setting the OS reads, in one place, so that "what does this need to
// run" is a file rather than a search.
//
// Nothing here throws on a missing value. A half-configured OS should show
// you which half is missing, not refuse to start: /system is most useful
// precisely when something is not connected yet.

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v != null ? n : fallback;
};

// HeyReach keys belong to a workspace, and Raindrop has one per sender
// (Zubin, Michael). Any variable named HEYREACH_API_KEY or
// HEYREACH_API_KEY_<NAME> is picked up, so adding a third sender is an
// environment change rather than a deploy.
function heyreachKeys(env) {
  return Object.entries(env)
    .filter(([k, v]) => /^HEYREACH_API_KEY(_[A-Z0-9_]+)?$/.test(k) && v)
    .map(([k, v]) => {
      const tail = k.replace(/^HEYREACH_API_KEY_?/, "");
      const label = tail
        ? tail.charAt(0) + tail.slice(1).toLowerCase().replace(/_/g, " ")
        : "Default";
      return { label, key: v, env: k };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function cfg() {
  const env = process.env;
  return {
    // --- storage ---------------------------------------------------------
    databaseUrl: env.DATABASE_URL ?? "",

    // --- sources ---------------------------------------------------------
    instantlyApiKey: env.INSTANTLY_API_KEY ?? "",
    heyreach: heyreachKeys(env),
    hubspotKey: env.HUBSPOT_SERVICE_KEY ?? "",

    // Shared secrets on the two things that write in from outside: the
    // Clay HTTP column and the reply webhooks. Without one set, those
    // endpoints refuse everything rather than accept anything.
    clayIngestSecret: env.CLAY_INGEST_SECRET ?? "",
    webhookSecret: env.WEBHOOK_SECRET ?? "",

    // --- the plan --------------------------------------------------------
    // From the growth plan: fifteen discovery calls held a week.
    goalMeetingsPerWeek: num(env.GOAL_MEETINGS_PER_WEEK, 15),
    // Estimated ACV used to turn qualified meetings into a pipeline figure
    // until HubSpot deals carry real amounts.
    estimatedAcv: num(env.ESTIMATED_ACV, 25_000),
    // How long a reply can wait on us before it reads as late.
    replySlaHours: num(env.REPLY_SLA_HOURS, 4),

    // --- access ----------------------------------------------------------
    sitePassword: env.SITE_PASSWORD ?? "",
  };
}
