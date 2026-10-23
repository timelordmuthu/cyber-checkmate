# CyberCheckmate Baseline Report (v1)

> **Generated:** 2026-10-22  
> **Source:** Baseline verification run (no code changes).

---

## 1. Test Suite Results
* **Command:** `python -m pytest -q`
* **Result:** **94 passed, 1 warning** (32.42s)
* **Passing tests:** 94
* **Failing tests:** 0

---

## 2. Server & Endpoint Verification

The backend server was started with `uvicorn backend.main:app --port 8000`.

### Health Check (`GET /health`)
* **Status Code:** `200`
* **Response Body:**
```json
{
  "status": "ok",
  "components": {
    "text_model": true,
    "url_model": false,
    "rules": true,
    "llm_gemini": false,
    "llm_groq": false
  },
  "model_version": "v1"
}
```

### KYC Scam Analysis (`POST /analyze`)
* **Payload:** `{"text": "Dear customer, your SBI KYC has expired. Update within 24 hours at http://sbi-kyc-update.xyz/login"}`
* **Status Code:** `200`
* **Verdict Level:** `red`
* **Risk Score:** `84`
* **Component Scores:**
  * `text`: `0.95`
  * `url`: `0.9`
  * `rules`: `0.3`
* **Detected Red Flags:**
  * `your` (`text_model`, strength: 1.0)
  * `domain imitates State Bank of India` (`brand_lookalike`, strength: 0.95)
  * `update` (`text_model`, strength: 0.7904)
  * `within 24 hours` (`urgency`, strength: 0.75)
  * `customer` (`text_model`, strength: 0.7355)
  * `uses suspicious domain extension (.xyz)` (`suspicious_tld`, strength: 0.65)
  * `within` (`text_model`, strength: 0.4547)
  * `kyc` (`text_model`, strength: 0.4397)

Server was cleanly stopped after verification.

---

## 3. Model Metadata & Environment
* **`models/text/active.json`:**
```json
{
  "version": "v1"
}
```
* **`models/text/v1/meta.json` Metrics:**
  * `n_train`: `4186`
  * `val_metrics.accuracy`: `0.98` (98.0%)
  * `val_metrics.macro_f1`: `0.9617`
  * `val_metrics.scam_recall`: `0.942`
  * `val_metrics.n_val`: `902`
* **Installed `scikit-learn` version:** `1.9.1`
