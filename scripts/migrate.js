#!/usr/bin/env node
// Apply every migration in migrations/ that has not run yet, in filename
// order. Filenames are dates, so that order is chronological. Tracked in a
// table rather than by a counter, the same as Raindrop OS.

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, dbConfigured } from "../lib/db.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  if (!dbConfigured()) {
    console.error("DATABASE_URL is not set. Nothing to migrate against.");
    process.exit(1);
  }

  const client = await pool().connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      )`);

    const { rows } = await client.query("select filename from schema_migrations");
    const done = new Set(rows.map((r) => r.filename));
    const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();

    let ran = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(join(DIR, file), "utf8");
      // One transaction per migration. Half-applied is worse than not run.
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
        console.log(`  applied  ${file}`);
        ran++;
      } catch (e) {
        await client.query("rollback");
        console.error(`  FAILED   ${file}\n${e.message}`);
        process.exit(1);
      }
    }
    console.log(ran ? `${ran} migration(s) applied.` : "Already up to date.");
  } finally {
    client.release();
    await pool().end();
  }
}

main();
