import re
import unicodedata


def name_key(full_name):
    """
    Canonical form of a person's name used to detect "same person" across
    the student registration form and the partner names typed into a
    capstone title application.

    Case, accents, punctuation, spacing and word order are ignored, so
    "Dela Cruz, Juan", "juan  dela cruz" and "JUAN DELA CRUZ" all collapse to
    the same key. A middle initial or a different spelling is NOT matched --
    that is a deliberate trade-off; the admin can still resolve edge cases
    manually when approving accounts.
    """
    text = unicodedata.normalize("NFKD", full_name or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    tokens = re.findall(r"[a-z0-9]+", text.casefold())
    return " ".join(sorted(tokens))
