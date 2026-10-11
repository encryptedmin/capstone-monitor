// Mirrors backend/accounts/terms.py so students get instant feedback.
// The server re-validates everything -- this is only for UX.

// Accepts "2026-2027", "2026 - 2027", "AY 2026-2027"; -, en dash or em dash.
const AY_RE = /^\s*(?:AY\s*)?(\d{4})\s*[-\u2013\u2014]\s*(\d{4})\s*$/i;

/** Returns { value: "2026-2027" } or { error: "message" }. */
export function normalizeAcademicYear(raw) {
  const match = AY_RE.exec(raw ?? "");
  if (!match) return { error: "Enter the academic year like 2026-2027." };
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end !== start + 1) {
    return { error: "The second year must be one year after the first (e.g. 2026-2027)." };
  }
  if (start < 2000 || start > 2099) return { error: "Enter a valid academic year." };
  return { value: `${start}-${end}` };
}

/** Sortable number so two terms can be compared chronologically. */
export function termOrder(academicYear, semester) {
  return Number(academicYear.slice(0, 4)) * 10 + Number(semester);
}

export const SEMESTERS = [
  { value: "1", label: "1st Semester" },
  { value: "2", label: "2nd Semester" },
];
