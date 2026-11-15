import { listTargets } from "@/server/targets";
import { getUserId } from "@/server/session";

/**
 * The signed-in user's monthly targets. A route handler rather than a
 * server action so reads run in parallel with saves; not cached, so another
 * device's changes show up on the next fetch.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const targets = await listTargets(userId);
  return Response.json(targets, { headers: { "Cache-Control": "private, no-store" } });
}
