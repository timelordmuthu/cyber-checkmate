"""
backend/pipeline/rules.py
--------------------------
Tactic rule engine per PRD FR2 and Section 16.3.

Scoring:
- Each phrase has a weight 1–20.
- Per category, take only the highest-weight matched phrase.
- rule_score = min(1.0, sum(category_max_weights) / 50)
- If ≥3 distinct categories match, add +0.15 (still capped at 1.0).
- A flag's strength = phrase weight / 20.

Evidence in red_flags comes from the ORIGINAL text (not normalised).

Thread-safe reload() for hot-swapping tactics.json from the admin page.
"""

from __future__ import annotations

import json
import re
import threading
from pathlib import Path
from typing import Optional

from backend.config import (
    TACTICS_JSON,
    RULE_SCORE_DENOMINATOR,
    RULE_COMBINATION_BONUS,
    RULE_CATEGORY_BONUS_MIN,
    RULE_PHRASE_WEIGHT_MAX,
)


@staticmethod
def _find_evidence(original: str, phrase: str) -> Optional[str]:
    """Find the phrase (case-insensitive) in the original text and return the matching span."""
    # Try exact (case-insensitive) match first
    pattern = re.compile(re.escape(phrase), re.IGNORECASE)
    m = pattern.search(original)
    if m:
        return m.group(0)
    return None


_LATIN_PHRASE_RE = re.compile(r"^[a-z0-9\s'\-]+$", re.IGNORECASE)

_NEGATION_WORDS = {
    "don't", "dont", "never", "not", "mat", "na", "nahi", "नहीं", "मत", "ना"
}
_NEGATION_PHRASES = ("do not", "no need to")


def _is_negated(prefix: str) -> bool:
    """
    Check if any negation word or phrase appears in the 3 words immediately before match_start.
    """
    words = prefix.split()
    if not words:
        return False
    last_3 = words[-3:]
    last_3_clean = [w.strip(".,;:!?\"'()[]{}") for w in last_3]

    for w in last_3_clean:
        if w in _NEGATION_WORDS:
            return True
    for w in last_3:
        if w in _NEGATION_WORDS:
            return True

    last_3_str = " ".join(last_3_clean)
    last_2_str = " ".join(last_3_clean[-2:]) if len(last_3_clean) >= 2 else ""
    for phrase in _NEGATION_PHRASES:
        if phrase in (last_3_str, last_2_str) or f" {phrase}" in f" {last_3_str}":
            return True
        raw_3_str = " ".join(last_3)
        if phrase in raw_3_str:
            return True

    return False


class RuleEngine:
    """Thread-safe tactic rule engine with hot-reload support."""

    def __init__(self, tactics_path: Optional[Path] = None) -> None:
        self._path = tactics_path or TACTICS_JSON
        self._lock = threading.Lock()
        self._tactics: dict[str, list[dict]] = {}
        self._loaded = False
        if self._path.exists():
            self.reload()

    def reload(self) -> None:
        """Load (or hot-reload) tactics.json. Thread-safe."""
        data = json.loads(self._path.read_text(encoding="utf-8"))
        # Build a new dict atomically, then swap
        new_tactics: dict[str, list[dict]] = {}
        for category, phrases in data.items():
            new_tactics[category] = []
            for p in phrases:
                phrase = p["phrase"].lower()
                entry = {
                    "phrase": phrase,
                    "weight": p["weight"],
                    "original_phrase": p["phrase"],
                }
                if _LATIN_PHRASE_RE.match(phrase):
                    pattern = r"(?<![a-z0-9])" + re.escape(phrase) + r"(?![a-z0-9])"
                    entry["_re"] = re.compile(pattern)
                else:
                    entry["_re"] = None
                new_tactics[category].append(entry)
        with self._lock:
            self._tactics = new_tactics
            self._loaded = True

    @property
    def loaded(self) -> bool:
        return self._loaded

    @property
    def categories(self) -> list[str]:
        with self._lock:
            return list(self._tactics.keys())

    def match(self, text_for_rules: str) -> dict[str, list[dict]]:
        """Match normalised text against tactics. Returns {category: [matched_phrases]}."""
        with self._lock:
            tactics = dict(self._tactics)  # snapshot

        matches: dict[str, list[dict]] = {}
        text_lower = text_for_rules.lower()

        for category, phrases in tactics.items():
            check_negation = category in ("payment_credentials", "isolation")
            for entry in phrases:
                compiled_re = entry.get("_re")
                matched = False

                if compiled_re is not None:
                    if check_negation:
                        for m in compiled_re.finditer(text_lower):
                            if not _is_negated(text_lower[:m.start()]):
                                matched = True
                                break
                    else:
                        if compiled_re.search(text_lower):
                            matched = True
                else:
                    phrase = entry["phrase"]
                    if check_negation:
                        start = 0
                        while True:
                            idx = text_lower.find(phrase, start)
                            if idx == -1:
                                break
                            if not _is_negated(text_lower[:idx]):
                                matched = True
                                break
                            start = idx + max(1, len(phrase))
                    else:
                        if phrase in text_lower:
                            matched = True

                if matched:
                    if category not in matches:
                        matches[category] = []
                    # Return clean copy without _re
                    clean_entry = {k: v for k, v in entry.items() if k != "_re"}
                    matches[category].append(clean_entry)

        return matches

    def score(self, text_for_rules: str) -> tuple[float, dict[str, list[dict]]]:
        """Compute the rule score per 16.3.

        Returns (rule_score, matches_dict).
        """
        matches = self.match(text_for_rules)

        # Per-category max weight
        category_max: dict[str, int] = {}
        for category, entries in matches.items():
            category_max[category] = max(e["weight"] for e in entries)

        total_weight = sum(category_max.values())
        rule_score = min(1.0, total_weight / RULE_SCORE_DENOMINATOR)

        # Combination bonus
        if len(category_max) >= RULE_CATEGORY_BONUS_MIN:
            rule_score = min(1.0, rule_score + RULE_COMBINATION_BONUS)

        return rule_score, matches

    def to_red_flags(
        self,
        matches: dict[str, list[dict]],
        original_text: str,
    ) -> list[dict]:
        """Convert matches to FR1 red_flag dicts with evidence from ORIGINAL text.

        Each flag: type="tactic", category=<cat>, evidence=<from original>, strength=weight/20
        """
        flags: list[dict] = []

        for category, entries in matches.items():
            # Use the highest-weight phrase for this category
            best = max(entries, key=lambda e: e["weight"])
            phrase = best["original_phrase"]
            weight = best["weight"]
            strength = round(weight / RULE_PHRASE_WEIGHT_MAX, 2)

            # Find evidence in original text
            evidence = _find_evidence(original_text, phrase)
            if evidence is None:
                # Fallback: use the phrase itself
                evidence = phrase

            flags.append({
                "type": "tactic",
                "category": category,
                "evidence": evidence,
                "strength": strength,
            })

        return flags

    def has_payment_and_urgency(self, matches: dict[str, list[dict]]) -> bool:
        """Check if both payment_credentials AND urgency are matched (for fusion override)."""
        return "payment_credentials" in matches and "urgency" in matches
