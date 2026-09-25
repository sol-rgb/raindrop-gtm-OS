import { revalidateTag, updateTag } from "next/cache";
import { DATASET_TAG } from "./model.js";

// Called after anything writes to the database, so the next page view reads
// the new rows. Route handlers expire the cache outright; server actions use
// updateTag, which also lets the person who pressed the button see their own
// change on the very next render.
export function datasetChanged({ fromAction = false } = {}) {
  try {
    if (fromAction) updateTag(DATASET_TAG);
    else revalidateTag(DATASET_TAG, { expire: 0 });
  } catch (e) {
    // Outside a request (the GitHub Action worker) there is no cache to clear.
    if (!/outside a request|static generation|not supported/i.test(e.message)) console.error("[freshness]", e.message);
  }
}
