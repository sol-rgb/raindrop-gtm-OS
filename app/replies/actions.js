"use server";

import { revalidatePath } from "next/cache";
import { dbConfigured, query } from "../../lib/db";
import { datasetChanged } from "../../lib/freshness";

// The only write the app makes. Marking a thread done takes it out of the
// queue here and nowhere else: Instantly and HeyReach are never touched. A
// new message from the lead reopens it on the next sync.
export async function markDone(formData) {
  if (!dbConfigured()) return;
  const source = String(formData.get("source") ?? "");
  const thread = String(formData.get("thread") ?? "");
  if (!source || !thread) return;
  await query("update replies set done = true, updated_at = now() where source = $1 and thread_id = $2", [source, thread]);
  datasetChanged({ fromAction: true });
  revalidatePath("/replies");
}
