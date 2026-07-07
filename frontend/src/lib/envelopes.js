import api from "@/lib/api";

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