// Proposal generation API.
//
// Real backend contract (per docs/TalkFile_repitch_ui_spec.html.html):
//   POST {VITE_API_BASE_URL}/proposal/generate
//   Content-Type: application/json
//   Body: ProposalGenerateBody (Korean keys, see below)
//   Response: text/plain (chunked / SSE) — the streamed 제안서 body.
//
// Mock impl reuses src/lib/llmClient.ts → mockClient.streamProposal which
// renders src/data/proposalTemplates per category.

import type { ProposalInput } from "../../data/types";
import { mockClient, buildBackupProposal } from "../llmClient";
import { apiConfig, streamText } from "./client";

/**
 * Request body shape for POST /proposal/generate.
 * Korean keys are intentional — they match the backend spec.
 */
export interface ProposalGenerateBody {
  브랜드명: string;
  브랜드_카테고리: string;
  콘텐츠_포맷: string;
  플랫폼: string;
  콘텐츠유형: string;
  팔로워규모: string;
  예상_도달: string;
  보수: string;
  핵심_키워드: string; // comma-joined
  타겟_소구점: string;
  // E 모델 features (hardcoded fallback values until model lands)
  전문성: number;
  신뢰성: number;
  진정성: number;
  스토리텔링: number;
  소비자_몰입: number;
  브랜드_인플루언서_적합도: number;
}

export const buildProposalBody = (
  input: ProposalInput,
): ProposalGenerateBody => ({
  브랜드명: input.브랜드명,
  브랜드_카테고리: input.브랜드_카테고리,
  콘텐츠_포맷: input.콘텐츠_포맷,
  플랫폼: input.플랫폼,
  콘텐츠유형: input.콘텐츠유형,
  팔로워규모: input.팔로워규모,
  예상_도달: input.예상_도달,
  보수: input.보수,
  핵심_키워드: input.핵심_키워드.join(", "),
  타겟_소구점: input.타겟_소구점,
  전문성: input.전문성,
  신뢰성: input.신뢰성,
  진정성: input.진정성,
  스토리텔링: input.스토리텔링,
  소비자_몰입: input.소비자_몰입,
  브랜드_인플루언서_적합도: input.브랜드_인플루언서_적합도,
});

export interface StreamProposalArgs {
  input: ProposalInput;
  estimatedReach: number;
  estimatedCtr: number;
  signal?: AbortSignal;
}

/**
 * Stream the 제안서 body chunk by chunk. Consumers concatenate yielded strings.
 * Aborts via the optional AbortSignal.
 */
export async function* streamProposal(
  args: StreamProposalArgs,
): AsyncIterable<string> {
  if (apiConfig.useMock) {
    yield* mockClient.streamProposal(args);
    return;
  }
  yield* streamText("/proposal/generate", {
    method: "POST",
    json: buildProposalBody(args.input),
    signal: args.signal,
  });
}

/** Synchronous fallback used by the "오프라인 백업 PDF" button. */
export const buildBackupBody = (
  input: ProposalInput,
  estimatedReach: number,
  estimatedCtr: number,
) => buildBackupProposal(input, estimatedReach, estimatedCtr);
