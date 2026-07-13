import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AdminPageIntro, AdminPillTabs, AdminSurfaceCard, AdminEmptyState,
  AdminStatCard, AdminSectionHeader, AdminStaffBadge,
} from "@/components/portal/AdminPrimitives";
import {
  Briefcase, Globe2, Plus, Pencil, Trash2, Eye, Mail, Phone,
  Link as LinkIcon, ExternalLink, MapPin, Users, Sparkles,
} from "lucide-react";
import { CAREERS_APP_STATUS } from "@/lib/semanticColors";

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
  { value: "new",         label: "New",        badge: CAREERS_APP_STATUS.new },
  { value: "reviewing",   label: "Reviewing",  badge: CAREERS_APP_STATUS.reviewing },
  { value: "contacted",   label: "Contacted",  badge: CAREERS_APP_STATUS.contacted },
  { value: "hired",       label: "Hired",      badge: CAREERS_APP_STATUS.hired },
  { value: "rejected",    label: "Rejected",   badge: CAREERS_APP_STATUS.rejected },
];

const EMPTY = { slug: "", title: "", department: "", location: "", job_type: "full-time", workplace: "hybrid", salary: "", summary: "", description: "", published: true };

const TYPE_LABEL = Object.fromEntries(JOB_TYPES.map((o) => [o.value, o.label]));
const WP_LABEL = Object.fromEntries(WORKPLACES.map((o) => [o.value, o.label]));

