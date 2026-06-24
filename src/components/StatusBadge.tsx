import { cn } from "@/lib/utils";
import type { AttendanceStatus, StudentStatus } from "@/lib/types";

const map: Record<string, string> = {
  Present: "bg-success/15 text-success border-success/30",
  Absent: "bg-destructive/15 text-destructive border-destructive/30",
  Active: "bg-success/15 text-success border-success/30",
  Inactive: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: AttendanceStatus | StudentStatus | string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        map[status] ?? "bg-secondary text-secondary-foreground border-border",
      )}
    >
      {status}
    </span>
  );
}
