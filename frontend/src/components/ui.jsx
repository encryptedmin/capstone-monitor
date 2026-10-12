import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// --- Button --------------------------------------------------------------

const VARIANTS = {
  primary:
    "bg-brand-gradient text-white hover:brightness-110 shadow-[0_10px_28px_-10px_rgba(61,109,245,0.75),inset_0_1px_0_rgba(255,255,255,0.25)]",
  ghost: "bg-fg/[0.07] text-fg hover:bg-fg/[0.12] border border-fg/[0.12] backdrop-blur-md",
  ghostLight: "bg-fg/[0.05] text-fg hover:bg-fg/[0.1] border border-fg/10",
  danger:
    "bg-danger-600 text-white hover:brightness-110 shadow-[0_10px_28px_-12px_rgba(207,59,52,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]",
  subtle: "text-fg/70 hover:text-fg hover:bg-fg/[0.07]",
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
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium
        transition-all duration-200 active:scale-[0.97] hover:-translate-y-px
        disabled:opacity-50 disabled:pointer-events-none
        ${VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

// Compact icon-only button used in toolbars and headers.
export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-fg/10 bg-fg/[0.05]
        text-fg/75 transition-all duration-200 hover:bg-fg/[0.1] hover:text-fg active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <IconButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={className}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

// --- Badge (status vocabulary, consistent everywhere) --------------------

const STATUS_STYLES = {
  pending: "bg-fg/[0.07] text-fg/70 ring-fg/10",
  in_progress: "bg-accent-500/15 text-accent ring-accent-500/25",
  completed: "bg-cyan-500/15 text-cyan ring-cyan-500/25",
  overdue: "bg-danger-500/15 text-danger ring-danger-500/25",
  approved: "bg-cyan-500/15 text-cyan ring-cyan-500/25",
  revision_needed: "bg-violet-500/15 text-violet-500 ring-violet-500/25",
  rejected: "bg-danger-500/15 text-danger ring-danger-500/25",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[status] ?? "bg-fg/[0.07] text-fg/60 ring-fg/10"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    admin: "bg-violet-500/15 text-violet-500 ring-violet-500/30",
    adviser: "bg-cyan-500/15 text-cyan ring-cyan-500/30",
    student: "bg-accent-500/15 text-accent ring-accent-500/30",
  };
  const labels = { admin: "Administrator", adviser: "Faculty Adviser", student: "Student" };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        styles[role] ?? "bg-fg/[0.07] text-fg/70 ring-fg/10"
      }`}
    >
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

// Historical name: content cards used to be solid white. They are now the same
// frosted glass as GlassCard so every page shares one surface language.
export function LightCard({ children, className = "", ...props }) {
  return (
    <div className={`glass rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}

// --- Page header / stat card --------------------------------------------------

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent mb-1.5">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg">{title}</h1>
        {description && <p className="text-fg/60 text-sm mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  accent: "from-accent-500 to-violet-500 shadow-[0_10px_24px_-8px_rgba(61,109,245,0.7)]",
  cyan: "from-cyan-500 to-accent-500 shadow-[0_10px_24px_-8px_rgba(20,184,196,0.7)]",
  violet: "from-violet-500 to-fuchsia-500 shadow-[0_10px_24px_-8px_rgba(124,92,250,0.7)]",
  amber: "from-amber-400 to-orange-500 shadow-[0_10px_24px_-8px_rgba(245,158,11,0.7)]",
};

export function StatCard({ icon: Icon, label, value, tone = "accent", hint }) {
  return (
    <GlassCard className="glass-hover p-5 relative overflow-hidden">
      <div
        aria-hidden
        className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${TONES[tone]} opacity-[0.14] blur-2xl`}
      />
      <div
        className={`relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${TONES[tone]}`}
      >
        <Icon size={19} />
      </div>
      <p
        className={`relative font-display font-semibold tabular-nums text-fg ${
          String(value).length > 12 ? "text-xl leading-9 truncate" : "text-3xl"
        }`}
        title={String(value)}
      >
        {value}
      </p>
      <p className="relative text-sm text-fg/60 mt-1">{label}</p>
      {hint && <p className="relative text-xs text-fg/45 mt-0.5">{hint}</p>}
    </GlassCard>
  );
}

// --- Progress bar ----------------------------------------------------------

export function ProgressBar({ value, total, colorClass = "bg-brand-gradient" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full rounded-full bg-fg/[0.08] overflow-hidden"
    >
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function ProgressRing({ value, total, size = 132, stroke = 11 }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-cyan-500)" />
            <stop offset="100%" stopColor="var(--color-accent-500)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-fg/[0.09]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold tabular-nums text-fg">
        {pct}%
      </span>
    </div>
  );
}

// --- Modal -------------------------------------------------------------

export function Modal({ open, onClose, title, children, width = "max-w-md" }) {
  // Intentionally NO backdrop-click or Escape-to-close: a modal only closes via
  // the X button or an explicit Cancel/Close button, so stray clicks never lose work.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md"
          style={{ background: "var(--scrim)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
        >
          <motion.div
            className={`glass-strong w-full ${width} rounded-t-3xl sm:rounded-3xl p-6 max-h-[88vh] overflow-y-auto scrollbar-thin`}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold text-fg">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-fg/50 hover:bg-fg/[0.08] hover:text-fg transition-colors"
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
        <div className="mb-4 rounded-2xl bg-fg/[0.06] ring-1 ring-inset ring-fg/10 p-3.5">
          <Icon size={24} className="text-fg/50" />
        </div>
      )}
      <p className="font-medium text-fg">{title}</p>
      {description && <p className="text-sm text-fg/60 mt-1 max-w-sm">{description}</p>}
    </div>
  );
}

// --- Field (form input wrapper) --------------------------------------------

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-fg/75 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-fg/[0.12] bg-fg/[0.04] px-3.5 py-2.5 text-sm text-fg " +
  "placeholder:text-fg/40 outline-none transition-all duration-200 hover:border-fg/25 " +
  "focus:border-accent-500 focus:bg-fg/[0.07] focus:ring-4 focus:ring-accent-500/20 " +
  "disabled:opacity-60";

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-fg/50" role="status" aria-label="Loading" />;
}

// --- Skeleton / Avatar -----------------------------------------------------

export function Skeleton({ className = "" }) {
  return <div aria-hidden className={`skeleton rounded-xl ${className}`} />;
}

export function Avatar({ name = "?", size = 36, className = "" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-gradient font-medium text-white
        shadow-[0_6px_16px_-6px_rgba(61,109,245,0.8)] ring-2 ring-fg/10 ${className}`}
    >
      {initials || "?"}
    </div>
  );
}
