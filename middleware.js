import { NextResponse } from "next/server";

// A shared password, not accounts. The password itself never lands in the
// cookie: both sides compare a hash of it, so a stolen cookie is not a
// reusable credential anywhere else.
// api/clay and api/webhooks are outside the gate because Clay, Instantly and
// HeyReach cannot log in. Each checks its own shared secret instead and
// refuses everything when that secret is not configured.
// api/healthz is outside the gate on purpose. Railway polls it to decide
// whether the service is alive, and a health check that gets redirected to a
// login page reads as a dead service: Railway would restart a perfectly
// healthy container, forever. It returns no pipeline data, only whether the
// process is serving and whether the database answers.
export const config = {
  matcher: [
    "/((?!api/login|api/healthz|api/clay|api/webhooks|login|_next/static|_next/image|favicon.ico|icon.svg|fonts/).*)",
  ],
};

async function hash(value) {
  const bytes = new TextEncoder().encode(`raindrop-gtm-os:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req) {
  const password = process.env.SITE_PASSWORD;

  // Fails closed. With no password configured nobody gets in, rather than
  // everybody. The login page explains what is missing.
  if (!password) return toLogin(req, "unset");

  const cookie = req.cookies.get("site_auth")?.value;
  if (cookie && cookie === (await hash(password))) return NextResponse.next();

  return toLogin(req);
}

function toLogin(req, reason) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search =
    `?next=${encodeURIComponent(req.nextUrl.pathname)}` +
    (reason ? `&reason=${reason}` : "");
  return NextResponse.redirect(url);
}
