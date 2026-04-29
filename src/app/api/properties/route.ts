import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";
import { PropertyModel } from "@/models/Property";
import { USER_ROLES, PROPERTY_STATUS, PROPERTY_TYPE } from "@/types";
import { publishEvent } from "@/lib/realtime";

function toSafeProperty(property: {
  _id: { toString(): string };
  title: string;
  address: string;
  type: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  status: string;
  assignedTo: { _id: { toString(): string }; name: string; email: string; role: string } | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: property._id.toString(),
    title: property.title,
    address: property.address,
    type: property.type,
    price: property.price,
    area: property.area,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    description: property.description,
    status: property.status,
    assignedTo: property.assignedTo
      ? {
          id: property.assignedTo._id.toString(),
          name: property.assignedTo.name,
          email: property.assignedTo.email,
          role: property.assignedTo.role,
          createdAt: "",
        }
      : null,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
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

  const status = request.nextUrl.searchParams.get("status");
  if (status) {
    query.status = status;
  }

  const type = request.nextUrl.searchParams.get("type");
  if (type) {
    query.type = type;
  }

  const properties = await PropertyModel.find(query)
    .populate("assignedTo", "name email role createdAt")
    .sort({ createdAt: -1 });

  return apiSuccess({
    properties: properties.map(toSafeProperty),
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

  const text = await request.text();
  const lines = text.trim().split("\n");
  
  if (lines.length < 2) {
    return apiError("CSV file is empty or invalid", 400);
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
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

  const properties = [];

  for (const record of results) {
    const type = record.type?.toLowerCase() || "house";
    const validType = Object.values(PROPERTY_TYPE).includes(type as typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE])
      ? type
      : PROPERTY_TYPE.HOUSE;

    properties.push({
      title: record.title || record.name || "Untitled Property",
      address: record.address || "",
      type: validType,
      price: parseFloat(record.price) || 0,
      area: parseFloat(record.area || record.size || "0") || 0,
      bedrooms: parseInt(record.bedrooms || record.beds || "0") || 0,
      bathrooms: parseInt(record.bathrooms || record.baths || "0") || 0,
      description: record.description || record.notes || "",
      status: PROPERTY_STATUS.AVAILABLE,
    });
  }

  const created = await PropertyModel.insertMany(properties);

  for (const prop of created) {
    publishEvent({
      type: "lead_created",
      leadId: prop._id.toString(),
      message: `Property ${prop.title} imported.`,
    });
  }

  return apiSuccess(
    {
      message: `${created.length} properties imported successfully`,
      count: created.length,
    },
    201,
  );
}