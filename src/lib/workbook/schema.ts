/**
 * Shared Zod schema for workbook assignments. Used by:
 *   - workbook/generate.ts (Claude-generated)
 *   - any future admin paste flow
 */

import { z } from "zod";

export const WorkbookAssignmentSchema = z.object({
  title: z.string().trim().min(5).max(140),
  brief: z.string().trim().min(80).max(4000),
});

export type WorkbookAssignmentInput = z.infer<typeof WorkbookAssignmentSchema>;
