// Authentication / evidence scoring API.
//
// Real backend contract:
//   POST {VITE_API_BASE_URL}/auth/score/receipt   multipart/form-data { file }   -> ReceiptResult
//   POST {VITE_API_BASE_URL}/auth/score/photo     multipart/form-data { file }   -> PhotoResult
//   POST {VITE_API_BASE_URL}/auth/score/sns       application/json { url }       -> SnsResult
//
// Mock impl returns the canned samples after a short delay so the demo timing
// feels real. Frontend never inspects backend internals (OCR, CV, NLP) —
// it just receives the structured result.

import type { PhotoResult, ReceiptResult, SnsResult } from "../../data/types";
import { sampleReceipt, samplePhoto, sampleSns } from "../../data/authEvidenceSamples";
import { apiConfig, apiFetch } from "./client";

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });

export const scoreReceipt = async (
  file: File,
  signal?: AbortSignal,
): Promise<ReceiptResult> => {
  if (apiConfig.useMock) {
    await wait(1400, signal);
    return sampleReceipt;
  }
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<ReceiptResult>("/auth/score/receipt", {
    method: "POST",
    body: fd,
    signal,
  });
};

export const scorePhoto = async (
  file: File,
  signal?: AbortSignal,
): Promise<PhotoResult> => {
  if (apiConfig.useMock) {
    await wait(1400, signal);
    return samplePhoto;
  }
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<PhotoResult>("/auth/score/photo", {
    method: "POST",
    body: fd,
    signal,
  });
};

export const scoreSns = async (
  url: string,
  signal?: AbortSignal,
): Promise<SnsResult> => {
  if (apiConfig.useMock) {
    await wait(1400, signal);
    return sampleSns;
  }
  return apiFetch<SnsResult>("/auth/score/sns", {
    method: "POST",
    json: { url },
    signal,
  });
};
