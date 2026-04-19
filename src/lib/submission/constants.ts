// Plain (non-"use server") module so constants can be imported by
// both the server action and the client component. Exporting this
// from a "use server" file is a Next.js build-time error:
//   "A 'use server' file can only export async functions"
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
