import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 md:px-8">
      <header className="crm-card mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Property Dealer CRM</p>
          <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
          <p className="text-sm text-[var(--muted)]">Role: {user.role}</p>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto mt-6 w-full max-w-7xl flex-1">{children}</main>
    </div>
  );
}
