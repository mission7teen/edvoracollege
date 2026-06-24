import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import shieldLogo from "@/assets/images/shield_logo_1782228638116.jpg";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthed, rememberedUser } = useAuth();
  const [username, setUsername] = useState(rememberedUser ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!rememberedUser);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed) navigate({ to: "/dashboard" });
  }, [isAuthed, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const res = login(username.trim(), password, remember);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Login failed");
      return;
    }
    toast.success("Welcome back, Admin");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden gradient-primary text-primary-foreground">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/15 backdrop-blur grid place-items-center">
            <img
              src={shieldLogo}
              alt="EDVORA"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="font-bold tracking-tight text-lg">EDVORA COLLEGE</div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">
              Attendance Management
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative max-w-md"
        >
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Education
            <br />
            Beyond Books.
          </h2>
          <p className="mt-4 text-white/80 leading-relaxed">
            A modern command center for managing students, batches and daily attendance — built for
            the EDVORA team.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm">
            {[
              { k: "Students", v: "1,240+" },
              { k: "Batches", v: "32" },
              { k: "Uptime", v: "99.9%" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/15"
              >
                <div className="text-xl font-bold">{s.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/70">{s.k}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative text-xs text-white/70 flex items-center gap-2">
          <ShieldCheck size={14} /> Secured admin access · Session managed
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card rounded-3xl p-8"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl overflow-hidden grid place-items-center">
              <img
                src={shieldLogo}
                alt="EDVORA"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="font-bold tracking-tight">EDVORA COLLEGE</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Attendance System
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to your dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your administrator credentials to continue.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="username"
                  autoFocus
                  autoComplete="username"
                  className="pl-9 h-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Edvora"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  className="pl-9 pr-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                  aria-label="toggle password"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Remember
                me
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => toast.info("Contact your administrator")}
              >
                Forgot password?
              </button>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 gradient-primary text-primary-foreground hover:opacity-95 shadow-elegant"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </div>

          <div className="mt-6 text-[11px] text-muted-foreground text-center border-t border-border pt-4">
            Demo credentials —{" "}
            <span className="font-mono font-semibold text-foreground">Edvora</span> /{" "}
            <span className="font-mono font-semibold text-foreground">Edvora@1234</span>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
