import { dbConfigured, one } from "../../../lib/db";

// Railway's health check. Deliberately shallow: it answers "is this process
// serving", not "is everything connected". A web service that refuses to come
// up because Ashby has no key would take the /system page down with it, and
// that page is where you go to find out Ashby has no key.
export const dynamic = "force-dynamic";

export async function GET() {
  const out = { ok: true, db: "not configured" };

  if (dbConfigured()) {
    try {
      await one("select 1 as ok");
      out.db = "ok";
    } catch (e) {
      out.db = `unreachable: ${e.message}`;
    }
  }

  return Response.json(out, { status: 200 });
}
