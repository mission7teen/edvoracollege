import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  ClipboardCheck,
  History,
  FileBarChart,
  TrendingUp,
  Settings,
  LogOut,
  Award,
  Wallet,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const items = [
  { to: "/dashboard", page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", page: "students", label: "Students", icon: Users },
  { to: "/teachers", page: "teachers", label: "Teachers", icon: GraduationCap },
  { to: "/batches", page: "batches", label: "Batches", icon: Layers },
  { to: "/subjects", page: "subjects", label: "Subjects", icon: BookOpen },
  { to: "/attendance", page: "attendance", label: "Mark Attendance", icon: ClipboardCheck },
  { to: "/history", page: "history", label: "Attendance History", icon: History },
  { to: "/exams", page: "exams", label: "Exam Marks", icon: Award },
  { to: "/payments", page: "payments", label: "Payments", icon: Wallet },
  { to: "/reports", page: "reports", label: "Reports", icon: FileBarChart },
  { to: "/analytics", page: "analytics", label: "Analytics", icon: TrendingUp },
  { to: "/settings", page: "settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const logout = useAuth((s) => s.logout);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { loading: roleLoading, can } = useRole();
  const visible = items.filter((it) => roleLoading || can(it.page));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl">
      <div className="px-5 h-16 flex items-center border-b border-border">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visible.map((it, i) => {

          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <motion.div
              key={it.to}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={it.to}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "gradient-primary text-primary-foreground shadow-elegant"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "shrink-0",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-primary",
                  )}
                />
                <span>{it.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
