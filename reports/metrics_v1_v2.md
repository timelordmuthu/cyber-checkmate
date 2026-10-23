# Validation Metrics: Model v1 vs Model v2

> **Evaluation Date:** 2026-10-22  
> **Note:** The validation split was expanded with new Indian templates (from $n = 902$ to $n = 1,097$). For a fair comparison, Model v1 was re-evaluated on the exact same new validation set alongside Model v2.

---

## 1. Metrics Comparison Table

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

---

## 2. Confusion Matrices (New Validation Split, n=1,097)

### Model v1 (Re-scored on new split)
```
               Predicted Legit    Predicted Scam
Actual Legit         849                17         (FP rate: 1.96%)
Actual Scam           12               219         (Recall: 94.81%)
```

### Model v2 (Weighted Indian rows, 30% effective weight)
```
               Predicted Legit    Predicted Scam
Actual Legit         856                10         (FP rate: 1.15%)
Actual Scam           9               222         (Recall: 96.10%)
```

---

## 3. Key Observations
1. **Scam Recall Improved:** Model v2 catches more scams on the Indian validation set (96.10% vs 94.81%).
2. **False Positive Rate Maintained Low:** 1.15% false positive rate on legitimate Indian messages.
3. **Macro F1 Increased:** Rose from 0.9606 to 0.9740.
