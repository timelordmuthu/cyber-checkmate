import json
from pathlib import Path

schemas_dir = Path("contracts/schemas")
schemas_dir.mkdir(parents=True, exist_ok=True)
fixtures_dir = Path("contracts/fixtures")
fixtures_dir.mkdir(parents=True, exist_ok=True)

# 1. Schemas
schemas = {
    "error.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": ["error"],
        "properties": {
            "error": {"type": "string"}
        }
    },
    "report-response.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": ["status"],
        "properties": {
            "status": {"type": "string", "enum": ["received"]}
        }
    },
    "health.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": ["status", "components", "model_version"],
        "properties": {
            "status": {"type": "string"},
            "components": {"type": "object"},
            "model_version": {"type": "string"},
            "api_version": {"type": ["integer", "null"]},
            "config": {"type": "object"}
        }
    },
    "languages.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": ["languages"],
        "properties": {
            "languages": {"type": "array"},
            "translator": {"type": "string"},
            "translator_engine": {"type": ["string", "null"]}
        }
    },
    "radar.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "demo": {"type": "boolean"},
            "generated_at": {"type": "string"},
            "top_scam_categories": {"type": "array"},
            "top_entities": {"type": "array"},
            "trend": {"type": "array"}
        }
    },
    "analyze.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": ["risk_score", "level"],
        "properties": {
            "risk_score": {"type": "integer", "minimum": 0, "maximum": 100},
            "level": {"type": "string", "enum": ["green", "amber", "red"]},
            "input_type": {"type": "string"},
            "extracted_text": {"type": "string"},
            "urls_found": {"type": "array"},
            "red_flags": {"type": "array"},
            "component_scores": {"type": "object"},
            "overrides_fired": {"type": "array"},
            "advice_en": {"type": "string"},
            "advice_hi": {"type": "string"},
            "advice_local": {"type": ["string", "null"]},
            "next_steps": {"type": "array"},
            "next_steps_hi": {"type": "array"},
            "next_steps_local": {"type": ["array", "null"]},
            "entities": {"type": "object"},
            "language": {"type": "object"},
            "reputation": {"type": "array"},
            "explanation_source": {"type": "string"},
            "model_version": {"type": "string"},
            "processing_ms": {"type": "integer"},
            "error": {"type": ["string", "null"]}
        }
    },
    "admin.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Ping": {
                "type": "object",
                "required": ["status", "role"],
                "properties": {
                    "status": {"type": "string"},
                    "role": {"type": "string"}
                }
            },
            "ReportList": {
                "type": "array",
                "items": {"type": "object"}
            },
            "VariantList": {
                "type": "array",
                "items": {"type": "object"}
            },
            "RetrainStatus": {
                "type": "object",
                "required": ["status"],
                "properties": {
                    "status": {"type": "string"},
                    "state": {"type": "string"},
                    "step": {"type": "string"},
                    "progress": {"type": "number"},
                    "version": {"type": "string"},
                    "metrics": {"type": "object"},
                    "gate_passed": {"type": "boolean"},
                    "started_at": {"type": "string"},
                    "finished_at": {"type": "string"}
                }
            },
            "ModelList": {
                "type": "array",
                "items": {"type": "object"}
            },
            "Rules": {
                "type": "object",
                "properties": {
                    "categories": {"type": "object"}
                }
            },
            "AddRuleResponse": {
                "type": "object",
                "required": ["success"],
                "properties": {
                    "success": {"type": "boolean"},
                    "category": {"type": "string"},
                    "phrase": {"type": "string"},
                    "weight": {"type": "number"}
                }
            }
        }
    }
}

for fname, s in schemas.items():
    (schemas_dir / fname).write_text(json.dumps(s, indent=2), encoding="utf-8")

