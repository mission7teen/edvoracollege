import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import { useData } from "@/lib/store";
import { toast } from "sonner";
import { Building2, RotateCcw, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { settings, updateSettings, reset } = useData();
  const [form, setForm] = useState(settings);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);

  return (
    <AppShell title="Settings" subtitle="Manage college information and system preferences">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary grid place-items-center text-primary-foreground">
              <Building2 />
            </div>
            <div>
              <h3 className="font-bold">College Information</h3>
              <p className="text-xs text-muted-foreground">
                Displayed across the dashboard and on exported reports.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="College name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </F>
            <F label="Academic year">
              <Input
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              />
            </F>
            <div className="col-span-2">
              <F label="Tagline">
                <Input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                />
              </F>
            </div>
            <F label="Contact email">
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </F>
            <F label="Contact phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </F>
            <div className="col-span-2">
              <F label="Address">
                <Textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </F>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Attendance threshold ({form.attendanceThreshold}%)</Label>
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
          <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setResetConfirmationOpen(true)}
            >
              <RotateCcw size={15} /> Reset demo data
            </Button>
            <Button
              onClick={() => {
                updateSettings(form);
                toast.success("Settings saved");
              }}
              className="w-full sm:w-auto gradient-primary text-primary-foreground"
            >
              <Save size={15} /> Save changes
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-6 space-y-4"
        >
          <h3 className="font-bold">System</h3>
          <Info k="Version" v="EDVORA Admin 1.0.0" />
          <Info k="Storage" v="Local browser (demo)" />
          <Info k="Theme" v="Light · Dark · System" />
          <Info k="Session" v="Persistent on this device" />
          <div className="text-xs text-muted-foreground pt-4 border-t border-border">
            All data is stored locally in your browser for this demo. For production use, connect
            Lovable Cloud to enable multi-user sync, role permissions, file uploads and audit logs.
          </div>
        </motion.div>
      </div>

      {/* RESET DATA CONFIRMATION DIALOG */}
      <AlertDialog open={resetConfirmationOpen} onOpenChange={setResetConfirmationOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5 animate-pulse">
              <RotateCcw size={18} />
              Reset Demo Data
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to restore the platform to its original state? This action will
              reset all your custom students, batches, subjects, and logs, then reseed sample
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 font-semibold text-xs rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                toast.success("Sample data restored successfully");
                setResetConfirmationOpen(false);
              }}
              className="h-9 font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
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
function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
