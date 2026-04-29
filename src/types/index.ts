export const USER_ROLES = {
  ADMIN: "admin",
  AGENT: "agent",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
} as const;

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

export const LEAD_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type LeadPriority = (typeof LEAD_PRIORITY)[keyof typeof LEAD_PRIORITY];

export const ACTIVITY_TYPES = {
  CREATED: "created",
  UPDATED: "updated",
  STATUS_CHANGED: "status_changed",
  ASSIGNED: "assigned",
  REASSIGNED: "reassigned",
  NOTE_UPDATED: "note_updated",
  FOLLOW_UP_SET: "follow_up_set",
  PRIORITY_CHANGED: "priority_changed",
  DELETED: "deleted",
} as const;

export type ActivityType =
  (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type SafeLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: number;
  status: LeadStatus;
  notes: string;
  assignedTo: SafeUser | null;
  source: string;
  score: LeadPriority;
  followUpDate: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export const PROPERTY_STATUS = {
  AVAILABLE: "available",
  SOLD: "sold",
  RENTED: "rented",
} as const;

export type PropertyStatus = (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS];

export const PROPERTY_TYPE = {
  HOUSE: "house",
  APARTMENT: "apartment",
  PLOT: "plot",
  COMMERCIAL: "commercial",
} as const;

export type PropertyType = (typeof PROPERTY_TYPE)[keyof typeof PROPERTY_TYPE];

export type SafeProperty = {
  id: string;
  title: string;
  address: string;
  type: PropertyType;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  status: PropertyStatus;
  assignedTo: SafeUser | null;
  createdAt: string;
  updatedAt: string;
};
