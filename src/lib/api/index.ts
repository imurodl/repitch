// Barrel export for src/lib/api. Components should import from this module.
//
// Mode toggle:
//   .env.local  →  VITE_DISABLE_MOCK=true  (calls real backend)
//                  VITE_API_BASE_URL=https://...   (default: http://localhost:8000)
//
// Default behavior: mocks ON. The demo build on Vercel runs against mocks
// unless an env override is set in the project settings.

export { apiConfig, ApiError } from "./client";

export * as auth from "./auth";
export * as campaign from "./campaign";
export * as inbox from "./inbox";
export * as matching from "./matching";
export * as proposal from "./proposal";
