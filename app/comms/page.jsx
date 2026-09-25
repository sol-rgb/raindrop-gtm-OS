import { Shell, PageHead, Panel } from "../../components/UI";
import { Tab } from "../../components/Controls";
import SourceBanner from "../../components/SourceBanner";
import CopyText from "../../components/CopyText";
import { dataset } from "../../lib/model";
import { cfg } from "../../lib/config";
import { prepare } from "../../lib/derive";
import { buildUpdate } from "../../lib/comms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comms | Raindrop GTM OS" };

const SPANS = [
  { key: "7", label: "Last 7 days" },
  { key: "14", label: "Last 14 days" },
  { key: "30", label: "Last 30 days" },
];

// The update for the Raindrop team, rewritten from the live numbers on every
// load. Pick the window, read it, copy it.
export default async function CommsPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const days = SPANS.some((s) => s.key === sp.days) ? Number(sp.days) : 7;
  const ds = await dataset();
  const p = prepare(ds);
  const { text } = buildUpdate(p, { days, hubspot: Boolean(cfg().hubspotKey) || ds.seed, acv: cfg().estimatedAcv });

  return (
    <>
      <SourceBanner ds={ds} />
      <Shell>
        <PageHead
          title="Comms."
          sub="A short update for the Raindrop team, written from the same numbers as the rest of the OS every time this page loads. Meetings only appear once HubSpot is connected."
        >
          <div className="flex flex-wrap justify-end gap-2">
            {SPANS.map((s) => (
              <Tab key={s.key} on={String(days) === s.key} href={`/comms?days=${s.key}`}>
                {s.label}
              </Tab>
            ))}
          </div>
        </PageHead>

        <Panel className="mb-32" flush>
          <CopyText text={text} />
        </Panel>
      </Shell>
    </>
  );
}
