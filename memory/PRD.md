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
- Welcome, sign-in (needs Clerk keys), role choice, browse+search+category chips+paging, presenter profile with 3 plans, send offer → conversation, accept/decline, chat (4s polling), presenter profile/photo/price editing with permission flow, profile/sign-out.
- Fixes after test 1: stable paging sort, tap areas of buttons, back button when screen opened directly.

## Sign-in status (2026-06)
- Live Clerk key (pk_live, Frontend API clerk.hireavatar.co) saved in frontend .env; backend uses CLERK_FRONTEND_API="clerk.hireavatar.co" → JWKS https://clerk.hireavatar.co/.well-known/jwks.json, issuer checked. No Clerk secret key needed; display name/email/photo synced via POST /api/me/sync.
- Blocked: clerk.hireavatar.co has no DNS record (NXDOMAIN). User chose to add Clerk domain CNAME records at GoDaddy. Re-test sign-in once DNS resolves.

## Backlog
- P0: Add Clerk keys (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) and test real sign-in; link original brandface backend/DB to share live data.
- P1: Send-offer error state; /me failure handling in auth bridge; tz-aware Mongo dates; offer race duplicate-key; hide blank presenter profiles; denormalized names going stale; upload type sniffing; +not-found screen; Log in button 44px.
- P2: Payments, reviews/ratings, favourites, portfolio videos, plan tracking, store publishing.
