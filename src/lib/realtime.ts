type RealtimeEvent = {
  id: string;
  type: "lead_created" | "lead_updated" | "lead_assigned" | "priority_changed";
  leadId: string;
  createdAt: string;
  message: string;
};

const globalStore = globalThis as typeof globalThis & {
  crmEvents?: RealtimeEvent[];
};

const events = globalStore.crmEvents || [];
globalStore.crmEvents = events;

export const EVENT_TYPES = {
  LEAD_CREATED: "lead_created",
  LEAD_UPDATED: "lead_updated",
  LEAD_ASSIGNED: "lead_assigned",
  PRIORITY_CHANGED: "priority_changed",
} as const;

export const MAX_EVENTS = 100;

export const publishEvent = (event: Omit<RealtimeEvent, "id" | "createdAt">) => {
  const next: RealtimeEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  events.push(next);

  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  return next;
};

export const getEventsSince = (since: string | null) => {
  if (!since) {
    return events.slice(-MAX_EVENTS);
  }

  const sinceTime = new Date(since).getTime();
  if (Number.isNaN(sinceTime)) {
    return events.slice(-MAX_EVENTS);
  }

  return events.filter((event) => new Date(event.createdAt).getTime() > sinceTime);
};

export const clearEvents = () => {
  events.length = 0;
};

export const getRecentEvents = (limit = 20) => {
  return events.slice(-limit);
};