# 2. Fixtures (exactly 26 files to satisfy contract_fixtures.test.js)
fixtures = {
    # 1. admin_add_rule.json
    "admin_add_rule.json": {
        "success": True,
        "category": "urgency",
        "phrase": "within 1 hour",
        "weight": 15
    },
    # 2. admin_models.json
    "admin_models.json": [
        {"version": "v2", "active": True, "accuracy": 0.95, "recall": 0.93, "created_at": "2026-10-22T08:00:00Z"},
        {"version": "v1", "active": False, "accuracy": 0.91, "recall": 0.88, "created_at": "2026-10-22T04:00:00Z"}
    ],
    # 3. admin_ping.json
    "admin_ping.json": {
        "status": "ok",
        "role": "admin"
    },
    # 4. admin_reports_pending.json
    "admin_reports_pending.json": [
        {
            "id": 1,
            "text": "Electricity cut off tonight pay immediately",
            "urls": ["http://pay-bill.click"],
            "user_label": "scam",
            "predicted_level": "amber",
            "predicted_score": 60,
            "model_version": "v2",
            "status": "pending",
            "category": "electricity_disconnection",
            "template_id": "in_elec_01",
            "duplicate_count": 1,
            "created_at": "2026-10-22T10:00:00Z",
            "reviewed_at": None
        }
    ],
    # 5. admin_reports_approved.json
    "admin_reports_approved.json": [
        {
            "id": 2,
            "text": "SBI KYC suspended update here",
            "urls": ["http://sbi-kyc.xyz"],
            "user_label": "scam",
            "predicted_level": "red",
            "predicted_score": 90,
            "model_version": "v2",
            "status": "approved",
            "category": "fake_kyc",
            "template_id": "in_kyc_01",
            "duplicate_count": 2,
            "created_at": "2026-10-22T09:00:00Z",
            "reviewed_at": "2026-10-22T09:30:00Z"
        }
    ],
    # 6. admin_retrain_passed.json
    "admin_retrain_passed.json": {
        "status": "passed",
        "state": "passed",
        "version": "v3",
        "metrics": {"accuracy": 0.96, "recall": 0.94, "fp_rate": 0.02},
        "gate_passed": True,
        "finished_at": "2026-10-22T10:15:00Z"
    },
    # 7. admin_retrain_running.json
    "admin_retrain_running.json": {
        "status": "running",
        "state": "running",
        "step": "training_model",
        "progress": 45,
        "started_at": "2026-10-22T10:10:00Z"
    },
    # 8. admin_rules.json
    "admin_rules.json": {
        "categories": {
            "urgency": [{"phrase": "within 24 hours", "weight": 15}],
            "payment_credentials": [{"phrase": "share otp", "weight": 18}]
        }
    },
    # 9. admin_variants.json
    "admin_variants.json": [
        {
            "id": 1,
            "report_id": 1,
            "text": "Your power will be disconnected at 9:30 PM. Pay bill at http://pay-bill.click",
            "label": "scam",
            "template_id": "in_elec_01_var",
            "created_at": "2026-10-22T10:05:00Z"
        }
    ],
    # 10. analyze_amber_job_hinglish.json
    "analyze_amber_job_hinglish.json": {
        "risk_score": 62,
        "level": "amber",
        "input_type": "text",
        "extracted_text": "Part-time job offer earn 3000 to 8000 daily from home. Join Telegram link.",
        "urls_found": [],
        "red_flags": [
            {"type": "tactic", "category": "reward", "evidence": "earn 3000 to 8000 daily", "strength": 0.75}
        ],
        "component_scores": {"text": 0.65, "url": None, "rules": 0.55},
        "overrides_fired": [],
        "advice_en": "Be cautious. High-paying part-time online tasks or Telegram job offers are frequently scams.",
        "advice_hi": "सावधान रहें। घर बैठे ज्यादा कमाई वाले अंशकालिक काम अक्सर धोखाधड़ी होते हैं।",
        "next_steps": ["Do not transfer any security deposit or registration fee"],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 150,
        "error": None
    },
    # 11. analyze_amber_urgency.json
    "analyze_amber_urgency.json": {
        "risk_score": 55,
        "level": "amber",
        "input_type": "text",
        "extracted_text": "Action required on your account within 2 hours.",
        "urls_found": [],
        "red_flags": [
            {"type": "tactic", "category": "urgency", "evidence": "within 2 hours", "strength": 0.60}
        ],
        "component_scores": {"text": 0.55, "url": None, "rules": 0.50},
        "overrides_fired": [],
        "advice_en": "Urgent tone detected.",
        "advice_hi": "संदेश में तात्कालिकता पाई गई।",
        "next_steps": ["Verify through official channels"],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 90,
        "error": None
    },
    # 12. analyze_green_clean_url.json
    "analyze_green_clean_url.json": {
        "risk_score": 10,
        "level": "green",
        "input_type": "url",
        "extracted_text": "",
        "urls_found": ["https://google.com"],
        "red_flags": [],
        "component_scores": {"text": None, "url": 0.10, "rules": 0.0},
        "overrides_fired": [],
        "advice_en": "Clean domain.",
        "advice_hi": "सुरक्षित लिंक।",
        "next_steps": ["Safe to browse"],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 70,
        "error": None
    },
    # 13. analyze_green_otp.json
    "analyze_green_otp.json": {
        "risk_score": 8,
        "level": "green",
        "input_type": "text",
        "extracted_text": "Your SBI NetBanking login OTP is 483921. Valid for 5 minutes. Do not share this OTP with anyone.",
        "urls_found": [],
        "entities": {"phones": [], "upi_ids": [], "urls": [], "amounts": [], "emails": [], "account_like": []},
        "overrides_fired": [],
        "red_flags": [],
        "component_scores": {"text": 0.06, "url": None, "rules": 0.04},
        "error": None,
        "advice_en": "This looks like a genuine OTP message from SBI. Remember: never share OTPs with anyone, including people claiming to be bank employees.",
        "advice_hi": "यह SBI का एक वास्तविक OTP संदेश लगता है। याद रखें: OTP कभी किसी के साथ साझा न करें, यहां तक कि बैंक कर्मचारी भी नहीं।",
        "next_steps": [
            "Never share this OTP with anyone",
            "If you did not request this OTP, contact your bank immediately"
        ],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 120
    },
    # 14. analyze_image_red.json
    "analyze_image_red.json": {
        "risk_score": 85,
        "level": "red",
        "input_type": "image",
        "extracted_text": "Your electricity will be disconnected tonight. Pay bill immediately.",
        "urls_found": ["http://pay-bill.click"],
        "red_flags": [
            {"type": "tactic", "category": "fear", "evidence": "disconnected tonight", "strength": 0.85}
        ],
        "component_scores": {"text": 0.88, "url": 0.75, "rules": 0.80},
        "overrides_fired": [],
        "advice_en": "This screenshot shows a common power bill disconnection scam.",
        "advice_hi": "यह स्क्रीनशॉट बिजली बिल धोखाधड़ी का सामान्य संकेत देता है।",
        "next_steps": ["Contact your official electricity provider board"],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 280,
        "error": None
    },
    # 15. analyze_on_device.json
    "analyze_on_device.json": {
        "risk_score": 45,
        "level": "amber",
        "input_type": "text",
        "extracted_text": "Verify your account details urgently",
        "urls_found": [],
        "red_flags": [
            {"type": "tactic", "category": "urgency", "evidence": "urgently", "strength": 0.65}
        ],
        "component_scores": {"text": 0.50, "url": None, "rules": 0.40},
        "overrides_fired": [],
        "advice_en": "Checked on-device without internet.",
        "advice_hi": "डिवाइस पर ऑफलाइन जांचा गया।",
        "next_steps": ["Check with official provider"],
        "explanation_source": "on-device",
        "model_version": "v2",
        "processing_ms": 25,
        "error": None
    },
    # 16. analyze_red_kyc_en.json (must have score 91 and authority flag for tests)
    "analyze_red_kyc_en.json": {
        "risk_score": 91,
        "level": "red",
        "input_type": "text",
        "extracted_text": "Dear customer, your SBI KYC is expiring. Update immediately at http://sbi-kyc-update.xyz/login or account will be blocked. Share OTP to verify.",
        "urls_found": ["http://sbi-kyc-update.xyz/login"],
        "entities": {
            "phones": [],
            "upi_ids": [],
            "urls": ["http://sbi-kyc-update.xyz/login"],
            "amounts": [],
            "emails": [],
            "account_like": []
        },
        "overrides_fired": ["strong_lookalike_floor"],
        "red_flags": [
            {
                "type": "tactic",
                "category": "authority",
                "evidence": "SBI",
                "strength": 0.85
            },
            {
                "type": "url",
                "category": "brand_lookalike",
                "evidence": "domain imitates sbi.co.in",
                "strength": 0.95
            },
            {
                "type": "keyword",
                "category": "text_model",
                "evidence": "kyc",
                "strength": 0.83
            },
            {
                "type": "tactic",
                "category": "urgency",
                "evidence": "immediately",
                "strength": 0.72
            },
            {
                "type": "tactic",
                "category": "payment_credentials",
                "evidence": "share otp",
                "strength": 0.90
            }
        ],
        "component_scores": {"text": 0.91, "url": 0.95, "rules": 0.80},
        "error": None,
        "advice_en": "This message is very likely a scam because it uses a fake SBI website and demands your OTP urgently. Real banks never ask for OTPs over SMS. Do not click the link or share any credentials.",
        "advice_hi": "यह संदेश संभवतः धोखाधड़ी है क्योंकि यह एक नकली SBI वेबसाइट का उपयोग करता है और आपका OTP तुरंत मांगता है। असली बैंक कभी SMS पर OTP नहीं मांगते। लिंक पर क्लिक न करें और कोई जानकारी साझा न करें।",
        "next_steps": [
            "Do not click the link",
            "Do not share your OTP, UPI PIN, or CVV with anyone",
            "Block the sender",
            "Report at 1930 or cybercrime.gov.in"
        ],
        "explanation_source": "llm",
        "model_version": "v2",
        "processing_ms": 340
    },
    # 17. analyze_ta_translated.json
    "analyze_ta_translated.json": {
        "risk_score": 88,
        "level": "red",
        "input_type": "text",
        "extracted_text": "மின் இணைப்பு துண்டிக்கப்படும்",
        "urls_found": [],
        "red_flags": [
            {"type": "tactic", "category": "fear", "evidence": "power cut", "strength": 0.85}
        ],
        "component_scores": {"text": 0.85, "url": None, "rules": 0.75},
        "overrides_fired": [],
        "advice_en": "Electricity disconnection threat detected.",
        "advice_hi": "बिजली कटौती की धमकी पाई गई।",
        "advice_local": "மின் இணைப்பு துண்டிப்பு அச்சுறுத்தல் கண்டறியப்பட்டது.",
        "language": {
            "code": "ta",
            "script": "Tamil",
            "translated": True,
            "translation": "Electricity connection will be disconnected",
            "translator": "indictrans2-dist-200M"
        },
        "next_steps": ["Do not call unknown helpline numbers"],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 210,
        "error": None
    },
    # 18. analyze_ta_translation_failed.json
    "analyze_ta_translation_failed.json": {
        "risk_score": 75,
        "level": "red",
        "input_type": "text",
        "extracted_text": "Unknown tamil message translation fail",
        "urls_found": [],
        "red_flags": [],
        "component_scores": {"text": 0.50, "url": None, "rules": 0.40},
        "overrides_fired": [],
        "advice_en": "Translation was unavailable. Proceed with caution.",
        "advice_hi": "अनुवाद उपलब्ध नहीं था। कृपया सावधानी बरतें।",
        "language": {
            "code": "ta",
            "script": "Tamil",
            "translated": False,
            "translation": None,
            "translator": "indictrans2-dist-200M"
        },
        "next_steps": ["Verify manually"],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 110,
        "error": None
    },
    # 19. analyze_url_only_official.json
    "analyze_url_only_official.json": {
        "risk_score": 5,
        "level": "green",
        "input_type": "url",
        "extracted_text": "",
        "urls_found": ["https://www.onlinesbi.sbi/"],
        "entities": {"phones": [], "upi_ids": [], "urls": ["https://www.onlinesbi.sbi/"], "amounts": [], "emails": [], "account_like": []},
        "overrides_fired": ["official_domain_cap"],
        "red_flags": [],
        "component_scores": {"text": None, "url": 0.05, "rules": 0.00},
        "error": None,
        "advice_en": "This is the official SBI NetBanking website. It appears safe to visit. Always check the URL carefully before entering any credentials.",
        "advice_hi": "यह SBI नेटबैंकिंग की आधिकारिक वेबसाइट है। यह देखने में सुरक्षित लगती है। कोई भी जानकारी दर्ज करने से पहले URL ध्यान से देखें।",
        "next_steps": [
            "Always bookmark official banking sites rather than using links",
            "Check the full URL bar before logging in"
        ],
        "explanation_source": "template",
        "model_version": "v2",
        "processing_ms": 85
    },
    # 20. analyze_v1_legacy.json (must have text score 0.93 and specific next steps for test)
    "analyze_v1_legacy.json": {
        "risk_score": 82,
        "level": "red",
        "input_type": "text",
        "extracted_text": "Dear customer your SBI KYC is pending update immediately at http://sbi-kyc.xyz",
        "urls_found": ["http://sbi-kyc.xyz"],
        "red_flags": [
            {"type": "url", "category": "brand_lookalike", "evidence": "sbi-kyc.xyz", "strength": 0.90}
        ],
        "component_scores": {"text": 0.93, "url": 0.88, "rules": 0.70},
        "overrides_fired": [],
        "advice_en": "Fake SBI website detected.",
        "advice_hi": "नकली एसबीआई वेबसाइट पाई गई।",
        "next_steps": ["Do not click the link or reply."],
        "explanation_source": "template",
        "model_version": "v1",
        "processing_ms": 120,
        "error": None
    },
    # 21. error_400_empty.json
    "error_400_empty.json": {
        "error": "Please enter a message, suspicious link, or upload a screenshot to check."
    },
    # 22. error_422_bad_form.json
    "error_422_bad_form.json": {
        "error": "Some fields are invalid."
    },
    # 23. error_503_model_not_ready.json
    "error_503_model_not_ready.json": {
        "error": "The model is not ready."
    },
    # 24. health_v2.json
    "health_v2.json": {
        "status": "ok",
        "components": {
            "text_model": True,
            "url_model": True,
            "rules": True,
            "ocr": True,
            "llm_gemini": False,
            "llm_groq": False
        },
        "model_version": "v2",
        "api_version": 2,
        "config": {}
    },
    # 25. languages.json
    "languages.json": {
        "languages": [
            {"code": "en", "name": "English", "script": "Latin"},
            {"code": "hi", "name": "Hindi", "script": "Devanagari"},
            {"code": "ta", "name": "Tamil", "script": "Tamil"}
        ],
        "translator": "ready",
        "translator_engine": "indictrans2-dist-200M"
    },
    # 26. radar_demo.json
    "radar_demo.json": {
        "demo": True,
        "generated_at": "2026-10-22T00:00:00Z",
        "top_scam_categories": [
            {"category": "fake_kyc", "count": 42},
            {"category": "digital_arrest", "count": 28},
            {"category": "job_offer", "count": 19}
        ],
        "top_entities": [
            {"type": "upi_id", "value": "refund.help@ybl", "reports": 15},
            {"type": "phone", "value": "98XXXXXX12", "reports": 11}
        ],
        "trend": [
            {"date": "2026-10-20", "count": 25},
            {"date": "2026-10-21", "count": 34},
            {"date": "2026-10-22", "count": 42}
        ]
    }
}

# Also ensure report_ok.json exists if needed by anything else
(fixtures_dir / "report_ok.json").write_text(json.dumps({"status": "received"}, indent=2), encoding="utf-8")

for fname, content in fixtures.items():
    (fixtures_dir / fname).write_text(json.dumps(content, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"Generated {len(schemas)} schemas and {len(fixtures)} fixtures")
