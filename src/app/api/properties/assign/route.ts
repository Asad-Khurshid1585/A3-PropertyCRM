import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";
import { PropertyModel } from "@/models/Property";
import { UserModel } from "@/models/User";
import { USER_ROLES } from "@/types";
import { publishEvent } from "@/lib/realtime";

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
  if (!body || !body.propertyId || !body.agentId) {
    return apiError("propertyId and agentId are required", 400);
  }

  await connectToDatabase();

  const property = await PropertyModel.findById(body.propertyId);
  if (!property) {
    return apiError("Property not found", 404);
  }

  const agent = await UserModel.findOne({
    _id: body.agentId,
    role: USER_ROLES.AGENT,
  }).select("name email");

  if (!agent) {
    return apiError("Agent not found", 404);
  }

  property.assignedTo = agent._id;
  await property.save();

  publishEvent({
    type: "lead_assigned",
    leadId: property._id.toString(),
    message: `Property ${property.title} assigned to ${agent.name}.`,
  });

  return apiSuccess({ message: "Property assigned successfully" });
}