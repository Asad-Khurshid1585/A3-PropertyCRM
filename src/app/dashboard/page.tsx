import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export default async function DashboardEntryPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  redirect(user.role === "admin" ? "/dashboard/admin" : "/dashboard/agent");
}
