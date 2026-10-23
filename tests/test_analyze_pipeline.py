"""tests/test_analyze_pipeline.py

Integration tests for the core analyze pipeline per PRD FR1.
Covers:
- Fake-KYC text with lookalike link -> red verdict
- Legit bank OTP text -> green verdict
- Message without URL -> component_scores.url is None
- Empty input -> BadInput exception
- Image input in Part 1 -> BadInput exception ("Screenshot checking is coming soon.")
- Response schema contract validation
"""

from __future__ import annotations

import io
import pytest
from backend.pipeline.analyze import analyze, init_pipeline, BadInput, get_text_model
from backend.schemas import AnalyzeResponse

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False


@pytest.fixture(scope="module", autouse=True)
def setup_pipeline():
    init_pipeline()


def test_empty_input_raises_bad_input():
    with pytest.raises(BadInput, match="No input provided"):
        analyze()

    with pytest.raises(BadInput, match="No input provided"):
        analyze(text="", url="   ")


def test_unreadable_image_raises_bad_input():
    with pytest.raises(BadInput, match="We couldn't open that image"):
        analyze(image_bytes=b"\x89PNG\r\n\x1a\n...")


@pytest.mark.skipif(not EASYOCR_AVAILABLE, reason="easyocr is not installed")
def test_analyze_image_extracts_text_and_url():
    """analyze(image_bytes=...) extracts text, returns input_type 'image', KYC, and URL."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (1000, 200), color="white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("verdana.ttf", 26)
    except Exception:
        try:
            font = ImageFont.truetype("arial.ttf", 26)
        except Exception:
            font = ImageFont.load_default()

    draw.text((30, 30), "Your SBI account will be blocked.", fill="black", font=font)
    draw.text((30, 80), "Update KYC at sbi-kyc-update.xyz", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    res = analyze(image_bytes=buf.getvalue())
    assert res.input_type == "image"
    assert "KYC" in res.extracted_text.upper()
    assert any("sbi-kyc-update" in u for u in res.urls_found)


def test_fake_kyc_with_lookalike_link_is_red():
    msg = (
        "Dear Customer, your SBI account KYC is pending! "
        "Update immediately at http://sbi.kyc-update.xyz/login "
        "or your account will be blocked within 24 hours. Call 9800000001."
    )
    res = analyze(text=msg)

    assert isinstance(res, AnalyzeResponse)
    assert res.level == "red", f"Expected red, got {res.level} (risk_score={res.risk_score})"
    assert res.risk_score > 70
    assert len(res.urls_found) >= 1
    assert "http://sbi.kyc-update.xyz/login" in res.urls_found[0]
    assert res.component_scores.url is not None
    assert res.component_scores.url >= 0.9

    # Verify red flags include strong lookalike
    lookalike_flags = [rf for rf in res.red_flags if rf.category == "brand_lookalike"]
    assert len(lookalike_flags) >= 1, "Expected brand_lookalike red flag"
    assert "State Bank of India" in lookalike_flags[0].evidence or "SBI" in lookalike_flags[0].evidence

    # Verify bilingual explanations
    assert len(res.advice_en) > 10
    assert len(res.advice_hi) > 10
    assert len(res.next_steps) >= 2
    assert res.error is None
    assert res.model_version in ("v1", "v2")


def test_bank_otp_is_green():
    msg = (
        "Your SBI NetBanking login OTP is 483921. Valid for 5 minutes. "
        "Do not share this OTP with anyone, including bank staff."
    )
    res = analyze(text=msg)

    assert isinstance(res, AnalyzeResponse)
    assert res.level == "green", f"Expected green, got {res.level} (risk_score={res.risk_score})"
    assert res.risk_score < 35
    assert res.component_scores.url is None
    assert len(res.urls_found) == 0
    assert res.input_type == "text"
    assert res.error is None


def test_no_url_has_null_url_component_score():
    msg = "Hello friend, are we still meeting for tea this evening at the college canteen?"
    res = analyze(text=msg)

    assert res.component_scores.url is None
    assert res.urls_found == []
    assert res.risk_score < 35
    assert res.level == "green"


def test_url_only_input():
    # Only URL provided
    scam_url = "http://sbi.kyc-update.xyz/login"
    res = analyze(url=scam_url)

    assert res.input_type == "url"
    assert res.urls_found == [scam_url]
    assert res.level == "red"
    assert res.component_scores.url is not None
    assert res.component_scores.url >= 0.9
    assert res.component_scores.text is None


def test_url_only_official_sbi_is_green():
    res = analyze(url="https://www.onlinesbi.sbi/")
    assert res.level == "green"
    assert res.component_scores.text is None


def test_url_only_lookalike_hdfc_is_amber_or_red():
    res = analyze(url="hdfcbamk.com/login")
    assert res.level in ("amber", "red")
    assert res.component_scores.text is None


def test_text_with_url_has_numeric_text_component():
    msg = "Dear customer your SBI KYC expired update at http://sbi-kyc-update.xyz/login"
    res = analyze(text=msg)
    assert res.component_scores.text is not None
    assert isinstance(res.component_scores.text, float)


def test_green_message_filters_low_strength_keywords():
    res = analyze(text="bro send me the notes for tomorrow's lab")
    assert res.level == "green"
    low_strength_keywords = [
        f for f in res.red_flags if f.type == "keyword" and f.strength < 0.6
    ]
    assert len(low_strength_keywords) == 0


def test_fake_kyc_message_keyword_flags_count():
    msg = "Dear customer, your SBI KYC has expired. Update within 24 hours at http://sbi-kyc-update.xyz/login"
    res = analyze(text=msg)
    keyword_flags = [f for f in res.red_flags if f.type == "keyword"]
    assert len(keyword_flags) <= 3
    assert any("sbi-kyc-update.xyz" in u for u in res.entities.urls)


def test_send_amount_to_upi_entities():
    res = analyze(text="Send Rs 5000 to winner.claim@ybl")
    assert res.entities.upi_ids == ["winner.claim@ybl"]
    assert res.entities.amounts == ["₹5000"]


def test_text_model_to_red_flags_filters_noise():
    text_model = get_text_model()
    flags = text_model.to_red_flags("the and you your for 123 urltoken kyc expired update customer")
    assert len(flags) <= 3
    for f in flags:
        assert len(f["evidence"]) >= 3
        assert not f["evidence"].isdigit()
        assert f["evidence"].lower() != "urltoken"
        assert f["evidence"].lower() not in {
            "the", "and", "you", "your", "for", "with", "this", "that", "are",
            "have", "has", "from", "will", "our", "can", "not", "all", "was",
            "now", "get", "hai", "ka", "ki", "ke", "se", "me", "ko", "aap",
        }


# ---------------------------------------------------------------------------
# FIX 3 — URL-only official domain returns green (F2 regression test)
# ---------------------------------------------------------------------------
def test_official_url_only_is_green():
    """
    analyze(text="https://www.onlinesbi.sbi/") must return level "green"
    and component_scores.text must be None (text model not invoked).

    Printed diagnostic: text_for_model for this input is 'URLTOKEN'.
    has_words is False after stripping URLTOKEN, so text_prob is None.
    Official domain whitelist override caps the score at 30 → green.
    """
    res = analyze(text="https://www.onlinesbi.sbi/")
    assert res.level == "green", (
        f"Expected green, got {res.level} (risk_score={res.risk_score}, "
        f"component_scores={res.component_scores})"
    )
    assert res.component_scores.text is None, (
        f"Expected component_scores.text to be None for URL-only input, "
        f"got {res.component_scores.text}"
    )
