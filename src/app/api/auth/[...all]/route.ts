import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

/**
 * Better Auth's endpoints: the Google redirect and callback, session reads
 * and sign-out all live under /api/auth/*.
 */
export const { GET, POST } = toNextJsHandler((request) => getAuth().handler(request));
