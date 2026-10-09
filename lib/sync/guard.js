// HeyReach can lower its own history. When a LinkedIn account is
// disconnected or a campaign deleted, its past days come back smaller or as
// zero, and a plain overwrite would erase what we stored (Oct 9: Sep 14 to
// Oct 8 went from 546 requests to 194). So for LinkedIn, a day older than
// yesterday keeps the higher of what we stored and what HeyReach says now.
// Today and yesterday still overwrite, since HeyReach is still counting them.

const FIELDS = ["contacted", "sent", "replied", "connectionsSent", "connectionsAccepted", "messagesStarted"];

// stored: rows already in the database, incoming: rows from this sync.
// cutoff: "YYYY-MM-DD", days before it are protected.
export function guardDaily(stored, incoming, cutoff) {
  const key = (r) => `${r.source}:${r.campaignId}:${r.day}`;
  const before = new Map(stored.map((r) => [key(r), r]));
  const kept = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  const rows = incoming.map((r) => {
    const old = before.get(key(r));
    if (!old || r.day >= cutoff) return r;
    const out = { ...r };
    for (const f of FIELDS) {
      if ((old[f] ?? 0) > (r[f] ?? 0)) {
        kept[f] += old[f] - (r[f] ?? 0);
        out[f] = old[f];
      }
    }
    return out;
  });
  return { rows, kept };
}
