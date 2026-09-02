import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, useData } from "@/lib/store";
import { exportCSV, exportJSON } from "@/lib/exporters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/hooks/use-role";
import {
  listUserRoles,
  createStaffAccount,
  setUserRole,
  removeUserRoles,
} from "@/lib/roles.functions";
import { cn } from "@/lib/utils";
import type { CollegeSettings } from "@/lib/types";
import {
  Building2,
  Globe,
  User,
  Lock,
  Users,
  MessageSquare,
  Palette,
  DatabaseBackup,
  ScrollText,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings · EDVORA COLLEGE" },
      { name: "description", content: "Configure academic year, integrations and preferences for EDVORA COLLEGE." },
      { property: "og:title", content: "Settings · EDVORA COLLEGE" },
      { property: "og:description", content: "Configure academic year, integrations and preferences for EDVORA COLLEGE." },
      { property: "og:url", content: "https://edvoracollege.lovable.app/settings" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/settings" }],
  }),
});

const SECTIONS = [
  { id: "college", label: "College Information", icon: Building2, adminOnly: true },
  { id: "general", label: "General Settings", icon: Globe, adminOnly: true },
  { id: "profile", label: "User Profile", icon: User, adminOnly: false },
  { id: "security", label: "Account Security", icon: Lock, adminOnly: false },
  { id: "roles", label: "Users & Roles", icon: Users, adminOnly: true },
  { id: "notifications", label: "Notifications", icon: MessageSquare, adminOnly: true },
  { id: "appearance", label: "Appearance", icon: Palette, adminOnly: false },
  { id: "backup", label: "Backup & Restore", icon: DatabaseBackup, adminOnly: true },
  { id: "audit", label: "Audit Logs", icon: ScrollText, adminOnly: true },

] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function SettingsPage() {
  const [active, setActive] = useState<SectionId>("college");
  const { isAdmin, loading: roleLoading } = useRole();

  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    const h = (hash || "").replace("#", "");
    if (h && SECTIONS.some((s) => s.id === h)) setActive(h as SectionId);
  }, [hash]);

  const visible = SECTIONS.filter((s) => !s.adminOnly || isAdmin || roleLoading);
  const activeSection = SECTIONS.find((s) => s.id === active);
  const blocked = !roleLoading && !isAdmin && !!activeSection?.adminOnly;
  const home: SectionId = isAdmin || roleLoading ? "college" : "profile";

  useEffect(() => {
    if (blocked) setActive("profile");
  }, [blocked]);


  return (
    <AppShell title="Settings" subtitle="System command center and configuration">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        <motion.nav
          id="settings-configuration-nav"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "glass-card rounded-2xl p-3 lg:sticky lg:top-4",
            active !== home && "hidden lg:block"
          )}

          aria-label="Settings sections"
        >
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
              CONFIGURATION
            </p>
            {!roleLoading && (
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px]">
                {isAdmin ? "Admin" : "Staff"}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            {visible.map((s) => {
              const Icon = s.icon;
              const on = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  aria-current={on ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-colors ${
                    on
                      ? "gradient-primary text-primary-foreground shadow"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Icon size={17} />
                  {s.label}
                  {s.adminOnly && (
                    <ShieldCheck size={13} className="ml-auto opacity-70" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </motion.nav>

        <motion.section
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {active !== home && (
            <button
              onClick={() => setActive(home)}

              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
              aria-label="Back to configuration"
            >
              <ChevronLeft size={16} />
              Back to Configuration
            </button>
          )}
          {blocked ? (
            <AdminOnlyNotice />
          ) : (
            <>
              {active === "college" && isAdmin && <CollegeSection />}
              {active === "general" && isAdmin && <GeneralSection />}
              {active === "profile" && <ProfileSection />}
              {active === "security" && <SecuritySection />}
              {active === "roles" && isAdmin && <RolesSection />}
              {active === "notifications" && isAdmin && <NotificationsSection />}
              {active === "appearance" && <AppearanceSection />}
              {active === "backup" && isAdmin && <BackupSection />}
              {active === "audit" && isAdmin && <AuditSection />}

            </>
          )}
        </motion.section>
      </div>
    </AppShell>
  );
}

function AdminOnlyNotice() {
  return (
    <Card
      title="Administrator access required"
      desc="This section contains sensitive configuration and is restricted to admins."
      icon={ShieldAlert}
    >
      <p className="text-sm text-muted-foreground">
        Ask an administrator to grant you the Admin role if you need access to Users &amp; Roles,
        Backup &amp; Restore or Audit Logs.
      </p>
    </Card>
  );
}


/* ---------------- shared helpers ---------------- */

function Card({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-11 h-11 rounded-xl gradient-primary grid place-items-center text-primary-foreground">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="font-bold">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function useSettingsForm() {
  const { settings, updateSettings } = useData();
  const { username } = useAuth();
  const [form, setForm] = useState<CollegeSettings>(settings);
  useEffect(() => setForm(settings), [settings]);

  const save = (action: string, patch?: Partial<CollegeSettings>) => {
    const next = { ...form, ...(patch || {}) };
    const log = [
      { at: new Date().toISOString(), actor: username || "staff", action },
      ...(settings.auditLog || []),
    ].slice(0, 100);
    updateSettings({ ...next, auditLog: log });
    toast.success("Settings saved");
  };

  return { form, setForm, save, settings };
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onSave} className="gradient-primary text-primary-foreground">
        <Save size={15} /> Save changes
      </Button>
    </div>
  );
}

/* ---------------- sections ---------------- */

function LogoUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const pick = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    setBusy(true);
    try {
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
      if (!ctx) throw new Error("Canvas unavailable");
      const scale = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - scale) / 2,
        (img.height - scale) / 2,
        scale,
        scale,
        0,
        0,
        size,
        size,
      );
      onChange(canvas.toDataURL("image/png"));
      toast.success("Logo ready — save changes to apply everywhere");
    } catch (e: any) {
      toast.error(e?.message || "Could not load image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">College logo</Label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-border grid place-items-center bg-muted">
          {value ? (
            <img src={value} alt="College logo preview" className="w-full h-full object-cover" />
          ) : (
            <Building2 size={20} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            accept="image/*"
            disabled={busy}
            aria-label="Upload college logo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
            }}
          />
          <div className="flex gap-2">
            <Input
              placeholder="…or paste an image URL"
              value={value.startsWith("data:") ? "" : value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 text-xs"
            />
            {value && (
              <Button variant="outline" size="sm" onClick={() => onChange("")}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Used in the sidebar, reports, the installed app icon and the browser tab icon.
      </p>
    </div>
  );
}

function CollegeSection() {

  const { form, setForm, save } = useSettingsForm();
  return (
    <Card
      title="College Information"
      desc="Displayed across the dashboard and on exported reports."
      icon={Building2}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="College name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </F>
        <F label="Academic year">
          <Input
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
          />
        </F>
        <div className="sm:col-span-2">
          <F label="Tagline">
            <Input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </F>
        </div>
        <F label="Contact email">
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </F>
        <F label="Contact phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </F>
        <div className="sm:col-span-2">
          <F label="Address">
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </F>
        </div>
        <div className="sm:col-span-2">
          <LogoUploader
            value={form.logo}
            onChange={(logo) => setForm({ ...form, logo })}
          />
        </div>

      </div>
      <SaveBar onSave={() => save("Updated college information")} />
    </Card>
  );
}

function GeneralSection() {
  const { form, setForm, save } = useSettingsForm();
  return (
    <Card title="General Settings" desc="Academic defaults used across attendance and reports." icon={Globe}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="Academic year">
          <Input
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
          />
        </F>
        <F label="Currency">
          <Input
            value={form.currency ?? "LKR"}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </F>
        <F label="Date format">
          <Select
            value={form.dateFormat ?? "YYYY-MM-DD"}
            onValueChange={(v) => setForm({ ...form, dateFormat: v as CollegeSettings["dateFormat"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Week starts on">
          <Select
            value={form.weekStart ?? "Monday"}
            onValueChange={(v) => setForm({ ...form, weekStart: v as CollegeSettings["weekStart"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Monday">Monday</SelectItem>
              <SelectItem value="Sunday">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Timezone">
          <Input
            value={form.timezone ?? "Asia/Colombo"}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </F>
        <div className="sm:col-span-2">
          <Label className="text-xs">
            Attendance threshold ({form.attendanceThreshold}%)
          </Label>
          <Slider
            min={50}
            max={100}
            step={1}
            value={[form.attendanceThreshold]}
            onValueChange={(v) => setForm({ ...form, attendanceThreshold: v[0] })}
            className="mt-3"
          />
        </div>
      </div>
      <SaveBar onSave={() => save("Updated general settings")} />
    </Card>
  );
}

function ProfileSection() {
  const { username } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const m = (data.user?.user_metadata || {}) as Record<string, string>;
      setFullName(m.full_name || "");
      setPhone(m.phone || "");
    });
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, phone } });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  return (
    <Card title="User Profile" desc="Your personal staff account details." icon={User}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full gradient-primary grid place-items-center text-primary-foreground font-bold">
          {(fullName || username || "EC").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm">{fullName || "Staff member"}</p>
          <p className="text-xs text-muted-foreground">{username}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="Full name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </F>
        <F label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </F>
        <div className="sm:col-span-2">
          <F label="Email (sign-in)">
            <Input value={username ?? ""} disabled />
          </F>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button disabled={busy} onClick={save} className="gradient-primary text-primary-foreground">
          <Save size={15} /> Save profile
        </Button>
      </div>
    </Card>
  );
}

function SecuritySection() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPw("");
    setPw2("");
    toast.success("Password updated");
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
    toast.success("Signed out on all devices");
  };

  return (
    <Card title="Account Security" desc="Password and session management." icon={Lock}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="New password">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </F>
        <F label="Confirm new password">
          <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </F>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        <Button variant="outline" onClick={signOutEverywhere}>
          Sign out all devices
        </Button>
        <Button
          disabled={busy}
          onClick={changePassword}
          className="gradient-primary text-primary-foreground"
        >
          <Save size={15} /> Update password
        </Button>
      </div>
      <p className="text-xs text-muted-foreground pt-2 border-t border-border">
        Public sign-ups are disabled — only an administrator can create new staff accounts.
      </p>
    </Card>
  );
}

function RolesSection() {
  const { username } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("staff");
  const [users, setUsers] = useState<
    { id: string; email: string; fullName?: string; createdAt: string; roles: string[]; accessRoleId: string | null }[]
  >([]);
  const [roles, setRoles] = useState<AppRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // new role draft
  const [roleName, setRoleName] = useState("");
  const [rolePages, setRolePages] = useState<string[]>(["dashboard", "attendance"]);
  const [roleIsAdmin, setRoleIsAdmin] = useState(false);

  const loadRoles = async () => {
    const { data, error } = await supabase.from("app_roles").select("id, name, pages, is_admin").order("name");
    if (error) toast.error(error.message);
    else setRoles((data ?? []) as AppRoleRow[]);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [rows] = await Promise.all([listUserRoles(), loadRoles()]);
      setUsers(rows as any);
    } catch (e: any) {
      toast.error(e?.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createRole = async () => {
    const name = roleName.trim();
    if (!name) return toast.error("Give the role a name");
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("app_roles").insert({
      id,
      name,
      pages: roleIsAdmin ? ALL_PAGE_IDS : rolePages,
      is_admin: roleIsAdmin,
    });
    if (error) return toast.error(error.message);
    toast.success("Role created");
    setRoleName("");
    setRolePages(["dashboard", "attendance"]);
    setRoleIsAdmin(false);
    await loadRoles();
  };

  const toggleRolePage = async (r: AppRoleRow, page: string) => {
    const pages = r.pages.includes(page) ? r.pages.filter((p) => p !== page) : [...r.pages, page];
    setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, pages } : x)));
    const { error } = await supabase.from("app_roles").update({ pages }).eq("id", r.id);
    if (error) toast.error(error.message);
  };

  const deleteRole = async (id: string) => {
    const { error } = await supabase.from("app_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role deleted");
    await load();
  };

  const add = async () => {
    setBusy(true);
    try {
      const picked = roles.find((r) => r.id === newUserRole);
      await createStaffAccount({
        data: { email, password, role: picked?.is_admin ? "admin" : "staff" },
      });
      const created = (await listUserRoles()) as any[];
      const user = created.find((u) => u.email === email.trim().toLowerCase());
      if (user) await assignAccessRole({ data: { userId: user.id, roleId: newUserRole } });
      toast.success("Account created");
      setEmail("");
      setPassword("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, roleId: string) => {
    try {
      await assignAccessRole({ data: { userId, roleId } });
      toast.success("Role updated");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not update role");
    }
  };

  const revoke = async (userId: string) => {
    try {
      await removeUserRoles({ data: { userId } });
      toast.success("Access revoked");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not remove roles");
    }
  };

  return (
    <>
      <Card title="Roles & page permissions" desc="Create roles and choose which pages each role can open." icon={ShieldCheck}>
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Role name (e.g. Teacher)"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
            <Button onClick={createRole} className="gradient-primary text-primary-foreground">
              <Plus size={15} /> Create role
            </Button>
          </div>
          <Toggle
            label="Full administrator rights"
            desc="Admins can open every page and manage roles."
            checked={roleIsAdmin}
            onChange={setRoleIsAdmin}
          />
          {!roleIsAdmin && (
            <div className="flex flex-wrap gap-2">
              {APP_PAGES.map((p) => {
                const on = rolePages.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setRolePages(on ? rolePages.filter((x) => x !== p.id) : [...rolePages, p.id])
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      on
                        ? "gradient-primary text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{r.name}</p>
                  {r.is_admin && <Badge className="text-[10px]">Admin</Badge>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete role ${r.name}`}
                  onClick={() => deleteRole(r.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
              {r.is_admin ? (
                <p className="text-xs text-muted-foreground">Full access to all pages.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {APP_PAGES.map((p) => {
                    const on = r.pages.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleRolePage(r, p.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          on
                            ? "bg-primary/10 text-primary border-primary/40"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Users & Roles" desc="Who can access the console and at what level." icon={Users}>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="staff@edvoracollege.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Temp password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sm:w-48"
          />
          <Select value={newUserRole} onValueChange={setNewUserRole}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={busy} className="gradient-primary text-primary-foreground">
            <Plus size={15} /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {loading && <p className="text-xs text-muted-foreground">Loading accounts…</p>}
          {!loading && users.length === 0 && (
            <p className="text-xs text-muted-foreground">No accounts found.</p>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2 last:border-0"
            >
              <span className="truncate">
                <span className="font-medium">{u.fullName || u.email}</span>
                {u.fullName && (
                  <span className="block text-xs text-muted-foreground truncate">{u.email}</span>
                )}
                {u.email === username && <Badge className="ml-2">You</Badge>}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={u.accessRoleId ?? (u.roles.includes("admin") ? "admin" : "staff")}
                  onValueChange={(v) => changeRole(u.id, v)}
                >
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove roles for ${u.email}`}
                  onClick={() => revoke(u.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Accounts, roles and page permissions are stored in the backend database. Public sign-ups
          stay disabled — only an administrator can create accounts here.
        </p>
      </Card>
    </>
  );
}



function NotificationsSection() {
  const { form, setForm, save } = useSettingsForm();
  return (
    <Card
      title="Notifications"
      desc="WhatsApp absentee alerts and spreadsheet sync."
      icon={MessageSquare}
    >
      <div className="space-y-3">
        <Toggle
          label="WhatsApp absentee list on attendance save"
          desc="Opens WhatsApp with a ready-made message listing absent students."
          checked={form.whatsappEnabled ?? true}
          onChange={(v) => setForm({ ...form, whatsappEnabled: v })}
        />
        <Toggle
          label="Sync attendance to Google Sheets"
          checked={form.sheetsEnabled ?? true}
          onChange={(v) => setForm({ ...form, sheetsEnabled: v })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="WhatsApp receiver ID">
          <Input
            placeholder="94777583711"
            value={form.whatsappReceiver ?? "94777583711"}
            onChange={(e) => setForm({ ...form, whatsappReceiver: e.target.value })}
          />
        </F>
        <div className="sm:col-span-2">
          <F label="Message template">
            <Textarea
              rows={3}
              placeholder="Absent students for {subject} — {batch} on {date}:"
              value={
                form.whatsappTemplate ??
                "Absent students for {subject} — {batch} on {date}: - EDVORA COLLEGE"
              }
              onChange={(e) => setForm({ ...form, whatsappTemplate: e.target.value })}
            />
          </F>
        </div>
      </div>
      <SaveBar onSave={() => save("Updated notification settings")} />
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useData();
  const { form, setForm, save } = useSettingsForm();
  return (
    <Card title="Appearance" desc="Theme and layout density for this console." icon={Palette}>
      <div className="grid grid-cols-2 gap-3">
        {(["light", "dark"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`rounded-xl border p-4 text-sm font-medium capitalize transition-colors ${
              theme === t ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
          >
            {t} mode
          </button>
        ))}
      </div>
      <F label="Density">
        <Select
          value={form.density ?? "comfortable"}
          onValueChange={(v) => setForm({ ...form, density: v as CollegeSettings["density"] })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">Comfortable</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <SaveBar onSave={() => save("Updated appearance settings")} />
    </Card>
  );
}

function BackupSection() {
  const data = useData();
  const [confirmReset, setConfirmReset] = useState(false);

  const backup = () => {
    exportJSON(`edvora-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      settings: data.settings,
      students: data.students,
      courses: data.courses,
      batches: data.batches,
      teachers: data.teachers,
      attendance: data.attendance,
      exams: data.exams,
      examMarks: data.examMarks,
      paymentPackages: data.paymentPackages,
      studentPayments: data.studentPayments,
    });
    toast.success("Backup downloaded");
  };

  const studentsCsv = () => {
    exportCSV(
      "students.csv",
      data.students.map((s) => ({
        StudentID: s.studentId,
        Name: s.fullName,
        Gender: s.gender ?? "",
        Phone: s.phone ?? "",
        Guardian: s.guardianName ?? "",
        GuardianPhone: s.guardianPhone ?? "",
        Status: s.status ?? "",
      })),
    );
    toast.success("Students CSV downloaded");
  };

  return (
    <>
      <Card title="Backup & Restore" desc="Download a full copy of your records." icon={DatabaseBackup}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Stat k="Students" v={data.students.length} />
          <Stat k="Attendance records" v={data.attendance.length} />
          <Stat k="Payments" v={data.studentPayments.length} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={backup}>
            <Download size={15} /> Full backup (JSON)
          </Button>
          <Button variant="outline" onClick={studentsCsv}>
            <Download size={15} /> Students (CSV)
          </Button>
          <Button variant="destructive" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={15} /> Reset demo data
          </Button>
        </div>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5">
              <RotateCcw size={18} /> Reset Demo Data
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              This resets students, batches, subjects and logs, then reseeds sample records.
              Download a backup first if you need the current data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                data.reset();
                toast.success("Sample data restored successfully");
                setConfirmReset(false);
              }}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="text-xl font-bold">{v}</p>
    </div>
  );
}

function AuditSection() {
  const { settings, updateSettings, attendance, studentPayments } = useData();
  const { username } = useAuth();

  const entries = useMemo(() => {
    const manual = (settings.auditLog || []).map((l) => ({ ...l }));
    const derived = [
      ...attendance.slice(-20).map((a) => ({
        at: a.date,
        actor: "system",
        action: `Attendance recorded for ${a.date}`,
      })),
      ...studentPayments.slice(-20).map((p) => ({
        at: p.paidOn || "",
        actor: "system",
        action: `Payment recorded (${p.amount})`,
      })),
    ];
    return [...manual, ...derived]
      .filter((e) => e.at)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 60);
  }, [settings.auditLog, attendance, studentPayments]);

  return (
    <Card title="Audit Logs" desc="Recent configuration and record activity." icon={ScrollText}>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            updateSettings({
              auditLog: [
                { at: new Date().toISOString(), actor: username || "staff", action: "Cleared audit log" },
              ],
            });
            toast.success("Audit log cleared");
          }}
        >
          <Trash2 size={14} /> Clear log
        </Button>
      </div>
      <div className="space-y-2 max-h-[520px] overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
        )}
        {entries.map((e, i) => (
          <div key={i} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
            <div>
              <p className="text-sm">{e.action}</p>
              <p className="text-xs text-muted-foreground">{e.actor}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(e.at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
