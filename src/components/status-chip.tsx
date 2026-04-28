export function StatusChip({ status }: { status: string }) {
  const classes =
    status === "closed"
      ? "bg-slate-200 text-slate-700"
      : status === "in_progress"
        ? "bg-sky-100 text-sky-700"
        : status === "assigned"
          ? "bg-indigo-100 text-indigo-700"
          : status === "contacted"
            ? "bg-teal-100 text-teal-700"
            : "bg-orange-100 text-orange-700";

  return (
    <span className={`crm-chip ${classes}`}>
      {status.replaceAll("_", " ").toUpperCase()}
    </span>
  );
}
