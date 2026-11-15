import { listTransactions } from "@/server/transactions";
import { getUserId } from "@/server/session";

/**
 * The signed-in user's transactions, newest first. A route handler rather
 * than a server action so reads run in parallel with saves; not cached, so
 * another device's changes show up on the next fetch.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const transactions = await listTransactions(userId);
  return Response.json(transactions, { headers: { "Cache-Control": "private, no-store" } });
}
