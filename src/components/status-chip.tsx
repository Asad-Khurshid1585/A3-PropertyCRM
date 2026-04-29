export function StatusChip({ status }: { status: string }) {
  const classes =
    status === "closed"
      ? "bg-zinc-700 text-zinc-300"
      : status === "in_progress"
        ? "bg-zinc-600 text-zinc-200"
        : status === "assigned"
          ? "bg-neutral-600 text-neutral-200"
          : status === "contacted"
            ? "bg-stone-600 text-stone-200"
            : "bg-gray-600 text-gray-200";

  return (
    <span className={`crm-chip ${classes}`}>
      {status.replaceAll("_", " ").toUpperCase()}
    </span>
  );
}
