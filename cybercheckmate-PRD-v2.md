# PRD v2: CyberCheckmate
**Explainable, multilingual scam detection for Indian phone users: check any message or link, understand why it's a scam, and act inside the golden hour.**

> Context for the coding agent: hackathon build (NexAI InnoHack 2026, Track: AI for Digital Safety and Online Scam Detection). A 4-person team reviews and runs everything you generate. Prioritise **working, honest, end-to-end features** over breadth. Use **only free, open-source tools and free-tier APIs**. Follow the build order in Section 14. **Read Section 16 (guardrails) before writing any code; where Section 16 is more specific than an earlier section, Section 16 wins.**

> **Changelog: v2 (22 Oct 2026, 21:00) vs v1**
> - **One consolidated document.** Replaces v1 plus its appended Section 18. Section and FR numbers from v1 are kept so existing prompt files still point to the right places.
> - **New Section 7: current build status** (what exists today, with real metrics: 4,186 training rows, 902 validation rows, 98.0% accuracy, 94 backend tests passing).
> - **New review fixes F1–F6 (Section 7.3), Priority 0:** Indian data expansion incl. digital-arrest and investment scams, URL-only scoring bug, negation-aware rules, fewer keyword chips, frontend fixes, version pinning.
> - **New features:** **FR11 Golden Hour Action Kit**, **FR12 Read-aloud + voice input**, **FR13 On-Device Shield** (offline/private mode for text and links; no OCR or translation offline), **FR14 Multilingual: 10 Indian languages + translate-then-detect with IndicTrans2**, **FR15 Scam Radar page** (opened from an "Open Scam Radar" button).
> - **FR1 contract: additive optional fields** `entities`, `language`, `reputation`, `next_steps_hi`, `next_steps_local`, `overrides_fired`; `component_scores.text` may be `null` for URL-only input. **New endpoints:** `GET /radar`, `GET /model/export` (static files), `GET /languages`.
> - **Dropped from scope (now Future work):** Pay-Safe UPI QR decoder, Conversation X-Ray, cross-lingual embedding model, Family Guardian, Scam Gym.
> - **Hard rules 8–9 added** (translation stays on our server; offline mode must say what it can't do).
> - **New guardrail Section 16.16** for the v2 features.

### Hard rules (never break these)
1. **Never fabricate data or results.** Every number in `reports/`, the README, the UI or slides must come from actually running code. If a step can't be run, leave a clear `TODO`.
2. **Never populate `data/real_world_test/` yourself.** The team fills it by hand with real messages.
3. **The LLM never decides the verdict.** Scores and levels come only from the rules, the text model, the URL/brand check and fusion. An LLM may only rephrase already-detected signals.
4. **No network calls in the analysis path** except the optional LLM explanation call. No WHOIS, DNS, URL expansion, page fetching or online suffix-list downloads at runtime.
5. **No paid services, no database server, no user accounts.** Frontend is React + Vite, built to static files and served by FastAPI. The only stored message data is user-reported messages (FR10) in a local SQLite file; the admin area uses a single `ADMIN_TOKEN`.
6. **Don't silently change the API contract** (FR1). Only the additive changes listed in FR1 are allowed.
7. **Never train on unreviewed user reports.** Only admin-approved reports enter training (FR10).
8. **(NEW) Translation runs on our own server** with a local model (FR14). Never send message text to a third-party translation or LLM API.
9. **(NEW) Offline/private mode must be honest:** it checks pasted text and links only, and the UI states that screenshots and translation need a connection (FR13).

---

## 1. Overview

### 1.1 Problem
India recorded **24 lakh+ cyber fraud complaints in 2025 (about 6,500 a day) and ₹22,495 crore reported lost**. Scams arrive as SMS, WhatsApp messages, links and screenshots: fake KYC, UPI refunds, electricity disconnection, customs/courier, "digital arrest", task jobs, investment groups. Existing tools fall short because they:
1. **Look at the sender, not the message.** Caller-ID and spam filters rarely read the text or check the link.
2. **Give no reason**, so users don't trust or learn from warnings.
3. **Aren't built for Indian scams or Indian languages.**
4. **Stop at the warning.** Victims lose the "golden hour" in which a quick report can freeze the money.

### 1.2 Solution
A mobile-first, installable web app (PWA). The user shares or pastes any suspicious message, link or screenshot and gets:
- a **verdict**: **Checkmate** (likely scam), **Check** (be careful) or **Safe**, with a 0–100 risk score;
- the **reasons**, with evidence (tactics, suspicious words, fake brand links);
- **what to do next**, plus a **Golden Hour Action Kit** that extracts the scammer's details and drafts the complaint;
- all of it in **10 Indian languages**, **read aloud** if wanted, and **checkable offline** for text and links.

### 1.3 Positioning
Competing teams go **wide** (many languages, voice). CyberCheckmate goes **deep and practical**: it explains *why*, reads messages in the user's language through translation, and turns a scam into a ready-to-file complaint. Pitch line: **"Others translate the warning. CyberCheckmate helps stop the money from leaving."**

### 1.4 Branding
Name **CyberCheckmate**; tagline *"Check any message before it checks you."*; brand kit in Section 16.15. The About section and footer state: independent student project, not affiliated with any bank, government body or law enforcement.

---

## 2. Goals and non-goals

### Goals
- G1: End-to-end analysis of text, URL and screenshot input through one API.
- G2: Every verdict explained with evidence.
- G3: Works well on an Android phone over HTTPS, including the share menu.
- G4: Honest evaluation: validation, frozen test set, real-world set, per-language machine-translated set, kept in separate tables.
- G5: Runs on a CPU laptop with no GPU and no paid services.
- G6: Adapts to new scams through reviewed reports, gated retraining and instant rule updates (FR10).
- **G7 (NEW):** Turn a detected scam into action within minutes (FR11).
- **G8 (NEW):** Serve users in 10 Indian languages, including messages written in those languages (FR14).
- **G9 (NEW):** Private/offline checking of text and links on the phone itself (FR13).
- **G10 (NEW):** Accessible to elderly and low-literacy users through read-aloud and voice input (FR12).

### Non-goals
- Live call analysis or call audio capture; native Android/iOS apps; user accounts.
- Storing any message the user did not explicitly report; storing extracted entities from ordinary checks.
- Automatic learning without human review.
- Live WHOIS/DNS/domain reputation lookups.
- **(v2) Dropped:** Pay-Safe UPI QR decoder, Conversation X-Ray, cross-lingual embedding model, Family Guardian, Scam Gym (see Section 17).

---

## 3. Users and user stories
**Users:** everyday Android users in India, including elderly and first-time digital users, students, and speakers of regional languages.

| ID | User story |
|---|---|
| US1 | I share a suspicious SMS and see within seconds whether it's a scam and why. |
| US2 | I share a WhatsApp screenshot and the app reads its text and links. |
| US3 | I paste a link and learn whether it imitates a brand like SBI or Paytm. |
| US4 | I read the explanation in my language. |
| US5 | I get clear next steps and one tap to 1930 / cybercrime.gov.in. |
| US6 | I can correct OCR-extracted text before re-checking. |
| US7 | I can report a result as wrong so the system learns. |
| US8 | As an admin, I review reports, generate variants, retrain, and deploy only if the gate passes. |
| US9 | As an admin, I add a scam phrase and it applies immediately. |
| US10 | As an admin, I see the live model version and can roll back. |
| **US11 (NEW)** | After a scam verdict, I get the scammer's phone/UPI/link/amount extracted and a complaint draft I can copy or save. |
| **US12 (NEW)** | I can listen to the verdict and steps, and dictate a message instead of typing. |
| **US13 (NEW)** | I can check a message written in Tamil (or 9 other Indian languages) and see what the app understood. |
| **US14 (NEW)** | With no internet, or in private mode, I can still check pasted text and links on my phone. |
| **US15 (NEW)** | I can open a Scam Radar page showing which scams are trending. |

---

## 4. System architecture

```
 Phone / laptop (React PWA)                                  FastAPI server (CPU)
 ┌──────────────────────────────────┐                 ┌───────────────────────────────────────────────┐
 │ Login · Dashboard · Check ·      │  POST /analyze  │ 0. Input: text / url / image                  │
 │ Result · History · Radar · Admin │ ──────────────▶ │ 1. OCR (EasyOCR en+hi) for images             │
 │                                  │                 │ 2. Language detection (script ranges)         │
 │ On-Device Shield (Web Worker)    │                 │ 3. Translate to English (IndicTrans2, local)  │
 │  rules + TF-IDF/LR + brand check │                 │ 4. Preprocess: URLs → URLTOKEN, normalise     │
 │  + fusion, from /model/export    │                 │ 5. Detectors:                                 │
 │  (offline: text & links only)    │                 │    a. Tactic rules (original + translation)   │
 │                                  │                 │    b. TF-IDF + Logistic Regression            │
 │ Golden Hour kit (client-side     │                 │    c. URL check + brand lookalike             │
 │  complaint draft, never stored)  │                 │ 6. Fusion + overrides → score, level          │
 │ Read-aloud / voice (Web Speech)  │ ◀────────────── │ 7. Entities (phone, UPI, URL, amount)         │
 │ History: summaries on device     │   FR1 JSON      │ 8. Explanation: templates in 10 languages     │
 └──────────────────────────────────┘                 │    (+ optional LLM rephrasing of signals)     │
                                                      │ Reports (SQLite) → admin review → retrain     │
                                                      │ Radar aggregates from approved reports        │
                                                      └───────────────────────────────────────────────┘
```

---

## 5. Tech stack (all free)
| Layer | Choice |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| ML | scikit-learn (TF-IDF + LogisticRegression), XGBoost (URL model when PhiUSIIL is available), joblib |
| URL/brand | tldextract (offline), rapidfuzz, idna |
| OCR | EasyOCR (en, hi), CPU PyTorch |
| **Translation (NEW)** | **IndicTrans2 distilled Indic→English 200M** (`ai4bharat/indictrans2-indic-en-dist-200M`, gated on Hugging Face) via `transformers` + IndicTransToolkit; fallback `facebook/nllb-200-distilled-600M` |
| Explanations | Templates in 10 languages; optional Gemini/Groq free tier to rephrase signals only |
| Storage | SQLite (reports only); browser localStorage (history summaries only) |
| Frontend | React 19 + Vite + Tailwind v4 + React Router v7, React Bits components, Hugeicons, @fontsource fonts (incl. Noto Sans scripts for Indian languages) |
| **On-device (NEW)** | Web Worker running exported model JSON |
| **Voice (NEW)** | Browser Web Speech API (speechSynthesis, SpeechRecognition) |
| Phone access | Cloudflare quick tunnel or Hugging Face Spaces (HTTPS) |

Secrets in `.env`: `GEMINI_API_KEY`, `GROQ_API_KEY`, `GEMINI_MODEL`, `GROQ_MODEL`, `ADMIN_TOKEN`, **`HF_TOKEN`** (to download the gated translation model; never committed).

---

## 6. Project structure
```
cybercheckmate/
├── backend/
│   ├── main.py, config.py, schemas.py, admin.py
│   ├── pipeline/   preprocess.py rules.py text_model.py url_features.py url_model.py
│   │               brand_check.py domain_utils.py fusion.py explain.py ocr.py analyze.py
│   │               entities.py (NEW)  language.py (NEW)  translate.py (NEW)
│   ├── feedback/   store.py variants.py dataset.py retrain.py gate.py registry.py radar.py (NEW)
│   └── resources/  tactics.json brands.json templates.json next_steps.json
│                   i18n/<lang>.json (NEW: templates + next steps per language)
├── training/       generate_indian_messages.py indian_templates/ make_splits.py prepare_text_data.py
│                   train_text_model.py prepare_url_data.py train_url_model.py evaluate.py
│                   translate_eval_set.py (NEW)
├── scripts/        download_models.py smoke_test.py check_demo_not_in_training.py
│                   export_model_js.py (NEW) parity_test.py (NEW)
├── data/  raw/ processed/ splits/ frozen_test.csv real_world_test/ feedback/ mt_eval/ (NEW)
├── models/ text/v1, v2 … active.json   url/
├── demo/   demo_inputs.json echallan/ multilingual/ (NEW)
├── reports/
├── tests/
└── frontend/
    ├── public/  manifest.webmanifest sw.js icons model/ (NEW: exported on-device model)
    └── src/     api.js history.js i18n/ (NEW: 10 languages) mock.js
                 ondevice/ (NEW: worker, tokenizer, rules, model, brand, fusion)
                 lib/ (motion, speech (NEW), entities-format (NEW), complaint (NEW))
                 components/ components/reactbits/ context/
                 pages/ Login Dashboard Check Result History Radar (NEW) GoldenHour (NEW) Admin
```

---

## 7. Current build status (NEW)

### 7.1 Built and verified (22 Oct)
- Backend: FastAPI `/health`, `/analyze`, `/mock/analyze`; preprocessing, rules, text model, URL features, URL scoring (lexical + brand check; no XGBoost yet because PhiUSIIL wasn't downloaded), fusion, template explanations; **94 tests passing**; responses in 60–150 ms on CPU.
- Text model v1: TF-IDF (word 1–2, char_wb 3–5; 47,000 features) + Logistic Regression, trained on **4,186 rows** (UCI SMS Spam + 409 synthetic Indian messages), template-split.
- **Validation (n = 902): accuracy 98.0%, scam precision 92.9%, scam recall 94.2%, false-positive rate 1.3%.** Frozen test set (n = 893) and real-world set (empty) not yet evaluated.
- Frontend (`CyberCheckmate-Frontend`): Login, Dashboard, Check, Result, History, Admin placeholder; real-backend demo pass on 6 cases (`LAPTOP_DEMO_REPORT.md`); 17 unit tests.

### 7.2 Not yet built
OCR, `/share`, PWA, reporting, admin features, adaptive learning, evaluation suite, React Bits v2 screens, and all v2 features (FR11–FR15).

### 7.3 Review fixes (Priority 0, do before new features)
Found by probing v1 with realistic messages:

| ID | Problem | Fix |
|---|---|---|
| **F1** | "Digital arrest" message scored **Check 53**; task-job scam **Safe 30**; Hinglish electricity scam **Check 40**. The Indian set has only **409 rows vs 5,574 UCI** and no digital-arrest, investment/trading, sextortion or fake-customer-care category. | Add those categories and more task-job/Hinglish variants (≥ 8 templates each); grow the Indian set to ≥ 1,500 rows; weight Indian rows to ≥ 30% of effective training weight; add tactic phrases (video call, money laundering, "safe account", "arrest warrant", "CBI officer", "stay on call"). Retrain **v2**; report v1 vs v2 on the same validation split and on a probe set. |
| **F2** | URL-only input runs the text model on the URL string: the official `https://www.onlinesbi.sbi/` scored **Check 53**. | No words after URL masking → skip the text model: `component_scores.text = null`, fusion `0.85·url + 0.15·rules`. |
| **F3** | "Do not share OTP" triggers the OTP-request tactic. | Negation-aware matching (16.16). |
| **F4** | Safe results show 5 keyword chips. | Max 3 keyword flags; none on green unless strength ≥ 0.6; drop tokens < 3 chars, numbers, stop words. |
| **F5** | Earlier frontend fixes missing (readable flag labels, Hindi next steps, edit box only for screenshots, Technical details panel). Older frontend copy has stray files. | Re-apply in `CyberCheckmate-Frontend`; delete the older copy's `app.js`, root `admin.html`, `share.html`, `sw.js`, `manifest.json`. |
| **F6** | Model pickled with scikit-learn 1.6.0. | Pin the version; record it in `meta.json`; retrain if it differs. |

---

## 8. Functional requirements

### FR1: API
- `POST /analyze` (multipart or JSON): `text`, `url`, `image` (png/jpg/webp ≤ 5 MB), `lang` (UI language code, default `en`).
- `GET /health`: component status (rules, text model, URL model, OCR, **translator**, LLM keys), `model_version`, config summary.
- **(NEW)** `GET /languages`: supported UI/explanation languages and whether the translator is loaded.
- **(NEW)** `GET /radar`: Scam Radar aggregates (FR15).
- **(NEW)** On-device model files served statically from the built frontend at `/model/` (FR13).
- Models load once at startup.

Response contract (fields marked *new* are additive and optional for older clients):
```json
{
  "risk_score": 82,
  "level": "red",
  "input_type": "text",
  "extracted_text": "text used for analysis (OCR output if image)",
  "urls_found": ["http://sbi-kyc-update.xyz/login"],
  "red_flags": [
    {"type": "tactic", "category": "urgency", "evidence": "within 24 hours", "strength": 0.6},
    {"type": "keyword", "category": "text_model", "evidence": "kyc", "strength": 0.83},
    {"type": "url", "category": "brand_lookalike", "evidence": "domain imitates SBI (sbi-kyc-update.xyz)", "strength": 0.95}
  ],
  "component_scores": {"text": 0.91, "url": 0.88, "rules": 0.70},
  "overrides_fired": ["strong_brand_lookalike"],
  "advice_en": "…", "advice_hi": "…",
  "advice_local": "… (in the requested lang, new)",
  "next_steps": ["…"], "next_steps_hi": ["…"], "next_steps_local": ["… (new)"],
  "entities": {"phones": ["98XXXXXX12"], "upi_ids": ["refund.help@ybl"], "urls": ["sbi-kyc-update.xyz"],
               "amounts": ["₹2,499"], "emails": [], "account_like": ["XXXX4821"]},
  "language": {"code": "ta", "script": "Tamil", "translated": true,
               "translation": "Your bank account will be blocked…", "translator": "indictrans2-dist-200M"},
  "reputation": [{"type": "upi_id", "masked": "refund.h***@ybl", "reports": 7}],
  "explanation_source": "template",
  "model_version": "v2",
  "processing_ms": 240,
  "error": null
}
```
**Contract rules:** `level` ∈ {green, amber, red}; `strength` and component scores in 0–1; `component_scores.url` is `null` without a URL and **`component_scores.text` is `null` for URL-only input**; `red_flags` sorted by strength, max 10; inputs combined (OCR text appended; explicit URL added; `input_type` = image > text > url); bad input → HTTP 400 `{"error"}`; model missing → 503; `/analyze` returns JSON only. `entities`, `language.translation` and `reputation` are returned to the requester only, **never stored or logged**. `reputation` is empty unless an entity matches approved reports (FR15).

### FR2: Tactic rule engine
Six categories (authority, fear, urgency, payment/credentials, isolation, reward), weighted phrases 1–20 in `tactics.json`, Hinglish and obfuscations normalised (16.2), per-category max, combo bonus (16.3). **(v2)** Negation-aware matching and phrases in the 10 supported scripts (16.16); rules run on both the original text and its English translation, and the higher score is used.

### FR3: Text classifier
TF-IDF (word 1–2 + char_wb 3–5) → Logistic Regression (balanced); top-token explanations; versioned models (`models/text/vN`). **(v2)** v2 trained with the expanded, weighted Indian data (F1); keyword-flag limits (F4); runs on the English translation for non-Latin-script messages.

### FR4: URL classifier and brand-lookalike check
Lexical URL features; XGBoost when PhiUSIIL is available, otherwise the transparent lexical scorer; brand check with official-domain whitelist, label-boundary token matching, fuzzy matching for tokens ≥ 5 chars with homoglyph normalisation, infrastructure allowlist, shortener flag (details 16.4). URLs and entities always come from the **original** text, never the translation.

### FR5: OCR
EasyOCR (en, hi) loaded once; resize, grayscale, dark-mode inversion; extracted text returned for editing (16.6). **Server only** (not in offline mode). For other Indian scripts, the team may add EasyOCR language packs where supported; otherwise state the limitation.

### FR6: Fusion
With URL: `100 × (0.5·text + 0.35·url + 0.15·rules)`; without URL: `100 × (0.77·text + 0.23·rules)`; **(v2) URL-only (no words): `100 × (0.85·url + 0.15·rules)`**. Overrides in order: strong lookalike → ≥ 80; payment + urgency → +10; official domain and text < 0.3 (or text `null`) → ≤ 30. Levels: < 35 green, 35–70 amber, > 70 red (16.5).

### FR7: Indian message dataset
Templated synthetic scam and legit messages with `template_id`, split by template. **(v2)** Categories: fake_kyc, upi_refund_collect, electricity_disconnection, customs_courier, job_task_scam, lottery_cashback, aadhaar_pan_update, loan_offer, **digital_arrest, investment_trading, sextortion_threat, fake_customer_care**; legit: otp, bank alerts, delivery, utility, college notices, promotional, chat. ≥ 1,500 rows, roughly balanced. No e-challan content (reserved for the adaptation demo). **(v2)** `demo/multilingual/`: 3–5 hand-checked messages per supported language for demos (never used in training).

### FR8: Explanation layer
Templates per flag category and per level, **(v2) in 10 languages** (`backend/resources/i18n/<lang>.json`); optional LLM rephrasing of signals only (English/Hindi), with template fallback; `next_steps` from fixed lists, never the LLM.

### FR9: Frontend PWA
React + Vite app (16.13–16.15): Login, Dashboard, Check, Result, History, **Radar (NEW)**, **Golden Hour (NEW)**, Admin. Mobile-first; verdict always text + icon + colour; English UI with a language selector covering all 10 languages; share target and service worker:
- `manifest.json` with `share_target`:
  ```json
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": { "title": "title", "text": "text", "url": "url",
                "files": [{ "name": "image", "accept": ["image/*"] }] }
  }
  ```
- `/share` (server route) injects the analysis into the built page (16.8). Service worker caches static files and the on-device model only; never API responses or POSTs.
- Footer: the privacy sentence (16.9) and the independent-project line.

### FR10: Adaptive learning (report → review → augment → retrain → gate → deploy)
Purpose: let the system adapt to **new, evolving scam types** without code changes. This is a **human-in-the-loop** loop; nothing trains automatically.

**FR10.1 Reporting (user side)**
- Result screen shows two buttons: **"This is a scam"** and **"This is not a scam"**.
- Directly under the buttons, show the consent line: *"Reporting saves this message so our team can review it and improve detection."*
- Only when the user taps a button is anything stored. Store: the message text (OCR text for images; **the image itself is not stored**), extracted URLs, the user's label, the model's level/score at the time, model version, timestamp. No IP address, device ID or name.
- `POST /report` with `{text, urls, user_label: "scam"|"legit", predicted_level, predicted_score, model_version}` → `{"status": "received"}`.
- Rate limit: max 20 reports per minute per server process (simple in-memory counter) to blunt spam/poisoning.

**FR10.2 Storage**
- SQLite file `data/feedback/feedback.db` (Python's built-in `sqlite3`, no ORM needed).
- Table `reports`: `id, text, urls (JSON), user_label, predicted_level, predicted_score, model_version, status ("pending"|"approved"|"rejected"), category (nullable, set by admin), template_id (set on approval), created_at, reviewed_at`.
- Table `variants`: `id, report_id, text, label, template_id, created_at` (LLM-generated variants of approved reports).
- `data/feedback/` is git-ignored.

**FR10.3 Admin page (`/admin`)**
- Protected by `ADMIN_TOKEN` (`.env`): the page asks for the token once and sends it as the header `X-Admin-Token` on every admin API call. All `/admin/*` endpoints return 401 without a valid token.
- Sections:
  1. **Pending reports:** text, user label, what the model predicted. Buttons: Approve (with editable final label and a category such as "e-challan", "fake KYC"), Reject.
  2. **Generate variants:** for an approved report, a button that asks the LLM for N (default 10, max 20) reworded variants with the same intent. Admin sees the variants and can delete bad ones before they're kept.
  3. **Rule editor:** add a phrase to a tactic category with a weight (1–20). Saved to `tactics.json` and **hot-reloaded immediately** (no restart, no retraining).
  4. **Retrain:** button that starts retraining and shows the gate result (16.12).
  5. **Model versions:** list of versions with date, training-set size and gate metrics; marks the live version; "Roll back" button per version.
- Admin endpoints: `GET /admin/ping` (token check, 16.14), `GET /admin/reports?status=pending`, `POST /admin/reports/{id}/approve`, `POST /admin/reports/{id}/reject`, `POST /admin/reports/{id}/variants`, `DELETE /admin/variants/{id}`, `POST /admin/rules`, `POST /admin/retrain`, `GET /admin/models`, `POST /admin/models/{version}/activate`.

**FR10.4 Variant generation**
- The LLM receives the approved message and its category, and returns JSON `{"variants": ["...", "..."]}`. Instruction: keep the same scam intent and tactics, vary wording, length, sender style and Hinglish/English mix; use fictional names, numbers and domains.
- **Every variant gets the same `template_id` as its source report** (generated on approval as `fb_<report_id>`), so variants never leak across train/validation/test splits.
- If the LLM is unavailable, variants are skipped; the approved report alone can still be used.
- Variants for "legit" reports are allowed too (helps fix false positives).

**FR10.5 Retraining**
- Retraining covers the **text model only** (fast, seconds). The URL model is not retrained from the UI; new phishing URLs reach the system through the rule editor and the brand list.
- Training set = original training data (UCI + curated Indian set) + approved reports + kept variants.
- Retraining runs in a background thread; `GET /admin/retrain/status` returns `idle | running | passed | failed` plus the gate metrics. Only one retrain at a time.
- Saved to `models/text/v{N}/` with `model.joblib` and `meta.json` (`version, created_at, n_train, n_feedback, gate_metrics, parent_version`).

**FR10.6 Gate (deploy only if it passes)** — exact rules in 16.12.

**FR10.7 Hot-swap and rollback**
- `models/text/active.json` stores the live version. On a passed gate, update it and swap the in-memory model **atomically** (load the new model fully, then replace the reference), so requests in flight never see a half-loaded model.
- Rollback = set `active.json` to an earlier version and hot-swap.
- `/health` and every `/analyze` response include `model_version`.

### FR11: Golden Hour Action Kit (NEW)
Shown as a prominent button on red and amber results ("I received this / I already paid: what now?"), opening `/golden-hour` for the current in-memory result.
- **Extracted details** from `entities`: phone numbers (Indian mobile formats, +91 and spaced variants), UPI IDs (`name@handle`), URLs/domains, amounts (₹, Rs, INR), e-mails, account-like numbers (shown masked). Each has a copy button. Detected by `backend/pipeline/entities.py` with tested regexes.
- **Complaint draft** built **in the browser** from the result: date and time, channel (SMS/WhatsApp/other, user-selectable), sender/number, UPI ID, link, amount lost (user-entered, optional), and a short description generated from the detected tactics ("The message pretended to be from SBI, threatened account blocking within 24 hours, and asked me to open a link."). Editable textarea; buttons **Copy**, **Share** (Web Share API) and **Save as PDF** (print stylesheet).
- **Steps by situation** (in the user's language):
  - *Not paid yet:* don't reply or click; block and report the sender; report at cybercrime.gov.in.
  - *Already paid:* **call 1930 immediately**; call your bank's official number to block the card/UPI and request a freeze; keep screenshots; don't delete the chat; file at cybercrime.gov.in with the draft.
- Buttons: Call 1930 (`tel:1930`), Open cybercrime.gov.in.
- **Privacy:** nothing in this screen is stored or sent anywhere unless the user shares it.

### FR12: Read-aloud and voice input (NEW)
- **Read-aloud:** a speaker button on Result and Golden Hour reads the verdict, top reasons and next steps using `speechSynthesis`, choosing a voice for the selected language (`lang` BCP-47 code) when the device has one; otherwise falls back to English and shows "No voice for this language on this device". Stop button; respects screen readers (no auto-play).
- **Voice input:** a mic button in the Check page dictates into the message box using `SpeechRecognition`/`webkitSpeechRecognition` where available (Chrome/Android), in the selected language. Hidden when unsupported. Shows a note that the browser's speech service may process audio (browser-dependent); dictation only starts on an explicit tap.

### FR13: On-Device Shield (NEW)
- `scripts/export_model_js.py` exports the **active** text model to `frontend/public/model/`: word and char vocabularies with idf, LR coefficients and intercept, preprocessing settings (lowercase, n-gram ranges, sublinear tf, norm), plus `tactics.json`, `brands.json`, fusion weights and thresholds, and a `manifest.json` with version and checksums. Target ≤ 1.5 MB raw.
- `frontend/src/ondevice/` re-implements preprocessing, URL extraction, rules (with negation), TF-IDF + LR, brand check and fusion in a **Web Worker**, matching the Python code.
- **Modes:** "Private mode: check on this phone" toggle (remembered per device), and automatic use when the server is unreachable. Results show the label **"Checked on this device"** and `explanation_source: "on-device"`.
- **Not available offline:** screenshots (OCR), translation, LLM explanations, reputation. The UI says so; explanations use the on-device template bundle for the selected language.
- `scripts/parity_test.py` runs ≥ 200 validation messages through Python and the JS implementation (via Node) and requires identical levels on ≥ 98% and score difference ≤ 2 points on ≥ 95%. Report actual numbers.
- The service worker caches the model files so private mode works in airplane mode after the first visit.

### FR14: Multilingual: 10 languages + translate-then-detect (NEW)
**Languages:** English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi (plus Odia if the template translation is ready; label it "beta"). UI strings, explanation templates and next steps exist for each (machine-translated once, labelled "translation not yet reviewed" until a speaker checks them).

**Translate-then-detect pipeline (server):**
1. Detect script from Unicode ranges (Devanagari → hi/mr, Bengali, Gurmukhi → pa, Gujarati, Tamil, Telugu, Kannada, Malayalam, Odia); Latin script → no translation.
2. Translate to English locally with IndicTrans2 (Indic→En, distilled 200M), loaded at startup on CPU, max 512 tokens, timeout 8 s; fallback NLLB-200 distilled 600M.
3. Rules on original + translation; text model and keyword flags on the translation; URLs/entities from the original.
4. Advice and next steps in the user's selected language (`lang`), defaulting to the detected language.
5. Response `language` block (FR1) and a collapsible "What we understood" box in the UI showing the translation.
- Translation failure → `translated: false`; detection uses rules on the original only; UI warns "Translation unavailable, checked with limited accuracy".

### FR15: Scam Radar page (NEW)
- Opened from an **"Open Scam Radar"** button on the Dashboard (and a nav item).
- `GET /radar` returns aggregates only, built from **admin-approved** reports: top scam categories this week with counts and trend vs last week, top reported domains/UPI IDs/phone numbers (masked), and total reports reviewed. Entities are stored as salted SHA-256 hashes plus masked display forms; raw entities are not stored.
- `reputation` in `/analyze` (optional): when an extracted entity's hash matches reported entities, show "Reported N times by other users" on the Result page.
- If there are fewer than 10 approved reports, the page shows a **demo dataset clearly labelled "Demo data"** (seeded from synthetic reports) and the real counts beside it.

---

## 9. Non-functional requirements
| ID | Requirement |
|---|---|
| NFR1 | Text/URL analysis < 2 s on CPU (excluding LLM); image < 6 s; **translated messages < 4 s**. |
| NFR2 | Fully works without an LLM (templates). |
| NFR3 | No live network lookups for URL analysis. |
| NFR4 | Privacy: no message text, images, translations, entities or results written to disk or logs, except user-reported messages (FR10, text only). |
| NFR5 | Phone access over HTTPS (tunnel or Hugging Face Spaces). |
| NFR6 | Runs identically on both team laptops (pinned requirements, Windows instructions). |
| NFR7 | All datasets and models available offline once downloaded. |
| NFR8 | `/analyze` keeps working during retraining. |
| **NFR9 (NEW)** | On-device mode: model download ≤ 1.5 MB raw; check completes < 500 ms on a mid-range phone; works in airplane mode after first visit. |
| **NFR10 (NEW)** | Startup loads the translator once; if it fails to load, the server still starts and `/health` reports it. |

---

## 10. Data sources
| Dataset / model | Use | Notes |
|---|---|---|
| UCI SMS Spam Collection | Text model | Old, non-Indian, mostly promotional spam |
| Synthetic Indian set (FR7) | Text model | Clearly labelled synthetic; split by template |
| PhiUSIIL Phishing URL Dataset | URL model | When downloaded; URL column only (16.1) |
| PhishTank/OpenPhish snapshot | Recent phishing test | Offline snapshot, never trained on |
| Real-world test set | Honest benchmark | Team-collected, never trained on |
| **IndicTrans2 Indic→En dist-200M (NEW)** | Translation | Gated on Hugging Face (accept terms, `HF_TOKEN`); MIT licence per its card (verify) |
| **IndicTrans2 En→Indic dist-200M (NEW)** | Building the machine-translated evaluation set | Evaluation only |
| **NLLB-200 distilled 600M (NEW)** | Translation fallback | Non-commercial licence; demo use |

---

## 11. Evaluation requirements (`training/evaluate.py`)
1. Text model on the frozen test set and validation set: precision, recall, F1, confusion matrix, by source.
2. Real-world set (if it has rows), reported separately.
3. Baseline: UCI-only model vs the active model on Indian scam rows.
4. False-positive check on legit Indian and real-world messages (full pipeline).
5. URL model (if trained) on held-out and recent-phishing sets.
6. End-to-end fused levels on the real-world set.
7. **(NEW) v1 vs v2** on the same validation split and on the probe set (digital arrest, task job, Hinglish, URL-only official link, OTP negation).
8. **(NEW) Machine-translated multilingual set:** Indian validation messages translated into Tamil, Bengali, Telugu and Marathi with En→Indic IndicTrans2, then run through translate-then-detect; recall and false-positive rate per language, labelled **"machine-translated test set"**.
9. **(NEW) On-device parity** numbers from `scripts/parity_test.py`.
10. `reports/metrics_summary.md`: separate tables for each of the above; every number from `reports/metrics.json`.

---

## 12. Known drawbacks and mitigations
| # | Drawback | Mitigation |
|---|---|---|
| 1 | Common idea in the room | Golden Hour kit, translate-then-detect in 10 languages, on-device mode, explainability, brand-lookalike check |
| 2 | Synthetic data inflates metrics | Template split, frozen test set, real-world set, probe set, honest labelling |
| 3 | Indian scams under-represented (v1) | F1 expansion and weighting; v1 vs v2 comparison |
| 4 | TF-IDF fooled by misspellings/Hinglish | Char n-grams, normalisation, Hinglish rules |
| 5 | Lexical URL features miss clean domains | Brand check, whitelist, shortener flag |
| 6 | OCR errors | Preprocessing + editable text |
| 7 | False positives on bank/OTP messages | Legit Indian data, negation-aware rules (F3), whitelist, FP metric |
| 8 | LLM hallucination | LLM only rephrases signals; templates fallback |
| 9 | Privacy concerns | No storage of checks; on-device mode; local translation; hashed radar entities |
| 10 | Translation softens scam wording | Rules also run on the original script; show the translation; per-language MT evaluation |
| 11 | Machine-translated UI may read awkwardly | Labelled until a speaker reviews; Hindi reviewed by the team |
| 12 | On-device JS may drift from Python | Parity test with thresholds; versioned export |
| 13 | Voice support varies by device | Feature detection; fallbacks; never auto-play |
| 14 | Data poisoning via reports | Human review, rate limit, gate (FR10) |
| 15 | Large model downloads (OCR, translator) | Download tonight on good Wi-Fi; `scripts/download_models.py`; load at startup |

---

## 13. Acceptance criteria
- [ ] `/analyze` returns the FR1 contract for text, URL and image inputs
- [ ] Fake KYC + lookalike link → red; bank OTP → green with **no** OTP-request flag (F3)
- [ ] Official bank URL alone → green; `component_scores.text` is `null` (F2)
- [ ] Digital-arrest and task-job probe messages → red or amber ≥ 60 with v2 (F1); v1 vs v2 table produced
- [ ] Screenshot with a scam link → OCR text shown, URL flagged
- [ ] Without an LLM key, explanations still appear in all 10 languages
- [ ] A Tamil (and one other language) scam message → detected language shown, translation shown, verdict red/amber, advice in that language
- [ ] Golden Hour: entities extracted; complaint draft editable; Copy/Share/PDF work; nothing stored
- [ ] Read-aloud works in English and Hindi in Chrome; mic dictation works on Android Chrome; both hidden when unsupported
- [ ] Airplane mode: private-mode check of a pasted message works and says "Checked on this device"; screenshot/translation show the offline notice; parity numbers reported
- [ ] Scam Radar opens from the Dashboard button; demo data labelled; aggregates only
- [ ] PWA installs on Android over HTTPS and appears in the share menu; shared SMS/WhatsApp/screenshot analysed
- [ ] Reports stored as pending; admin review, variants, rule editor, gated retrain, rollback work; `/analyze` responds during retraining
- [ ] `evaluate.py` produces every report in Section 11

---

## 14. Build order (night of 22–23 Oct)
| Window | Work | Priority |
|---|---|---|
| 21:00–22:30 | F1–F4 + retrain v2 (backend); F5 (frontend); teammate accepts IndicTrans2 terms + creates `HF_TOKEN`, downloads models | P0 |
| 22:30–00:30 | Phone essentials: OCR, `/share`, PWA, HTTPS | P0 |
| 00:30–02:00 | FR11 Golden Hour (entities + client-side draft) and FR12 read-aloud/voice | P1 |
| 02:00–04:00 | FR14 translate-then-detect + 10-language templates | P1 |
| 04:00–05:30 | FR13 On-Device Shield + parity test | P1 |
| 05:30–06:30 | FR15 Scam Radar page; reporting (FR10.1) if not done | P2 |
| 06:30–07:30 | Evaluation reports (Section 11), real-world SMS set, poster | P1 |
| 07:30–09:00 | Freeze, smoke tests, rehearsal, backup video | P0 |
If behind schedule: drop FR15 first, then the admin retraining parts of FR10 (keep reporting + rule editor), then FR13. Never drop P0 items.

### Demo script (main round)
1. Fake SBI KYC SMS shared from the phone → **Checkmate**, reasons, Hindi toggle, **read aloud**.
2. Bank OTP → **Safe** with no false OTP flag.
3. **Tamil** scam message → "Detected: Tamil", translation shown, Checkmate, advice in Tamil.
4. **Golden Hour**: tap "I already paid", extracted UPI ID/phone, complaint draft → Save as PDF; Call 1930 button.
5. **Airplane mode** → paste a scam message → "Checked on this device".
6. **Open Scam Radar** → trending scams (demo data labelled).
7. Metrics slide: v1 vs v2, frozen test, per-language MT results, parity numbers.
8. If built: adaptation demo (e-challan before/after retrain).

---

## 15. Glossary
| Term | Meaning |
|---|---|
| Scam / phishing | Label 1 (messages / URLs) |
| Legit | Label 0 |
| Registrable domain | e.g. `onlinesbi.sbi` in `retail.onlinesbi.sbi`, computed offline |
| Template split | All messages from one template stay in one split |
| Flagged | Level amber or red |
| Signals | Contents of `red_flags` |
| **Translate-then-detect (NEW)** | Translate a non-Latin-script message to English locally, then run the detectors |
| **On-device / private mode (NEW)** | Detection running in the browser from exported model files |
| **Golden hour (NEW)** | The first hours after a fraudulent payment, when reporting to 1930 gives the best chance of freezing funds |
| **Entities (NEW)** | Phone numbers, UPI IDs, URLs, amounts, e-mails, account-like numbers extracted from a message |

---

## 16. Clarifications and guardrails (read before coding)
Sections 16.1–16.15 are carried over unchanged from v1 (16.13's colour note is superseded by 16.15). **16.16 is new.**

### 16.1 Data and labels
- **UCI SMS Spam:** labels are `ham` / `spam`. Map `spam → scam (1)`, `ham → legit (0)`. Known limitation: much UCI "spam" is promotional, not fraud. Accept this, but also add **legitimate Indian promotional messages** (store offers, telecom recharge ads) to the Indian legit set so the model doesn't flag every ad as a scam.
- **PhiUSIIL:** **do not assume the label encoding.** Read the dataset's documentation and verify which value means phishing (in some versions `1 = legitimate`). Print the label counts and a few example URLs per label before training, and set an explicit `PHISHING_LABEL` constant.
- **PhiUSIIL ships many precomputed columns**, some derived from page content (HTML, title, images). **Do not train on those columns.** At inference we only have the URL string, so use **only the URL column** and compute every feature with our own `url_model.extract_features(url)` function. The exact same function must be used in training and inference.
- **PhiUSIIL bias:** its legitimate URLs are often short homepages while phishing URLs have long paths, so the model may learn "long URL = phishing". Mitigate with the official-domain whitelist (FR4), and add a few hundred **legitimate deep links** (long URLs on official brand domains) to training, taken from the `brands.json` domains. Report this limitation in the README.
- **PhishTank / OpenPhish:** only phishing URLs, no legit ones. Download a snapshot **once** to `data/raw/`; do not write a scraper. If PhishTank needs an API key the team doesn't have, skip it and use the OpenPhish community feed only.
- **Never use test data to choose thresholds or weights.** Split train / validation / test. Tune fusion weights and the green/amber/red thresholds on the validation split only.
- **Fit the TF-IDF vectorizer on training data only.**
- **Class imbalance:** keep `class_weight="balanced"` (LogReg) and set `scale_pos_weight` (XGBoost) from the training label ratio.
- **Synthetic Indian messages:** use fictional phone numbers (e.g. `98XXXXXX01` patterns) and fictional scam domains. Each message needs a `template_id`; split with `GroupShuffleSplit` on `template_id`. Write the generator so the team can easily edit and extend the templates by hand.
- **Real-world test set:** see Hard rule 2. Training scripts must **never read** `data/real_world_test/`; only `evaluate.py` may.

### 16.2 Text preprocessing
- **Extract URLs first**, then replace each URL in the text with the token `URLTOKEN` before feeding the text model and the rule engine. URLs go to the URL model separately. (This stops the text model memorising domains and stops text normalisation from corrupting URLs.)
- **Two versions of the text:** the `original` (used for evidence snippets shown to the user) and the `normalised` (used for matching). Evidence shown in `red_flags` must be taken from the original text.
- Normalisation steps (rules only): lowercase; collapse whitespace; remove dots/spaces **between single letters** (`k.y.c`, `k y c` → `kyc`); map `0→o`, `1→i/l`, `@→a`, `$→s` **only inside tokens that mix letters and digits** (so OTPs, amounts and dates are untouched).
- Hinglish in Latin script and Hindi in Devanagari must both be supported in `tactics.json` (include phrases in both scripts, e.g. "turant" and "तुरंत").
- All text files (`tactics.json`, `templates.json`, `brands.json`, CSVs) must be read and written with `encoding="utf-8"` explicitly. **Windows defaults to a different encoding and Hindi text will break otherwise.**

### 16.3 Rule engine scoring (exact)
- Each phrase in `tactics.json` has a weight from 1 to 20.
- For each category, take only the **highest-weight matched phrase** (repeating the same scary word must not inflate the score).
- `rule_score = min(1.0, sum(category_max_weights) / 50)`.
- If 3 or more distinct categories matched, add `+0.15` (still capped at 1.0).
- A flag's `strength` = phrase weight / 20.

### 16.4 URL model and brand check (exact)
- `url_score` for a message = the **maximum** phishing probability across all URLs found (after whitelist and lookalike adjustments). If no URL, `url_score = null`.
- **Registrable domain:** use `tldextract`, but **configure it offline**: `tldextract.TLDExtract(suffix_list_urls=())` (or point it at a bundled copy of the public suffix list). By default it downloads the suffix list on first run, which breaks Hard rule 4.
- **Whitelist match:** exact match of the registrable domain, or a subdomain of it (e.g. `retail.onlinesbi.sbi` matches `onlinesbi.sbi`). Then cap the URL score at 0.1.
- **Lookalike matching:**
  - Brand tokens must match on **label boundaries** (split the host by `.` and `-`), not raw substrings. E.g. `axis` must not match inside an unrelated word.
  - Fuzzy (edit-distance) matching only for brand labels of **5+ characters** (e.g. `hdfcbank`, `paytm`, `phonepe`, `flipkart`). Short brands such as `sbi` or `npci` use exact-token matching only, because fuzzy matching on short strings causes false positives.
  - Compare against the registrable domain's main label (e.g. `hdfcbamk` vs `hdfcbank`), after homoglyph normalisation.
  - **"Strong" lookalike** (triggers the ≥ 80 override) = similarity ≥ 90, **or** an exact brand token appears in the subdomain/path-free host of a non-official registrable domain (e.g. `sbi.kyc-update.xyz`).
  - **Known legitimate infrastructure must not be flagged as brand lookalikes**: e.g. `amazonaws.com`, `googleusercontent.com`, `cloudfront.net` contain brand names but aren't impersonation. Keep an `infrastructure_allowlist` in `brands.json`.
- **`brands.json` domains must be human-verified.** Do not trust your own memory for official domains. Add a top-level field `"verified": false` and a README note telling the team to check every domain on the brand's real website before the demo.
- **Shorteners and free-form hosts** (`bit.ly`, `tinyurl.com`, `forms.gle`, `docs.google.com/forms`, `wa.me`, `t.me`): flag as "link hides the real destination" with strength 0.5, do **not** expand them, and don't treat them as phishing by themselves.

### 16.5 Fusion (exact)
- `text_score` = text model probability of scam; `rules_score` from 16.3; `url_score` from 16.4.
- With a URL: `score = 100 × (0.5·text + 0.35·url + 0.15·rules)`.
- Without a URL: `score = 100 × (0.77·text + 0.23·rules)` (same 0.5 : 0.15 ratio, re-normalised).
- Then apply overrides **in this order**: (1) strong brand lookalike → `max(score, 80)`; (2) payment/credential **and** urgency both matched → `+10`; (3) whitelisted official domain **and** `text_score < 0.3` → `min(score, 30)`. Clamp to 0–100 and round to an integer.
- Levels: `score < 35` green; `35 ≤ score ≤ 70` amber; `score > 70` red.
- These are starting values; the team may retune them on the validation split. Keep them all in `config.py`.

### 16.6 OCR
- **EasyOCR downloads its model weights on first use.** Add a `scripts/download_models.py` that triggers the download once, and run it during setup (while the network works), so the demo works offline.
- EasyOCR needs PyTorch. Install the **CPU-only** PyTorch wheel (much smaller and faster to install). Document the exact command in the README.
- Use **Python 3.11** (best compatibility for PyTorch/EasyOCR on Windows).
- Resize images so the longer side is at most 1600 px before OCR, for speed.
- Dark-mode check: if mean grayscale brightness < 100, invert the image.
- Load the EasyOCR reader **once at startup** (`gpu=False`).
- If OCR finds no text, return the HTTP 400 error from FR1.

### 16.7 LLM explanation
- **Do not hardcode model names.** Read `GEMINI_MODEL` and `GROQ_MODEL` from `.env`, with defaults in `.env.example`. Model names change often; the team will check the current free-tier models when creating keys.
- Use the current official Python SDK for each provider; if unsure, call the provider's REST API with `httpx` instead.
- Ask the LLM for **JSON output** `{"advice_en": "...", "advice_hi": "..."}`. Validate it; if parsing fails or a field is missing, use the template fallback.
- Send the LLM **only**: the score, level, and the `red_flags` list (categories + short evidence snippets). **Do not send the full message text** (privacy, see 16.9).
- Timeout 5 seconds per provider. If both fail or no keys are set, use templates silently and set `explanation_source: "template"`.
- `next_steps` comes from a fixed list chosen by flag categories, **never from the LLM**.

### 16.8 PWA, Share Target and HTTPS
- `/share` is a **server-side FastAPI route** that accepts the multipart POST from the share target, runs the same pipeline as `/analyze`, and returns the built `frontend/dist/index.html` with the result injected as `<script>window.__CC_SHARE__ = {...}</script>` (JSON escaped for a script context, e.g. `<` → `\u003c`). The React app reads it on load and shows the result. Nothing is stored. No service-worker fetch interception is needed.
- The manifest's `start_url`, `scope` and share-target `action` must be **relative to the same origin** (e.g. `/`, `/share`), never a hardcoded hostname.
- When an SMS or WhatsApp message is shared, Android usually puts everything (including links) in the `text` field and leaves `url` empty. **Always concatenate `title`, `text` and `url`, then extract URLs from the combined string.**
- The service worker caches **static files only**. It must never cache `/analyze` or `/share` responses or any POST request.
- Frontend is **React + Vite** (16.13). In production FastAPI serves `frontend/dist/` at the same origin, so no CORS setup is needed. In development, Vite's dev server proxies API calls to FastAPI.
- **The Cloudflare quick tunnel URL changes every time it restarts.** An installed PWA is tied to its origin, so a new URL means re-installing on the phone. Document this. For the final demo, prefer a **stable URL**: deploy to Hugging Face Spaces (Docker or FastAPI template, CPU) early and install the PWA from there.
- UI labels must be bilingual (English + Hindi) where shown to users.

### 16.9 Privacy wording (must be accurate)
- We do not store messages, but free-tier LLM providers may log or use the data they receive. Hence 16.7 sends only signals and short evidence snippets, never full messages.
- The footer text must say exactly: **"We don't store your messages unless you report them. Only the detected warning signs are sent to an AI service to write the explanation."** Do not claim "nothing leaves your device".
- Exception for FR10 variant generation: the admin's approved report text **is** sent to the LLM to create variants. This happens only on the admin page, only for messages users chose to report. Strip phone numbers, email addresses and digit sequences of 6+ digits (replace with placeholders) before sending.
- Do not log request bodies, extracted text or images. FastAPI/Uvicorn access logs (method, path, status, time) are fine.

### 16.10 Evaluation definitions
- For end-to-end evaluation, treat **amber or red as "flagged"** and green as "not flagged".
- **Recall** = scam messages flagged / all scam messages. **False-positive rate** = legit messages flagged / all legit messages.
- Report the synthetic test split and the real-world set in **separate tables**. Never merge them into one number.
- If `data/real_world_test/` is empty, `evaluate.py` prints a clear notice and skips that section; it must not crash and must not substitute synthetic data.

### 16.11 Startup and robustness
- The backend must start even if a model file is missing: `/health` reports which components are missing, and `/analyze` returns HTTP 503 with a clear message telling the user to run the training scripts.
- Provide one command per step in the README, in order: create venv → install CPU PyTorch → install requirements → download OCR models → prepare data → train text model → train URL model → evaluate → run server → start tunnel.
- Provide a `scripts/smoke_test.py` that calls `/analyze` with the saved demo inputs in `demo/` and prints the level for each. The team runs it before every demo.
- Windows is the primary OS: use `pathlib`, no shell-specific commands in Python, and give Windows commands (PowerShell) first in the README.

### 16.12 Adaptive learning guardrails (FR10)
- **Frozen gate set:** at first training, save the test split to `data/frozen_test.csv`. It **never changes** and is **never used for training**, including after feedback. Approved reports and variants go only into training (and a separate feedback validation split, below).
- **Feedback validation split:** when approving reports, hold out ~20% of feedback `template_id` groups (with their variants) into `data/feedback_val.csv`. This measures whether the new model actually learned the new scam types.
- **Gate rule (all must pass):**
  1. On the frozen set: recall drops by **no more than 0.02** and false-positive rate rises by **no more than 0.02** compared with the live model.
  2. On the feedback validation split (if it has at least 5 messages): recall is **not lower** than the live model's.
  If any check fails, the new version is saved but **not activated**, and the admin sees which check failed. The admin may still activate it manually, with a warning.
- **Minimum data:** retraining is disabled until at least **3 approved reports** exist since the last version (prevents retraining on a single example).
- **Variant cap:** at most 20 variants per report and at most **30% of the total training set** from feedback + variants (if over the cap, randomly sample variants down). Stops a burst of reports from dominating the model.
- **Reports from the same text** (exact duplicate after normalisation) are merged; the count is shown on the admin page.
- **The URL model, fusion weights and thresholds are not changed by retraining.** Only the text model and `tactics.json` adapt.
- `tactics.json` edits from the admin page are validated (category exists, weight 1–20, phrase not empty, no duplicates) and a backup copy is written before each save.
- **Evaluation reports must state how many training examples came from feedback and variants**, and the real-world set remains the honest benchmark.

### 16.13 Frontend (React + Vite + React Bits)
- **Stack:** React + Vite, **JavaScript** (not TypeScript), Tailwind CSS. React Bits components are copied into `frontend/src/components/reactbits/` (JS + Tailwind variants) with their required dependencies only. Credit React Bits in the README.
- **Two delivery parts:** **Part 1 (laptop)**: check screen + result screen running in the browser against `/analyze` via the Vite dev proxy. **Part 2 (phone)**: production build served by FastAPI, mobile layout, PWA manifest + share target, service worker, HTTPS. Part 2 starts only when Part 1 works.
- **Theme:** chess. Verdict names: red = **"Checkmate"** (scam), amber = **"Check"** (suspicious), green = **"Safe"**. Dark board-like palette; colours must still read clearly as red/amber/green, with text labels (never colour alone).
- **Performance:** at most one animated/WebGL background, on the check screen only; the result screen stays light. Respect `prefers-reduced-motion` (disable animations). The app must stay usable on a low-end Android phone.
- **Mock mode:** `VITE_USE_MOCK=true` makes the app use `AnalyzeResponse.example()`-shaped mock data, so the UI can be built before the backend is ready.
- **Language:** English UI with a toggle to Hindi for labels, advice and next steps.
- **Errors:** show the API's `{"error"}` message in plain language; never a blank screen.
- **Admin page:** simple and functional (tables and buttons), built in the adaptive-learning phase.
- (v2 note) The colour guidance above is superseded by the palette in 16.15.

### 16.14 Login page, on-device history and admin sign-in (approved decisions)
- **Login page has two cards:** **"Continue as User"** (no account, no password; just enters the app) and **"Admin Login"** (asks for the `ADMIN_TOKEN`). There are **no user accounts** (Hard rule 5); the user card is navigation, not authentication, and must never be described as a security feature.
- **Admin sign-in:** the token is kept only in `sessionStorage` (cleared when the tab closes), never in source code, `localStorage` or URLs. It is verified with `GET /admin/ping` (returns 200 with a valid `X-Admin-Token`, 401 otherwise, 503 if `ADMIN_TOKEN` is unset). Until the admin backend exists, the Admin card shows "Admin tools aren't available yet" when `/admin/ping` returns 404. Admin screens are never shown to anyone without a verified token, and every admin API call still sends the token (the backend enforces it).
- **On-device event history (dashboard and history page):** after each successful analysis, the frontend saves a **summary only** in the browser's `localStorage` under the key `cc_history_v1`: `{id, created_at, level, risk_score, input_type, flag_categories, explanation_source, model_version, reported}`. **Never** store the message text, extracted text, URLs, evidence snippets or images. Keep at most 200 entries (drop the oldest). Wrap every read/write in try/catch; the app must work when storage is unavailable. Provide a visible **"Clear history"** button. History is per device and per browser; it is not sent to the server.
- `reported` becomes `true` only after the user submits a report through `/report` (FR10.1); the history view labels such entries "Reported" so a saved report is distinguishable from an ordinary check.
- **Visual identity:** follow the team's approved frontend design. Palette: deep forest green `#051F20`, `#0B2B26`, `#163832`, `#235347`; mint `#8EB698`; pale mint `#DAF1DE`; optional muted plum and warm cream for secondary surfaces. Risk levels must still read clearly as red / amber / green with text labels and icons. This palette replaces the earlier "dark board-like" colour note in 16.13; the chess wording (Checkmate / Check / Safe) stays.

### 16.15 Brand and component kit (approved)
- **Palette tokens (team-confirmed, same colours as 16.14):** `cc-black #051F20` (app background), `cc-deep #0B2B26` (header, cards), `cc-pine #163832` (inner cards, inputs, borders), `cc-juniper #235347` (primary buttons, active nav), `cc-glow #8EB698` (secondary text, glows, focus rings), `cc-mint #DAF1DE` (main text, icons). Risk colours stay red `#EF4444`, amber `#F59E0B`, green `#22C55E`, always with a text label and icon.
- **Logo:** use the brand-kit image files in `frontend/src/assets/brand/` (primary vertical, horizontal, compact, app icon 192/512, favicon 16/32, avatar). Never redraw or re-typeset the logo.
- **Fonts (npm @fontsource, offline):** Chakra Petch for headings, Inter for body, Noto Sans Devanagari for Hindi.
- **Icons:** Hugeicons (`@hugeicons/react`, `@hugeicons/core-free-icons`).
- **React Bits components (JS + Tailwind variants via `npx shadcn@latest add @react-bits/<Name>-JS-TW`):** Depth Text (login name), Radar (login background, WebGL2), Border Glow (role cards), Split Flap Text (dashboard board), Magic Bento (dashboard tiles), Animated List (activity/history), Rubber Segment (check modes, filters), Lattice Loader (analyzing, retrain), Slosh Gauge (risk score), Electric Border (red results only, WebGL2), Hold Button (clear history, force-activate), Swipe Toast (feedback), Status Mark (retrain steps), Fade/Animated Content (entrances), plus the existing Dot Grid, Count Up, Decrypted Text, Spotlight Card. **Not used:** Pill Nav (requires React Router v6), Dock, Grid Scan, cursor effects.
- **Performance budget (mandatory):** at most one WebGL2 effect mounted at a time; none when reduced motion is on, `saveData` is on, WebGL2 is unavailable, or the device is low-tier (small screen with ≤ 4 CPU cores); animations pause when the tab is hidden; canvas DPR capped at 1.5; `/admin` and all WebGL components lazy-loaded; initial JS target ≤ 250 KB gzip.
- React Bits licence: MIT + Commons Clause; credit it in the README.

### 16.16 v2 feature guardrails (NEW)
**Fusion and flags in v2 (F2, F4; extends 16.5):** if the input has no words after URL masking (only URLs), skip the text model, set `component_scores.text = null`, and use `score = 100 × (0.85·url + 0.15·rules)`; the official-domain override applies when `text` is `null` or < 0.3. Keyword flags: at most 3; none on green results unless strength ≥ 0.6; drop tokens shorter than 3 characters, pure numbers and stop words.

**Negation-aware rules (F3):** skip a `payment_credentials` (and `isolation`) match when one of `do not`, `don't`, `dont`, `never`, `not`, `no need to`, `mat`, `na`, `नहीं`, `मत`, `ना` appears within the 3 tokens before the phrase. Unit-test "Do not share this OTP", "never share your PIN", "OTP mat batana" (no match) and "share the OTP now" (match).

**Entities (FR11):**
- Phones: `(?:\+91[\s-]?|0)?[6-9]\d{9}` plus spaced/hyphenated forms and masked forms like `98XXXXXX12`; exclude numbers that are part of a detected OTP sentence ("is your OTP").
- UPI IDs: `[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}`, excluding e-mail addresses (those whose handle part contains a dot-TLD).
- Amounts: `(?:₹|rs\.?|inr)\s?\d[\d,]*(?:\.\d{1,2})?` (case-insensitive).
- Account-like: 9–18 digit runs or masked `XX…1234`; always returned masked except the last 4 digits.
- Deduplicate; max 5 per type. Never log or store. Tests for each pattern including false-positive cases (dates, OTPs, prices in promotions).

**Complaint draft (FR11):** generated by a pure function `buildComplaint(result, userInputs, lang)` in `src/lib/complaint.js`; unit-tested; no network calls; print stylesheet hides navigation and shows only the draft, date and CyberCheckmate footer line "Prepared with CyberCheckmate. Verify details before submitting."

**Translation (FR14):**
- Load the model and tokenizer once in a background thread at startup; `/health` shows `translator: loading | ready | failed`. Requests before it's ready use rules on the original text and say so.
- Use the model's required preprocessing (IndicTransToolkit / language tags such as `tam_Taml` → `eng_Latn`). Batch long text by sentence; cap at 512 tokens per chunk and 1,500 characters total.
- Never translate Latin-script text (English/Hinglish). Mixed-script messages: translate only the non-Latin segments and keep the rest.
- Map script → IndicTrans2 language tag in one table in `language.py`; Devanagari defaults to Hindi unless Marathi-specific characters/words are detected (best effort; state the limit).
- Translations are returned in the response only; not logged, cached on disk or stored.

**10-language templates (FR8/FR14):** one JSON file per language with the same keys as English; a test fails if any key is missing. Machine-translated files carry `"reviewed": false` until a speaker sets it to true; the UI shows a small "translation not yet reviewed" note for unreviewed languages. Fonts: Noto Sans for each script via @fontsource.

**On-device (FR13):**
- Tokenisation must match scikit-learn exactly: lowercase, default `token_pattern` `(?u)\b\w\w+\b` for words, `char_wb` padding with spaces, `sublinear_tf` (1 + log tf), idf from the export, L2 normalisation per vectorizer then concatenation order identical to the FeatureUnion.
- The Worker loads model JSON lazily and keeps it in memory; checks never touch the network.
- Private-mode toggle stored in localStorage as a boolean only.
- Version mismatch between the exported model and the server's active model is shown in Technical details.

**Read-aloud / voice (FR12):** feature-detect `window.speechSynthesis` and `window.SpeechRecognition || window.webkitSpeechRecognition`; never auto-start; stop speech on route change; dictation result goes into the textarea for the user to review before Check.

**Scam Radar (FR15):** entity hashes use a server-side secret salt from `.env` (`RADAR_SALT`); aggregates exclude any bucket with fewer than 2 reports; demo data lives in `data/radar_demo.json`, is loaded only when real approved reports < 10, and every demo number is marked "Demo data" in the response (`"demo": true`) and the UI.

---

## 17. Future work (slides and roadmap, not this build)
- **Pay-Safe:** UPI QR / payment-intent decoder ("scanning this QR sends ₹5,000").
- **Conversation X-Ray:** WhatsApp chat timeline of manipulation stages, evaluated on ICFD-31k.
- **Cross-lingual embedding model** as an extra detector.
- **Family Guardian:** consented verdict alerts to a family member (Telegram bot).
- **Scam Gym:** "real or scam?" training game.
- Live domain reputation; transformer text model (multilingual BERT/IndicBERT) once real data exists; live call scam detection; more languages and reviewed translations.
