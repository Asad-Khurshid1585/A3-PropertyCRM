import { z } from "zod";
import { LEAD_STATUS, USER_ROLES } from "@/types";

export const signupSchema = z.object({
  name: z.string().min(3).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(64),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.AGENT]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(64),
});

export const leadCreateSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  propertyInterest: z.string().min(3).max(120),
  budget: z.number().positive(),
  status: z
    .enum([
      LEAD_STATUS.NEW,
      LEAD_STATUS.CONTACTED,
      LEAD_STATUS.ASSIGNED,
      LEAD_STATUS.IN_PROGRESS,
      LEAD_STATUS.CLOSED,
    ])
    .optional(),
  notes: z.string().max(500).optional(),
  assignedTo: z.string().optional(),
  source: z.string().min(2).max(50),
  followUpDate: z.string().datetime().optional(),
});

export const leadUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  propertyInterest: z.string().min(3).max(120).optional(),
  budget: z.number().positive().optional(),
  status: z
    .enum([
      LEAD_STATUS.NEW,
      LEAD_STATUS.CONTACTED,
      LEAD_STATUS.ASSIGNED,
      LEAD_STATUS.IN_PROGRESS,
      LEAD_STATUS.CLOSED,
    ])
    .optional(),
  notes: z.string().max(500).optional(),
  assignedTo: z.string().nullable().optional(),
  source: z.string().min(2).max(50).optional(),
  followUpDate: z.string().datetime().nullable().optional(),
});

export const assignmentSchema = z.object({
  leadId: z.string().min(6),
  agentId: z.string().min(6),
});

export const followUpSchema = z.object({
  followUpDate: z.string().datetime(),
});
