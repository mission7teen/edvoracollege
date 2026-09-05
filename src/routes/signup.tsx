import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { InstallPrompt } from "@/components/InstallPrompt";
import shieldLogo from "@/assets/images/shield_logo_1782228638116.jpg";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create account · EDVORA COLLEGE Staff Portal" },
      {
        name: "description",
        content:
          "Create a staff account for the EDVORA COLLEGE attendance management system to manage students, batches, exams and attendance.",
      },
      { property: "og:title", content: "Create account · EDVORA COLLEGE Staff Portal" },
      {
        property: "og:description",
        content: "Create a staff account for the EDVORA COLLEGE attendance management dashboard.",
      },
      { property: "og:url", content: "https://edvoracollege.lovable.app/signup" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/signup" }],
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthed, init } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isAuthed) navigate({ to: "/dashboard" });
  }, [isAuthed, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const res = await signup(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Sign up failed");
      return;
    }
    setSent(true);
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
            <img src={shieldLogo} alt="EDVORA COLLEGE Logo" className="w-full h-full object-cover" />
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
            Create your staff account to start managing students, batches and daily attendance.
          </p>
        </motion.div>

        <div className="relative text-xs text-white/70 flex items-center gap-2">
          <ShieldCheck size={14} /> Secured staff access · Sessions managed by Lovable Cloud
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md glass-card rounded-3xl p-8 text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
              <MailCheck size={26} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account, then sign in.
            </p>
            <Button
              className="w-full h-11 mt-6 gradient-primary text-primary-foreground hover:opacity-95 shadow-elegant"
              onClick={() => navigate({ to: "/login" })}
            >
              Back to sign in
            </Button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md glass-card rounded-3xl p-8"
          >
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl overflow-hidden grid place-items-center">
                <img src={shieldLogo} alt="EDVORA COLLEGE Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-bold tracking-tight">EDVORA COLLEGE</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Attendance System
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign up with your staff email to get started.
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
                    autoComplete="new-password"
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
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    className="pl-9 h-11"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 gradient-primary text-primary-foreground hover:opacity-95 shadow-elegant"
              >
                {loading ? "Please wait…" : "Create account"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </motion.form>
        )}
      </div>
      <InstallPrompt />
    </div>
  );
}
