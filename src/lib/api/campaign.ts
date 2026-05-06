// Campaign analytics API.
//
// Real backend contract:
//   GET {VITE_API_BASE_URL}/campaigns/:id/metrics    -> DailyMetric[]    (cumulative views/likes/comments per day)
//   GET {VITE_API_BASE_URL}/campaigns/:id/posts      -> ContentPost[]    (per-post stats)
//
// Mock impl uses src/data/campaignMetrics.ts deterministic seed-by-id so the
// chart looks the same across renders.

import {
  generateDailyMetrics,
  generateContentPosts,
  type ContentPost,
  type DailyMetric,
} from "../../data/campaignMetrics";
import { apiConfig, apiFetch } from "./client";

export const getCampaignMetrics = async (
  campaignId: string,
  signal?: AbortSignal,
): Promise<DailyMetric[]> => {
  if (apiConfig.useMock) {
    return generateDailyMetrics(campaignId);
  }
  return apiFetch<DailyMetric[]>(`/campaigns/${encodeURIComponent(campaignId)}/metrics`, {
    signal,
  });
};

export const getCampaignPosts = async (
  campaignId: string,
  signal?: AbortSignal,
): Promise<ContentPost[]> => {
  if (apiConfig.useMock) {
    return generateContentPosts(campaignId);
  }
  return apiFetch<ContentPost[]>(`/campaigns/${encodeURIComponent(campaignId)}/posts`, {
    signal,
  });
};
