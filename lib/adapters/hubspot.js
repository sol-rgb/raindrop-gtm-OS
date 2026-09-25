// HubSpot CRM v3, read only, authenticated with a Service Key.
//
// Legacy private apps stop being creatable on Oct 26, 2026, so this takes a
// Service Key (Settings > Integrations > Service Keys). Scopes needed:
//   crm.objects.contacts.read    contacts, and meetings (HubSpot gates the
//                                meetings object on the contacts scope)
//   crm.objects.companies.read
//   crm.objects.deals.read
//
// The link back to a signal is a custom dropdown property, source_signal, on
// contacts and deals. A meeting inherits it from the contact it is with.

import { call } from "./http.js";

const BASE = "https://api.hubapi.com/crm/v3/objects";

// HubSpot's meeting outcome values. "Held" is completed and nothing else.
const OUTCOME = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  RESCHEDULED: "rescheduled",
  NO_SHOW: "no show",
  CANCELED: "canceled",
};

export function hubspot(key, { signalProperty = "source_signal" } = {}) {
  const headers = { Authorization: `Bearer ${key}` };
  const get = (url) => call("hubspot", url, { headers });
  const post = (url, body) => call("hubspot", url, { method: "POST", headers, body });

  async function paged(object, properties, associations) {
    const out = [];
    let after;
    do {
      const qs = new URLSearchParams({ limit: "100", properties: properties.join(",") });
      if (associations) qs.set("associations", associations);
      if (after) qs.set("after", after);
      const page = await get(`${BASE}/${object}?${qs}`);
      out.push(...(page.results ?? []));
      after = page.paging?.next?.after;
    } while (after);
    return out;
  }

  async function contactsById(ids) {
    const map = new Map();
    for (let i = 0; i < ids.length; i += 100) {
      const res = await post(`${BASE}/contacts/batch/read`, {
        properties: ["company", "firstname", "lastname", signalProperty],
        inputs: ids.slice(i, i + 100).map((id) => ({ id })),
      });
      for (const c of res.results ?? []) map.set(c.id, c.properties ?? {});
    }
    return map;
  }

  return {
    async meetings(since) {
      const rows = await paged(
        "meetings",
        ["hs_meeting_title", "hs_meeting_start_time", "hs_meeting_outcome", "hs_createdate"],
        "contacts",
      );
      const recent = rows.filter((m) => (m.properties?.hs_createdate ?? "") >= new Date(since).toISOString());
      const contactIds = [
        ...new Set(recent.flatMap((m) => m.associations?.contacts?.results?.map((r) => r.id) ?? [])),
      ];
      const contacts = await contactsById(contactIds);

      return recent.map((m) => {
        const cid = m.associations?.contacts?.results?.[0]?.id ?? null;
        const c = cid ? contacts.get(cid) ?? {} : {};
        return {
          id: m.id,
          contactId: cid,
          company: c.company ?? null,
          signal: c[signalProperty] ?? null,
          title: m.properties?.hs_meeting_title ?? null,
          bookedAt: m.properties?.hs_createdate ?? null,
          startAt: m.properties?.hs_meeting_start_time ?? null,
          outcome: OUTCOME[m.properties?.hs_meeting_outcome] ?? "scheduled",
        };
      });
    },

    async deals(since) {
      const rows = await paged("deals", ["dealname", "dealstage", "amount", "createdate", signalProperty]);
      return rows
        .filter((d) => (d.properties?.createdate ?? "") >= new Date(since).toISOString())
        .map((d) => ({
          id: d.id,
          company: d.properties?.dealname ?? null,
          signal: d.properties?.[signalProperty] ?? null,
          stage: d.properties?.dealstage ?? null,
          amount: d.properties?.amount != null ? Number(d.properties.amount) : null,
          createdAt: d.properties?.createdate ?? null,
          qualified: !/closedlost/i.test(d.properties?.dealstage ?? ""),
        }));
    },
  };
}
