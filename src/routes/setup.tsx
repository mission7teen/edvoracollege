import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Building2, Users, Palette, Check, ArrowRight, Loader2, Upload, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import { PRESET_ACCENTS } from "@/lib/theme";
import { createStaffAccount } from "@/lib/roles.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: SetupPage,
  head: () => ({
    meta: [
      { title: "Account setup · EDVORA COLLEGE" },
      {
        name: "description",
        content:
          "Set up your college account: add your college details and logo, invite staff, and choose your colours.",
      },
      { property: "og:title", content: "Account setup · EDVORA COLLEGE" },
      {
        property: "og:description",
        content: "Create your college workspace in a few quick steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const STEPS = [
  { id: "college", label: "College information", icon: Building2 },
  { id: "users", label: "Users & roles", icon: Users },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const { settings, updateSettings, accent, setAccent, theme, setTheme } = useData();
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    email: "",
    phone: "",
    address: "",
    academicYear: new Date().getFullYear().toString(),
    logo: "",
  });

  // If this account already finished setup, go straight to the app.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id, setup_completed")
        .limit(1)
        .maybeSingle();
      if (data?.setup_completed) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  const pickLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Invalid image"));
      el.src = dataUrl;
    });
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - scale) / 2, (img.height - scale) / 2, scale, scale, 0, 0, size, size);
    setForm((f) => ({ ...f, logo: canvas.toDataURL("image/png") }));
  };

  const saveCollege = async () => {
    if (!form.name.trim()) {
      toast.error("Enter your college name");
      return false;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_my_college", { _name: form.name.trim() });
      if (error) throw new Error(error.message);
      updateSettings({
        ...settings,
        name: form.name.trim(),
        tagline: form.tagline,
        email: form.email,
        phone: form.phone,
        address: form.address,
        academicYear: form.academicYear,
        logo: form.logo || settings.logo,
      });
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Could not save your college");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("complete_my_setup");
      if (error) throw new Error(error.message);
      toast.success("Your college is ready");
      navigate({ to: "/dashboard", replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Could not finish setup");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Set up your college</h1>
          <p className="text-sm text-muted-foreground">
            A few quick details — you can change everything later in Settings.
          </p>
        </header>

        <ol className="flex items-center justify-center gap-2" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                  i === step
                    ? "gradient-primary text-primary-foreground"
                    : i < step
                      ? "bg-muted text-foreground"
                      : "bg-muted/50 text-muted-foreground",
                )}
              >
                {i < step ? <Check size={13} /> : <s.icon size={13} />}
                <span className="hidden sm:inline">{s.label}</span>
              </span>
            </li>
          ))}
        </ol>

        <motion.section
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 space-y-4"
        >
          {step === 0 && (
            <>
              <h2 className="font-bold">College information</h2>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted grid place-items-center">
                  {form.logo ? (
                    <img src={form.logo} alt="College logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-logo" className="text-xs">
                    College logo
                  </Label>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <label htmlFor="setup-logo" className="cursor-pointer">
                        <Upload size={14} /> Upload
                      </label>
                    </Button>
                    {form.logo && (
                      <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, logo: "" }))}>
                        <X size={14} /> Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="setup-logo"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void pickLogo(f);
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="College name">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your college name"
                  />
                </Field>
                <Field label="Academic year">
                  <Input
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              </div>
              <Field label="Tagline">
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </Field>
              <Field label="Address">
                <Textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>

              <div className="flex justify-end pt-2">
                <Button
                  disabled={saving}
                  className="gradient-primary text-primary-foreground"
                  onClick={async () => {
                    if (await saveCollege()) setStep(1);
                  }}
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 1 && <UsersStep onNext={() => setStep(2)} onSkip={() => setStep(2)} />}

          {step === 2 && (
            <>
              <h2 className="font-bold">Appearance</h2>
              <p className="text-xs text-muted-foreground">Pick a colour and mode for your college.</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_ACCENTS.map((c) => (
                  <button
                    key={c.hex}
                    aria-label={c.name}
                    onClick={() => setAccent(c.hex)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-transform",
                      accent === c.hex ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                {(["light", "dark"] as const).map((m) => (
                  <Button
                    key={m}
                    variant={theme === m ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(m)}
                    className="capitalize"
                  >
                    {m}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={finish} disabled={saving}>
                  Skip
                </Button>
                <Button
                  onClick={finish}
                  disabled={saving}
                  className="gradient-primary text-primary-foreground"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Finish setup
                </Button>
              </div>
            </>
          )}
        </motion.section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function UsersStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<{ email: string; role: string }[]>([]);

  const add = async () => {
    setBusy(true);
    try {
      await createStaffAccount({ data: { email, password, role } });
      setAdded((a) => [...a, { email, role }]);
      setEmail("");
      setPassword("");
      toast.success("Account created");
    } catch (e: any) {
      toast.error(e?.message || "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="font-bold">Users &amp; roles</h2>
      <p className="text-xs text-muted-foreground">
        Create accounts for your team now, or skip and do it later in Settings.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.com" />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
      </div>
      <div className="flex gap-2">
        {(["staff", "admin"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={role === r ? "default" : "outline"}
            onClick={() => setRole(r)}
            className="capitalize"
          >
            {r}
          </Button>
        ))}
        <Button size="sm" onClick={add} disabled={busy || !email || password.length < 8} className="ml-auto">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Add account
        </Button>
      </div>

      {added.length > 0 && (
        <ul className="space-y-1 text-sm">
          {added.map((a) => (
            <li key={a.email} className="flex items-center gap-2 text-muted-foreground">
              <Check size={14} className="text-primary" /> {a.email} · {a.role}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button onClick={onNext} className="gradient-primary text-primary-foreground">
          <ArrowRight size={15} /> Continue
        </Button>
      </div>
    </>
  );
}
