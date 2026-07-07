import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError, downloadFile, fetchPdfBlobUrl } from "@/lib/api";
import { Document, Page } from "react-pdf";
import { PDF_OPTIONS } from "@/lib/pdf";
import { formatOrgRole } from "@/lib/orgLabels";
import { usePoll, POLL_FAST_MS, POLL_SLOW_MS } from "@/hooks/usePoll";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OrgTeamTab from "@/components/settings/OrgTeamTab";
import {
  Building2, Users, FileText, Gauge, AlertTriangle, ExternalLink, Download, Loader2,
} from "lucide-react";

const fmtContractDate = (iso) => (iso
  ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
  : null);

function UsageBar({ used, limit, label, unlimited }) {
  if (unlimited) {
    return (
      <div>
        <div className="flex justify-between text-sm">
          <span className="font-medium text-[var(--c-ink)]">{label}</span>
          <span className="text-[var(--c-muted-fg)]">Unlimited pool</span>
        </div>
        <p className="mt-1 text-xs text-[var(--c-muted-fg)]">{used.toLocaleString()} sent this period</p>
      </div>
    );
  }
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70 && pct < 90;
  const color = danger ? "#DC2626" : warn ? "#F59E0B" : "var(--c-primary)";
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-[var(--c-ink)]">{label}</span>
        <span className="text-[var(--c-muted-fg)]">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--c-paper-2)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 text-xs text-[var(--c-muted-fg)]">{pct}% used · {Math.max(0, limit - used).toLocaleString()} remaining</p>
    </div>
  );
}

function OverviewTab({ data }) {
  const org = data.organization;
  const usage = data.usage;
  const atRisk = usage.at_limit || usage.seat_percent >= 70;

  return (
    <div className="space-y-5" data-testid="org-portal-overview">
      {atRisk && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Approaching or at your contract limit</p>
            <p className="mt-1">
              {usage.seat_at_limit
                ? "Your seat has reached its monthly allowance."
                : usage.org_at_limit
                  ? "Your organisation pool has reached its monthly cap."
                  : "You are nearing your monthly allowance."}
              {" "}Contact your account manager to review your contract.
            </p>
            <Button size="sm" className="mt-3" asChild style={{ background: "var(--c-primary)", color: "#fff" }}>
              <Link to="/contact">Contact account team</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[var(--c-primary)]" />
            <h3 className="font-heading font-semibold text-[var(--c-ink)]">Your seat</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">Documents you send this billing period</p>
          <div className="mt-4">
            <UsageBar used={org.seat_used} limit={org.seat_limit} label="Monthly seat allowance" />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--c-primary)]" />
            <h3 className="font-heading font-semibold text-[var(--c-ink)]">Organisation pool</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--c-muted-fg)]">
            Shared across {org.member_count} seat{org.member_count !== 1 ? "s" : ""}
            {org.contract_pool_limit
              ? ` · Contract cap ${org.contract_pool_limit.toLocaleString()}`
              : org.org_unlimited
                ? " · Enterprise unlimited"
                : ` · Default ${org.per_seat_limit} × seats`}
          </p>
          <div className="mt-4">
            <UsageBar
              used={org.org_used}
              limit={org.org_limit ?? 0}
              label="Monthly pool"
              unlimited={org.org_unlimited}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Your role</p>
          <p className="mt-2 font-heading text-lg font-bold text-[var(--c-ink)]">{formatOrgRole(org.your_role)}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Team size</p>
          <p className="mt-2 font-heading text-lg font-bold text-[var(--c-ink)]">{org.member_count} seats</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted-fg)]">Resets</p>
          <p className="mt-2 font-heading text-lg font-bold text-[var(--c-ink)]">{org.resets_label || "Monthly"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-paper-2)] p-4 text-sm text-[var(--c-muted-fg)]">
        <p><strong className="text-[var(--c-ink)]">Hourly burst:</strong> up to {usage.hourly_burst_limit} documents/hour across your organisation.</p>
        <p className="mt-2">Deleting sent documents does not restore your monthly allowance.</p>
      </div>
    </div>
  );
}

