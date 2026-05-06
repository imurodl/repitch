// Influencer matching / search API.
//
// Real backend contract:
//   GET {VITE_API_BASE_URL}/influencers/search
//     query: category, age, tone, budget, followers
//     -> RankResult ({ items: MatchedInfluencer[], relaxed: boolean })
//   `relaxed: true` means the server widened the filter (returned the full
//   pre-ranked top set) because strict filtering left fewer than 3 results.
//
// Mock impl uses src/lib/matching.ts → rankInfluencers, which now ranks from
// E's XGBoost output (src/data/matchingResults.json) joined to the local
// influencer dataset.

import type { MatchingFilters } from "../../data/types";
import { rankInfluencers, type RankResult } from "../matching";
import { influencers as localInfluencers } from "../../data/influencers";
import { apiConfig, apiFetch } from "./client";

export interface SearchInfluencersArgs {
  filters: MatchingFilters;
  signal?: AbortSignal;
}

export const searchInfluencers = async ({
  filters,
  signal,
}: SearchInfluencersArgs): Promise<RankResult> => {
  if (apiConfig.useMock) {
    return rankInfluencers(filters, localInfluencers);
  }
  return apiFetch<RankResult>("/influencers/search", {
    method: "GET",
    query: {
      category: filters.category,
      age: filters.age,
      tone: filters.tone,
      budget: filters.budget,
      followers: filters.followers,
    },
    signal,
  });
};
