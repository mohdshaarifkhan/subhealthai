import { Request } from "next/server";
import { resolveUserId } from "./resolveUser";

export interface User {
  id: string;
}

/**
 * Extract and validate user from request.
 * For now, expects ?user query param or Authorization header.
 * TODO: Implement proper session/auth token validation.
 */
export async function requireUser(req: Request): Promise<User> {
  const url = new URL(req.url);
  const userParam = url.searchParams.get("user");
  
  // Try query param first
  if (userParam) {
    const userId = await resolveUserId(userParam);
    return { id: userId };
  }

  // TODO: Extract from Authorization header or session
  // For now, fallback to demo user
  const userId = await resolveUserId("demo");
  return { id: userId };
}

