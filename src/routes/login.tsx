import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { lovable } from "@/integrations/lovable/index";
import shieldLogo from "@/assets/images/shield_logo_1782228638116.jpg";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthed, rememberedUser, init } = useAuth();
  const [email, setEmail] = useState(rememberedUser ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!rememberedUser);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isAuthed) navigate({ to: "/dashboard" });
  }, [isAuthed, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await login(email.trim(), password, remember);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Authentication failed");
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function onGoogle() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error.message ?? "Google sign-in failed");
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
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
            <img src={shieldLogo} alt="EDVORA" className="w-full h-full object-cover" />
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
        </motion.div>

        <div className="relative text-xs text-white/70 flex items-center gap-2">
          <ShieldCheck size={14} /> Secured staff access · Sessions managed by Lovable Cloud
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card rounded-3xl p-8"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl overflow-hidden grid place-items-center">
              <img src={shieldLogo} alt="EDVORA" className="w-full h-full object-cover" />
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
            Use your staff credentials or Google account.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@edvoracollege.com"
                  required
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
                  minLength={6}
                  required
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
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  Remember me
                </label>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 gradient-primary text-primary-foreground hover:opacity-95 shadow-elegant"
            >
              {loading ? "Please wait…" : "Sign in"}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onGoogle}
              className="w-full h-11"
            >
              Continue with Google
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Accounts are created by the administrator. Contact your admin for access.
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