function TeamRosterTab({ team, canManage, orgPerSeat, onReload }) {
  if (canManage) {
    return (
      <OrgTeamTab
        members={team}
        orgPerSeat={orgPerSeat}
        onReload={onReload}
      />
    );
  }
  return (
    <div className="space-y-4" data-testid="org-portal-team-readonly">
      <p className="text-sm text-[var(--c-muted-fg)]">
        Your organisation admin manages team accounts. Contact them to request a new login.
      </p>
      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
        <ul className="divide-y divide-[var(--c-border)]">
          {team.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--c-ink)]">{m.name || m.email}</p>
                <p className="text-xs text-[var(--c-muted-fg)]">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {m.seat_limit != null && (
                  <span className="text-xs text-[var(--c-muted-fg)]">
                    {(m.seat_used ?? 0).toLocaleString()} / {m.seat_limit.toLocaleString()} docs
                  </span>
                )}
                <Badge variant="outline">{formatOrgRole(m.org_role)}</Badge>
                {m.active === false && <Badge variant="outline" className="border-amber-200 text-amber-700">Paused</Badge>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ContractPdfViewer({ url, version }) {
  const containerRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(720);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    setNumPages(null);
  }, [url, version]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth - 48;
      setPageWidth(Math.min(Math.max(w, 300), 960));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="org-contract-pdf max-h-[calc(100vh-14rem)] overflow-y-auto bg-[var(--c-paper-2)] px-4 py-6 cs-grid-paper"
      data-testid="org-contract-pdf-viewer"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <Document
          key={version || url}
          file={url}
          options={PDF_OPTIONS}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={(
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
            </div>
          )}
          error={<p className="py-10 text-center text-sm text-red-600">Could not load contract preview.</p>}
        >
          {numPages != null && Array.from({ length: numPages }, (_, i) => (
            <div
              key={`${version}-${i + 1}`}
              className="mb-5 bg-white shadow-[0_6px_24px_rgba(15,23,32,0.12)]"
              style={{ width: pageWidth }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={(
                  <div className="flex min-h-[480px] items-center justify-center bg-white">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--c-primary)]" />
                  </div>
                )}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function ContractTab({ org, refreshKey }) {
  const contract = org.contract;
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const contractVersion = contract?.version || contract?.uploaded_at || refreshKey || "";

  useEffect(() => {
    if (!contract?.is_pdf) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPdfError(null);
      return undefined;
    }
    let active = true;
    let blobUrl = null;
    setPdfLoading(true);
    setPdfError(null);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const cacheBust = encodeURIComponent(contractVersion);
    fetchPdfBlobUrl(`/org/contract?inline=true&v=${cacheBust}`)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        blobUrl = url;
        setPdfUrl(url);
      })
      .catch((err) => {
        if (!active) return;
        setPdfError(err?.message || "Could not load contract preview");
      })
      .finally(() => { if (active) setPdfLoading(false); });
    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [contract?.is_pdf, contractVersion, refreshKey]);

  const handleDownload = async () => {
    try {
      const v = encodeURIComponent(contractVersion);
      await downloadFile(
        `/org/contract?v=${v}`,
        contract?.filename || "organisation-contract.pdf",
      );
    } catch {
      toast.error("Could not download contract");
    }
  };

  if (!contract) {
    return (
      <div
        className="rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-6 py-16 text-center"
        data-testid="org-portal-contract"
      >
        <FileText className="mx-auto h-10 w-10 text-[var(--c-muted-fg)]" />
        <p className="mt-3 text-sm text-[var(--c-muted-fg)]">
          Your signed contract will appear here once it has been uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="org-portal-contract">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--card)] px-5 py-4">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-[var(--c-ink)]">{contract.filename}</p>
          {contract.uploaded_at && (
            <p className="mt-0.5 text-xs text-[var(--c-muted-fg)]">Uploaded {fmtContractDate(contract.uploaded_at)}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload} data-testid="org-contract-download">
          <Download className="mr-1.5 h-4 w-4" /> Download
        </Button>
      </div>

      {contract.is_pdf ? (
        <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--card)]">
          {pdfLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary)]" />
            </div>
          ) : pdfError ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-red-700">{pdfError}</p>
              <p className="mt-2 text-xs text-[var(--c-muted-fg)]">
                You can still try downloading the file above, or contact your account manager.
              </p>
            </div>
          ) : pdfUrl ? (
            <ContractPdfViewer url={pdfUrl} version={contractVersion} />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--c-muted-fg)]">
          Download the file to view this contract.
        </p>
      )}
    </div>
  );
}

