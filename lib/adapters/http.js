// One fetch wrapper for every source, so a 429 is handled the same way
// everywhere: read Retry-After if the API sends it, otherwise back off, and
// give up after a few tries with an error that says which call failed.

export class SourceError extends Error {
  constructor(source, status, message) {
    super(`${source} ${status}: ${message}`);
    this.source = source;
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function call(source, url, { method = "GET", headers = {}, body, tries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.ok) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= tries - 1) {
      const text = (await res.text()).slice(0, 300);
      throw new SourceError(source, res.status, text || res.statusText);
    }

    const after = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 1500 * 2 ** attempt);
  }
}

// YYYY-MM-DD in UTC. Every source is read and stored by UTC day, because
// Instantly reads date-only ranges as UTC and mixing zones would move a
// reply sent at 9pm in San Francisco onto the wrong day for one tool only.
export const ymd = (d) => new Date(d).toISOString().slice(0, 10);

export const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
