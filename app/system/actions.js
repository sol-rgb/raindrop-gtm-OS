"use server";

import { revalidatePath } from "next/cache";
import { dbConfigured } from "../../lib/db";
import { runSync } from "../../lib/sync/run";
import { datasetChanged } from "../../lib/freshness";

// "Sync now" on /system. Behind the site password like every page, and it
// only ever reads from the tools and writes to our own database.
export async function syncNow() {
  if (!dbConfigured()) return;
  await runSync({ trigger: "manual" });
  datasetChanged({ fromAction: true });
  revalidatePath("/", "layout");
}
