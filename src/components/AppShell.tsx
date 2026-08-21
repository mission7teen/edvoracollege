import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Menu, Moon, Search, Sun, User, Lock, KeyRound, Palette, MessageSquare, LogOut } from "lucide-react";
import { useData, useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const theme = useData((s) => s.theme);
  const setTheme = useData((s) => s.setTheme);
  const settings = useData((s) => s.settings);
  const [open, setOpen] = useState(false);
  const username = useAuth((s) => s.username);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const goSettings = (hash: string) => {
    navigate({ to: "/settings", hash });
  };
  const initials = (settings.name || "Edvora College")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:block sticky top-0 h-screen">
        <Sidebar />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="h-16 px-4 lg:px-8 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation menu">
              <Menu />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-xl border border-border bg-card w-64 text-sm text-muted-foreground">
              <Search size={15} />
              <span className="text-xs">Search students, batches…</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="notifications">
              <Bell size={18} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 pl-3 ml-1 border-l border-border outline-none"
                  aria-label="Open user profile menu"
                >
                  <div className="w-9 h-9 rounded-full gradient-primary grid place-items-center text-primary-foreground text-xs font-bold">
                    {initials || "EC"}
                  </div>
                  <div className="hidden sm:block text-xs leading-tight text-left">
                    <div className="font-semibold truncate max-w-[120px]">{settings.name}</div>
                    <div className="text-muted-foreground">{settings.academicYear}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="text-base font-bold leading-tight truncate">{settings.name}</div>
                  <div className="text-sm text-muted-foreground font-normal truncate">
                    {username ?? settings.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="py-2.5 text-sm" onSelect={() => goSettings("profile")}>
                  <User size={16} className="mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 text-sm" onSelect={() => goSettings("general")}>
                  <Lock size={16} className="mr-2" /> Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 text-sm" onSelect={() => goSettings("security")}>
                  <KeyRound size={16} className="mr-2" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 text-sm" onSelect={() => goSettings("appearance")}>
                  <Palette size={16} className="mr-2" /> Theme preference
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 text-sm" onSelect={() => goSettings("notifications")}>
                  <MessageSquare size={16} className="mr-2" /> Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="py-2.5 text-sm text-destructive focus:text-destructive"
                  onSelect={async () => {
                    await logout();
                    window.location.href = "/login";
                  }}
                >
                  <LogOut size={16} className="mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {actions && <div className="px-4 lg:px-8 pb-3 -mt-1 flex flex-wrap gap-2">{actions}</div>}
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
