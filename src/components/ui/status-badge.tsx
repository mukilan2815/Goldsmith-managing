import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "incomplete" | "complete" | "cancelled";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<
  Status,
  { label: string; variant: string; className: string }
> = {
  incomplete: {
    label: "Incomplete",
    variant: "secondary",
    className:
      "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300",
  },
  complete: {
    label: "Complete",
    variant: "default",
    className:
      "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    className:
      "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant as any}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
