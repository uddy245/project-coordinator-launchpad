import { neonAuth } from "@/lib/auth/neon";

// Proxies auth API calls (email links, verification, session) to Neon Auth.
const handlers = () => neonAuth().handler();

export const GET = (...args: Parameters<ReturnType<typeof handlers>["GET"]>) =>
  handlers().GET(...args);
export const POST = (...args: Parameters<ReturnType<typeof handlers>["POST"]>) =>
  handlers().POST(...args);
