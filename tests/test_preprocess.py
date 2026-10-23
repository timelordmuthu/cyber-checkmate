"""
tests/test_preprocess.py
------------------------
Tests for backend/pipeline/preprocess.py covering:
- URL extraction (with/without scheme, trailing punctuation)
- Non-URL patterns: Rs.500, 10.30, v2.0, e.g. must NOT be matched
- replace_urls → URLTOKEN
- normalise_for_rules: lowercase, collapse spaces, k.y.c→kyc, homoglyphs
  in mixed tokens only, OTP/amount/date untouched, Devanagari preserved
- prepare() integration
"""

import pytest
from backend.pipeline.preprocess import (
    extract_urls,
    replace_urls,
    normalise_for_rules,
    prepare,
)


# ===================================================================
# extract_urls
# ===================================================================

class TestExtractUrls:
    def test_url_with_http(self):
        urls = extract_urls("Visit http://example.com/page for info")
        assert urls == ["http://example.com/page"]

    def test_url_with_https(self):
        urls = extract_urls("Go to https://secure.bank.co.in/login?q=1")
        assert urls == ["https://secure.bank.co.in/login?q=1"]

    def test_url_without_scheme(self):
        urls = extract_urls("Check sbi-kyc-update.xyz/login now")
        assert any("sbi-kyc-update.xyz" in u for u in urls)

    def test_multiple_urls(self):
        text = "Visit http://a.com and http://b.com today"
        urls = extract_urls(text)
        assert len(urls) == 2

    def test_dedup(self):
        text = "Go to http://a.com and again http://a.com"
        urls = extract_urls(text)
        assert len(urls) == 1

    def test_trailing_punctuation_stripped(self):
        urls = extract_urls("Visit http://example.com/page.")
        assert urls == ["http://example.com/page"]

    def test_trailing_comma_stripped(self):
        urls = extract_urls("See http://example.com, for details")
        assert urls == ["http://example.com"]

    # --- Must NOT match ---

    def test_no_match_rs_amount(self):
        urls = extract_urls("Pay Rs.500 immediately")
        assert urls == []

    def test_no_match_decimal(self):
        urls = extract_urls("It was 10.30 AM when it happened")
        assert urls == []

    def test_no_match_version(self):
        urls = extract_urls("Upgraded to v2.0 today")
        assert urls == []

    def test_no_match_eg(self):
        urls = extract_urls("For e.g. you could try this")
        assert urls == []

    def test_no_match_plain_number(self):
        urls = extract_urls("Call 9812345678 for help")
        assert urls == []


# ===================================================================
# replace_urls
# ===================================================================

class TestReplaceUrls:
    def test_single_replacement(self):
        text = "Go to http://evil.com/steal now"
        urls = ["http://evil.com/steal"]
        result = replace_urls(text, urls)
        assert result == "Go to URLTOKEN now"

    def test_multiple_replacements(self):
        text = "See http://a.com and http://b.com"
        urls = ["http://a.com", "http://b.com"]
        result = replace_urls(text, urls)
        assert result == "See URLTOKEN and URLTOKEN"

    def test_no_urls(self):
        text = "Just a plain message"
        result = replace_urls(text, [])
        assert result == text


# ===================================================================
# normalise_for_rules
# ===================================================================

class TestNormaliseForRules:
    def test_lowercase(self):
        assert normalise_for_rules("HELLO WORLD") == "hello world"

    def test_collapse_whitespace(self):
        assert normalise_for_rules("hello   world") == "hello world"

    def test_kyc_dots(self):
        result = normalise_for_rules("complete K.Y.C now")
        assert "kyc" in result

    def test_kyc_spaces(self):
        result = normalise_for_rules("complete k y c now")
        assert "kyc" in result

    def test_otp_zero_becomes_o_in_mixed(self):
        # "0TP" is mixed (digit 0 + letters TP) → "otp"
        result = normalise_for_rules("Share your 0TP")
        assert "otp" in result

    def test_pure_number_untouched(self):
        # "500" is pure digits → no homoglyph mapping
        result = normalise_for_rules("Rs 500 only")
        assert "500" in result

    def test_date_untouched(self):
        result = normalise_for_rules("Due on 10.30 AM")
        # 10.30 has no letters, so it stays
        assert "10.30" in result

    def test_otp_code_untouched(self):
        # "482901" is pure digits → stays as is
        result = normalise_for_rules("Your OTP is 482901")
        assert "482901" in result

    def test_devanagari_preserved(self):
        text = "आपका खाता बंद हो जाएगा"
        result = normalise_for_rules(text)
        assert "आपका" in result
        assert "खाता" in result
        assert "बंद" in result

    def test_mixed_homoglyph_dollar(self):
        # "$ecure" has letters and $, so $ → s
        result = normalise_for_rules("$ecure login")
        assert "secure" in result

    def test_at_sign_in_mixed(self):
        # "p@ss" has letters and @, so @ → a
        result = normalise_for_rules("Enter p@ss")
        assert "pass" in result

    def test_pure_symbol_not_mapped(self):
        # "@" alone or "$" alone → no mapping since not a mixed token
        result = normalise_for_rules("send @ 5 PM")
        assert "@" in result


# ===================================================================
# prepare() integration
# ===================================================================

class TestPrepare:
    def test_full_scam_message(self):
        text = (
            "Dear customer, update your K.Y.C at http://sbi-kyc.xyz/login "
            "or your account will be blocked within 24 hours"
        )
        p = prepare(text)
        assert p.original == text
        assert "http://sbi-kyc.xyz/login" in p.urls
        assert "URLTOKEN" in p.text_for_model
        assert "http://sbi-kyc.xyz/login" not in p.text_for_model
        assert "kyc" in p.text_for_rules

    def test_no_urls(self):
        text = "Your OTP is 123456. Do not share."
        p = prepare(text)
        assert p.urls == []
        assert "URLTOKEN" not in p.text_for_model
        assert "123456" in p.text_for_rules

    def test_rs_not_extracted_as_url(self):
        text = "Pay Rs.500 or you'll be charged Rs.1000"
        p = prepare(text)
        assert p.urls == []
