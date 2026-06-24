import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string;
  trend?: "up" | "down" | "flat";
  accent?: "primary" | "success" | "warning" | "destructive";
  delay?: number;
}

const accentMap = {
  primary: "from-primary/15 to-primary/0 text-primary",
  success: "from-success/15 to-success/0 text-success",
  warning: "from-warning/20 to-warning/0 text-warning",
  destructive: "from-destructive/15 to-destructive/0 text-destructive",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  trend,
  accent = "primary",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl glass-card p-5"
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl opacity-70",
          accentMap[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</div>
          {delta && (
            <div
              className={cn(
                "mt-1.5 text-xs font-medium",
                trend === "down" ? "text-destructive" : "text-success",
              )}
            >
              {delta}
            </div>
          )}
        </div>
        <div
          className={cn(
            "grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br",
            accentMap[accent],
          )}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
      </div>
    </motion.div>
  );
}
