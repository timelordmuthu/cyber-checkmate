# PRD: CyberCheckmate
**Explainable scam detection for SMS, links and screenshots, shared straight from your phone**

> Context for the coding agent: this is a 24-hour hackathon build (NexAI InnoHack 2026, Track: AI for Digital Safety and Online Scam Detection). A 4-person team will review and run everything you generate. Prioritise a **working end-to-end pipeline** over completeness. Use **only free, open-source tools and free-tier APIs**. Build in the phases in Section 14, and keep each phase runnable before starting the next.

> **Read Section 16 (Clarifications and guardrails, including Section 16.13 for the React frontend) before writing any code.** Where Section 16 is more specific than an earlier section, Section 16 wins.

### Hard rules (never break these)
1. **Never fabricate data or results.** Do not invent metrics, accuracy numbers, or "real-world" messages. Every number in `reports/`, the README or anywhere else must come from actually running `training/evaluate.py`. If a step can't be run, leave a clear `TODO` instead of a number.
2. **Never populate `data/real_world_test/` yourself.** The team fills it by hand with real messages. Create only the folder, a README describing the CSV format, and an empty CSV with headers.
3. **The LLM never decides the verdict.** The score and level come only from the rules, the text model, the URL model and fusion. The LLM only rephrases already-detected signals.
4. **No network calls in the analysis path** except the optional LLM explanation call. No WHOIS, DNS, URL expansion, page fetching, or online suffix-list downloads at runtime.
5. **No paid services, no database server, no user accounts.** Python 3.11 for the backend; React + Vite with JavaScript for the frontend (built into `frontend/dist/` and served by FastAPI in production). The only stored data is user-reported messages for the adaptive learning feature (FR10), kept in a local SQLite file. The admin page is protected by a single `ADMIN_TOKEN` from `.env`, not by accounts.
6. **Don't silently change the API response contract** (Section 7, FR1). The frontend depends on it.
7. **Never train on unreviewed user reports.** Only admin-approved reports may enter training data (FR10).

---

## 1. Overview

### 1.1 Problem
Indians lose large sums every year to scams that reach them on their phones as SMS, WhatsApp messages, links and screenshots, such as fake KYC updates, UPI refund requests, electricity disconnection warnings, customs parcel threats and fake job offers. Existing tools fall short because they:
1. **Give no reason.** Blocklists and spam filters return "spam" or nothing, so users don't trust or learn from the warning.
2. **Aren't built for Indian scams.** Most models are trained on Western promotional spam and miss UPI, KYC, Aadhaar and Hinglish patterns.
3. **Are inconvenient.** Users must copy text into a separate site, and screenshots can't be checked at all.

