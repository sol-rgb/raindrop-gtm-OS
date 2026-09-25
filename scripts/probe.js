#!/usr/bin/env node
// Read-only check of every key in the environment. No database needed and
// nothing is written anywhere: it lists what each tool can see and which
// signal each campaign would be filed under.
//
//   npm run probe

import { cfg } from "../lib/config.js";
import { daysAgo } from "../lib/adapters/http.js";
import { instantly } from "../lib/adapters/instantly.js";
import { heyreach } from "../lib/adapters/heyreach.js";
import { signalFor, signalByKey } from "../lib/data/signals.js";

const c = cfg();
const line = (s = "") => console.log(s);
const label = (cp) => signalByKey(signalFor(cp))?.name ?? "?";

async function section(title, fn) {
  line(`\n${title}`);
  try {
    await fn();
  } catch (e) {
    line(`  failed: ${e.message}`);
  }
}

if (!c.instantlyApiKey) line("INSTANTLY_API_KEY missing");
else
  await section("Instantly", async () => {
    const api = instantly(c.instantlyApiKey);
    const campaigns = await api.campaigns();
    line(`  ${campaigns.length} campaigns`);
    for (const cp of campaigns) {
      const rows = await api.daily(cp.id, daysAgo(60), new Date());
      const sum = (k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
      line(
        `  - ${cp.name}  [${cp.status}]  open tracking ${cp.openTracking ? "on" : "off"}` +
          `  60d: ${sum("contacted")} contacted, ${sum("sent")} sent, ${sum("replied")} replied` +
          `  -> ${label(cp)}`,
      );
    }
  });

if (!c.heyreach.length) line("\nNo HEYREACH_API_KEY_* variables");
for (const k of c.heyreach) {
  await section(`HeyReach (${k.label}, from ${k.env})`, async () => {
    const api = heyreach(k.key, k.label);
    const campaigns = await api.campaigns();
    const daily = await api.daily(daysAgo(60), new Date());
    line(`  ${campaigns.length} campaigns`);
    for (const cp of campaigns) {
      const rows = daily.filter((r) => r.campaignId === cp.id);
      const sum = (f) => rows.reduce((n, r) => n + (r[f] ?? 0), 0);
      line(
        `  - [${cp.id}] ${cp.name}  [${cp.status}]` +
          `  60d: ${sum("connectionsSent")} requests, ${sum("connectionsAccepted")} accepted, ${sum("replied")} replied` +
          `  -> ${label(cp)}`,
      );
    }
  });
}

line(c.hubspotKey ? "\nHUBSPOT_SERVICE_KEY set" : "\nHUBSPOT_SERVICE_KEY missing (pending from Gonz)");
