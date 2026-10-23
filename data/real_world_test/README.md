# Real-World Test Dataset

This directory is strictly reserved for human-verified, real-world scam and legitimate messages collected from team phones.

## CSV Format: `real_world.csv`
Columns:
- `text`: The raw SMS or message text.
- `label`: `scam` (1) or `legit` (0).
- `category`: Category of message (e.g., `fake_kyc`, `upi_collect`, `electricity_bill`, `delivery`, `bank_otp`, `transaction_alert`).
- `template_id`: Unique identifier for the template group or sender style.
- `source`: Source of message (e.g., `real_sms`, `whatsapp`).

**Note:** Never use messages in this folder for training or validation. This is used solely by `training/evaluate.py` for honest ground-truth testing.
