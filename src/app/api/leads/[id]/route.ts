import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { applyRoleRateLimit, requireRole } from "@/lib/request-helpers";
import { LeadModel } from "@/models/Lead";
import { leadUpdateSchema } from "@/lib/validators";
import { USER_ROLES, ACTIVITY_TYPES } from "@/types";
import { toSafeLead } from "@/lib/lead-serializer";
import { canAccessLead } from "@/lib/permissions";
import { logLeadActivity } from "@/lib/activity";
import { publishEvent } from "@/lib/realtime";

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

  const lead = await LeadModel.findById(id).populate(
    "assignedTo",
    "name email role createdAt",
  );

  if (!lead) {
    return apiError("Lead not found", 404);
  }

  return apiSuccess({ lead: toSafeLead(lead) });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
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

  const body = await request.json().catch(() => null);
  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request payload", 422);
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

  const lead = await LeadModel.findById(id);
  if (!lead) {
    return apiError("Lead not found", 404);
  }

  const previousStatus = lead.status;
  const previousNotes = lead.notes;
  const previousScore = lead.score;

  if (auth.payload.role === USER_ROLES.AGENT && parsed.data.assignedTo) {
    return apiError("Agents cannot reassign leads", 403);
  }

  if (parsed.data.followUpDate !== undefined) {
    lead.followUpDate = parsed.data.followUpDate
      ? new Date(parsed.data.followUpDate)
      : null;
  }

  if (parsed.data.assignedTo !== undefined) {
    lead.assignedTo = parsed.data.assignedTo || null;
  }

  if (parsed.data.name !== undefined) lead.name = parsed.data.name;
  if (parsed.data.email !== undefined) lead.email = parsed.data.email;
  if (parsed.data.phone !== undefined) lead.phone = parsed.data.phone;
  if (parsed.data.propertyInterest !== undefined)
    lead.propertyInterest = parsed.data.propertyInterest;
  if (parsed.data.budget !== undefined) lead.budget = parsed.data.budget;
  if (parsed.data.status !== undefined) lead.status = parsed.data.status;
  if (parsed.data.notes !== undefined) lead.notes = parsed.data.notes;
  if (parsed.data.source !== undefined) lead.source = parsed.data.source;

  await lead.save();

  await logLeadActivity({
    leadId: lead._id.toString(),
    actorId: auth.payload.sub,
    type: ACTIVITY_TYPES.UPDATED,
    description: `Lead ${lead.name} updated.`,
  });

  if (previousStatus !== lead.status) {
    await logLeadActivity({
      leadId: lead._id.toString(),
      actorId: auth.payload.sub,
      type: ACTIVITY_TYPES.STATUS_CHANGED,
      description: `Status changed from ${previousStatus} to ${lead.status}.`,
      metadata: {
        from: previousStatus,
        to: lead.status,
      },
    });
  }

  if (previousNotes !== lead.notes) {
    await logLeadActivity({
      leadId: lead._id.toString(),
      actorId: auth.payload.sub,
      type: ACTIVITY_TYPES.NOTE_UPDATED,
      description: "Lead notes updated.",
    });
  }

  if (parsed.data.followUpDate !== undefined) {
    await logLeadActivity({
      leadId: lead._id.toString(),
      actorId: auth.payload.sub,
      type: ACTIVITY_TYPES.FOLLOW_UP_SET,
      description: lead.followUpDate
        ? `Follow-up set for ${lead.followUpDate.toDateString()}.`
        : "Follow-up removed.",
    });
  }

  if (previousScore !== lead.score) {
    await logLeadActivity({
      leadId: lead._id.toString(),
      actorId: auth.payload.sub,
      type: ACTIVITY_TYPES.PRIORITY_CHANGED,
      description: `Priority changed from ${previousScore} to ${lead.score}.`,
      metadata: { from: previousScore, to: lead.score },
    });

    publishEvent({
      type: "priority_changed",
      leadId: lead._id.toString(),
      message: `${lead.name} priority changed to ${lead.score}.`,
    });
  }

  publishEvent({
    type: "lead_updated",
    leadId: lead._id.toString(),
    message: `${lead.name} was updated.`,
  });

  const withAssignment = await LeadModel.findById(lead._id).populate(
    "assignedTo",
    "name email role createdAt",
  );

  return apiSuccess({ lead: toSafeLead(withAssignment) });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
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

  const { id } = await context.params;
  await connectToDatabase();

  const lead = await LeadModel.findById(id);
  if (!lead) {
    return apiError("Lead not found", 404);
  }

  await logLeadActivity({
    leadId: lead._id.toString(),
    actorId: auth.payload.sub,
    type: ACTIVITY_TYPES.DELETED,
    description: `Lead ${lead.name} deleted.`,
  });

  await LeadModel.findByIdAndDelete(id);

  return apiSuccess({ message: "Lead deleted" });
}
