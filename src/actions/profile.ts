"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/types";

const UpdateProfileSchema = z.object({
  fullName: z.string().trim().max(100, "Name is too long").optional(),
});

export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const user = await getAppUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    // Own row only, and only the user-editable column (never role/has_access).
    await db
      .update(profiles)
      .set({ fullName: parsed.data.fullName || null })
      .where(eq(profiles.id, user.id));
  } catch (err) {
    const e = err as { cause?: { message?: string }; message?: string } | null;
    return {
      ok: false,
      error: e?.cause?.message ?? e?.message ?? "Database error",
      code: "DB_ERROR",
    };
  }

  revalidatePath("/profile");
  return { ok: true, data: undefined };
}
