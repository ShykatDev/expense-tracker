import { listCategories } from "@/server/categories";
import { getUserId } from "@/server/session";

/**
 * The signed-in user's custom categories and hidden keys, as
 * `{ custom, hidden }`. A route handler so reads don't queue behind saves;
 * not cached, so another device's changes show up on the next fetch.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await listCategories(userId);
  return Response.json(categories, { headers: { "Cache-Control": "private, no-store" } });
}
