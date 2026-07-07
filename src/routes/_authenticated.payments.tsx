import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Package, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useData } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
  head: () => ({
    meta: [
      { title: "Payments · EDVORA COLLEGE" },
      { name: "description", content: "Track student payments and outstanding balances at EDVORA COLLEGE." },
      { property: "og:title", content: "Payments · EDVORA COLLEGE" },
      { property: "og:description", content: "Track student payments and outstanding balances at EDVORA COLLEGE." },
      { property: "og:url", content: "https://edvoracollege.lovable.app/payments" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://edvoracollege.lovable.app/payments" }],
  }),
});

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function PaymentsPage() {
  return (
    <AppShell title="Payments" subtitle="Manage packages and record student monthly payments">
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments" className="gap-1">
            <Wallet size={14} /> Payments
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-1">
            <Package size={14} /> Packages
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="packages"><PackagesTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function PackagesTab() {
  const packages = useData((s) => s.paymentPackages);
  const addPkg = useData((s) => s.addPaymentPackage);
  const deletePkg = useData((s) => s.deletePaymentPackage);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: 0, description: "" });

  const handleAdd = () => {
    if (!form.name.trim() || !form.amount) {
      toast.error("Name and amount are required");
      return;
    }
    addPkg({ name: form.name.trim(), amount: Number(form.amount), description: form.description });
    toast.success("Package created");
    setForm({ name: "", amount: 0, description: "" });
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Reusable payment packages assigned when recording student payments.
        </p>
        <Button className="gap-1 gradient-primary text-primary-foreground" onClick={() => setOpen(true)}>
          <Plus size={16} /> New Package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No packages yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{p.name}</h3>
                  <p className="text-primary font-mono font-semibold mt-1">
                    Rs. {p.amount.toLocaleString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete package "${p.name}"?`)) {
                      deletePkg(p.id);
                      toast.success("Deleted");
                    }
                  }}
                >
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-2">{p.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payment Package</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Amount (Rs.)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaymentsTab() {
  const students = useData((s) => s.students);
  const batches = useData((s) => s.batches);
  const packages = useData((s) => s.paymentPackages);
  const payments = useData((s) => s.studentPayments);
  const addPayment = useData((s) => s.addStudentPayment);
  const deletePayment = useData((s) => s.deleteStudentPayment);

  const [batchFilter, setBatchFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>(currentMonth());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    packageId: "",
    month: currentMonth(),
    amount: 0,
    paidOn: new Date().toISOString().slice(0, 10),
  });

  const filteredPayments = useMemo(() => {
    const studentIdSet = new Set(
      students
        .filter((s) => (batchFilter === "ALL" ? true : s.batchId === batchFilter))
        .map((s) => s.id),
    );
    return payments
      .filter((p) => (monthFilter ? p.month === monthFilter : true))
      .filter((p) => studentIdSet.has(p.studentId))
      .sort((a, b) => (b.paidOn || "").localeCompare(a.paidOn || ""));
  }, [payments, students, batchFilter, monthFilter]);

  const openNew = () => {
    setForm({
      studentId: "",
      packageId: "",
      month: monthFilter || currentMonth(),
      amount: 0,
      paidOn: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.studentId || !form.month || !form.amount) {
      toast.error("Student, month and amount are required");
      return;
    }
    addPayment({
      studentId: form.studentId,
      packageId: form.packageId || undefined,
      month: form.month,
      amount: Number(form.amount),
      paidOn: form.paidOn,
    });
    toast.success("Payment recorded");
    setOpen(false);
  };

  const paidCount = filteredPayments.length;
  const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <Users className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Payments</p>
            <p className="text-xl font-bold">{paidCount}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <Wallet className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total collected</p>
            <p className="text-xl font-bold">Rs. {total.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <Package className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Packages</p>
            <p className="text-xl font-bold">{packages.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Month</Label>
            <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Batch</Label>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="gap-1 gradient-primary text-primary-foreground" onClick={openNew}>
          <Plus size={16} /> Add Payment
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Student ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid on</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No payments recorded.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((pay) => {
                const stu = students.find((s) => s.id === pay.studentId);
                const pkg = pay.packageId ? packages.find((p) => p.id === pay.packageId) : null;
                return (
                  <TableRow key={pay.id}>
                    <TableCell className="font-mono text-xs">{stu?.studentId || "—"}</TableCell>
                    <TableCell>{stu?.fullName || "Unknown"}</TableCell>
                    <TableCell>{pkg?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{pay.month}</TableCell>
                    <TableCell className="font-mono">Rs. {pay.amount.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{pay.paidOn}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this payment?")) {
                            deletePayment(pay.id);
                            toast.success("Deleted");
                          }
                        }}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.studentId} — {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Package</Label>
              <Select
                value={form.packageId}
                onValueChange={(v) => {
                  const p = packages.find((x) => x.id === v);
                  setForm({ ...form, packageId: v, amount: p?.amount ?? form.amount });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · Rs. {p.amount.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </div>
              <div>
                <Label>Paid on</Label>
                <Input type="date" value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Amount (Rs.)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}