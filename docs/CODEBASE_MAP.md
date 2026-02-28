# Codebase Map

This file groups the repository by responsibility so future cleanup/refactor work is easier to plan.

## 1) App runtime (web client)

- `index.tsx` — React entry point and app mount.
- `App.tsx` — top-level app shell, view switching, modal orchestration.
- `index.html`, `index.css` — base HTML and global styles.
- `types.ts` — shared domain models and enums used across app/state/services.
- `constants.ts` — seed/demo data and generation helpers for marketplace state.

## 2) UI components

- `components/` — reusable and feature components.
  - `auth/` — login/register/verification/forgot-password flows.
  - `bids/` — bidding and bid UX.
  - `chat/` — inbox/thread chat UI.
  - `community/` — groups and thread interactions.
  - `dashboard/` — seller dashboard.
  - `live/` — host controls/session/overlay for live features.
  - `onboarding/` — buyer/seller onboarding steps.
  - `profile/` — profile screens and profile edit widgets.
  - `admin/` — moderation UI.
  - `ui/` and `assets/` — low-level display wrappers and icons/logos.

## 3) State management and app context

- `context/`
  - `AuthContext.tsx` — auth session + auth actions wiring.
  - `StoreContext.tsx` — combines marketplace/social/live slices for UI consumers.
  - `ChatContext.tsx` — chat-specific provider logic.
- `stores/`
  - `useMarketplaceStore.ts` — listings, filters, transactions.
  - `useBreaksStore.ts` — breaks/live-event state.
  - `useSocialStore.ts` — community/groups/thread state.
  - `useWalletStore.ts`, `useNotificationStore.ts` — wallet and notifications.

## 4) Services (external/system integration)

- `services/authService.ts` — localStorage-backed auth simulation.
- `services/geminiService.ts` — Gemini model calls (text/vision/location).
- `services/cardRecognitionService.ts` — OCR + card matching pipeline.
- `services/tcgApiService.ts` — external TCG metadata calls.
- `services/valuationService.ts` — pricing/valuation logic.
- `services/chatService.ts` — chat persistence/service layer.

## 5) Utilities

- `utils/env.ts` — typed env-variable accessor.
- `utils/storage.ts` — local storage helpers.
- `utils/filterUtils.ts`, `utils/dateUtils.ts` — filtering/date formatting.
- `utils/imageProcessing.ts`, `utils/opencvLoader.ts` — CV/image preprocessing.

## 6) Build/config/tooling

- `package.json` — scripts and dependencies.
- `vite.config.ts`, `vite-env.d.ts` — Vite config + TS client env types.
- `tsconfig.json` — TypeScript compiler options.
- `tailwind.config.js`, `postcss.config.js` — styling pipeline config.
- `scripts/check-duplicate-symbols.mjs` — duplicate symbol guard.

## 7) Mobile shell (Capacitor iOS)

- `capacitor.config.ts` — Capacitor project config.
- `ios/App/` — generated/maintained iOS wrapper, Xcode project, app assets, Swift entry points.

## 8) Live infrastructure scaffold

- `live/infra/terraform/` — infra provisioning templates.
- `live/helm/live-stack/` — Kubernetes Helm chart templates.
- `live/k8s/` — namespace/secret templates.
- `live/scripts/`, `live/tests/`, `live/docs/` — deploy helpers, smoke tests, rollout docs.

## 9) Metadata/docs

- `README.md` — setup and script usage.
- `.env.example` — local env template.
- `metadata.json` — project metadata.

---

## Priority cleanup candidates (next passes)

1. Move seed/mock data generation from `constants.ts` into a dedicated `data/` or test fixture layer.
2. Replace localStorage auth simulation with backend-backed auth and secure password handling.
3. Reduce `any` usage in `App.tsx`, `components/*`, and services to strict typed contracts.
4. Split `App.tsx` view-router logic into smaller route/controller modules.
