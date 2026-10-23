# FE Setup Analysis — FE3-S

_Generated: 2026-10-22 22:10 IST  
Spec pack: `from claude/` (found at repo root, untouched as original)  
Node: v24.15.0 | Baseline: 17/17 tests ✅ | Build: 152.70 kB gzip ✅_

---

## Step 1 – "from claude" Folder Verification

**Found at:** `c:\...\NIH CyberCheckmate\from claude\`

| Expected file | Present? |
|---|---|
| `cybercheckmate-FE-PRD.md` | ✅ |
| `INTEGRATION.md` | ✅ |
| `cybercheckmate-PRD-v2.md` | ✅ |
| `contracts/API-CONTRACT.md` | ✅ |
| `contracts/contract-inputs.json` | ✅ |
| `contracts/schemas/` (8 files) | ✅ all 8 |
| `contracts/fixtures/` (26 files) | ✅ all 26 |

**MISSING:** none  
**EXTRA:** none  

All 35 JSON files parse without errors. All 9 `analyze_*.json` fixtures have a valid `risk_score` (int 0–100) and a valid `level` (green / amber / red).

---

## Step 2 – Repo Layout

| Check | Result |
|---|---|
| Repo root | `c:\Users\jp160\Desktop\Viswas\College - VIT\Project\NIH CyberCheckmate` |
| `frontend/` at root | ✅ |
| `backend/` at root | ✅ |
| `models/` at root | ✅ |
| `scripts/` at root | ✅ |
| `contracts/` at root | ✅ (just copied from `from claude/`) |
| `training/` at root | ❌ not present (not a blocker; training scripts live in `scripts/`) |
| Git repo | ❌ NOT a git repo (`git init` not done) |
| Branch | N/A |
| Remote | N/A |

> [!IMPORTANT] Frontend and backend ARE co-located in the same folder (one repo structure), which is what INTEGRATION.md Step 0 requires. However, `git init` has not been run. The INTEGRATION.md two-laptop join workflow cannot proceed until git is initialised.

---

## Step 3 – Files Put in Place

| Action | Result |
|---|---|
| `from claude/contracts` → `<root>/contracts` | ✅ Copied (root had no prior `contracts/`) |
| `cybercheckmate-FE-PRD.md` → root | ✅ Copied (not previously present) |
| `INTEGRATION.md` → root | ✅ Copied |
| `cybercheckmate-PRD-v2.md` → root | ✅ Copied |
| `.nvmrc` (containing `22`) | ✅ Created |
| `.gitignore` | ❌ Does **not** exist at repo root |

**Missing `.gitignore` lines** (INTEGRATION.md §0.1):
```
node_modules/
frontend/dist/
.env
.env.local
frontend/.env.local
venv/
.venv/
__pycache__/
data/raw/
data/feedback/
*.db
playwright-report/
test-results/
```
_(Not edited — reported only, as instructed.)_

---

## Step 4 – JSON Validation

All 35 JSON files in `contracts/` are syntactically valid.

| Fixture | `risk_score` | `level` |
|---|---|---|
| `analyze_amber_job_hinglish.json` | 58 ✅ | amber ✅ |
| `analyze_green_otp.json` | 9 ✅ | green ✅ |
| `analyze_image_red.json` | 91 ✅ | red ✅ |
| `analyze_on_device.json` | 58 ✅ | amber ✅ |
| `analyze_red_kyc_en.json` | 91 ✅ | red ✅ |
| `analyze_ta_translated.json` | 84 ✅ | red ✅ |
| `analyze_ta_translation_failed.json` | 80 ✅ | red ✅ |
| `analyze_url_only_official.json` | 4 ✅ | green ✅ |
| `analyze_v1_legacy.json` | 91 ✅ | red ✅ |

---

## Step 5 – Baseline (FE3-0)

See `FE_BASELINE.md` for full details.

- **Node:** v24.15.0 ✅  
- **`npm test`:** 17/17 pass ✅  
- **`npm run build`:** clean, 152.70 kB gzip ✅  

---

## Step 6 – Specs Read

All four spec files read in full:
1. `cybercheckmate-FE-PRD.md` (v2, 399 lines)
2. `INTEGRATION.md` (161 lines)
3. `cybercheckmate-PRD-v2.md` (663 lines)
4. `contracts/API-CONTRACT.md` (148 lines)
5. All 8 schemas and all 26 fixtures inspected.

---

## Step 7 – Gap Analysis

> [!NOTE] The current frontend was built to the **original PRD v1** prompts (FE-1 through FE-8). The FE PRD v2 spec pack significantly extends the requirements. Gaps below compare the current `frontend/src` source against the new spec.

### a. Route map

| Route (spec §3) | Current state |
|---|---|
| `/` → redirect | ✅ exists |
| `/login` | ✅ exists (`LoginPage.jsx`) |
| `/dashboard` | ✅ exists |
| `/check` | ✅ exists |
| `/result` | ✅ exists |
| `/history` | ✅ exists |
| `/golden-hour` | ❌ **MISSING** (FR11) |
| `/scam-radar` | ❌ **MISSING** (FR15; current nav has no radar page) |
| `/settings` | ❌ **MISSING** (new in FE PRD v2) |
| `/share` | ❌ **MISSING** (FR9 share landing) |
| `/console` (was `/admin`) | ⚠️ **WRONG PATH** — current app uses `/admin`; spec §1 says `/admin/*` is a reserved backend prefix; the frontend admin page **must move to `/console`** |
| `/console/reports` | ❌ MISSING (sub-tab) |
| `/console/rules` | ❌ MISSING |
| `/console/models` | ❌ MISSING |
| `/console/retrain` | ❌ MISSING |
| `*` → NotFound | ⚠️ currently redirects to root instead of a 404 page |

**Critical:** The `/admin` route in `App.jsx` conflicts with the backend's `/admin/*` API prefix. When FastAPI serves the built frontend, a browser navigation to `/admin` would hit the API, not the React page. This must be fixed before the join (J1).

### b. `src/routes.js` — route constants

❌ **Does not exist.** The spec (§3) requires all path strings as constants in `src/routes.js`. Current code hardcodes strings in `App.jsx` and `<Link>` elements. This must be created.

### c. API layer (`src/api/`)

| Spec item | Current state |
|---|---|
| `src/api/` multi-module layout | ❌ Everything is in a single `src/api.js` flat file |
| `api/http.js` with `requestJson`, `AbortController`, timeouts | ❌ Missing; `fetch` called inline with no timeout |
| `api/errors.js` (`ApiError`, `NetworkError`, `FeatureUnavailableError`, `InvalidResponseError`) | ❌ Missing; errors are plain `Error` with a `.status` property |
| `api/normalize.js` (`normalizeAnalyzeResponse`) | ❌ Missing; no normalisation layer |
| `api/analyze.js`, `api/health.js`, `api/languages.js`, `api/report.js`, `api/radar.js`, `api/admin.js` | ❌ Missing |
| `api/mock.js` using contract fixtures (`@contracts/fixtures/`) | ⚠️ `src/mock.js` exists but uses hand-written mock data, not contract fixtures |
| `src/api.js` re-exports `analyze`, `getHealth`, `isMockMode` | ✅ Compatible but needs to proxy the new modules |
| `getLanguages()` → GET `/languages` | ❌ Missing |
| `sendReport()` → POST `/report` | ❌ Missing |
| `getRadar()` → GET `/radar` | ❌ Missing |
| All `admin.*` functions | ❌ Missing |
| 20 s timeout for `/analyze`; 60 s with image | ❌ No timeout at all |
| `analyzeWithFallback()` (on-device fallback) | ❌ Missing |

### d. Context / state

| Spec item | Current state |
|---|---|
| `AnalysisContext` | ✅ exists (`context/AnalysisContext.jsx`) |
| `LanguageContext` | ✅ exists (`context/LanguageContext.jsx`) |
| `ServerContext` | ❌ **MISSING** (stores health / capabilities from `/health` + `/languages`) |
| `ToastContext` | ❌ Missing |
| `PrivateModeContext` | ❌ Missing |
| `lib/storage.js` (`safeGet`, `safeSet`, `safeRemove`) | ❌ Missing; storage access is inline in `history.js` |
| `lib/session.js` (`getRole`, `setRole`, `getAdminToken`, …) | ❌ Missing; `sessionStorage` access is inline in `App.jsx` |

### e. i18n

| Spec item | Current state |
|---|---|
| `src/i18n/` multi-file layout | ❌ Everything in one `src/i18n.js` flat file |
| 11 language codes (en, hi, ta, te, bn, mr, gu, kn, ml, pa, or) | ❌ Only **en and hi** implemented; 9 languages missing |
| Separate `en.json`, `hi.json`, `ta.json`, … per language | ❌ Strings are inline in `i18n.js` as JS objects |
| `i18n/languages.js` — language metadata list | ❌ Missing |
| `i18n/fonts.js` — dynamic Noto Sans imports | ❌ Missing |
| Test: all language files have identical keys | ❌ Missing |
| `t(key, vars)` from `useLanguage()` | ⚠️ `t(key, lang)` exists but takes a lang parameter instead of reading from context; no variable interpolation |
| `cc_lang` persists all 11 codes | ⚠️ Current `setStoredLang` only accepts `'en'` or `'hi'` (hard-coded guard) |

### f. Mock mode

| Spec item | Current state |
|---|---|
| Uses `@contracts/fixtures/` | ❌ Uses hand-written `src/mock.js` data |
| Routing: empty → `error_400_empty`, Tamil script → `analyze_ta_translated`, etc. | ⚠️ Different routing logic (text contains "kyc", "otp", etc.) |
| Admin mocks accept token `"mock"` only | ❌ No admin mock |
| `getLanguages()`, `getRadar()`, admin functions in mock | ❌ Missing |

### g. Component library

| Spec item | Current state |
|---|---|
| React Bits components (22 required) | ❌ Only **4** installed: `CountUp`, `DecryptedText`, `DotGrid`, `SpotlightCard` |
| Missing: `DepthText`, `Radar`, `BorderGlow`, `FadeContent` (Login) | ❌ |
| Missing: `SplitFlapText`, `MagicBento`, `AnimatedList`, `RubberSegment`, `LatticeLoader` (Dashboard/Check) | ❌ |
| Missing: `SloshGauge`, `ElectricBorder`, `AnimatedContent`, `ShinyText` (Result) | ❌ |
| Missing: `HoldButton`, `SwipeToast`, `StatusMark`, `Stepper`, `Counter` | ❌ |
| `@hugeicons/react` + `@hugeicons/core-free-icons` | ❌ Not installed |
| `@fontsource/*` (Indian scripts) | ❌ Not installed |
| `src/components/reactbits/README.md` (inventory) | ❌ Missing |
| Spec §9: No shadcn/ui, Radix, etc. | ✅ Not used |

### h. Pages

| Page | Spec (§7) requirement | Current state |
|---|---|---|
| Login | DepthText, Radar bg, BorderGlow, FadeContent; 2 cards (User / Admin); „No account needed." line | ⚠️ Basic login exists; missing spec React Bits components; admin card uses `/admin` (wrong path) |
| Dashboard | SplitFlapText, MagicBento, AnimatedList, CountUp; Scam Radar button, Golden Hour button; install banner | ⚠️ Exists but missing React Bits components; no Radar or Golden Hour buttons |
| Check | RubberSegment modes (Message/Link/Screenshot); MicButton (FR12); LatticeLoader overlay; DotGrid bg | ⚠️ Exists; no RubberSegment, no MicButton, no LatticeLoader |
| Result | SloshGauge, ElectricBorder (red), CountUp, SpotlightCard; SpeakButton; TranslationBox; ReputationCard; EntityList; Golden Hour button; TechnicalDetails; ReportPanel | ⚠️ Exists; missing many spec components and sections |
| Golden Hour | `/golden-hour`; Stepper, RubberSegment, EntityList, complaint draft, copy/share/PDF | ❌ **Entire page missing** |
| Scam Radar | `/scam-radar`; `getRadar()`; Counter, ShinyText, FadeContent; 404 / offline states | ❌ **Entire page missing** |
| Settings | `/settings`; language select (11); Private mode; voice info; server info; privacy text; credits | ❌ **Entire page missing** |
| Share Landing | `/share`; reads `window.__CC_SHARE__`; LatticeLoader | ❌ **Entire page missing** |
| Console | `/console`; 4 sub-tabs; admin token guard | ⚠️ `/admin` exists but wrong path; sub-tabs missing |
| NotFound | `pages/NotFoundPage.jsx` | ❌ Missing; currently redirects to root |

### i. Layout and navigation

| Spec item | Current state |
|---|---|
| `Header` with LanguageSelect, ServerStatus pill, Private-mode chip, Console link, Sign out | ⚠️ Layout exists but missing LanguageSelect, ServerStatus pill, Private-mode chip |
| Bottom nav mobile (<768 px): Home, Check, History, Radar, Settings | ❌ Missing |
| Top nav desktop: same 5 items | ❌ Missing |
| Footer privacy sentence | ⚠️ May be partially present; spec wording not verified |
| `ErrorBoundary` wrapping every route | ❌ Missing |

### j. PWA and service worker

| Spec item | Current state |
|---|---|
| `public/manifest.webmanifest` with `share_target` | ❌ Missing |
| `public/sw.js` (hand-written, no library) | ❌ Missing |
| `sw.js` never caches API paths or POST | ❌ N/A (no SW) |
| SW registered only in production on HTTPS/localhost | ❌ N/A |
| Install prompt captured in Dashboard | ❌ Missing |
| Icons 192 / 512 / maskable | ❌ Missing |

### k. Design system / tokens

| Spec item | Current state |
|---|---|
| `--color-cc-black`, `--color-cc-deep`, `--color-cc-pine`, `--color-cc-juniper`, `--color-cc-glow`, `--color-cc-mint` | ⚠️ `index.css` may have partial tokens; not verified against exact hex values in §10 |
| `--color-risk-red #EF4444`, `--color-risk-amber #F59E0B`, `--color-risk-green #22C55E` | ⚠️ Tokens exist but values differ: `red` is `#F87171` (spec: `#EF4444`), `green` is `#4ADE80` (spec: `#22C55E`), `amber` is `#FBBF24` (spec: `#F59E0B`) — need correction |
| Chakra Petch (headings), Inter (body), Noto Sans per script | ⚠️ Inter likely present; Chakra Petch and Noto Sans multi-script not confirmed |
| `lib/fx.js` + `useFxTier()` (off / lite / full) | ❌ Missing |
| WebGL components render only on `full` tier, max one mounted | ❌ No tier system |

### l. Testing

| Spec item (§13) | Current state |
|---|---|
| `normalize` tests against all fixtures | ❌ No `normalize.js` exists yet |
| API error tests (400/404/429/503/network/timeout) | ⚠️ 5 tests exist but cover limited cases |
| Mock routing (Tamil script, image, etc.) | ⚠️ Partially tested but against old mock logic |
| i18n key completeness (11 languages) | ❌ Missing |
| Complaint builder | ❌ Missing (no `lib/complaint.js`) |
| Entities regex | ❌ Missing |
| Speech feature detection | ❌ Missing |
| Route constants vs reserved prefixes | ❌ Missing (no `src/routes.js`) |
| On-device golden tests | ❌ Missing (no `ondevice/` module) |
| Every fixture validates against its schema (ajv) | ❌ `ajv` not installed |
| `npm run contract:check` (live backend) | ❌ `scripts/contract-check.mjs` missing |
| `npm run check:routes` | ❌ `scripts/check-routes.mjs` missing |
| Playwright e2e | ❌ `@playwright/test` not installed; no `e2e/` folder |

### m. On-device shield (FR13)

| Spec item | Current state |
|---|---|
| `src/ondevice/` — preprocess, tfidf, model, rules, domain, url, brand, fusion, explain, analyzeLocal, worker, client | ❌ **Entire module missing** |
| `public/model/` populated by `scripts/export_model_js.py` | ❌ No `export_model_js.py` (backend task BE2-21) |
| `scripts/parity.mjs` | ❌ Missing |
| Private-mode toggle stored as `cc_private_mode` | ❌ Missing |

---

## Summary Table

| Dimension | Status | Priority |
|---|---|---|
| a. Routes | ⚠️ 6 pages missing; `/admin` conflict | 🔴 P0 |
| b. `src/routes.js` | ❌ Not created | 🔴 P0 |
| c. API layer | ⚠️ Single flat file; no normalize/errors/timeout | 🔴 P0 |
| d. Context / storage lib | ❌ ServerContext, ToastContext, lib/storage.js, lib/session.js missing | 🔴 P0 |
| e. i18n | ⚠️ Only en+hi; 9 languages missing; wrong structure | 🟠 P1 |
| f. Mock mode | ⚠️ Uses hand-written data, not contract fixtures | 🟠 P1 |
| g. React Bits components | ❌ 18 of 22 missing; Hugeicons missing | 🔴 P0 |
| h. Pages | ❌ 4 pages entirely missing; others incomplete | 🔴 P0 |
| i. Layout/nav | ⚠️ Bottom nav, ServerStatus, ErrorBoundary missing | 🟠 P1 |
| j. PWA / SW | ❌ No manifest, no SW, no icons | 🟠 P1 |
| k. Design tokens/fx | ⚠️ Partial; `lib/fx.js` missing | 🟡 P2 |
| l. Tests | ⚠️ 17 basic tests pass; normalize/e2e/contract missing | 🟠 P1 |
| m. On-device (FR13) | ❌ Entirely missing | 🟡 P2 |

---

## Recommended Build Order (aligned to INTEGRATION.md join schedule)

```
Before J1 (FE3-1 → FE3-5):
  1. Fix /admin → /console route; create src/routes.js
  2. Build src/api/ multi-module layout (http.js, errors.js, normalize.js, analyze.js, health.js)
  3. Switch mock.js to use @contracts/fixtures via @contracts alias in vite.config.js
  4. Install React Bits batch 1 (LatticeLoader, RubberSegment, AnimatedList, CountUp already present)
  5. Install @hugeicons/react; add ajv + ajv-formats dev deps
  6. Add ServerContext + lib/storage.js + lib/session.js
  7. Build NotFound page; add ErrorBoundary
  8. Write normalize tests (ajv against fixtures) → target 100% fixture coverage

Before J2 (FE3-6 → FE3-18):
  9. Complete Login page (React Bits: DepthText, BorderGlow, FadeContent; Radar bg at fx=full)
  10. Complete Dashboard (SplitFlapText, MagicBento, AnimatedList)
  11. Complete Check page (RubberSegment modes, MicButton stub, LatticeLoader)
  12. Complete Result page (SloshGauge, ElectricBorder, SpeakButton, TranslationBox, ReputationCard, EntityList, TechnicalDetails, ReportPanel)
  13. Build Settings page (11-language select, private mode toggle, server info, credits)
  14. Build /share landing
  15. Expand i18n to 9 remaining languages
  16. Build Golden Hour page (FR11)

Before J3 (FE3-19 → FE3-22):
  17. Build on-device module (src/ondevice/) once backend exports model
  18. Implement parity.mjs
  19. Private mode full wiring

Before J4 (FE3-23 → FE3-25):
  20. Build /console sub-tabs (Reports, Rules, Models, Retrain)
  21. Build /scam-radar (FR15)
  22. PWA: manifest.webmanifest + sw.js + icons

Final (FE3-26 → FE3-28):
  23. Playwright e2e suite
  24. contract:check script
  25. check:routes script
  26. Lighthouse audit ≥ 90
```

---

## Critical Blocker

> [!CAUTION] The `/admin` route in `App.jsx` must be renamed to `/console` **before** any join. When FastAPI serves the built `dist/`, any browser request to `/admin` will be intercepted by FastAPI's admin API, not served as an SPA page. This will cause a hard 401 or 404 for the admin UI.

---

## Files to Create / Modify (Next Sprint FE3-1)

| File | Action |
|---|---|
| `src/routes.js` | Create — constants for all page paths |
| `src/api/http.js` | Create — requestJson with AbortController + timeouts |
| `src/api/errors.js` | Create — ApiError, NetworkError, FeatureUnavailableError, InvalidResponseError |
| `src/api/normalize.js` | Create — normalizeAnalyzeResponse with defaults |
| `src/api/analyze.js` | Create |
| `src/api/health.js` | Create |
| `src/api/languages.js` | Create |
| `src/api/report.js` | Create |
| `src/api/radar.js` | Create |
| `src/api/admin.js` | Create |
| `src/api/mock.js` | Create — use @contracts/fixtures |
| `src/api/index.js` | Create — analyzeWithFallback |
| `src/api.js` | Modify — re-export from api/index.js |
| `src/context/ServerContext.jsx` | Create |
| `src/context/ToastContext.jsx` | Create |
| `src/context/PrivateModeContext.jsx` | Create |
| `src/lib/storage.js` | Create |
| `src/lib/session.js` | Create |
| `src/lib/fx.js` | Create |
| `src/lib/labels.js` | Create |
| `src/lib/speech.js` | Create |
| `src/lib/complaint.js` | Create |
| `src/lib/entities.js` | Create |
| `src/components/ErrorBoundary.jsx` | Create |
| `src/components/RequireRole.jsx` | Create |
| `src/components/RequireResult.jsx` | Create |
| `src/components/VerdictBadge.jsx` | Create |
| `src/components/FlagList.jsx` | Create |
| `src/pages/GoldenHourPage.jsx` | Create |
| `src/pages/RadarPage.jsx` | Create |
| `src/pages/SettingsPage.jsx` | Create |
| `src/pages/ShareLandingPage.jsx` | Create |
| `src/pages/NotFoundPage.jsx` | Create |
| `src/pages/console/ConsoleLayout.jsx` | Create |
| `src/pages/console/ReportsPage.jsx` | Create |
| `src/pages/console/RulesPage.jsx` | Create |
| `src/pages/console/ModelsPage.jsx` | Create |
| `src/pages/console/RetrainPage.jsx` | Create |
| `src/App.jsx` | Modify — rename /admin → /console; add new routes; add ErrorBoundary |
| `vite.config.js` | Modify — add @contracts alias; regex proxy; loadEnv for VITE_BACKEND_URL |
| `jsconfig.json` | Create / Modify — add @contracts path |
| `src/i18n/` | Create multi-file structure with 11 language JSON files |
| `frontend/scripts/contract-check.mjs` | Create |
| `frontend/scripts/check-routes.mjs` | Create |
| `frontend/scripts/parity.mjs` | Create (after on-device) |
| `public/manifest.webmanifest` | Create |
| `public/sw.js` | Create |
| `package.json` | Add: @hugeicons/react, @hugeicons/core-free-icons, ajv, ajv-formats, @playwright/test, @fontsource/* |
