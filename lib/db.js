// Postgres, via Supabase's session pooler.
//
// One lazily-created pool per process. The Next.js app and the Railway worker
// are separate processes and each gets its own; neither shares a connection
// with the other.

import pg from "pg";
import { cfg } from "./config.js";

let _pool = null;

export function dbConfigured() {
  return Boolean(cfg().databaseUrl);
}

// Supabase requires TLS; a local Postgres started for a test does not support
// it at all, and pg throws rather than falling back. Decide from the URL
// rather than hardcoding either one, so the same code runs in both places.
//
// rejectUnauthorized is false because Supabase's pooler presents a
// certificate signed by its own CA. That is worth being explicit about: it
// means the connection is encrypted but the server is not verified, which is
// the standard arrangement for the pooler and not something to copy elsewhere.
export function sslFor(url) {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (mode === "disable") return false;
    if (mode) return { rejectUnauthorized: false };
    const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
    return local ? false : { rejectUnauthorized: false };
  } catch {
    return { rejectUnauthorized: false };
  }
}

// One connection per process, and let it go quickly.
//
// Supabase's session pooler allows fifteen clients in total. On a long-lived
// server that is fifteen for one process and generous. On Vercel every warm
// instance builds its own pool, so the real number is the pool size times
// however many instances exist, and the site starts answering
// EMAXCONNSESSION while nobody is doing anything unusual.
//
// An earlier version of this tried to detect serverless from process.env
// .VERCEL and size the pool accordingly. That variable is only present when
// a project has system environment variables exposed, which is a setting,
// so the detection silently read false in production and the pool stayed
// four deep. Environment sniffing was the wrong tool: nothing in this
// codebase runs two queries at once, on a server or anywhere else, so one
// connection is the right answer everywhere and there is nothing to detect.
//
// The sync worker raises the idle timeout through the environment, because
// it makes hundreds of sequential writes and reconnecting between each is
// the one case where holding the socket pays for itself.
const MAX_CLIENTS = Number(process.env.DB_POOL_MAX || 1);
const IDLE_MS = Number(process.env.DB_POOL_IDLE_MS || 2_000);

export function pool() {
  if (_pool) return _pool;
  const url = cfg().databaseUrl;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the Supabase pooler URI.",
    );
  }
  _pool = new pg.Pool({
    connectionString: url,
    // Supabase's pooler closes idle connections. A sync run holds one open
    // across minutes of API paging during which it is idle, and without
    // keepalives that surfaces much later as "connection terminated
    // unexpectedly" on the first write after the pull.
    keepAlive: true,
    max: MAX_CLIENTS,
    // Short, because an idle connection is one some other instance cannot
    // have. Long enough that the several queries a single page render makes
    // still share one socket.
    idleTimeoutMillis: IDLE_MS,
    connectionTimeoutMillis: 10_000,
    // Never hold a process open on an idle client.
    allowExitOnIdle: true,
    ssl: sslFor(url),
  });
  _pool.on("error", (e) => console.error("[db] idle client error:", e.message));
  return _pool;
}

// Running out of connections is transient by definition: somebody else is
// about to let one go. One short wait and a second attempt turns most of
// these into a slow page rather than a broken one.
function isConnectionLimit(e) {
  const m = `${e?.message ?? ""} ${e?.code ?? ""}`;
  return /EMAXCONNSESSION|max clients reached|too many clients|53300/i.test(m);
}

export async function query(sql, params = [], { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await pool().query(sql, params);
      return res.rows;
    } catch (e) {
      if (attempt >= retries || !isConnectionLimit(e)) throw e;
      // 150ms, then 450ms. Long enough for a page render elsewhere to
      // finish, short enough that nobody watches a spinner over it.
      await new Promise((r) => setTimeout(r, 150 * 3 ** attempt));
    }
  }
}

export async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

// Read helper for the pages. Returns a fallback instead of throwing when
// there is no database yet, so every surface renders in seed mode and says
// so, rather than 500ing on a repo nobody has connected.
export async function safe(fn, fallback) {
  if (!dbConfigured()) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error("[db] read failed:", e.message);
    return fallback;
  }
}