export default function AdminCareers() {
  const [tab, setTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);

  const refreshStats = async () => {
    setStatsLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get("/admin/careers/jobs"),
        api.get("/admin/careers/applications"),
      ]);
      setJobs(jobsRes.data);
      setApps(appsRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { refreshStats(); }, []);

  const liveCount = jobs.filter((j) => j.published).length;
  const newApps = apps.filter((a) => a.status === "new").length;

  return (
    <div data-testid="admin-careers">
      <AdminPageIntro
        caveat="Hiring"
        title="Careers"
        subtitle="Publish roles on the public careers page and triage incoming applications."
        actions={(
          <>
            <AdminStaffBadge />
            <Button
              onClick={() => setJobDialogOpen(true)}
              data-testid="admin-careers-new-job"
              style={{ background: "var(--c-ink-solid)", color: "#fff" }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New position
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminStatCard
          icon={Briefcase}
          label="Open positions"
          value={statsLoading ? "…" : jobs.length}
          tone="teal"
          testId="admin-careers-stat-positions"
        />
        <AdminStatCard
          icon={Globe2}
          label="Live on site"
          value={statsLoading ? "…" : liveCount}
          tone="success"
          sub={!statsLoading && jobs.length - liveCount > 0 ? `${jobs.length - liveCount} hidden` : undefined}
          testId="admin-careers-stat-live"
        />
        <AdminStatCard
          icon={Users}
          label="Applications"
          value={statsLoading ? "…" : apps.length}
          tone="accent"
          sub={!statsLoading && newApps > 0 ? `${newApps} new` : undefined}
          testId="admin-careers-stat-applications"
        />
      </div>

      <div className="mt-5">
        <AdminPillTabs
          tabs={[
            { id: "jobs", label: "Job posts", count: jobs.length, testId: "admin-careers-tab-jobs" },
            { id: "applications", label: "Applications", count: apps.length, testId: "admin-careers-tab-applications" },
          ]}
          value={tab}
          onChange={setTab}
          testId="admin-careers-tabs"
        />
      </div>

      <div className="mt-4">
        {tab === "jobs" ? (
          <JobsTab
            externalCreateOpen={jobDialogOpen}
            onExternalCreateClose={() => setJobDialogOpen(false)}
            onChanged={refreshStats}
          />
        ) : (
          <ApplicationsTab onChanged={refreshStats} />
        )}
      </div>
    </div>
  );
}

/* ----------------------------- JOBS TAB ----------------------------- */

function JobsTab({ externalCreateOpen, onExternalCreateClose, onChanged }) {
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
      await onChanged?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!externalCreateOpen) return;
    setForm(EMPTY);
    setEditingSlug(null);
    setOpen(true);
    onExternalCreateClose?.();
  }, [externalCreateOpen, onExternalCreateClose]);

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
      toast.error(formatApiError(err));
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
      toast.error(formatApiError(err));
    }
  };

  return (
    <div>
      <AdminSurfaceCard className="overflow-hidden p-0" flush>
        <AdminSectionHeader
          icon={Briefcase}
          title="Job posts"
          subtitle={loading ? "Loading positions…" : `${jobs.length} ${jobs.length === 1 ? "position" : "positions"} on file`}
          action={(
            <Button
              variant="outline"
              size="sm"
              onClick={startCreate}
              data-testid="admin-careers-empty-create"
              className="rounded-xl"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add position
            </Button>
          )}
        />
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              icon={Sparkles}
              title="No positions yet"
              description="Publish your first role — it will appear on the public /careers page when marked live."
              action={(
                <Button onClick={startCreate} data-testid="admin-careers-new-job-inline" style={{ background: "var(--c-ink-solid)", color: "#fff" }}>
                  <Plus className="mr-1.5 h-4 w-4" /> New position
                </Button>
              )}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {jobs.map((j) => (
              <div
                key={j.slug}
                className="grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--c-paper-2)] lg:grid-cols-12"
                data-testid="admin-careers-job-row"
              >
                <div className="lg:col-span-5 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>
                    {j.department}
                  </p>
                  <p className="mt-0.5 font-heading text-base font-semibold text-[var(--c-ink)]">{j.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--c-muted-fg)]">{j.summary}</p>
                </div>
                <div className="lg:col-span-3 flex flex-wrap gap-1.5 text-[11px]">
                  <Pill icon={MapPin}>{j.location}</Pill>
                  <Pill icon={Briefcase}>{TYPE_LABEL[j.job_type] || j.job_type}</Pill>
                  <Pill icon={Globe2}>{WP_LABEL[j.workplace] || j.workplace}</Pill>
                </div>
                <div className="lg:col-span-2">
                  <span className={j.published ? "cs-badge cs-badge-success" : "cs-badge cs-badge-neutral"}>
                    {j.published ? "Live" : "Hidden"}
                  </span>
                  {j.salary ? (
                    <p className="mt-1.5 text-xs font-medium text-[var(--c-muted-fg)]">{j.salary}</p>
                  ) : null}
                </div>
                <div className="lg:col-span-2 flex items-center justify-start gap-1 lg:justify-end">
                  <a
                    href={`/careers/${j.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--c-border)] bg-[var(--card)] hover:bg-[var(--c-paper-2)]"
                    title="View public page"
                    data-testid="admin-careers-view"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => startEdit(j)} title="Edit" data-testid="admin-careers-edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setConfirmDel(j)} title="Delete" data-testid="admin-careers-delete">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSurfaceCard>

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
              <Label htmlFor="job-summary">Summary * <span className="text-xs text-[var(--c-muted-fg)]">(1-2 sentences shown on the listing)</span></Label>
              <Textarea id="job-summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} data-testid="admin-careers-field-summary" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="job-description">Full description * <span className="text-xs text-[var(--c-muted-fg)]">(supports bullet lists, lines starting with &quot;- &quot;)</span></Label>
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

function ApplicationsTab({ onChanged }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const params = status === "all" ? {} : { status };
      const { data } = await api.get("/admin/careers/applications", { params });
      setApps(data);
      await onChanged?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(filter); }, [filter]);

  const current = useMemo(() => apps.find((a) => a.application_id === openId) || null, [apps, openId]);
  const statusOpt = (v) => STATUS_OPTIONS.find((s) => s.value === v) || STATUS_OPTIONS[0];

  const setStatus = async (application_id, status) => {
    try {
      await api.patch(`/admin/careers/applications/${application_id}`, { status });
      toast.success(`Marked as ${statusOpt(status).label.toLowerCase()}`);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "\u2014";

  const filterTabs = [
    { id: "all", label: "All", testId: "admin-careers-app-filter-all" },
    ...STATUS_OPTIONS.map((s) => ({
      id: s.value,
      label: s.label,
      testId: `admin-careers-app-filter-${s.value}`,
    })),
  ];

  return (
    <div>
      <div className="mb-4">
        <AdminPillTabs
          tabs={filterTabs}
          value={filter}
          onChange={setFilter}
          testId="admin-careers-app-filter"
        />
      </div>

      <AdminSurfaceCard className="overflow-hidden p-0" flush>
        <AdminSectionHeader
          icon={Mail}
          title="Applications"
          subtitle={loading ? "Loading applications…" : `${apps.length} ${apps.length === 1 ? "candidate" : "candidates"}${filter !== "all" ? ` · ${statusOpt(filter).label}` : ""}`}
        />
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : apps.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              icon={Mail}
              title={filter === "all" ? "No applications yet" : `No ${statusOpt(filter).label.toLowerCase()} applications`}
              description={filter === "all" ? "Applications submitted on /careers will appear here." : `No applications currently marked as "${statusOpt(filter).label}".`}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {apps.map((a) => (
              <button
                key={a.application_id}
                type="button"
                onClick={() => setOpenId(a.application_id)}
                data-testid="admin-careers-app-row"
                className="grid w-full grid-cols-1 items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--c-paper-2)] lg:grid-cols-12"
              >
                <div className="lg:col-span-4 min-w-0">
                  <p className="font-heading text-sm font-semibold text-[var(--c-ink)]">{a.name}</p>
                  <p className="truncate text-xs text-[var(--c-muted-fg)]">{a.email}</p>
                </div>
                <div className="lg:col-span-3 text-sm font-medium text-[var(--c-ink)]">{a.job_title}</div>
                <div className="lg:col-span-2">
                  <span className={statusOpt(a.status).badge}>{statusOpt(a.status).label}</span>
                </div>
                <div className="lg:col-span-3 text-left text-xs text-[var(--c-muted-fg)] lg:text-right">{fmtDate(a.created_at)}</div>
              </button>
            ))}
          </div>
        )}
      </AdminSurfaceCard>

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
                      className={`${current.status === s.value ? s.badge + " ring-2 ring-offset-1 ring-[var(--c-primary)]" : "cs-badge border border-[var(--c-border)] bg-transparent text-[var(--c-ink)] hover:bg-[var(--c-paper-2)]"}`}
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
      <Icon className="mt-0.5 h-4 w-4 text-[var(--c-muted-fg)]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
