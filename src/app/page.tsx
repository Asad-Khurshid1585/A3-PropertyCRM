import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="crm-card w-full max-w-2xl p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">CS-4032</p>
        <h1 className="mt-2 text-4xl font-bold text-[var(--foreground)]">
          Property Dealer CRM
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Manage Facebook, walk-in, and website leads in one place with role-based
          dashboards, lead scoring, follow-ups, timeline logs, and analytics.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="crm-button">
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-[var(--brand)] px-4 py-2 font-semibold text-[var(--brand)]"
          >
            Create Account
          </Link>
        </div>
      </main>
    </div>
  );
}
