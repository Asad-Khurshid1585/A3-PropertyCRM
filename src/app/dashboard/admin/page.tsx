import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";

export default async function AdminDashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard/agent");
  }

  return <DashboardClient role="admin" />;
}
