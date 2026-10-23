# Probe Comparison: Model v1 vs Model v2

> **Evaluated via:** Full `backend.pipeline.analyze.analyze()` pipeline
> **Date:** 2026-10-22 22:39:53

| ID | Category | Expected | v1 Level (Score) | v2 Level (Score) | Text Score (v1 -> v2) | Status |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| **P1** | digital_arrest | `red or amber` | **amber** (52) | **amber** (49) | `0.51 -> 0.47` | PASS |
| **P2** | task_job | `red or amber` | **green** (30) | **amber** (48) | `0.39 -> 0.63` | PASS |
| **P3** | hinglish_electricity | `red or amber` | **amber** (40) | **amber** (70) | `0.44 -> 0.83` | PASS |
| **P4** | investment | `red or amber` | **amber** (47) | **amber** (57) | `0.61 -> 0.75` | PASS |
| **P5** | legit_otp | `green` | **green** (28) | **green** (14) | `0.28 -> 0.1` | PASS |
| **P6** | legit_police_awareness | `green` | **amber** (51) | **green** (25) | `0.59 -> 0.25` | PASS |
| **P7** | official_url_only | `green` | **green** (9) | **green** (9) | `None -> None` | PASS |
| **P8** | fake_kyc | `red or amber` | **red** (84) | **red** (83) | `0.95 -> 0.94` | PASS |

### Probe Details & Inputs

- **P1 (digital_arrest):** `This is Mumbai Police cyber cell. A parcel with drugs in your name was seized. Stay on video call, don't tell anyone, or you will be arrested today.`
- **P2 (task_job):** `Hi! Part time job, earn 3000 daily by liking YouTube videos. Telegram par join karo.`
- **P3 (hinglish_electricity):** `Aapka bijli connection aaj raat 9:30 baje kat diya jayega. Turant officer se baat karein 98XXXXXX12`
- **P4 (investment):** `Join our VIP group for guaranteed returns. Double your money in 7 days, invest and earn daily profit.`
- **P5 (legit_otp):** `492011 is your SBI NetBanking OTP for txn of Rs 1,500 at AMAZON. Valid 10 mins. Do not share OTP with anyone.`
- **P6 (legit_police_awareness):** `Police never ask you to stay on a video call or transfer money. Report cyber fraud at 1930.`
- **P7 (official_url_only):** `https://www.onlinesbi.sbi/`
- **P8 (fake_kyc):** `Dear customer, your SBI account KYC has expired. Update within 24 hours at http://sbi-kyc-update.xyz/login or your account will be blocked.`