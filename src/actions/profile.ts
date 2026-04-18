"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName || null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  revalidatePath("/profile");
  return { ok: true, data: undefined };
}
