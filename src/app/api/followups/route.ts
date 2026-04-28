import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess } from "@/lib/api";
import { applyRoleRateLimit, requireRole } from "@/lib/request-helpers";
import { USER_ROLES } from "@/types";
import { LeadModel } from "@/models/Lead";
import { toSafeLead } from "@/lib/lead-serializer";

const STALE_DAYS = 7;

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

  const now = new Date();
  const staleDate = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const baseQuery: Record<string, unknown> = {};
  if (auth.payload.role === USER_ROLES.AGENT) {
    baseQuery.assignedTo = auth.payload.sub;
  }

  const [overdueFollowups, staleLeads] = await Promise.all([
    LeadModel.find({
      ...baseQuery,
      followUpDate: { $lt: now },
    })
      .populate("assignedTo", "name email role createdAt")
      .sort({ followUpDate: 1 }),
    LeadModel.find({
      ...baseQuery,
      lastActivityAt: { $lt: staleDate },
    })
      .populate("assignedTo", "name email role createdAt")
      .sort({ lastActivityAt: 1 }),
  ]);

  return apiSuccess({
    overdueFollowups: overdueFollowups.map((lead) => toSafeLead(lead)),
    staleLeads: staleLeads.map((lead) => toSafeLead(lead)),
  });
}
