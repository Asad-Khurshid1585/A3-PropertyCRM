import type { SafeLead, SafeUser } from "@/types";

type LeadWithAssignment = {
  _id: { toString(): string };
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: number;
  status: SafeLead["status"];
  notes: string;
  source: string;
  score: SafeLead["score"];
  followUpDate: Date | null;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo:
    | null
    | {
        _id: { toString(): string };
        name: string;
        email: string;
        role: SafeUser["role"];
        createdAt: Date;
      };
};

export const toSafeLead = (lead: LeadWithAssignment): SafeLead => {
  return {
    id: lead._id.toString(),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    propertyInterest: lead.propertyInterest,
    budget: lead.budget,
    status: lead.status,
    notes: lead.notes,
    source: lead.source,
    score: lead.score,
    followUpDate: lead.followUpDate ? lead.followUpDate.toISOString() : null,
    lastActivityAt: lead.lastActivityAt.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    assignedTo: lead.assignedTo
      ? {
          id: lead.assignedTo._id.toString(),
          name: lead.assignedTo.name,
          email: lead.assignedTo.email,
          role: lead.assignedTo.role,
          createdAt: lead.assignedTo.createdAt.toISOString(),
        }
      : null,
  };
};
