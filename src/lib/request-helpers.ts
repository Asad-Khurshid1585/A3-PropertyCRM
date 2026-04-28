import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { applyRateLimit } from "@/lib/rate-limit";
import { getAuthPayloadFromRequest } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/types";

export const parseRequestJson = async <T>(request: NextRequest) => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

export const requireAuth = (request: NextRequest) => {
  const payload = getAuthPayloadFromRequest(request);

  if (!payload) {
    return { error: apiError("Unauthorized", 401), payload: null };
  }

  return { error: null, payload };
};

export const requireRole = (
  request: NextRequest,
  roles: UserRole[],
):
  | { error: ReturnType<typeof apiError>; payload: null }
  | {
      error: null;
      payload: {
        sub: string;
        role: "admin" | "agent";
        email: string;
        name: string;
      };
    } => {
  const auth = requireAuth(request);
  if (!auth.payload) {
    return auth;
  }

  if (!roles.includes(auth.payload.role)) {
    return { error: apiError("Forbidden", 403), payload: null };
  }

  return auth;
};

export const applyRoleRateLimit = ({
  request,
  role,
  userId,
}: {
  request: NextRequest;
  role: UserRole;
  userId: string;
}) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${role}:${userId}:${ip}`;
  const limit = role === USER_ROLES.AGENT ? 50 : 500;

  const result = applyRateLimit(key, limit);
  if (!result.allowed) {
    return apiError("Rate limit exceeded. Try again shortly.", 429);
  }

  return null;
};