export default function OrganisationPortal() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractRefreshKey, setContractRefreshKey] = useState(0);
  const tab = params.get("tab") || "overview";
  const setTab = (t) => setParams(t === "overview" ? {} : { tab: t }, { replace: true });

  const loadPortal = useCallback(async ({ silent = false } = {}) => {
    if (!user?.org_id) return;
    if (!silent) setLoading(true);
    try {
      const { data: d } = await api.get("/org/portal", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      setData((prev) => {
        const prevVer = prev?.organization?.contract?.version;
        const nextVer = d?.organization?.contract?.version;
        if (prevVer !== nextVer) {
          setContractRefreshKey((k) => k + 1);
        }
        return d;
      });
    } catch (err) {
      if (!silent) toast.error(formatApiError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.org_id]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const prevTab = useRef(tab);
  useEffect(() => {
    if (prevTab.current === tab) return;
    prevTab.current = tab;
    if (user?.org_id) loadPortal({ silent: true });
  }, [tab, user?.org_id, loadPortal]);

  const pollPortal = tab === "overview" || tab === "team";
  const pollContractMeta = tab === "contract";

  usePoll(
    () => { if (user?.org_id) loadPortal({ silent: true }); },
    POLL_FAST_MS,
    { enabled: Boolean(user?.org_id) && pollPortal },
  );

  usePoll(
    () => { if (user?.org_id) loadPortal({ silent: true }); },
    POLL_SLOW_MS,
    { enabled: Boolean(user?.org_id) && pollContractMeta },
  );

  if (user === null) return null;
  if (user && !user.org_id) return <Navigate to="/dashboard" replace />;

  const org = data?.organization;

  return (
    <AppShell
      title="Organisation"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/usage"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Detailed usage</Link>
        </Button>
      }
    >
      {loading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-xl border border-[var(--c-primary)]/25 bg-[var(--c-primary)]/5 p-5" data-testid="org-portal-header">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--c-primary)22" }}>
                  <Building2 className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
                </span>
                <div>
                  <h1 className="font-heading text-xl font-bold text-[var(--c-ink)]">{org.name}</h1>
                  <p className="mt-0.5 text-sm text-[var(--c-muted-fg)]">
                    Organisation plan · {org.member_count} seat{org.member_count !== 1 ? "s" : ""} · You are the <span className="font-medium text-[var(--c-ink)]">{formatOrgRole(org.your_role)}</span>
                  </p>
                </div>
              </div>
              <Badge className="bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]">Organisation</Badge>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-5 h-auto flex-wrap gap-1 bg-[var(--c-paper-2)] p-1">
              <TabsTrigger value="overview" data-testid="org-portal-tab-overview" className="data-[state=active]:bg-[var(--card)]">
                <Gauge className="mr-1.5 h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="team" data-testid="org-portal-tab-team" className="data-[state=active]:bg-[var(--card)]">
                <Users className="mr-1.5 h-4 w-4" /> Team
              </TabsTrigger>
              <TabsTrigger value="contract" data-testid="org-portal-tab-contract" className="data-[state=active]:bg-[var(--card)]">
                <FileText className="mr-1.5 h-4 w-4" /> Contract
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview"><OverviewTab data={data} /></TabsContent>
            <TabsContent value="team">
              <TeamRosterTab
                team={data.team}
                canManage={data.can_manage_team}
                orgPerSeat={org.org_per_seat_limit}
                onReload={loadPortal}
              />
            </TabsContent>
            <TabsContent value="contract">
              <ContractTab org={org} refreshKey={contractRefreshKey} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </AppShell>
  );
}