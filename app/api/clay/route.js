import { cfg } from "../../../lib/config";
import { dbConfigured, query } from "../../../lib/db";
import { secretOk } from "../../../lib/secret";
import { SIGNALS } from "../../../lib/data/signals";

// Where Clay's HTTP column sends each qualified row. One row per lead; a
// re-send of the same row updates it rather than counting it twice, so a
// column that re-runs after an edit does not inflate "leads entered".
export const dynamic = "force-dynamic";

export async function POST(req) {
  const c = cfg();
  const url = new URL(req.url);
  if (!secretOk(req.headers.get("x-clay-secret") ?? url.searchParams.get("secret"), c.clayIngestSecret)) {
    return Response.json({ ok: false, error: "bad or missing secret" }, { status: 401 });
  }
  if (!dbConfigured()) return Response.json({ ok: false, error: "no database" }, { status: 503 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "body is not JSON" }, { status: 400 });
  }

  const rows = Array.isArray(body) ? body : [body];
  const known = new Set(SIGNALS.map((s) => s.key));
  let saved = 0;
  const rejected = [];

  for (const r of rows) {
    const signal = String(r.signal ?? "").trim().toLowerCase();
    if (!known.has(signal)) {
      rejected.push({ id: r.id ?? null, error: `unknown signal "${r.signal}"` });
      continue;
    }
    const domain = r.domain ? String(r.domain).toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "") : null;
    const id = String(r.id || [domain, r.email, r.linkedin, signal].filter(Boolean).join(":"));
    if (!id || id === signal) {
      rejected.push({ error: "row needs an id, a domain, an email or a LinkedIn URL" });
      continue;
    }
    await query(
      `insert into leads (id, signal, company, domain, person, email, linkedin, payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (id) do update set signal = excluded.signal,
         -- A re-send with fewer fields fills gaps; it never blanks what is known.
         company = coalesce(excluded.company, leads.company),
         domain = coalesce(excluded.domain, leads.domain),
         person = coalesce(excluded.person, leads.person),
         email = coalesce(excluded.email, leads.email),
         linkedin = coalesce(excluded.linkedin, leads.linkedin),
         payload = leads.payload || excluded.payload`,
      [id, signal, r.company ?? null, domain, r.person ?? null, r.email ?? null, r.linkedin ?? null, JSON.stringify(r)],
    );
    saved++;
  }

  return Response.json({ ok: rejected.length === 0, saved, rejected }, { status: rejected.length && !saved ? 400 : 200 });
}
