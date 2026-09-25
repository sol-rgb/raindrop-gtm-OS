import { Suspense } from "react";
import Mark from "../../components/Mark";

export const metadata = { title: "Sign in | Raindrop GTM OS" };

export default async function LoginPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/";
  const failed = sp.error === "1";

  // Read the variable here rather than trusting the query param. This page
  // renders in the Node runtime, so what it sees is the truth about the
  // running deployment, not what the middleware inlined at build time.
  const unset = !process.env.SITE_PASSWORD;

  return (
    <Suspense>
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <Mark size={22} className="mb-12 text-ink" />

          <h1 className="display text-[30px] text-ink">GTM OS</h1>

          {unset ? (
            <p className="mt-6 border-l-2 border-bad pl-4 text-[13px] leading-relaxed text-bad">
              SITE_PASSWORD is not set on this build. Add it in the Vercel
              project settings, then redeploy with the build cache off. Saving
              the variable does not change a deployment that already exists.
            </p>
          ) : (
            <p className="mt-4 text-[14px] text-muted">
              Enter the team password.
            </p>
          )}

          <form action="/api/login" method="POST" className="mt-8">
            <input type="hidden" name="next" value={next} />
            <input
              type="password"
              name="password"
              autoFocus
              autoComplete="current-password"
              aria-label="Team password"
              className="w-full border border-strong bg-surface px-4 py-3 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent"
              placeholder="Password"
            />

            {failed ? (
              <p className="mt-3 text-[13px] text-bad">
                That is not the password.
              </p>
            ) : null}

            <button
              type="submit"
              className="btn mt-4 w-full bg-ink px-5 py-3 text-[14px] text-bg hover:opacity-90"
            >
              Continue
            </button>
          </form>

          <p className="mt-10 text-[12px] leading-relaxed text-faint">
            This holds outbound pipeline, replies and meetings. Do
            not forward the password outside Raindrop and Carrara.
          </p>
        </div>
      </div>
    </Suspense>
  );
}
