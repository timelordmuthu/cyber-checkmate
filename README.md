# Scam Checkmate

## Overview

## Setup (Windows)

```powershell
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python scripts/download_models.py
```

Use scikit-learn 1.6.0 (pinned). If you change it, retrain the text model.

## Data

## Training

## Evaluation

## Running

```powershell
# From the project root, with the venv activated:
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Then open:
- `http://127.0.0.1:8000/health` – backend health check
- `http://127.0.0.1:8000/mock/analyze` – canonical FR1 example response (frontend dev)
- `http://127.0.0.1:8000/docs` – interactive Swagger UI

### PowerShell curl.exe Examples

```powershell
# 1. Analyze a scam text (JSON)
'{"text": "Dear customer, your SBI KYC is expiring. Update immediately at http://sbi.kyc-update.xyz/login or account blocked."}' | `
  curl.exe -s -X POST "http://127.0.0.1:8000/analyze" -H "Content-Type: application/json" -d "@-"

# 2. Analyze a legitimate bank OTP text (JSON)
'{"text": "Your SBI NetBanking login OTP is 483921. Valid for 5 minutes. Do not share this OTP with anyone."}' | `
  curl.exe -s -X POST "http://127.0.0.1:8000/analyze" -H "Content-Type: application/json" -d "@-"

# 3. Analyze a suspicious link directly (JSON)
'{"url": "http://sbi.kyc-update.xyz/login"}' | `
  curl.exe -s -X POST "http://127.0.0.1:8000/analyze" -H "Content-Type: application/json" -d "@-"

# 4. Analyze via multipart/form-data
curl.exe -s -X POST "http://127.0.0.1:8000/analyze" `
  -F "text=Electricity bill unpaid. Power disconnected tonight. Call 9800000001."

# 5. Empty request returns 400 BadInput
'{}' | curl.exe -i -X POST "http://127.0.0.1:8000/analyze" -H "Content-Type: application/json" -d "@-"
```

## Phone access (HTTPS)

## Admin

## Limitations
