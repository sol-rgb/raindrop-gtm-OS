import { NextResponse } from "next/server";

async function hash(value) {
  const bytes = new TextEncoder().encode(`raindrop-gtm-os:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time-ish compare. Two strings of different length fail fast, which
// leaks length only, and the password is not a secret worth that much care.
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req) {
  const password = process.env.SITE_PASSWORD;

  // Send them back to the login page, which explains what is missing. A raw
  // 503 body is a dead end for whoever is trying to get in.
  if (!password) {
    const url = new URL("/login", req.url);
    url.searchParams.set("reason", "unset");
    return NextResponse.redirect(url, { status: 303 });
  }

  const form = await req.formData();
  const supplied = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/") || "/";

  if (!same(supplied, password)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set("site_auth", await hash(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
