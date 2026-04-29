import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";
import { LeadModel } from "@/models/Lead";
import { USER_ROLES, LEAD_STATUS } from "@/types";
import { publishEvent } from "@/lib/realtime";
import { logLeadActivity } from "@/lib/activity";
import { getLeadPriority } from "@/lib/scoring";

function toSafeLead(lead: {
  _id: { toString(): string };
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: number;
  status: string;
  notes: string;
  assignedTo: { _id: { toString(): string }; name: string; email: string; role: string } | null;
  source: string;
  score: string;
  followUpDate: Date | null;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: lead._id.toString(),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    propertyInterest: lead.propertyInterest,
    budget: lead.budget,
    status: lead.status,
    notes: lead.notes,
    assignedTo: lead.assignedTo
      ? {
          id: lead.assignedTo._id.toString(),
          name: lead.assignedTo.name,
          email: lead.assignedTo.email,
          role: lead.assignedTo.role,
          createdAt: "",
        }
      : null,
    source: lead.source,
    score: lead.score,
    followUpDate: lead.followUpDate?.toISOString() || null,
    lastActivityAt: lead.lastActivityAt.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

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
    query.assignedTo = auth.payload.sub;
  }

  const leads = await LeadModel.find(query)
    .populate("assignedTo", "name email role createdAt")
    .sort({ createdAt: -1 });

  return apiSuccess({
    leads: leads.map(toSafeLead),
  });
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

  await connectToDatabase();

  let text: string;
  const contentType = request.headers.get("content-type") || "";
  
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return apiError("No file provided", 400);
    }
    text = await file.text();
  } else {
    text = await request.text();
  }

  const lines = text.trim().split("\n");
  
  if (lines.length < 2) {
    return apiError("CSV file is empty or invalid", 400);
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(" ", "_"));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    if (Object.values(obj).some((v) => v)) {
      results.push(obj);
    }
  }

  if (results.length === 0) {
    return apiError("No valid data found in CSV", 400);
  }

  const leads = [];

  for (const record of results) {
    const budget = parseFloat(record.budget) || 0;
    const score = getLeadPriority(budget);
    
    leads.push({
      name: record.name || "Unknown",
      email: record.email || "noemail@example.com",
      phone: record.phone || "923000000000",
      propertyInterest: record.property_interest || record.propertyinterest || record.property_interest || "Not specified",
      budget,
      status: LEAD_STATUS.NEW,
      notes: record.notes || "",
      source: record.source || "imported",
      score,
    });
  }

  const created = await LeadModel.insertMany(leads);

  for (const lead of created) {
    await logLeadActivity({
      leadId: lead._id.toString(),
      actorId: auth.payload.sub,
      type: "created",
      description: `Lead ${lead.name} imported from CSV.`,
    });
    
    publishEvent({
      type: "lead_created",
      leadId: lead._id.toString(),
      message: `${lead.name} added (${lead.score} priority).`,
    });
  }

  return apiSuccess(
    {
      message: `${created.length} leads imported successfully`,
      count: created.length,
    },
    201,
  );
}