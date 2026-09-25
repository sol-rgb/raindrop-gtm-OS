#!/usr/bin/env node
// Entry point for the hourly GitHub Action and for a manual run:
//   node worker/run.js --source manual

import { runSync } from "../lib/sync/run.js";
import { dbConfigured, pool } from "../lib/db.js";

const trigger = process.argv.includes("--source")
  ? process.argv[process.argv.indexOf("--source") + 1]
  : "cron";

if (!dbConfigured()) {
  console.error("DATABASE_URL is not set. The sync writes to Postgres and has nowhere to write.");
  process.exit(1);
}

try {
  const { ok, results } = await runSync({ trigger });
  for (const r of results) if (!r.ok) console.error(`  ${r.source} failed: ${r.error}`);
  await pool().end();
  // A failed source fails the run, so the Action goes red and somebody sees it.
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error(e);
  process.exit(1);
}
