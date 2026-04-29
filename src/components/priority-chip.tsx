export function PriorityChip({ priority }: { priority: string }) {
  const classes =
    priority === "high"
      ? "bg-red-900 text-red-200"
      : priority === "medium"
        ? "bg-yellow-900 text-yellow-200"
        : "bg-green-900 text-green-200";

  return <span className={`crm-chip ${classes}`}>{priority.toUpperCase()}</span>;
}
