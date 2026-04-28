import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { assignmentSchema } from "@/lib/validators";
import { applyRoleRateLimit, requireRole } from "@/lib/request-helpers";
import { USER_ROLES, LEAD_STATUS, ACTIVITY_TYPES } from "@/types";
import { LeadModel } from "@/models/Lead";
import { UserModel } from "@/models/User";
import { logLeadActivity } from "@/lib/activity";
import { publishEvent } from "@/lib/realtime";
import { assignedLeadEmailTemplate, sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const auth = requireRole(request, [USER_ROLES.ADMIN]);
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

  const body = await request.json().catch(() => null);
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request payload", 422);
  }

  await connectToDatabase();

  const lead = await LeadModel.findById(parsed.data.leadId);
  if (!lead) {
    return apiError("Lead not found", 404);
  }

  const agent = await UserModel.findOne({
    _id: parsed.data.agentId,
    role: USER_ROLES.AGENT,
  }).select("name email");

  if (!agent) {
    return apiError("Agent not found", 404);
  }

  const isReassigned = Boolean(lead.assignedTo);
  lead.assignedTo = agent._id;
  if (lead.status === LEAD_STATUS.NEW) {
    lead.status = LEAD_STATUS.ASSIGNED;
  }
  await lead.save();

  await logLeadActivity({
    leadId: lead._id.toString(),
    actorId: auth.payload.sub,
    type: isReassigned ? ACTIVITY_TYPES.REASSIGNED : ACTIVITY_TYPES.ASSIGNED,
    description: `${isReassigned ? "Reassigned" : "Assigned"} lead to ${agent.name}.`,
    metadata: {
      assignedTo: agent._id.toString(),
    },
  });

  publishEvent({
    type: "lead_assigned",
    leadId: lead._id.toString(),
    message: `${lead.name} assigned to ${agent.name}.`,
  });

  await sendEmail({
    to: agent.email,
    subject: `Lead Assigned: ${lead.name}`,
    html: assignedLeadEmailTemplate({
      agentName: agent.name,
      leadName: lead.name,
    }),
  });

  return apiSuccess({ message: "Lead assigned successfully" });
}
