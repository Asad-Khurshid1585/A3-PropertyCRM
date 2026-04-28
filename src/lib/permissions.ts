import { LeadModel } from "@/models/Lead";
import { USER_ROLES } from "@/types";

export const PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_LEADS: "manage_leads",
  VIEW_ANALYTICS: "view_analytics",
  ASSIGN_LEADS: "assign_leads",
  DELETE_LEADS: "delete_leads",
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.DELETE_LEADS,
  ],
  [USER_ROLES.AGENT]: [
    PERMISSIONS.MANAGE_LEADS,
  ],
};

export const hasPermission = (role: string, permission: string): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const canAccessLead = async ({
  userId,
  role,
  leadId,
}: {
  userId: string;
  role: "admin" | "agent";
  leadId: string;
}) => {
  if (role === USER_ROLES.ADMIN) {
    return true;
  }

  const lead = await LeadModel.findById(leadId).select("assignedTo");
  if (!lead?.assignedTo) {
    return false;
  }

  return lead.assignedTo.toString() === userId;
};
