import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

// --- Button --------------------------------------------------------------

const VARIANTS = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-400 shadow-[0_8px_24px_-8px_rgba(47,111,237,0.55)]",
  ghost: "bg-white/10 text-white hover:bg-white/20 border border-white/15",
  ghostLight: "bg-black/[0.04] text-ink hover:bg-black/[0.08] border border-black/10",
  danger: "bg-danger-500 text-white hover:brightness-110",
  subtle: "text-ink/70 hover:text-ink hover:bg-black/5",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
        transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none
        ${VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

// --- Badge (status vocabulary, consistent everywhere) --------------------

const STATUS_STYLES = {
  pending: "bg-black/[0.06] text-ink/70",
  in_progress: "bg-accent-500/15 text-accent-500",
  completed: "bg-cyan-100 text-cyan-500",
  overdue: "bg-danger-100 text-danger-500",
  approved: "bg-cyan-100 text-cyan-500",
  revision_needed: "bg-accent-500/15 text-accent-500",
  rejected: "bg-danger-100 text-danger-500",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
  approved: "Approved",
  revision_needed: "Revision needed",
  rejected: "Rejected",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-black/5 text-ink/60"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    admin: "bg-base-700 text-white",
    adviser: "bg-cyan-500 text-white",
    student: "bg-accent-500 text-white",
  };
  const labels = { admin: "Administrator", adviser: "Faculty Adviser", student: "Student" };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[role]}`}>
      {labels[role] ?? role}
    </span>
  );
}

// --- Glass panels ----------------------------------------------------------

export function GlassCard({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag className={`glass rounded-2xl ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function LightCard({ children, className = "", ...props }) {
  return (
    <div className={`bg-white rounded-2xl border border-black/[0.06] shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

// --- Progress bar ----------------------------------------------------------

export function ProgressBar({ value, total, colorClass = "bg-accent-500" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="h-1.5 w-full rounded-full bg-black/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// --- Modal -------------------------------------------------------------

export function Modal({ open, onClose, title, children, width = "max-w-md" }) {
  // Intentionally NO backdrop-click or Escape-to-close: a modal only closes via
  // the X button or an explicit Cancel/Close button, so stray clicks never lose work.
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
        >
          <motion.div
            className={`glass-light w-full ${width} rounded-2xl p-6 max-h-[85vh] overflow-y-auto scrollbar-thin`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-medium text-ink">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-ink/40 hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Standard Cancel + Submit button row for modal forms.
export function ModalActions({ onCancel, submitLabel, loading = false, disabled = false }) {
  return (
    <div className="flex gap-3 mt-2">
      <Button type="button" variant="ghostLight" className="flex-1" onClick={onCancel} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" loading={loading} disabled={disabled} className="flex-1">
        {submitLabel}
      </Button>
    </div>
  );
}

// --- Empty state -----------------------------------------------------------

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="mb-4 rounded-full bg-black/[0.04] p-3">
          <Icon size={22} className="text-ink/40" />
        </div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink/50 mt-1 max-w-sm">{description}</p>}
    </div>
  );
}

// --- Field (form input wrapper) --------------------------------------------

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-ink/70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-black/10 bg-black/[0.02] px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-ink/35 focus:border-accent-500 focus:bg-white outline-none transition-colors";

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-ink/40" />;
}
