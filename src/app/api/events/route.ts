import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api";
import { applyRoleRateLimit, requireRole } from "@/lib/request-helpers";
import { USER_ROLES } from "@/types";
import { getEventsSince } from "@/lib/realtime";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, [USER_ROLES.ADMIN, USER_ROLES.AGENT]);
  if (!auth.payload) {
    return auth.error;
  }

  const rateErr = applyRoleRateLimit({
    request,
    role: auth.payload.role,
    userId: auth.payload.sub,
  });
  if (rateErr) {
    return rateErr;
  }

  const since = request.nextUrl.searchParams.get("since");
  const events = getEventsSince(since);

  return apiSuccess({
    events,
    serverTime: new Date().toISOString(),
  });
}
