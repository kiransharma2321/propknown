"use server";

import { revalidatePath } from "next/cache";
import { masterApiSession } from "@/lib/adminGuard";
import { draftsFromProjectChecks } from "@/lib/listings/finder";

// Run the Auto Project Finder on demand (master only): sourced project checks -> drafts.
export async function runFinderAction() {
  if (!(await masterApiSession())) throw new Error("Master admin only");
  await draftsFromProjectChecks();
  revalidatePath("/admin/automation/project-finder");
  revalidatePath("/admin/approval-queue");
}
