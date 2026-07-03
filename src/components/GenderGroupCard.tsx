import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GenderGroupCardProps {
  label: string;
  count: number;
  index?: number;
  className?: string;
  children: ReactNode;
}

/**
 * A card shell with a labelled header used to group student listings by gender.
 * Male students render in one card, Female students in another below it.
 */
export function GenderGroupCard({
  label,
  count,
  index = 0,
  className,
  children,
}: GenderGroupCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      className={cn("rounded-2xl overflow-hidden", className)}
    >
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2.5">
        <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count} {count === 1 ? "student" : "students"}
        </span>
      </div>
      {children}
    </motion.div>
  );
}
