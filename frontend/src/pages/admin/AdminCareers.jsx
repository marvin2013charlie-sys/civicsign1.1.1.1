import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Briefcase, MapPin, Globe2, Plus, Pencil, Trash2, Eye, Mail, Phone, Link as LinkIcon, ExternalLink } from "lucide-react";

const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];
const WORKPLACES = [
  { value: "remote",  label: "Remote" },
  { value: "hybrid",  label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];
const STATUS_OPTIONS = [
  { value: "new",         label: "New",        color: "bg-blue-100 text-blue-700" },
  { value: "reviewing",   label: "Reviewing",  color: "bg-amber-100 text-amber-700" },
  { value: "contacted",   label: "Contacted",  color: "bg-violet-100 text-violet-700" },
  { value: "hired",       label: "Hired",      color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected",    label: "Rejected",   color: "bg-zinc-200 text-zinc-700" },
];

const EMPTY = { slug: "", title: "", department: "", location: "", job_type: "full-time", workplace: "hybrid", salary: "", summary: "", description: "", published: true };

export default function AdminCareers() {
  const [tab, setTab] = useState("jobs");
  return (
    <div data-testid="admin-careers">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Careers</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Manage open positions and review applications.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="jobs" data-testid="admin-careers-tab-jobs">Job posts</TabsTrigger>
          <TabsTrigger value="applications" data-testid="admin-careers-tab-applications">Applications</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs" className="mt-4"><JobsTab /></TabsContent>
        <TabsContent value="applications" className="mt-4"><ApplicationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- JOBS TAB ----------------------------- */

function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingSlug, setEditingSlug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/careers/jobs");
      setJobs(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm(EMPTY); setEditingSlug(null); setOpen(true); };
  const startEdit = (j) => {
    setForm({
      slug: j.slug,
      title: j.title,
      department: j.department,
      location: j.location,
      job_type: j.job_type,
      workplace: j.workplace,
      salary: j.salary || "",
      summary: j.summary,
      description: j.description,
      published: !!j.published,
    });
    setEditingSlug(j.slug);
    setOpen(true);
  };

  const save = async () => {
    if (form.title.trim().length < 2 || form.summary.trim().length < 10 || form.description.trim().length < 20) {
      toast.error("Title, a 10+ char summary, and a 20+ char description are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, salary: form.salary.trim() || null };
      if (editingSlug) {
        await api.put(`/admin/careers/jobs/${editingSlug}`, payload);
        toast.success("Position updated");
      } else {
        await api.post("/admin/careers/jobs", payload);
        toast.success("Position created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slug) => {
    try {
      await api.delete(`/admin/careers/jobs/${slug}`);
      toast.success("Position deleted");
      setConfirmDel(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {loading ? "…" : `${jobs.length} ${jobs.length === 1 ? "position" : "positions"}`}
        </span>
        <Button onClick={startCreate} data-testid="admin-careers-new-job" style={{ background: "var(--c-primary)", color: "#fff" }}>
          <Plus className="mr-1.5 h-4 w-4" /> New position
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted-foreground)]">No positions yet — click <span className="font-semibold">New position</span> to publish your first opening.</div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {jobs.map((j) => (
              <div key={j.slug} className="grid grid-cols-1 items-center gap-3 px-5 py-4 lg:grid-cols-12" data-testid="admin-careers-job-row">
                <div className="lg:col-span-6">
                  <p className="font-semibold text-[var(--c-ink)]">{j.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{j.department} · {j.location}</p>
                </div>
                <div className="lg:col-span-3 flex flex-wrap gap-1.5 text-[11px]">
                  <Pill icon={Briefcase}>{j.job_type}</Pill>
                  <Pill icon={Globe2}>{j.workplace}</Pill>
                </div>
                <div className="lg:col-span-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.published ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                    {j.published ? "Live" : "Hidden"}
                  </span>
                </div>
                <div className="lg:col-span-2 flex items-center justify-end gap-1">
                  <a href={`/careers/${j.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--c-paper-2)]" title="View public page" data-testid="admin-careers-view">
                    <Eye className="h-4 w-4" />
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(j)} title="Edit" data-testid="admin-careers-edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDel(j)} title="Delete" data-testid="admin-careers-delete">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit position" : "New position"}</DialogTitle>
            <DialogDescription>Published positions appear on the public /careers page immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto px-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="job-title">Title *</Label>
              <Input id="job-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Full-Stack Engineer" data-testid="admin-careers-field-title" />
            </div>
            <div>
              <Label htmlFor="job-department">Department *</Label>
              <Input id="job-department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Engineering" data-testid="admin-careers-field-department" />
            </div>
            <div>
              <Label htmlFor="job-location">Location *</Label>
              <Input id="job-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="London, UK" data-testid="admin-careers-field-location" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger data-testid="admin-careers-field-type"><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Workplace</Label>
              <Select value={form.workplace} onValueChange={(v) => setForm({ ...form, workplace: v })}>
                <SelectTrigger data-testid="admin-careers-field-workplace"><SelectValue /></SelectTrigger>
                <SelectContent>{WORKPLACES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="job-salary">Salary range (optional)</Label>
              <Input id="job-salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="£75k – £95k" data-testid="admin-careers-field-salary" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="job-summary">Summary * <span className="text-xs text-[var(--muted-foreground)]">— 1-2 sentences shown on the listing</span></Label>
              <Textarea id="job-summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} data-testid="admin-careers-field-summary" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="job-description">Full description * <span className="text-xs text-[var(--muted-foreground)]">— supports bullet lists (lines starting with &quot;- &quot;)</span></Label>
              <Textarea id="job-description" rows={10} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="font-mono text-xs" data-testid="admin-careers-field-description" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch id="job-publish" checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} data-testid="admin-careers-field-published" />
              <Label htmlFor="job-publish" className="cursor-pointer">Publish on /careers</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="admin-careers-save" style={{ background: "var(--c-primary)", color: "#fff" }}>
              {saving ? "Saving…" : (editingSlug ? "Save changes" : "Create position")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this position?</DialogTitle>
            <DialogDescription>
              {confirmDel?.title} will be permanently removed. Existing applications for this role will be kept in the Applications tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button onClick={() => remove(confirmDel.slug)} data-testid="admin-careers-confirm-delete" style={{ background: "#DC2626", color: "#fff" }}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------- APPLICATIONS TAB -------------------------- */

function ApplicationsTab() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { status: filter };
      const { data } = await api.get("/admin/careers/applications", { params });
      setApps(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter]);

  const current = useMemo(() => apps.find((a) => a.application_id === openId) || null, [apps, openId]);
  const statusOpt = (v) => STATUS_OPTIONS.find((s) => s.value === v) || STATUS_OPTIONS[0];

  const setStatus = async (application_id, status) => {
    try {
      await api.patch(`/admin/careers/applications/${application_id}`, { status });
      toast.success(`Marked as ${statusOpt(status).label.toLowerCase()}`);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "\u2014";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-[180px]" data-testid="admin-careers-app-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All applications</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {loading ? "…" : `${apps.length} ${apps.length === 1 ? "application" : "applications"}`}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : apps.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted-foreground)]">No applications {filter === "all" ? "yet" : `with status "${filter}"`}.</div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {apps.map((a) => (
              <button
                key={a.application_id}
                type="button"
                onClick={() => setOpenId(a.application_id)}
                data-testid="admin-careers-app-row"
                className="grid w-full grid-cols-1 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--c-paper-2)] lg:grid-cols-12"
              >
                <div className="lg:col-span-4">
                  <p className="font-semibold text-[var(--c-ink)]">{a.name}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{a.email}</p>
                </div>
                <div className="lg:col-span-3 text-sm text-[var(--c-ink)]">{a.job_title}</div>
                <div className="lg:col-span-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusOpt(a.status).color}`}>{statusOpt(a.status).label}</span>
                </div>
                <div className="lg:col-span-3 text-right text-xs text-[var(--muted-foreground)]">{fmtDate(a.created_at)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-xl" data-testid="admin-careers-app-detail">
          <DialogHeader>
            <DialogTitle>{current?.name}</DialogTitle>
            <DialogDescription>{current?.job_title} · applied {fmtDate(current?.created_at)}</DialogDescription>
          </DialogHeader>
          {current && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
              <ContactRow icon={Mail} label="Email"><a className="text-[var(--c-primary)] hover:underline" href={`mailto:${current.email}`}>{current.email}</a></ContactRow>
              {current.phone && <ContactRow icon={Phone} label="Phone">{current.phone}</ContactRow>}
              {current.linkedin && <ContactRow icon={LinkIcon} label="LinkedIn"><a className="text-[var(--c-primary)] hover:underline" href={current.linkedin} target="_blank" rel="noreferrer">{current.linkedin}</a></ContactRow>}
              {current.portfolio && <ContactRow icon={ExternalLink} label="Portfolio"><a className="text-[var(--c-primary)] hover:underline" href={current.portfolio} target="_blank" rel="noreferrer">{current.portfolio}</a></ContactRow>}
              <div>
                <Label>Cover message</Label>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3 text-sm leading-relaxed">{current.cover_message}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(current.application_id, s.value)}
                      data-testid={`admin-careers-app-status-${s.value}`}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${current.status === s.value ? s.color + " ring-2 ring-offset-1 ring-[var(--c-primary)]" : "border border-[var(--c-border)] text-[var(--c-ink)] hover:bg-[var(--c-paper-2)]"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Pill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-2 py-0.5 font-medium capitalize text-[var(--c-ink)]">
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-[var(--muted-foreground)]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
