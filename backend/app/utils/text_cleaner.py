"""
Text cleaning utilities for OCR and PDF extraction noise removal.
Applied during Layer 3 (Preprocessing).
"""

from __future__ import annotations

import re
import unicodedata


# Patterns that indicate OCR scanning artifacts
_OCR_ARTIFACTS = re.compile(
    r"[^\x00-\x7F\u00C0-\u024F\u0900-\u097F]"  # Non-Latin, non-Devanagari chars
    r"|[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]"       # Control characters (keep \t \n \r)
)

_MULTIPLE_SPACES = re.compile(r" {2,}")
_MULTIPLE_NEWLINES = re.compile(r"\n{3,}")
_PAGE_NUMBERS = re.compile(r"^\s*(?:page\s*)?\d+\s*(?:of\s*\d+)?\s*$", re.IGNORECASE | re.MULTILINE)
_HEADER_FOOTER = re.compile(
    r"(?:^\s*(?:confidential|private|draft|copy|proprietary)\s*$)",
    re.IGNORECASE | re.MULTILINE,
)
_NULL_BYTES = re.compile(r"\x00")
_HYPHENATED_LINEBREAK = re.compile(r"-\n(\w)")   # "hyph-\nenated" → "hyphenated"
_LIGATURES = str.maketrans({
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\u2019": "'",
    "\u2018": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2026": "...",
    "\u00b0": " degrees",
    "\u03bc": "u",      # micro symbol
    "\u03b1": "alpha",
    "\u03b2": "beta",
})


def remove_null_bytes(text: str) -> str:
    return _NULL_BYTES.sub("", text)


def normalize_unicode(text: str) -> str:
    """NFC normalize and replace common ligatures / smart quotes."""
    text = unicodedata.normalize("NFC", text)
    return text.translate(_LIGATURES)


def remove_control_chars(text: str) -> str:
    return _OCR_ARTIFACTS.sub(" ", text)


def fix_hyphenated_linebreaks(text: str) -> str:
    """Rejoin words split across lines with a hyphen."""
    return _HYPHENATED_LINEBREAK.sub(r"\1", text)


def remove_page_numbers(text: str) -> str:
    return _PAGE_NUMBERS.sub("", text)


def remove_header_footer_noise(text: str) -> str:
    return _HEADER_FOOTER.sub("", text)


def normalize_whitespace(text: str) -> str:
    text = _MULTIPLE_SPACES.sub(" ", text)
    text = _MULTIPLE_NEWLINES.sub("\n\n", text)
    return text.strip()


def deduplicate_lines(text: str) -> str:
    """
    Remove lines that appear more than 3 times (repeated headers/footers).
    Keeps structure intact for lines that appear legitimately multiple times (e.g. table rows).
    """
    lines = text.split("\n")
    from collections import Counter
    counts = Counter(line.strip() for line in lines if line.strip())
    cleaned = []
    seen_duplicates: set[str] = set()
    for line in lines:
        stripped = line.strip()
        if counts[stripped] > 3:
            if stripped not in seen_duplicates:
                seen_duplicates.add(stripped)
                cleaned.append(line)
            # skip subsequent duplicates
        else:
            cleaned.append(line)
    return "\n".join(cleaned)


def clean_text(text: str) -> str:
    """
    Full cleaning pipeline applied to raw extracted text.
    Order matters — apply fixes sequentially.
    """
    text = remove_null_bytes(text)
    text = normalize_unicode(text)
    text = fix_hyphenated_linebreaks(text)
    text = remove_control_chars(text)
    text = remove_page_numbers(text)
    text = remove_header_footer_noise(text)
    text = deduplicate_lines(text)
    text = normalize_whitespace(text)
    return text
