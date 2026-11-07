// Search and status filter of the schools list, encoded in the URL (/admin?statut=impaye&q=dupont). Pure.

import type { PlatformSchool, SubscriptionStatus } from "@/lib/types";
import { SUBSCRIPTION_STATUSES } from "@/features/abonnement/status-meta";

export type SchoolStatusFilter = "tous" | SubscriptionStatus;
export type SchoolQuery = { status: SchoolStatusFilter; q: string };

export function parseSchoolQuery(params: Record<string, string | string[] | undefined>): SchoolQuery {
  const raw = params.statut;
  const status = typeof raw === "string" && (SUBSCRIPTION_STATUSES as string[]).includes(raw) ? (raw as SubscriptionStatus) : "tous";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  return { status, q };
}

export function schoolsHref(query: SchoolQuery): string {
  const params = new URLSearchParams();
  if (query.status !== "tous") params.set("statut", query.status);
  if (query.q.trim()) params.set("q", query.q.trim());
  const search = params.toString();
  return search ? `/admin?${search}` : "/admin";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Name or subdomain, accents ignored. */
export function filterSchools(schools: PlatformSchool[], query: SchoolQuery): PlatformSchool[] {
  const needle = normalize(query.q.trim());
  return schools.filter(
    (s) =>
      (query.status === "tous" || s.status === query.status) &&
      (!needle || normalize(`${s.name} ${s.slug}`).includes(needle)),
  );
}