### 1.2 Solution
A mobile-first, installable web app (PWA). The user shares any suspicious SMS, message, link or screenshot to CyberCheckmate from the phone's share menu (or pastes or uploads it) and receives:
- a **risk score** (0–100) with a chess-themed level: Safe (green) / Check (amber) / Checkmate (red)
- the **specific red flags** found (tactics, suspicious words, URL findings)
- **what to do next** (don't click, block the sender, report to 1930 / cybercrime.gov.in)
- an explanation in **English and Hindi**

### 1.3 Branding note
Show the tagline *"Check any message before it checks you."* in the app header, and the footer disclaimer *"Independent student project, not affiliated with any bank, government body or law enforcement."* in the footer.
---

## 2. Goals and non-goals

### Goals
- G1: End-to-end analysis of text, URL and screenshot input through one API endpoint.
- G2: Every verdict comes with explainable reasons drawn from detected signals.
- G3: Works well from an Android phone over HTTPS, with a share-target flow.
- G4: Honest evaluation: precision, recall, F1 and confusion matrices on synthetic and real-world test sets, plus a false-positive check and a baseline comparison.
- G5: Runs on a CPU laptop with no GPU and no paid services.
- G6: Adapts to new scam types through a human-reviewed feedback loop (report → review → variants → retrain → gate → deploy) and instant rule updates, without code changes (FR10).

### Non-goals (out of scope)
- Live call analysis or call audio capture
- Live WHOIS / DNS / domain reputation lookups (the venue network is unreliable)
- Native Android/iOS apps
- User accounts or login (the admin page uses a single shared token)
- Storing any message the user did not explicitly report
- Automatic or online learning without human review
- Deep learning model training (transformers are future work)

---

## 3. Target users and user stories
**Users:** everyday Android phone users in India, including elderly and first-time digital users, and students.

| ID | User story |
|---|---|
| US1 | As a user, I share a suspicious SMS to Scam Police and see within seconds whether it's a scam and why. |
| US2 | As a user, I share a screenshot of a WhatsApp message and the app reads the text and links from it. |
| US3 | As a user, I paste a link and learn whether it imitates a known brand like SBI or Paytm. |
| US4 | As a user, I read the explanation in Hindi. |
| US5 | As a user who received a scam, I get clear next steps and a one-tap way to reach 1930 / cybercrime.gov.in. |
| US6 | As a user, I can correct OCR-extracted text before analysis if it was misread. |
| US7 | As a user, I can report a result as wrong ("This is a scam" / "This is not a scam") so the system can learn new scam types. |
| US8 | As an admin (the team), I review reported messages, approve or reject them, generate variants, retrain the model, and only deploy the new model if it passes quality checks. |
| US9 | As an admin, I add a new scam phrase to the rule engine and it takes effect immediately, without retraining. |
| US10 | As an admin, I can see which model version is live and roll back to an earlier one. |

---

## 4. System architecture

```
Input (Share Target / paste / upload)
        │
        ▼
┌────────────────┐   image   ┌──────────────┐
│  /analyze API  │──────────▶│ OCR (EasyOCR │──▶ extracted text + URLs (regex)
└────────────────┘           │  en + hi)    │
        │ text / url         └──────────────┘
        ▼
┌─────────────────────────────────────────────────┐
│ 1. Tactic rule engine  (instant, weighted)      │
│ 2. Text classifier     (TF-IDF + LogReg)        │
│ 3. URL classifier      (XGBoost lexical) +      │
│    brand-lookalike check (edit distance,        │
│    homoglyphs, official-domain whitelist)       │
└─────────────────────────────────────────────────┘
        │ structured signals
        ▼
┌───────────────────────┐
│ Fusion + overrides    │──▶ risk_score, level
└───────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│ Explanation layer: LLM rephrases ONLY the     │
│ detected signals (EN + HI); template fallback │
└───────────────────────────────────────────────┘
        │
        ▼
     JSON response ──▶ PWA result screen
```

---

## 5. Tech stack (all free)
| Layer | Choice |
|---|---|
| Language | Python 3.11 (see 16.6) |
| Backend | FastAPI + Uvicorn |
| ML | scikit-learn (TF-IDF, LogisticRegression), XGBoost, joblib for saving models |
| OCR | EasyOCR (`en`, `hi`), pip-only, which avoids installing Tesseract on Windows |
| String matching | `rapidfuzz` (edit distance), `tldextract` (domain parsing), `idna` (punycode) |
| LLM (primary) | Google Gemini API, free tier (key from Google AI Studio) |
| LLM (secondary) | Groq free tier |
| LLM (final fallback) | Local template explanations (no network) |
| Frontend | React + Vite (JavaScript) + Tailwind CSS (built to `frontend/dist/`, served by FastAPI in production) |
| HTTPS for the phone | Cloudflare quick tunnel (`cloudflared`), or deploy to Hugging Face Spaces |
| Version control | Git + GitHub (commit often) |

All secrets go in a `.env` file (`GEMINI_API_KEY`, `GROQ_API_KEY`, `GEMINI_MODEL`, `GROQ_MODEL`, `ADMIN_TOKEN`), never committed. Storage for FR10 uses Python's built-in `sqlite3` (free, no server). Provide `.env.example`.

---

## 6. Project structure
```
scam-police/
├── backend/
│   ├── main.py                 # FastAPI app, /analyze, /health, serves frontend
│   ├── config.py               # weights, thresholds, env loading
│   ├── schemas.py              # Pydantic request/response models
│   ├── pipeline/
│   │   ├── rules.py            # tactic rule engine
│   │   ├── text_model.py       # load + predict + top-token explanation
│   │   ├── url_model.py        # feature extraction + predict
│   │   ├── brand_check.py      # lookalike / homoglyph / whitelist
│   │   ├── ocr.py              # EasyOCR wrapper + URL regex
│   │   ├── fusion.py           # score combination + overrides
│   │   └── explain.py          # LLM call (timeout) + template fallback
│   ├── feedback/
│   │   ├── store.py            # SQLite reports + variants (FR10.2)
│   │   ├── variants.py         # LLM variant generation (FR10.4)
│   │   ├── retrain.py          # background retraining + gate (FR10.5, 16.12)
│   │   └── registry.py         # model versions, active.json, hot-swap (FR10.7)
│   ├── admin.py                # /admin/* routes, X-Admin-Token check
│   └── resources/
│       ├── tactics.json        # tactic dictionary with weights
│       ├── brands.json         # brand -> official domains
│       └── templates.json      # fallback explanation templates (en, hi)
├── training/
│   ├── prepare_text_data.py
│   ├── train_text_model.py
│   ├── prepare_url_data.py
│   ├── train_url_model.py
│   └── evaluate.py             # metrics, confusion matrices, baseline comparison
├── data/
│   ├── raw/                    # UCI SMS, PhiUSIIL, PhishTank/OpenPhish dumps
│   ├── indian_messages/        # curated synthetic scam + legit messages (CSV with template_id)
│   ├── real_world_test/        # real scam SMS collected by the team
│   ├── frozen_test.csv         # gate set, never changes (16.12)
│   ├── feedback_val.csv        # held-out feedback groups (16.12)
│   └── feedback/feedback.db    # SQLite, git-ignored (FR10.2)
├── models/
│   ├── text/v1/, v2/ ...       # model.joblib + meta.json per version
│   ├── text/active.json        # live text-model version
│   └── url/model.joblib
├── frontend/
│   ├── index.html
│   ├── share.html              # share-target landing page
│   ├── admin.html              # admin page (FR10.3)
│   ├── app.js
│   ├── styles.css
│   ├── manifest.json
│   └── sw.js
├── reports/                    # generated metrics + confusion matrix PNGs
├── demo/                       # saved demo inputs (texts, URLs, screenshots)
├── scripts/
│   ├── download_models.py      # one-time EasyOCR weight download (16.6)
│   └── smoke_test.py           # runs demo inputs through /analyze (16.11)
├── requirements.txt
├── .env.example
└── README.md                   # setup + run + tunnel instructions
```

---

## 7. Functional requirements

### FR1: API
- `POST /analyze` accepts **multipart/form-data** with any of: `text` (string), `url` (string), `image` (file: png/jpg/webp, max 5 MB), `lang` (`en` | `hi` | `both`, default `both`).
- `GET /health` returns status plus which LLM provider is reachable.
- Models load **once at startup**, not on every request.
- Response contract (must match exactly, since the frontend depends on it):

```json
{
  "risk_score": 82,
  "level": "red",
  "input_type": "text | url | image",
  "extracted_text": "text used for analysis (OCR output if image)",
  "urls_found": ["http://sbi-kyc-update.xyz/login"],
  "red_flags": [
    {"type": "tactic", "category": "urgency", "evidence": "within 24 hours", "strength": 0.6},
    {"type": "keyword", "category": "text_model", "evidence": "kyc", "strength": 0.83},
    {"type": "url", "category": "brand_lookalike", "evidence": "domain imitates sbi.co.in", "strength": 0.95}
  ],
  "component_scores": {"text": 0.91, "url": 0.88, "rules": 0.70},
  "error": null,
  "advice_en": "This message is very likely a scam because ...",
  "advice_hi": "यह संदेश संभवतः धोखाधड़ी है क्योंकि ...",
  "next_steps": ["Do not click the link", "Block the sender", "Report at 1930 or cybercrime.gov.in"],
  "explanation_source": "llm | template",
  "model_version": "v1",
  "processing_ms": 1240
}
```

**Contract rules:**
- `level` is exactly one of the lowercase strings `"green"`, `"amber"`, `"red"`.
- `strength` is always a float in **0–1** (how strongly that single flag points to a scam). It is for display ordering only; fusion uses `component_scores`.
- `component_scores.url` is `null` when no URL was found. `component_scores` values are floats in 0–1 (`text` and `url` are model probabilities of "scam/phishing"; `rules` is the rule score).
- `red_flags` is sorted by `strength`, descending, max 10 items.
- `input_type` reflects what the user sent; if text containing a URL is sent, it is `"text"` and `urls_found` lists the extracted URLs.
- If several inputs are sent together (text + url + image), combine them: OCR text is appended to `text`, the explicit `url` is added to `urls_found` (deduplicated), and `input_type` is the "richest" one sent (`image` > `text` > `url`).
- On bad input (nothing sent, unreadable image, file too large, OCR found no text), return **HTTP 400** with `{"error": "<plain-language message>"}` and no other fields. Never invent a fourth level such as "unknown". The frontend shows the error message. On success, `error` is `null`.
- `/analyze` returns JSON only. HTML result pages are served by `/share` and the frontend, never by `/analyze`.

### FR2: Tactic rule engine (`rules.py`, `tactics.json`)
- Categories with per-phrase weights: **authority** (RBI, bank, police, TRAI, customs, income tax), **fear** (account blocked, suspended, arrest, legal action), **urgency** (immediately, within 24 hours, last warning, turant), **payment / credentials** (OTP, UPI PIN, CVV, fee, pay now), **isolation** (don't share with anyone), **reward** (lottery, cashback, refund, prize, job offer).
- Include **Hinglish phrases and common obfuscations**: "band ho jayega", "turant", "K.Y.C", "k y c", "verifi", "0TP", spacing and dot tricks. Normalise text first (lowercase, collapse spaces, strip dots between letters, map digit/letter homoglyphs).
- Bonus: if 3 or more distinct categories match, add a combination bonus.
- Output: rule score 0–1 plus the list of matched phrases with their categories.

### FR3: Text classifier
- Pipeline: TF-IDF (word 1–2 grams + char 3–5 grams, `char_wb`) feeding LogisticRegression (`class_weight="balanced"`).
- Training data: UCI SMS Spam Collection + the curated Indian set (FR7).
- Explanation: return the top 5 tokens in the input that push towards "scam" (coefficient × tf-idf value).
- Save the model with joblib.

### FR4: URL classifier and brand-lookalike check
- **Lexical features only (no network calls):** URL length, host length, number of dots, hyphens, digits ratio, `@` present, IP address as host, subdomain depth, Shannon entropy of the host, suspicious TLD (`.xyz .top .live .click .info .buzz`, configurable), punycode (`xn--`), presence of keywords (login, kyc, verify, update, secure, account, reward, refund), URL shortener domains, HTTPS present.
- Model: XGBoost, trained on PhiUSIIL plus recent PhishTank/OpenPhish samples. The legitimate class comes from PhiUSIIL's legitimate URLs.
- **Brand check (`brand_check.py`):**
  - `brands.json` maps each brand to its official registrable domains (SBI, HDFC, ICICI, Axis, Paytm, PhonePe, Google Pay, NPCI, India Post, IRCTC, Income Tax e-filing, Amazon, Flipkart, and a few more).
  - **Whitelist:** if the registrable domain exactly matches an official domain, mark it trusted and cap the URL score (this cuts false positives on long legitimate bank URLs).
  - **Lookalike:** if a brand name appears in the domain or subdomain but the registrable domain isn't official, or the edit-distance similarity to an official domain is ≥ 85 after homoglyph normalisation (rn→m, 0→o, 1→l, vv→w), flag `brand_lookalike` with the brand name.
  - **Legitimate hosts used for scams** (forms.gle, docs.google.com/forms, bit.ly, wa.me, t.me): don't call them phishing on their own, but flag them as "link hides the real destination / uses a free form" with moderate weight.

### FR5: OCR
- EasyOCR with `['en', 'hi']`. Load the reader once at startup (it's slow to initialise).
- Pre-process: convert to grayscale; if the mean brightness is low (dark mode), invert.
- Extract URLs with a regex that also catches URLs without a scheme (`example.com/path`).
- Return the extracted text in the response so the user can **edit and re-submit** it (US6).

### FR6: Fusion (`fusion.py`)
- Base: `score = 100 × (0.5·text + 0.35·url + 0.15·rules)`. If no URL is present, re-normalise the weights between text and rules.
- Overrides:
  - Strong `brand_lookalike` → `score = max(score, 80)`
  - Payment/credential request + urgency both matched → +10 (cap at 100)
  - Whitelisted official domain and text score < 0.3 → `score = min(score, 30)`
- Levels: **< 35 green**, **35–70 amber**, **> 70 red**. Keep all weights and thresholds in `config.py`.
- The fusion logic must be simple enough to explain to a judge in one sentence.

### FR7: Indian message dataset (`data/indian_messages/`)
- CSV columns: `text, label (scam|legit), category, template_id, source (synthetic|real)`.
- 300–500 scam messages across categories: fake KYC, UPI refund/collect, electricity disconnection, customs/courier parcel, fake job/task scams, lottery/cashback, Aadhaar/PAN update, loan offers.
- **An equal number of legit messages:** real-style OTP messages, bank debit/credit alerts, delivery updates, utility bill reminders, college/exam notices. (These are required to reduce false positives on real bank SMS.)
- Vary the wording, sender style, Hinglish/English mix and length. Don't generate messages by only swapping names or amounts.
- Generate a helper script that creates a starter set from templates **with a `template_id`**, so that train/test splits are done **by template (GroupShuffleSplit)**, not randomly. Random splits inflate metrics through near-duplicates.

### FR8: Explanation layer (`explain.py`)
- Input to the LLM: **only the structured signals** (matched tactics, top tokens, URL findings, score, level). Never the raw instruction to "decide if this is a scam".
- System prompt must say: use only the provided signals, don't invent new reasons, keep it to 2–3 short sentences in simple language, and produce both English and Hindi.
- Timeout of 5 seconds per provider. Order: Gemini → Groq → templates.
- `templates.json`: a sentence per red-flag category in English and Hindi, assembled when the LLM is unavailable.
- Set `explanation_source` in the response.

### FR9: Frontend PWA
- **Mobile-first**, large traffic-light result card, red flags shown as chips grouped by type, a toggle between English and Hindi.
- Input screen: a text box (paste), a URL box, an image upload, and a "Check" button.
- Result screen: score and level, red flags, advice, next steps, an **editable extracted-text box for images** with a "Re-check" button, a **"Report: call 1930"** button (`tel:1930`) and a link to `https://cybercrime.gov.in`.
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
- The `/share` route accepts the shared data, runs the analysis and shows the result page.
- Service worker for installability (basic caching of static assets only).
- **Fallback:** if the share target doesn't work on a device, the paste/upload page must still work fully.
- Footer: the exact privacy sentence from Section 16.9, plus the not-affiliated-with-police tagline.

---

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
- Admin endpoints: `GET /admin/reports?status=pending`, `POST /admin/reports/{id}/approve`, `POST /admin/reports/{id}/reject`, `POST /admin/reports/{id}/variants`, `DELETE /admin/variants/{id}`, `POST /admin/rules`, `POST /admin/retrain`, `GET /admin/models`, `POST /admin/models/{version}/activate`.

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

## 8. Non-functional requirements
| ID | Requirement |
|---|---|
| NFR1 | Text/URL analysis returns in < 2 s on a CPU laptop (excluding the LLM call); image analysis < 6 s. |
| NFR2 | Fully works with the LLM unavailable (template fallback). |
| NFR3 | No live network lookups for URL analysis. |
| NFR4 | **Privacy:** no message text, images or results written to disk or logs, **except messages the user explicitly reports** (FR10), which are stored as text only. Log only timings and errors. Only signals (not full messages) are sent to the LLM for explanations (16.7, 16.9). |
| NFR8 | `/analyze` keeps working normally while a retrain is running (background thread, atomic model swap). |
| NFR5 | Phone access requires **HTTPS** (PWA install and Share Target need it). README must document the Cloudflare quick tunnel command and a Hugging Face Spaces deployment option. |
| NFR6 | Runs identically on both team laptops (pinned `requirements.txt`, Windows-compatible instructions). |
| NFR7 | All datasets and models available offline once downloaded. |

---

## 9. Data sources
| Dataset | Use | Notes |
|---|---|---|
| UCI SMS Spam Collection | Text model | Old, non-Indian, mostly promotional spam, so it's combined with the Indian set |
| PhiUSIIL Phishing URL Dataset (UCI) | URL model | About 235k URLs, phishing + legitimate |
| PhishTank / OpenPhish feeds | Recent phishing URLs | Download a snapshot once and keep it offline |
| Curated Indian message set | Text model | Synthetic, clearly labelled as such, split by template |
| Real-world test set | Honest evaluation only | 20–50 real scam SMS plus 20 real bank/OTP messages from team phones, **never used for training** |

---

## 10. Evaluation requirements (`training/evaluate.py`)
Generate into `reports/`:
1. **Text model:** precision, recall, F1, confusion matrix (PNG) on the template-split synthetic test set.
2. **Text model on the real-world test set:** the same metrics, reported separately.
3. **Baseline comparison:** a model trained on UCI only vs. UCI + the Indian set, both tested on Indian scam messages (shows the value of the Indian data).
4. **False-positive check:** the share of real legit bank/OTP messages wrongly flagged as amber/red.
5. **URL model:** precision, recall, F1 and confusion matrix on a held-out PhiUSIIL split, plus results on the recent PhishTank/OpenPhish snapshot (to show behaviour on newer URLs).
6. **End-to-end:** the fused level vs. labels on the real-world test set.
7. A `metrics_summary.md` table for direct use in slides and the poster.

---

## 11. Known drawbacks and built-in mitigations
| # | Drawback | Mitigation in this build |
|---|---|---|
| 1 | Common idea, many teams build spam/URL checkers | Share-from-phone flow, explainable flags, Indian brand-lookalike check, Hindi output |
| 2 | UCI data doesn't reflect Indian scams | Curated Indian scam + legit dataset (FR7) |
| 3 | Synthetic data inflates metrics | Template-based split + separate real-world test set (FR7, FR10) |
| 4 | TF-IDF fooled by misspellings and Hinglish | Char n-grams, text normalisation, Hinglish rules |
| 5 | Lexical URL features miss clean domains and abused legit hosts; false positives on long bank URLs | Brand-lookalike check, official-domain whitelist, free-form/shortener flag (FR4) |
| 6 | Phishing URL data goes stale | Recent PhishTank/OpenPhish snapshot, evaluated separately; framed as "explainable risk", not a guarantee |
| 7 | OCR errors (dark mode, Hindi, small fonts) | Pre-processing + editable extracted text (FR5, US6) |
| 8 | False positives on real bank/OTP messages | Legit Indian messages in training, whitelist, false-positive metric |
| 9 | LLM may hallucinate reasons | LLM sees only structured signals; template fallback (FR8) |
| 10 | Privacy concerns | No storage of messages (NFR4); on-device inference listed as future work |
| 11 | Web Share Target unsupported on iOS | Paste/upload fallback; Android-first |
| 12 | Free-tier rate limits / venue network issues | Template fallback, offline datasets, mobile hotspot, pre-deployed cloud copy |
| 13 | Scams evolve; a static model goes stale | Adaptive learning loop: report → review → variants → retrain → gate (FR10), plus instant rule updates |
| 14 | Data poisoning via fake reports | Human review before training, rate limit, duplicate merging, no auto-training (Hard rule 7) |
| 15 | Overfitting to a few new examples | Minimum 3 reports, variant cap (30%), gate on the frozen test set (16.12) |
| 16 | Variants inflate metrics | Same `template_id` for variants, held-out feedback groups, real-world set stays the benchmark |
| 17 | Reporting stores messages (privacy) | Explicit consent line, text only (no images/IDs), PII stripped before variant generation, accurate footer (16.9) |
| 18 | A bad retrain breaks the live system | Versioned models, gate, atomic hot-swap, one-click rollback (FR10.7) |

---

## 12. Acceptance criteria (definition of done)
- [ ] `POST /analyze` returns the exact JSON contract for text, URL and image inputs.
- [ ] A fake KYC SMS with a lookalike SBI link scores **red**, with tactic, keyword and brand-lookalike flags.
- [ ] A real-style bank OTP message scores **green**.
- [ ] A WhatsApp-style screenshot with a scam link is OCR'd, the URL is extracted and flagged.
- [ ] With the LLM key removed, responses still include English and Hindi template advice.
- [ ] The PWA opens on an Android phone over HTTPS, installs, and appears in the share menu.
- [ ] `evaluate.py` produces all reports in Section 10.
- [ ] README lets a teammate set up and run the project on Windows from scratch.
- [ ] Reporting a result stores it as `pending`; nothing trains until an admin approves.
- [ ] `/admin/*` returns 401 without the correct `X-Admin-Token`.
- [ ] Adding a phrase in the rule editor changes `/analyze` results immediately, without restart.
- [ ] Retraining creates a new version with `meta.json`, runs the gate, and activates only if the gate passes.
- [ ] Rollback to an earlier version works and `model_version` in responses changes accordingly.
- [ ] `/analyze` keeps responding while a retrain runs.

---

## 13. Demo script (must work reliably)
1. On the phone, share a fake KYC SMS to Scam Police → **red**, flags shown, toggle to Hindi.
2. Share a real bank OTP message → **green** (proves the system discriminates).
3. Share a WhatsApp scam screenshot with a lookalike link → OCR text shown → URL flagged as imitating a bank.
4. Show the metrics summary (baseline vs. with Indian data, real-world test results, false-positive rate).
5. **Adaptation demo:** check a new scam type that is not in the training data (e.g. a fake e-challan traffic-fine SMS) → green/amber. Report 3–5 examples, approve them in `/admin`, generate variants, click Retrain → gate passes, v2 goes live. Check a **new, unseen** e-challan message → red. (Prepare these e-challan messages in `demo/` beforehand, and make sure none of them are in the training data.)
6. Backups: saved demo inputs in `demo/`, and a pre-recorded screen video (including the adaptation demo).

---

## 14. Build phases (in order; each must run before moving on)
| Phase | Deliverable | Target time |
|---|---|---|
| P0 | Repo structure, `requirements.txt`, `.env.example`, FastAPI `/health`, README setup | 11:30–12:30 |
| P1 | Rule engine + text model trained on UCI + starter Indian set; URL feature extractor + XGBoost; brand check; each with a small CLI test | 12:30–3:00 |
| P2 | `/analyze` endpoint with fusion + template explanations; basic HTML page calling it; reachable from the phone via HTTPS tunnel | 3:00–5:00 |
| P3 | Preliminary-round readiness: stable demo of text + URL; metrics from `evaluate.py` | by 5:00–6:00 |
| P4 | OCR, LLM explanations (EN + HI), PWA manifest + share target, UI polish | 6:00–10:00 PM |
| P4.5 | Adaptive learning (FR10): `/report` + SQLite, admin page with token, rule editor hot-reload, variants, background retrain + gate, versions + rollback. **Build only after P2–P4 work end to end.** If short on time, ship reporting + rule editor first, retraining second. | 10 PM–1 AM |
| P5 | Real-world test set evaluation, false-positive check, bug fixes, demo inputs (including the adaptation demo set), README final | overnight |
| P6 | Code freeze, rehearsal, backup video | 8:00–9:00 AM |

**Rule:** after P3, no new features until P2–P3 work end to end.

---

## 15. Glossary
| Term | Meaning in this PRD |
|---|---|
| Scam / phishing | Label `1`. "Scam" for messages, "phishing" for URLs. |
| Legit | Label `0`. |
| Registrable domain | The domain a person can register, e.g. `onlinesbi.sbi` in `retail.onlinesbi.sbi`, computed offline with `tldextract`. |
| Template split | Train/test split where all messages generated from one template stay in the same split. |
| Flagged | Fused level is amber or red. |
| Signals | Matched tactics, top text-model tokens and URL findings, i.e. the contents of `red_flags`. |
| Strong lookalike | Defined in 16.4. |

---

## 16. Clarifications and guardrails (read before coding)

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
- `/share` is a **server-side FastAPI route** that accepts the multipart POST from the share target, runs the same pipeline as `/analyze`, and returns an HTML result page (or redirects to the frontend with the result). No service-worker fetch interception is needed for share handling.
- The manifest's `start_url`, `scope` and share-target `action` must be **relative to the same origin** (e.g. `/`, `/share`), never a hardcoded hostname.
- When an SMS or WhatsApp message is shared, Android usually puts everything (including links) in the `text` field and leaves `url` empty. **Always concatenate `title`, `text` and `url`, then extract URLs from the combined string.**
- The service worker caches **static files only**. It must never cache `/analyze` or `/share` responses or any POST request.
- Frontend is **vanilla HTML/CSS/JS**, served by FastAPI from `frontend/` at the same origin, so no CORS setup is needed.
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

### 16.13 Frontend architecture and React/Vite specifications
- **Stack:** React + Vite (JavaScript) + Tailwind CSS in `frontend/`.
- **Development & Mocking:** `vite.config.js` proxies `/analyze`, `/health`, `/report`, `/admin`, `/mock` to `http://127.0.0.1:8000`. If `VITE_USE_MOCK=true` is set in `frontend/.env.local`, `src/api.js` returns the FR1 example JSON from `src/mock.js` without requiring a running backend.
- **Production Serving via FastAPI:** FastAPI mounts and serves `frontend/dist/` at `/` (static assets with `index.html` fallback for client routes). If `dist/` is missing, `GET /` returns a brief message instructing the user to run `npm run build`.
- **Web Share Target Handoff (`/share`):** `POST /share` accepts multipart form data (`title`, `text`, `url`, `image`), runs `analyze()`, and returns `dist/index.html` with `<script>window.__CC_SHARE__ = {...}</script>` safely injected before the application bundle. JSON serialization escapes `<`, `>`, `&`, `\u2028`, and `\u2029`. The React app checks `window.__CC_SHARE__` on load, displays the shared analysis result immediately, and cleans up the global variable.
- **Visual Design & Chess Theme:**
  - Dark chess-board palette, high contrast, readable typography, responsive down to 360 px width. Large tap targets ($\ge 44$ px) and sticky bottom check button on mobile.
  - Chess terminology for verdicts: Red = **"Checkmate: likely scam"**, Amber = **"Check: be careful"**, Green = **"Safe: looks okay"**. Always displays text labels and icons, never relying on color alone.
  - React Bits UI effects: animated grid/board background ("Squares" or "Dot Grid"), text effect for "CyberCheckmate" title, count-up animation for the 0–100 score, spotlight effect for the result card. Animation respects `prefers-reduced-motion` and disables on low-power/small screens.
- **Internationalization (i18n):** `src/i18n.js` provides bilingual English and Hindi strings with an instant header toggle.
- **Reporting & Admin Portal:**
  - Result view provides "This is a scam" / "This is not a scam" buttons with the FR10.1 consent line, enabled via feature flag `VITE_ENABLE_REPORTS`.
  - Admin view at `/admin`: asks once for `ADMIN_TOKEN` (stored safely in `sessionStorage`), passed as `X-Admin-Token` header for managing pending reports, generating variants, editing rules, and viewing/activating model versions.
- **Footer & Disclaimers:** Contains the exact privacy sentence from Section 16.9 and the disclaimer: *"Independent student project, not affiliated with any bank, government body or law enforcement."*

---

## 17. Future work (for slides, not for this build)
- On-device inference for privacy
- Live domain reputation (domain age, certificate checks)
- Community-reported scam database with LLM de-duplication
- Regional languages beyond Hindi (Tamil, Telugu, Bengali)
- Transformer-based text model (e.g. multilingual BERT) as an upgrade
- Live call scam detection (call-merge "Guardian" number)
