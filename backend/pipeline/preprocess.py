"""
backend/pipeline/preprocess.py
------------------------------
Text preprocessing exactly per PRD Section 16.2.

Pipeline:
  1. extract_urls   — pull URLs (with/without scheme) from raw text
  2. replace_urls   — swap each URL in the text with URLTOKEN
  3. normalise_for_rules — lowercase, collapse spaces, deobfuscate
  4. prepare(text)  → original, urls, text_for_model, text_for_rules

Key rules from 16.2:
- Extract URLs FIRST, then replace with URLTOKEN before text model and rules.
- Two versions: original (for evidence) and normalised (for matching).
- Normalisation: lowercase; collapse whitespace; join single-letter-dot/space
  patterns (k.y.c → kyc); map 0→o 1→l @→a $→s ONLY inside mixed tokens.
- Devanagari is left untouched.
- Must NOT match "Rs.500", "10.30", "v2.0", "e.g." as URLs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# URL extraction
# ---------------------------------------------------------------------------

# Match URLs with a scheme (http, https, ftp)
_URL_WITH_SCHEME = re.compile(
    r"""
    (?:https?|ftp)://                     # scheme
    [^\s<>\"'\)\]\},;]+                   # rest of URL (greedy, stops at whitespace/delimiters)
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Match URLs without a scheme: domain.tld/optional-path
# Must start with a word char, have at least one dot, and a valid TLD-like suffix.
# Negative lookbehind: not preceded by @ (emails), digit/dot (decimals like 10.30),
# or a letter+dot that looks like abbreviation.
_URL_NO_SCHEME = re.compile(
    r"""
    (?<![A-Za-z])                          # not preceded by letter (avoids "e.g.", "v2.0")
    (?<!\d)                                # not preceded by digit (avoids "10.30", "Rs.500")
    (?<![/@])                              # not preceded by @ or /
    (?:
        (?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+ # subdomains
        (?:com|org|net|in|co\.in|gov\.in|ac\.in|edu|io|xyz|top|live|click|
           info|buzz|me|biz|us|uk|gle|ly|be|cc|to|app|dev|site|online|
           gq|ml|tk|cf|ga|pw|rest|cyou|cfd|monster|hair)  # TLD
    )
    (?:[/][^\s<>\"'\)\]\},;]*)?            # optional path
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Trailing punctuation that's likely not part of the URL
_TRAILING_PUNCT = re.compile(r"[.,;:!?\)\]\}>]+$")


def extract_urls(text: str) -> list[str]:
    """Extract URLs from text. Returns a deduplicated list, order-preserved.

    Must NOT match: "Rs.500", "10.30", "v2.0", "e.g." or similar.
    """
    urls: list[str] = []
    seen: set[str] = set()
    matched_spans: list[tuple[int, int]] = []

    for match in _URL_WITH_SCHEME.finditer(text):
        url = _TRAILING_PUNCT.sub("", match.group(0))
        if url and url not in seen:
            seen.add(url)
            urls.append(url)
            matched_spans.append(match.span())

    for match in _URL_NO_SCHEME.finditer(text):
        start, end = match.span()
        # Skip if this match overlaps with any previously matched scheme URL
        if any(s <= start < e or s < end <= e for s, e in matched_spans):
            continue
        url = _TRAILING_PUNCT.sub("", match.group(0))
        # Extra guard: skip if looks like a version or decimal
        if re.match(r"^[vV]?\d+\.\d+", url):
            continue
        # Skip if it looks like Rs.NNN
        if re.match(r"(?i)^rs\.\d", url):
            continue
        if url and url not in seen:
            seen.add(url)
            urls.append(url)

    return urls


def replace_urls(text: str, urls: list[str]) -> str:
    """Replace each extracted URL in the text with URLTOKEN."""
    result = text
    for url in urls:
        result = result.replace(url, "URLTOKEN")
    return result


# ---------------------------------------------------------------------------
# Text normalisation (for rule engine matching) — PRD 16.2
# ---------------------------------------------------------------------------

# Pattern for single letters separated by dots or spaces: k.y.c, k y c, K.Y.C
_SINGLE_LETTER_DOTS = re.compile(
    r"""
    \b
    ([A-Za-z])           # first letter
    (?:                  # followed by one or more of:
        [.\s]+           #   dots/spaces
        ([A-Za-z])       #   another single letter
    )+
    \b
    """,
    re.VERBOSE,
)


def _join_single_letter_patterns(text: str) -> str:
    """Join 'k.y.c', 'k y c', 'K.Y.C' → 'kyc'."""
    def _replace(m: re.Match) -> str:
        # Get all the characters in the match, strip dots and spaces
        raw = m.group(0)
        letters = re.sub(r"[.\s]+", "", raw)
        return letters

    return _SINGLE_LETTER_DOTS.sub(_replace, text)


def _is_mixed_token(token: str) -> bool:
    """True if token contains BOTH letters and digits/symbols (@, $, 0-9)."""
    has_letter = any(c.isalpha() for c in token)
    has_digit_or_sym = any(c.isdigit() or c in "@$" for c in token)
    return has_letter and has_digit_or_sym


_HOMOGLYPH_MAP = str.maketrans({
    "0": "o",
    "1": "l",
    "@": "a",
    "$": "s",
})


def normalise_for_rules(text: str) -> str:
    """Normalise text for rule matching per PRD 16.2.

    Steps:
    1. Lowercase
    2. Collapse whitespace
    3. Join single-letter dot/space patterns (k.y.c → kyc)
    4. Map 0→o 1→l @→a $→s ONLY inside mixed letter+digit/symbol tokens
    5. Devanagari left untouched
    """
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    text = _join_single_letter_patterns(text)

    # Apply homoglyph mapping only to mixed tokens
    tokens = text.split(" ")
    result_tokens: list[str] = []
    for token in tokens:
        if _is_mixed_token(token):
            token = token.translate(_HOMOGLYPH_MAP)
        result_tokens.append(token)

    return " ".join(result_tokens)


# ---------------------------------------------------------------------------
# Main prepare() function
# ---------------------------------------------------------------------------

@dataclass
class PreparedText:
    """Result of preparing raw text for the analysis pipeline."""
    original: str          # untouched input (for evidence snippets)
    urls: list[str]        # extracted URLs
    text_for_model: str    # URLs replaced with URLTOKEN (for TF-IDF)
    text_for_rules: str    # normalised version (for rule matching)


def prepare(text: str) -> PreparedText:
    """Full preprocessing pipeline per PRD 16.2.

    1. Extract URLs from the original text.
    2. Replace URLs with URLTOKEN → text_for_model.
    3. Normalise the URLTOKEN'd text → text_for_rules.
    """
    original = text
    urls = extract_urls(text)
    text_with_tokens = replace_urls(text, urls)
    text_for_rules = normalise_for_rules(text_with_tokens)

    return PreparedText(
        original=original,
        urls=urls,
        text_for_model=text_with_tokens,
        text_for_rules=text_for_rules,
    )
