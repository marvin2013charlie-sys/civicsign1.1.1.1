import api from "@/lib/api";

export {
  ENVELOPE_STATUS_FILTERS,
  normalizeEnvelopeStatusFilter,
  envelopeFilterPath,
  envelopeStatusToDashboardFilter,
} from "@/lib/envelopeFilters";

export const ENVELOPE_PAGE_SIZE = 10;

/** Load every envelope for the signed-in user (paginated server-side). */
export async function fetchAllEnvelopes() {
  const all = [];
  let skip = 0;
  const limit = 500;
  while (true) {
    const { data } = await api.get("/envelopes", { params: { paginated: true, skip, limit } });
    const items = data.items || [];
    all.push(...items);
    if (!items.length || skip + items.length >= data.total) break;
    skip += limit;
  }
  return all;
}

/**
 * Load one page of envelopes with optional search and status filters.
 * @param {{ page?: number, limit?: number, status?: string, q?: string, excludeManagePdf?: boolean, managePdfOnly?: boolean, sealedOnly?: boolean }} opts
 */
export async function fetchEnvelopesPage({
  page = 1,
  limit = ENVELOPE_PAGE_SIZE,
  status,
  q,
  excludeManagePdf = false,
  managePdfOnly = false,
  sealedOnly = false,
} = {}) {
  const skip = (page - 1) * limit;
  const params = { paginated: true, skip, limit };
  if (status && status !== "all") params.status = status;
  const trimmed = (q || "").trim();
  if (trimmed) params.q = trimmed;
  if (excludeManagePdf) params.exclude_manage_pdf = true;
  if (managePdfOnly) params.manage_pdf_only = true;
  if (sealedOnly) params.sealed_only = true;
  const { data } = await api.get("/envelopes", { params });
  return {
    items: data.items || [],
    total: data.total ?? 0,
    skip: data.skip ?? skip,
    limit: data.limit ?? limit,
  };
}