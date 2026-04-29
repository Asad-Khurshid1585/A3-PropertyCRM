import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess } from "@/lib/api";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";
import { ActivityLogModel } from "@/models/ActivityLog";
import { LeadModel } from "@/models/Lead";
import { USER_ROLES } from "@/types";

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

  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (auth.payload.role === USER_ROLES.AGENT) {
    const leads = await LeadModel.find({ assignedTo: auth.payload.sub }).select("_id");
    const leadIds = leads.map((l) => l._id);
    query.leadId = { $in: leadIds };
  }

  const activities = await ActivityLogModel.find(query)
    .populate("actorId", "name email role")
    .populate("leadId", "name")
    .sort({ createdAt: -1 })
    .limit(50);

  return apiSuccess({
    activities: activities.map((a) => ({
      id: a._id.toString(),
      leadId: a.leadId?._id?.toString(),
      leadName: a.leadId?.name || "Unknown Lead",
      description: a.description,
      type: a.type,
      createdAt: a.createdAt.toISOString(),
      actor: a.actorId
        ? {
            name: (a.actorId as { name: string }).name,
            email: (a.actorId as { email: string }).email,
          }
        : null,
    })),
  });
}