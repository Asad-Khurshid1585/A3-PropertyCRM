import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { applyRoleRateLimit, requireRole } from "@/lib/request-helpers";
import { USER_ROLES } from "@/types";
import { canAccessLead } from "@/lib/permissions";
import { ActivityLogModel } from "@/models/ActivityLog";

type Params = { id: string };

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
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

  const { id } = await context.params;
  await connectToDatabase();

  const allowed = await canAccessLead({
    userId: auth.payload.sub,
    role: auth.payload.role,
    leadId: id,
  });

  if (!allowed) {
    return apiError("Forbidden", 403);
  }

  const activities = await ActivityLogModel.find({ leadId: id })
    .populate("actorId", "name email role")
    .sort({ createdAt: -1 });

  return apiSuccess({
    activities: activities.map((activity) => ({
      id: activity._id.toString(),
      type: activity.type,
      description: activity.description,
      metadata: activity.metadata,
      createdAt: activity.createdAt.toISOString(),
      actor: activity.actorId
        ? {
            id: activity.actorId._id.toString(),
            name: activity.actorId.name,
            email: activity.actorId.email,
            role: activity.actorId.role,
          }
        : null,
    })),
  });
}
