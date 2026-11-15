import { listAccounts } from "@/server/accounts";
import { getUserId } from "@/server/session";

/** The signed-in user's accounts (Cash first) and transfers (newest first). */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listAccounts(userId);
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
