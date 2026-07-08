import React, { useCallback, useEffect, useState } from "react";
import { usePoll, POLL_FAST_MS } from "@/hooks/usePoll";
import { toast } from "sonner";
import api, { formatApiError, downloadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Building2, Plus, Users, FileText, Pencil, Trash2, Loader2, Infinity,
  Eye, EyeOff, Copy, Check, KeyRound, Upload, Download,
} from "lucide-react";

const fmtContractDate = (iso) => (iso
  ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
  : null);

function OrgContractPanel({ org, onUpdated, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const contract = org?.contract;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size < 1) {
      toast.error("That file is empty — choose a PDF or Word document");
      return;
    }
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      toast.error("Upload a PDF or Word (.docx) contract file");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post(`/admin/organizations/${org.org_id}/contract`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Contract uploaded — visible to the organisation in their portal");
      await onUpdated?.(data.contract);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the contract file? The organisation will no longer see it in their portal.")) return;
    setRemoving(true);
    try {
      await api.delete(`/admin/organizations/${org.org_id}/contract`);
      toast.success("Contract removed");
      await onUpdated?.(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setRemoving(false);
    }
  };

  const download = async () => {
    try {
      await downloadFile(
        `/admin/organizations/${org.org_id}/contract`,
        contract?.filename || "organisation-contract.pdf",
      );
    } catch {
      toast.error("Could not download contract");
    }
  };

  return (
    <div
      className={compact ? "space-y-4" : "mt-5 rounded-lg border border-[var(--c-border)] p-4"}
      data-testid="org-contract-section"
    >
      {!compact && (
        <div>
          <h3 className="font-heading text-sm font-semibold text-[var(--c-ink)]">Signed contract</h3>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
            Upload the signed agreement — both CivicSign and the organisation can view it anytime in the organisation portal.
          </p>
        </div>
      )}
      {contract ? (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--c-ink)]">
            <FileText className="mr-1.5 inline h-4 w-4 text-[var(--c-primary)]" />
            {contract.filename}
          </p>
          {contract.uploaded_at && (
            <p className="mt-1 text-xs text-[var(--c-muted-fg)]">Uploaded {fmtContractDate(contract.uploaded_at)}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--c-muted-fg)]">No contract on file yet. Upload a PDF or DOCX (max 25 MB).</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={uploading} asChild style={{ background: "var(--c-primary)", color: "#fff" }}>
          <label className="cursor-pointer" data-testid="org-contract-upload">
            {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            {contract ? "Replace contract" : "Upload contract"}
            <input type="file" accept=".pdf,.docx,application/pdf" className="sr-only" onChange={upload} />
          </label>
        </Button>
        {contract && (
          <>
            <Button variant="outline" onClick={download} data-testid="org-contract-download">
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button variant="outline" disabled={removing} onClick={remove} data-testid="org-contract-remove">
              {removing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function OrgContractDialog({ org, onClose, onUpdated }) {
  if (!org) return null;
  return (
    <Dialog open={!!org} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="org-contract-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--c-primary)]" />
            Contract — {org.name}
          </DialogTitle>
          <DialogDescription>
            Upload the signed organisation agreement. It appears in the customer&apos;s Organisation portal → Contract tab for all members to view.
          </DialogDescription>
        </DialogHeader>
        <OrgContractPanel
          org={org}
          compact
          onUpdated={async (contract) => {
            await onUpdated?.(org.org_id, contract);
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function generatePw() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = "abcdefghijkmnpqrstuvwxyz";
  const n = "23456789";
  const s = "!@#$%^&*";
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  let out = pick(A) + pick(a) + pick(n) + pick(s);
  const all = A + a + n + s;
  for (let i = 0; i < 8; i++) out += pick(all);
  return out.split("").sort(() => Math.random() - 0.5).join("");
}

function OrgFormFields({ name, setName, limit, setLimit, unlimited, setUnlimited }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="org-name">Organisation name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Bank Ltd"
          data-testid="org-form-name"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[var(--c-border)] p-3">
        <div>
          <Label>Enterprise unlimited</Label>
          <p className="text-xs text-[var(--c-muted-fg)]">Signed contract, no monthly cap</p>
        </div>
        <Switch
          checked={unlimited}
          onCheckedChange={(v) => { setUnlimited(v); if (v) setLimit(""); }}
          data-testid="org-form-unlimited"
        />
      </div>
      {!unlimited && (
        <div>
          <Label htmlFor="org-limit">Monthly document limit</Label>
          <p className="text-xs text-[var(--c-muted-fg)]">Shared pool across all seats. Leave empty for default (500 docs × number of seats). Pricing is agreed in your client meeting.</p>
          <Input
            id="org-limit"
            type="number"
            min="1"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="e.g. 100000"
            className="mt-1"
            data-testid="org-form-limit"
          />
        </div>
      )}
    </div>
  );
}

function CreateOrgDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setLimit("");
      setUnlimited(false);
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setShowPw(false);
      setCreatedCreds(null);
      setCopied(false);
    } else if (!ownerPassword) {
      setOwnerPassword(generatePw());
    }
  }, [open, ownerPassword]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter an organisation name");
      return;
    }
    if (!ownerName.trim() || !ownerEmail.trim() || ownerPassword.length < 8) {
      toast.error("Owner name, email and an 8+ character password are required");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        enterprise_unlimited: unlimited,
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim().toLowerCase(),
        owner_password: ownerPassword,
      };
      const n = parseInt(limit, 10);
      if (!unlimited && Number.isFinite(n) && n > 0) body.monthly_envelope_limit = n;
      const { data } = await api.post("/admin/organizations", body);
      setCreatedCreds({
        orgName: data.name,
        email: data.owner?.email || ownerEmail,
        password: ownerPassword,
      });
      onCreated?.(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const closeAll = () => {
    setCreatedCreds(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !createdCreds} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" data-testid="org-create-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--c-primary)]" /> New organisation
            </DialogTitle>
            <DialogDescription>
              Create a shared document pool and the primary organisation login. The owner can add more team accounts from Settings.
            </DialogDescription>
          </DialogHeader>
          <OrgFormFields
            name={name} setName={setName}
            limit={limit} setLimit={setLimit}
            unlimited={unlimited} setUnlimited={setUnlimited}
          />
          <div className="space-y-3 rounded-lg border border-[var(--c-border)] p-4">
            <p className="text-sm font-semibold text-[var(--c-ink)]">Organisation owner login</p>
            <p className="text-xs text-[var(--c-muted-fg)]">
              This is the main account for the client. Share the email and temporary password securely.
            </p>
            <div>
              <Label htmlFor="org-owner-name">Contact name</Label>
              <Input id="org-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Jane Smith" data-testid="org-owner-name" />
            </div>
            <div>
              <Label htmlFor="org-owner-email">Organisation email</Label>
              <Input id="org-owner-email" type="email" value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value.toLowerCase())}
                placeholder="accounts@clientbank.co.uk" data-testid="org-owner-email" />
            </div>
            <div>
              <Label htmlFor="org-owner-password">Temporary password</Label>
              <div className="relative">
                <Input id="org-owner-password" type={showPw ? "text" : "password"} value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)} data-testid="org-owner-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-2 p-1 text-[var(--c-muted-fg)]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => setOwnerPassword(generatePw())}>
                <KeyRound className="mr-1 h-3 w-3" /> Generate secure password
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy} data-testid="org-create-submit"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Create organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCreds} onOpenChange={(v) => { if (!v) closeAll(); }}>
        <DialogContent data-testid="org-create-success-dialog">
          <DialogHeader>
            <DialogTitle>Organisation created</DialogTitle>
            <DialogDescription>
              «{createdCreds?.orgName}» is ready. Share these login details with the organisation owner.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-paper-2)] p-3 font-mono text-sm">
            <p>Email: {createdCreds?.email}</p>
            <p>Password: {createdCreds?.password}</p>
          </div>
          <p className="text-xs text-[var(--c-muted-fg)]">
            The owner signs in at /login, then adds team members under Settings → Organisation team.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={async () => {
              const ok = await copyToClipboard(
                `Organisation: ${createdCreds.orgName}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}\nLogin: ${window.location.origin}/login`,
              );
              if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
            }}>
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              Copy credentials
            </Button>
            <Button onClick={closeAll}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditOrgDialog({ org, onClose, onSaved, onContractUpdated }) {
  const [name, setName] = useState(org?.name || "");
  const [limit, setLimit] = useState(
    org?.monthly_envelope_limit != null ? String(org.monthly_envelope_limit) : "",
  );
  const [unlimited, setUnlimited] = useState(!!org?.enterprise_unlimited);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setLimit(org.monthly_envelope_limit != null ? String(org.monthly_envelope_limit) : "");
      setUnlimited(!!org.enterprise_unlimited);
    }
  }, [org]);

  if (!org) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const body = { name: name.trim(), enterprise_unlimited: unlimited };
      const n = parseInt(limit, 10);
      body.monthly_envelope_limit = unlimited ? 0 : (Number.isFinite(n) && n > 0 ? n : 0);
      await api.patch(`/admin/organizations/${org.org_id}`, body);
      toast.success("Organisation updated");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!org} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="org-edit-dialog">
        <DialogHeader>
          <DialogTitle>Edit {org.name}</DialogTitle>
          <DialogDescription>Changes apply to all {org.member_count} member(s) immediately.</DialogDescription>
        </DialogHeader>
        <OrgFormFields
          name={name} setName={setName}
          limit={limit} setLimit={setLimit}
          unlimited={unlimited} setUnlimited={setUnlimited}
        />
        <OrgContractPanel
          org={org}
          onUpdated={(contract) => onContractUpdated?.(org.org_id, contract)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} data-testid="org-edit-submit"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [contractOrg, setContractOrg] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/admin/organizations", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      setOrgs(data);
    } catch (err) {
      if (!silent) toast.error(formatApiError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (orgId) => {
    const { data } = await api.get(`/admin/organizations/${orgId}`, {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    return data;
  }, []);

  useEffect(() => { load(); }, [load]);

  const pollDetail = Boolean(detail?.org_id) && !createOpen && !editOrg && !contractOrg;

  usePoll(async () => {
    if (!detail?.org_id) return;
    try {
      const data = await fetchDetail(detail.org_id);
      setDetail(data);
      setOrgs((prev) => prev.map((o) => (
        o.org_id === data.org_id
          ? {
            ...o,
            member_count: data.member_count,
            used_this_month: data.used_this_month,
            monthly_limit: data.monthly_limit,
            unlimited: data.unlimited,
            contract: data.contract,
            has_contract: !!data.contract,
          }
          : o
      )));
    } catch (err) {
      console.warn("AdminOrganizations: poll detail failed", err);
    }
  }, POLL_FAST_MS, { enabled: pollDetail });

  const openDetail = async (orgId) => {
    setDetailLoading(true);
    try {
      setDetail(await fetchDetail(orgId));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteOrg = async (org) => {
    if (!window.confirm(`Delete «${org.name}»? This only works if no users are assigned.`)) return;
    setDeleting(org.org_id);
    try {
      await api.delete(`/admin/organizations/${org.org_id}`);
      toast.success("Organisation deleted");
      if (detail?.org_id === org.org_id) setDetail(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeleting(null);
    }
  };

  const pct = (org) => {
    if (org.unlimited || !org.monthly_limit) return 0;
    return Math.min(100, Math.round((org.used_this_month / org.monthly_limit) * 100));
  };

  const refreshOrgContract = async (orgId, contract) => {
    setOrgs((prev) => prev.map((o) => (
      o.org_id === orgId ? { ...o, contract, has_contract: !!contract } : o
    )));
    if (detail?.org_id === orgId) {
      setDetail((d) => (d ? { ...d, contract, has_contract: !!contract } : d));
    }
    if (contractOrg?.org_id === orgId) {
      setContractOrg((o) => (o ? { ...o, contract, has_contract: !!contract } : o));
    }
    if (editOrg?.org_id === orgId) {
      setEditOrg((o) => (o ? { ...o, contract, has_contract: !!contract } : o));
    }
  };

  return (
    <div data-testid="admin-organizations" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--c-ink)]">Organisations</h1>
          <p className="mt-0.5 max-w-xl text-sm text-[var(--c-muted-fg)]">
            Shared document pools for enterprise clients. Each organisation gets an owner login (email + temp password) who can add team accounts from Settings.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="org-create-button"
          style={{ background: "var(--c-primary)", color: "#fff" }}>
          <Plus className="mr-1.5 h-4 w-4" /> New organisation
        </Button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="org-explainer">
        <p className="font-semibold">How this protects you (bank example)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Create one org with an owner email + temp password. Set monthly limits per contract (custom pools for each organisation).</li>
          <li>The owner adds branch logins from Settings → Organisation team.</li>
          <li>All logins share one pool. No single account can consume &quot;unlimited&quot; alone.</li>
        </ul>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={`orgs-skel-${i}`} className="h-16 w-full" />)}
          </div>
        ) : orgs.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--c-muted-fg)]">
            No organisations yet. Create one for your first enterprise client.
          </div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {orgs.map((org) => (
              <div
                key={org.org_id}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
                data-testid="org-row"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)22" }}>
                    <Building2 className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--c-ink)]">{org.name}</p>
                    <p className="text-xs text-[var(--c-muted-fg)]">{org.org_id}</p>
                    {org.has_contract ? (
                      <Badge variant="outline" className="mt-1 border-emerald-200 text-emerald-700" data-testid="org-contract-badge">
                        Contract on file
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 border-amber-200 text-amber-700" data-testid="org-contract-badge">
                        No contract
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 text-[var(--c-muted-fg)]">
                    <Users className="h-3.5 w-3.5" /> {org.member_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--c-ink)]">
                    <FileText className="h-3.5 w-3.5" />
                    {org.unlimited ? (
                      <><Infinity className="h-3.5 w-3.5" /> Unlimited</>
                    ) : (
                      <>{org.used_this_month.toLocaleString()} / {org.monthly_limit.toLocaleString()}</>
                    )}
                  </span>
                  {!org.unlimited && (
                    <Badge variant="outline" className={pct(org) >= 90 ? "border-rose-300 text-rose-700" : ""}>
                      {pct(org)}%
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContractOrg(org)}
                    data-testid="org-contract-button"
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Contract
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDetail(org.org_id)} data-testid="org-view-members">
                    Members
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditOrg(org)} data-testid="org-edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleting === org.org_id || org.member_count > 0}
                    onClick={() => deleteOrg(org)}
                    data-testid="org-delete"
                  >
                    {deleting === org.org_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(detail || detailLoading) && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5" data-testid="org-detail-panel">
          <h2 className="font-heading text-lg font-semibold text-[var(--c-ink)]">Organisation details</h2>
          {detailLoading ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : detail ? (
            <>
              <p className="mt-1 text-sm text-[var(--c-muted-fg)]">
                {detail.name} · {detail.member_count} member(s) ·{" "}
                {detail.unlimited
                  ? `${detail.used_this_month.toLocaleString()} sent this month (unlimited)`
                  : `${detail.used_this_month.toLocaleString()} / ${detail.monthly_limit.toLocaleString()} this month`}
              </p>
              {detail.contact_email && (
                <p className="mt-2 text-xs text-[var(--c-muted-fg)]">Owner email: {detail.contact_email}</p>
              )}
              <OrgContractPanel org={detail} onUpdated={(contract) => refreshOrgContract(detail.org_id, contract)} />
              {detail.members.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--c-muted-fg)]">No users assigned yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--c-border)] rounded-lg border border-[var(--c-border)]">
                  {detail.members.map((m) => (
                    <li key={m.user_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-[var(--c-ink)]">{m.name || m.email}</p>
                        <p className="text-xs text-[var(--c-muted-fg)]">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.org_role === "owner" && <Badge variant="outline">Owner</Badge>}
                        <Badge variant="outline" className="capitalize">{m.plan}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setDetail(null)}>Close</Button>
            </>
          ) : null}
        </div>
      )}

      <OrgContractDialog
        org={contractOrg}
        onClose={() => setContractOrg(null)}
        onUpdated={refreshOrgContract}
      />
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      <EditOrgDialog
        org={editOrg}
        onClose={() => setEditOrg(null)}
        onSaved={load}
        onContractUpdated={refreshOrgContract}
      />
    </div>
  );
}