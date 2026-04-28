export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AgentUser = {
  id: string;
  name: string;
  email: string;
  role: "agent";
  createdAt: string;
};

export type ActivityItem = {
  id: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};
