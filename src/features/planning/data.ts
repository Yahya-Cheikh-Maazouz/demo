import { cache } from "react";
import { getBalance, getBookingRules, getBookingWeek } from "@/lib/api/eleve";

/**
 * Several Suspense boundaries of the same page need the balance or the rules:
 * memoized for the request so the API is called once.
 */
export const getPlanningBalance = cache(getBalance);
export const getPlanningRules = cache(getBookingRules);
export const getPlanningWeek = cache(getBookingWeek);
