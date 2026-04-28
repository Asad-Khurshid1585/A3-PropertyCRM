export function PriorityChip({ priority }: { priority: string }) {
  const classes =
    priority === "high"
      ? "bg-rose-100 text-rose-700"
      : priority === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return <span className={`crm-chip ${classes}`}>{priority.toUpperCase()}</span>;
}
