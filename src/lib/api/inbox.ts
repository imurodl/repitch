// Proposals / inbox API.
//
// Real backend contract:
//   POST {VITE_API_BASE_URL}/proposals                 body: SubmittedProposal -> SubmittedProposal (with server id)
//   GET  {VITE_API_BASE_URL}/proposals                                          -> SubmittedProposal[]
//   GET  {VITE_API_BASE_URL}/proposals/:id                                      -> SubmittedProposal
//   PATCH {VITE_API_BASE_URL}/proposals/:id/status   body: { status }           -> SubmittedProposal
//
// Mock impl uses a module-level Map so mock submissions persist across the
// session (cleared on hard refresh — same behavior as the original
// AppContext-only state).

import type { SubmittedProposal } from "../../data/types";
import { apiConfig, apiFetch } from "./client";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "negotiating";

const mockStore = new Map<string, SubmittedProposal>();

const newId = () => `prop_${Math.random().toString(36).slice(2, 9)}`;

export const submitProposal = async (
  proposal: Omit<SubmittedProposal, "id"> & { id?: string },
): Promise<SubmittedProposal> => {
  if (apiConfig.useMock) {
    const stored: SubmittedProposal = { ...proposal, id: proposal.id ?? newId() };
    mockStore.set(stored.id, stored);
    return stored;
  }
  return apiFetch<SubmittedProposal>("/proposals", {
    method: "POST",
    json: proposal,
  });
};

export const listProposals = async (): Promise<SubmittedProposal[]> => {
  if (apiConfig.useMock) {
    return Array.from(mockStore.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  return apiFetch<SubmittedProposal[]>("/proposals");
};

export const getProposal = async (id: string): Promise<SubmittedProposal | null> => {
  if (apiConfig.useMock) {
    return mockStore.get(id) ?? null;
  }
  try {
    return await apiFetch<SubmittedProposal>(`/proposals/${id}`);
  } catch {
    return null;
  }
};

export const updateProposalStatus = async (
  id: string,
  status: ProposalStatus,
): Promise<SubmittedProposal | null> => {
  if (apiConfig.useMock) {
    const found = mockStore.get(id);
    if (!found) return null;
    return found; // mock doesn't track status separately yet
  }
  return apiFetch<SubmittedProposal>(`/proposals/${id}/status`, {
    method: "PATCH",
    json: { status },
  });
};

/** Test-only — wipes the in-memory mock store. */
export const _resetMockInbox = () => mockStore.clear();
