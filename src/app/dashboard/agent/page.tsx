import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";

export default async function AgentDashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "agent") {
    redirect("/dashboard/admin");
  }

  return <DashboardClient role="agent" />;
}
