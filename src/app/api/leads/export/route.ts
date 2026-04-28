import { apiSuccess } from "@/lib/api";
import { requireRole } from "@/lib/request-helpers";
import { USER_ROLES } from "@/types";
import { LeadModel } from "@/models/Lead";
import { connectToDatabase } from "@/lib/db";

const createCsvRow = (row: Record<string, unknown>) =>
  Object.values(row)
    .map((v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
    .join(",");

const CSV_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Property Interest",
  "Budget",
  "Status",
  "Priority",
  "Source",
  "Assigned To",
  "Follow-up Date",
  "Created At",
].join(",");

export async function GET(request: Request) {
  const auth = requireRole(request as never, [USER_ROLES.ADMIN]);
  if (!auth.payload) {
    return auth.error;
  }

  await connectToDatabase();

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (priority) query.score = priority;

  const leads = await LeadModel.find(query)
    .populate("assignedTo", "name")
    .lean();

  if (format === "json") {
    return apiSuccess({ leads });
  }

  const rows = leads.map((lead) => ({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    propertyInterest: lead.propertyInterest,
    budget: lead.budget,
    status: lead.status,
    priority: lead.score,
    source: lead.source,
    assignedTo:
      (lead.assignedTo as { name?: string })?.name || "Unassigned",
    followUpDate: lead.followUpDate?.toISOString().slice(0, 10) || "",
    createdAt: lead.createdAt.toISOString().slice(0, 10),
  }));

  const csv = [CSV_HEADERS, ...rows.map(createCsvRow)].join("\n");

  const headers = new Headers();
  headers.set("Content-Type", "text/csv");
  headers.set(
    "Content-Disposition",
    `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`
  );

  return new Response(csv, { status: 200, headers });
}