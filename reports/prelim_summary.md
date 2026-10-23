# Preliminary Metrics Summary – CyberCheckmate

> **Evaluation Split:** Validation Set (`data/splits/val.csv`, $n = 902$)  
> **Data Composition:** Group-split UCI SMS Spam Collection + Curated Indian SMS/messaging templates  
> **Evaluated At:** 2026-10-22  
> **Source Artifact:** [`reports/val_metrics_text.json`](file:///c:/Users/timel/OneDrive/Desktop/muthu%20vit/codings/scam-%20checkmate/reports/val_metrics_text.json)

---

## 1. Text Classifier Validation Metrics

The text classifier uses `FeatureUnion(word 1–2 grams + char_wb 3–5 grams)` fed into `LogisticRegression(class_weight="balanced")`. Evaluated on the validation split ($n = 902$ messages, split by `template_id` via `GroupShuffleSplit`):

| Class | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **Legitimate (Ham)** | 98.95% | 98.69% | 98.82% | 764 |
| **Scam (Fraud)** | 92.86% | 94.20% | 93.53% | 138 |
| **Macro Average** | **95.90%** | **96.45%** | **96.17%** | **902** |
| **Overall Accuracy** | — | — | **98.00%** | **902** |

### Confusion Matrix (Validation Set)

```
               Predicted Legit    Predicted Scam
Actual Legit         754                10         (False Positive Rate: 1.3%)
Actual Scam            8               130         (Recall: 94.2%)
```

- **True Negatives:** 754 legitimate messages correctly cleared.
- **False Positives:** 10 legitimate messages flagged (1.3% FP rate).
- **False Negatives:** 8 scam messages missed (94.2% fraud detection recall).
- **True Positives:** 130 scam messages correctly identified.

---

## 2. Text Classifier Model v2 (Expanded & Weighted Indian Dataset)

> **Evaluation Split:** New Expanded Validation Set (`data/splits/val.csv`, $n = 1,097$)  
> **Source Artifacts:** [`reports/metrics_v1_v2.md`](file:///c:/Users/timel/OneDrive/Desktop/muthu%20vit/codings/scam-%20checkmate/reports/metrics_v1_v2.md), [`reports/val_metrics_text_v2.json`](file:///c:/Users/timel/OneDrive/Desktop/muthu%20vit/codings/scam-%20checkmate/reports/val_metrics_text_v2.json)  
> **Training Configuration:** Indian rows weighted to 30% effective weight share; UCI rows 70% share; trained on $n = 4,500$ rows.

### Validation Metrics: Model v1 vs Model v2 (Fair Comparison on New Split, $n = 1,097$)

| Metric | v1 (Original Split, n=902) | v1 (New Split, n=1,097) | v2 (New Split, n=1,097) |
|:---|:---:|:---:|:---:|
| **Accuracy** | 0.9800 | 0.9736 | **0.9827** |
| **Macro F1** | 0.9617 | 0.9606 | **0.9740** |
| **Scam Recall** | 0.9420 | 0.9481 | **0.9610** |
| **Scam Precision** | 0.9286 | 0.9280 | **0.9569** |
| **Scam F1** | 0.9353 | 0.9379 | **0.9590** |
| **Legit Recall** | 0.9869 | 0.9804 | **0.9885** |
| **Legit Precision** | 0.9895 | 0.9861 | **0.9896** |
| **Legit F1** | 0.9882 | 0.9832 | **0.9890** |
| **False Positive Rate** | 1.3% | 1.96% | **1.15%** |
| **Validation Support** | 902 | 1,097 | 1,097 |

### Confusion Matrix (Model v2 on New Validation Split)

```
               Predicted Legit    Predicted Scam
Actual Legit         856                10         (False Positive Rate: 1.15%)
Actual Scam            9               222         (Recall: 96.10%)
```

- **True Negatives:** 856 legitimate messages correctly cleared.
- **False Positives:** 10 legitimate messages flagged (1.15% FP rate).
- **False Negatives:** 9 scam messages missed (96.10% fraud detection recall).
- **True Positives:** 222 scam messages correctly identified.

---

## 3. What Is Not Yet Evaluated (Pending Items)

In adherence to Hackathon Hard Rule 2 (*no fabricated metrics or evaluations*), the following benchmarks have not yet been evaluated:

1. **Real-World Test Set (`data/real_world_test/real_world.csv`):**
   - The team's curated set of live, real-world Indian SMS messages is reserved for final independent benchmarking in Prompt 21. It has not been evaluated yet.
2. **Protected Frozen Test Set (`data/frozen_test.csv`, $n = 893$):**
   - The frozen gate set is strictly quarantined to prevent data leakage and benchmark over-tuning. It will only be run during formal adaptive-learning gate checks.
3. **URL Classifier Model (`reports/val_metrics_url.json`):**
   - The standalone XGBoost model on the 235k PhiUSIIL dataset was skipped via the Prompt 6 fallback because raw training data was not placed in `data/raw/phiusiil/`.
   - Brand lookalike detection, official domain whitelisting, and rule heuristics currently provide URL scoring (with neutral $0.50$ base fallback).

