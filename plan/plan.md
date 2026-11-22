# HireAvatar Mobile App (iOS & Android)

A native phone app for HireAvatar, where businesses find on-camera presenters and presenters get hired to promote brands.
It runs on the same backend and accounts as hireavatar.co, so people pick up where they left off on the website.

## Who it's for
- **Presenters**: people who want to be the face of a brand. They set their prices and receive offers from businesses.
- **Businesses**: brands looking for on-camera talent for videos and promotions. They browse presenters, message them, and send offers.

## Core features and experience
- **Same login as the website**: Google or email sign-in using the website's existing sign-in system. Existing users see their real profile, chats and offers.
- **Role choice**: after first sign-in, users pick Presenter or Business, same as on the website.
- **Browse presenters**: a fast, scrollable grid of presenter cards (photo, name, "from ₹" price), filtered by category, with search.
- **Presenter profile**: photos, bio, prices, and the three hiring options from the website:
  - Per Video: one finished video at the presenter's price
  - Part-time: up to 8 videos and 1 shoot day a month
  - Full-time: a dedicated face, up to 20 videos a month
- **Send an offer** (business): pick a hiring option, add a brief and budget, and send it. This opens a conversation.
- **Offers inbox**: presenters accept or decline. Both sides see offer status (pending, accepted, declined).
- **Messaging**: one-to-one chat between a business and a presenter, tied to their offer.
- **My profile** (presenter): edit photos, bio and prices from the phone. Photos are uploaded to cloud storage.
- **Speed**: images are cached, lists load in pages, and pull-to-refresh is on every list.

## User flow
1. Open app → see the welcome screen ("Be the face of a brand. Or find yours.") → Sign in with Google or email.
2. First time only: choose Presenter or Business.
3. **Business**: Browse → open a presenter → Send offer → chat in Messages → track the offer in Offers.
4. **Presenter**: Offers inbox → accept or decline → chat with the business → keep the profile and prices up to date.
5. Bottom tabs: **Browse / Offers / Messages / Profile**. Presenters see their own profile where businesses see Browse.

## UI/UX feel
- Matches the website: dark background, white type, pink accent (#FF5FA2), the HireAvatar logo, and glassy rounded cards.
- Large presenter photos, short and confident text, smooth screen transitions, and small press animations.
- Follows native iOS and Android conventions, including iOS's latest tab bar on supported iPhones.

## Implementation phases
**Phase 1 (MVP, built now)**
- Bring the website's backend into this project and run it here, connected to the same sign-in system so accounts match.
- Sign-in, role choice, browse and search presenters, presenter profiles, send, accept and decline offers, messaging, and presenter profile and price editing.

**Phase 2**
- Payments and payouts in the app, reusing the website's payment setup.
- Reviews and ratings ("5★ from a brand") and saved or favourite presenters.

**Phase 3**
- Presenter portfolio videos and reels, monthly plan tracking for Part-time and Full-time hires, and getting ready for App Store and Play Store publishing.

## Assumptions
- **Getting the backend from "brandface"**: this project cannot read another chat directly. The way to bring the code over is to open the brandface chat, use **Save to GitHub**, and share that repository link here. The backend is then copied in and the app is built on it unchanged where possible. If no link is shared, a backend with the same features and data shape as the website is rebuilt here. In that case, website and app data stay separate until the original code is linked.
- **Same accounts**: the website uses its own sign-in service (Clerk). The app uses that same service, so users need no new accounts. Its keys are requested in a secure card during the build. Until they are added, sign-in will not work.
- **Shared live data**: if the copied backend points to the website's live database, app and website show the same presenters, offers and chats. Otherwise the preview uses its own data until the app is published.
- **Phase 1 scope**: browse, profiles, offers, messaging and profile editing. No real money moves in Phase 1.
- **Look**: matches the website (dark, pink accent, same logo), since no other style was chosen.
- Prices are shown in Indian Rupees (₹), as on the website.
- Push notifications are not included.
