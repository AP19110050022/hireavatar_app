# HireAvatar Mobile — PRD

## Original problem
"hireavatar.co is the webapp that i built from here. based on that with same backend create app that works smooth, fast, and can be able to run on both ios and android"

## Approved plan (summary)
Expo app (iOS/Android) for HireAvatar marketplace. Presenters set prices & receive offers; businesses browse, send offers, chat. Same look as website (dark indigo, white pills, pink #FF5FA2). Clerk sign-in (same service as website). Original backend repo not linked → backend rebuilt here with same features; data separate until original code is linked.

## Architecture
- Backend: FastAPI + MongoDB (`/app/backend/server.py`). Auth: Clerk session JWT verified via Clerk JWKS (CLERK_SECRET_KEY); internal test sessions in `user_sessions`. Emergent Object Storage for photos (`/api/upload`, public `/api/files/...`). 8 seed presenters.
- Collections: users, presenters, offers, conversations, messages, files, user_sessions.
- Frontend: Expo Router. `/` welcome, `/sign-in` (Google SSO + email code via @clerk/expo), `/role`, tabs Browse/Offers/Messages/Profile (NativeTabs on iOS 26+), `/presenter/[id]`, `/offer/[presenterId]` modal, `/chat/[id]`, `/edit-profile` modal. Root-layout auth gate. React Query caching, infinite paging, pull-to-refresh, expo-image disk cache.

## Implemented (2026-06)
- Welcome, sign-in, role choice, browse+search+category chips+paging, presenter profile with 3 plans, send offer → conversation, accept/decline, chat (4s polling), presenter profile/photo/price editing with permission flow, profile/sign-out.
- Reliability fixes: deterministic pagination, timezone-aware Mongo reads, atomic first-conversation creation and offer responses, profile name/photo propagation, hidden incomplete presenter cards, decoded image upload validation, and bounded frontend API requests.
- UX fixes: direct-route back navigation, correct touch targets, branded unknown-route screen, complete plan descriptions, send-offer retry/error state, stable presenter-card test IDs, and a Clerk connectivity preflight that prevents the guest app from hanging or crashing when Clerk is unavailable.

## Sign-in status (2026-06)
- Live Clerk key (pk_live, Frontend API clerk.hireavatar.co) saved in frontend .env; backend uses CLERK_FRONTEND_API="clerk.hireavatar.co" → JWKS https://clerk.hireavatar.co/.well-known/jwks.json, issuer checked. No Clerk secret key needed; display name/email/photo synced via POST /api/me/sync.
- Blocked: clerk.hireavatar.co has no DNS record (NXDOMAIN). The mobile app now keeps guest browsing usable and renders an honest unavailable-sign-in card instead of mounting the failing Clerk SDK. Re-test Google and email sign-in once DNS resolves.

## Shared website data status (2026-06)
- Blocked: this workspace has no Git remote and no Brandface backend source/configuration. The app currently uses the local FastAPI/MongoDB backend with seeded presenters, so production presenters and offers are not yet shared with hireavatar.co.
- To complete this, the Brandface repository and production API/database integration must be linked to this workspace; do not replace credentials or database settings directly.

## Verification (2026-06)
- Backend regression: 18/18 tests passed after the reliability and upload-validation changes.
- Frontend: lint and `yarn tsc --noEmit` passed. Phone-size browser validation confirmed the guest marketplace renders and presenter-card test IDs are stable.
- Real Clerk sign-in and authenticated send-offer retry remain unverified because the Clerk domain is unresolved.

## Backlog
- P0: Verify Clerk DNS, then test real Google/email sign-in, account sync, and authenticated send-offer retry; link the original Brandface backend/DB to share live data.
- P1: Add an authenticated device test for send-offer retry and test first-conversation concurrency under load.
- P2: Payments, reviews/ratings, favourites, portfolio videos, plan tracking, store publishing.
