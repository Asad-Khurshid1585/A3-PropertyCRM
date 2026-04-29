import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { leadCreateSchema } from "@/lib/validators";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";
import { LeadModel } from "@/models/Lead";
import { UserModel } from "@/models/User";
import { toSafeLead } from "@/lib/lead-serializer";
import { ACTIVITY_TYPES, LEAD_STATUS, USER_ROLES } from "@/types";
import { logLeadActivity } from "@/lib/activity";
import { publishEvent } from "@/lib/realtime";
import {
  assignedLeadEmailTemplate,
  newLeadEmailTemplate,
  sendEmail,
} from "@/lib/email";
import { getEnv } from "@/lib/env";

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

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");

  const query: Record<string, unknown> = {};

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.score = priority;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { propertyInterest: { $regex: search, $options: "i" } },
    ];
  }

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt = {
        ...(query.createdAt as object),
        $gte: new Date(dateFrom),
      };
    }
    if (dateTo) {
      query.createdAt = {
        ...(query.createdAt as object),
        $lte: new Date(dateTo),
      };
    }
  }

  if (auth.payload.role === USER_ROLES.AGENT) {
    query.assignedTo = auth.payload.sub;
  }

  const leads = await LeadModel.find(query)
    .populate("assignedTo", "name email role createdAt")
    .sort({ createdAt: -1 });

  return apiSuccess({ leads: leads.map((lead) => toSafeLead(lead)) });
}

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
  const parsed = leadCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request payload", 422);
  }

  await connectToDatabase();

  let assignedAgent:
    | null
    | {
        _id: { toString(): string };
        name: string;
        email: string;
      } = null;

  if (parsed.data.assignedTo) {
    const agent = await UserModel.findOne({
      _id: parsed.data.assignedTo,
      role: USER_ROLES.AGENT,
    }).select("name email");

    if (!agent) {
      return apiError("Assigned agent not found", 404);
    }

    assignedAgent = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
    };
  }

  const lead = await LeadModel.create({
    ...parsed.data,
    status: parsed.data.assignedTo ? LEAD_STATUS.ASSIGNED : LEAD_STATUS.NEW,
    notes: parsed.data.notes || "",
    assignedTo: parsed.data.assignedTo || null,
    followUpDate: parsed.data.followUpDate
      ? new Date(parsed.data.followUpDate)
      : null,
  });

  await logLeadActivity({
    leadId: lead._id.toString(),
    actorId: auth.payload.sub,
    type: ACTIVITY_TYPES.CREATED,
    description: `New lead ${lead.name} created from ${lead.source}.`,
    metadata: {
      source: lead.source,
      status: lead.status,
      score: lead.score,
    },
  });

  if (assignedAgent) {
    await logLeadActivity({
      leadId: lead._id.toString(),
      actorId: auth.payload.sub,
      type: ACTIVITY_TYPES.ASSIGNED,
      description: `New lead assigned to ${assignedAgent.name}.`,
      metadata: {
        assignedTo: assignedAgent._id.toString(),
      },
    });
  }

  publishEvent({
    type: "lead_created",
    leadId: lead._id.toString(),
    message: `${lead.name} added (${lead.score} priority).`,
  });

  await sendEmail({
    to: getEnv().ADMIN_EMAIL,
    subject: `New Lead: ${lead.name}`,
    html: newLeadEmailTemplate({
      leadName: lead.name,
      source: lead.source,
      budget: lead.budget,
    }),
  });

  if (assignedAgent) {
    await sendEmail({
      to: assignedAgent.email,
      subject: `Lead Assigned: ${lead.name}`,
      html: assignedLeadEmailTemplate({
        agentName: assignedAgent.name,
        leadName: lead.name,
      }),
    });

    publishEvent({
      type: "lead_assigned",
      leadId: lead._id.toString(),
      message: `${lead.name} assigned to ${assignedAgent.name}.`,
    });
  }

  const withAssignment = await LeadModel.findById(lead._id).populate(
    "assignedTo",
    "name email role createdAt",
  );

  return apiSuccess({ lead: toSafeLead(withAssignment) }, 201);
}
