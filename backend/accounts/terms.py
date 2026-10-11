import re

# Accepts "2026-2027", "2026 - 2027", "AY 2026-2027", with -, en dash or em dash.
_AY_RE = re.compile(r"^\s*(?:AY\s*)?(\d{4})\s*[-\u2013\u2014]\s*(\d{4})\s*$", re.IGNORECASE)


def normalize_academic_year(value):
    """Return the canonical 'YYYY-YYYY' form, or raise ValueError with a
    student-friendly message."""
    match = _AY_RE.match(value or "")
    if not match:
        raise ValueError("Enter the academic year like 2026-2027.")
    start, end = int(match.group(1)), int(match.group(2))
    if end != start + 1:
        raise ValueError("The second year must be one year after the first (e.g. 2026-2027).")
    if not 2000 <= start <= 2099:
        raise ValueError("Enter a valid academic year.")
    return f"{start}-{end}"


def term_order(academic_year, semester):
    """Sortable key so two terms can be compared chronologically."""
    return (int(academic_year[:4]), int(semester))
