import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Ban, RotateCcw, KeyRound } from "lucide-react";
import { usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { flattenErrors } from "../../lib/names";
import {
  LightCard,
  RoleBadge,
  Button,
  Modal,
  ModalActions,
  Field,
  inputClass,
  EmptyState,
  Spinner,
} from "../../components/ui";

const ROLE_TABS = [
  { key: "", label: "All" },
  { key: "admin", label: "Admins" },
  { key: "adviser", label: "Advisers" },
  { key: "student", label: "Students" },
];

const STATUS_TABS = [
  { key: "", label: "Any status" },
  { key: "pending", label: "Pending approval" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
];

const ACCOUNT_STATUS_STYLES = {
  pending: "bg-accent-500/15 text-accent",
  active: "bg-cyan-500/15 text-cyan",
  disabled: "bg-danger-500/15 text-danger",
};
const ACCOUNT_STATUS_LABELS = { pending: "Pending approval", active: "Active", disabled: "Disabled" };

function AccountStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ACCOUNT_STATUS_STYLES[status]}`}>
      {ACCOUNT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const { push } = useToast();
  const { user: currentUser } = useAuth();

  const load = async (role, status) => {
    setLoading(true);
    const { data } = await usersApi.list(role || undefined, status ? { status } : {});
    setUsers(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => {
    load(roleFilter, statusFilter);
  }, [roleFilter, statusFilter]);

  const runAction = async () => {
    const { user, action } = actionTarget;
    setActionSaving(true);
    try {
      if (action === "approve" || action === "re-enable") {
        await usersApi.setActive(user.id, true);
        push(action === "approve" ? "Account approved." : "Account re-enabled.", "success");
      } else if (action === "disable") {
        await usersApi.setActive(user.id, false);
        push("Account disabled.", "success");
      } else {
        await usersApi.remove(user.id);
        push("User removed.", "success");
      }
      setActionTarget(null);
      load(roleFilter, statusFilter);
    } catch (err) {
      push(err.response?.data?.detail || `Couldn't ${action} this account.`, "error");
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Users</h1>
          <p className="text-fg/55 text-sm">
            Approve student registrations, create accounts, and manage access.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Create account
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin max-w-full" role="tablist">
          {ROLE_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={roleFilter === t.key}
              onClick={() => setRoleFilter(t.key)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                roleFilter === t.key
                  ? "bg-fg/[0.12] text-fg ring-1 ring-inset ring-fg/15"
                  : "text-fg/62 hover:text-fg hover:bg-fg/[0.06]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} w-auto py-2`}
          aria-label="Filter by account status"
        >
          {STATUS_TABS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <LightCard className="p-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size={22} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-fg/55 border-b border-fg/[0.06]">
                <th className="px-4 py-3 font-medium">Name</th>
                {roleFilter === "student" && <th className="px-4 py-3 font-medium">Section</th>}
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                <tr key={u.id} className="border-b border-fg/[0.04] last:border-0">
                  <td className="px-4 py-3 text-fg">
                    {u.student_profile?.full_name || u.adviser_profile?.full_name || (u.role === "admin" ? "Administrator" : "—")}
                  </td>
                  {roleFilter === "student" && (
                    <td className="px-4 py-3 text-fg/70">{u.student_profile?.section || "-"}</td>
                  )}
                  <td className="px-4 py-3 text-fg/70">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <AccountStatusBadge status={u.account_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.account_status === "pending" && (
                        <Button className="px-3 py-1.5" onClick={() => setActionTarget({ user: u, action: "approve" })}>Approve</Button>
                      )}
                      {u.account_status === "active" && !isSelf ? (
                        <button
                          onClick={() => setActionTarget({ user: u, action: "disable" })}
                          title="Disable"
                          aria-label="Disable"
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-danger transition-colors"
                        >
                          <Ban size={15} />
                        </button>
                      ) : u.account_status === "disabled" ? (
                        <button
                          onClick={() => setActionTarget({ user: u, action: "re-enable" })}
                          title="Re-enable"
                          aria-label="Re-enable"
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-cyan transition-colors"
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : null}
                      {(u.role === "student" || u.role === "adviser") && (
                        <button
                          onClick={() => setResetTarget(u)}
                          title={`Reset ${u.role} password`}
                          aria-label={`Reset password for ${u.email}`}
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-accent transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => setActionTarget({ user: u, action: "delete" })}
                          title="Delete"
                          aria-label="Delete"
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-danger transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </LightCard>

      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load(roleFilter, statusFilter);
        }}
      />
      <Modal
        open={!!actionTarget}
        onClose={() => !actionSaving && setActionTarget(null)}
        title={`${actionTarget?.action === "delete" ? "Delete" : actionTarget?.action === "approve" ? "Approve" : actionTarget?.action === "disable" ? "Disable" : "Re-enable"} account`}
      >
        <p className="text-sm text-fg/70 mb-5">
          {actionTarget?.action === "delete"
            ? `Remove ${actionTarget?.user?.email}? Their capstone files and submissions stay on record. This cannot be undone.`
            : actionTarget?.action === "disable"
              ? `Disable ${actionTarget?.user?.email}? They will not be able to sign in or submit new work.`
              : actionTarget?.action === "approve"
                ? `Approve ${actionTarget?.user?.email} and allow them to sign in?`
                : `Re-enable ${actionTarget?.user?.email} and allow them to sign in?`}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="ghostLight" className="flex-1" onClick={() => setActionTarget(null)} disabled={actionSaving}>Cancel</Button>
          <Button type="button" variant={actionTarget?.action === "delete" || actionTarget?.action === "disable" ? "danger" : "primary"} className="flex-1" onClick={runAction} loading={actionSaving}>
            {actionTarget?.action === "delete" ? "Delete account" : actionTarget?.action === "approve" ? "Approve" : actionTarget?.action === "disable" ? "Disable account" : "Re-enable account"}
          </Button>
        </div>
      </Modal>
      <ResetUserPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSaved={() => {
          setResetTarget(null);
          push(`${resetTarget?.role === "adviser" ? "Adviser" : "Student"} password reset.`, "success");
        }}
      />
    </div>
  );
}

const EMPTY_USER_FORM = {
  email: "",
  password: "",
  role: "adviser",
  full_name: "",
};

function CreateUserModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { push } = useToast();

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors((errs) => ({ ...errs, [key]: "" }));
  };

  const mismatch = confirmPassword.length > 0 && form.password !== confirmPassword;

  const reset = () => {
    setForm(EMPTY_USER_FORM);
    setConfirmPassword("");
    setShowPw(false);
    setFieldErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== confirmPassword) {
      push("Passwords do not match.", "error");
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const payload = { ...form, email: form.email.trim().toLowerCase() };
      if (form.role === "admin") delete payload.full_name;
      await usersApi.create(payload);
      push(`${form.role === "admin" ? "Administrator" : "Adviser"} account created.`, "success");
      reset();
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        // Field errors (e.g. duplicate email) show under their input; the rest in a toast.
        const { email, full_name, password, ...rest } = data;
        const next = {};
        if (email !== undefined) next.email = flattenErrors(email).join(" ");
        if (full_name !== undefined) next.full_name = flattenErrors(full_name).join(" ");
        if (password !== undefined) next.password = flattenErrors(password).join(" ");
        setFieldErrors(next);
        const other = flattenErrors(rest);
        if (other.length > 0) push(other.join(" "), "error");
        else if (Object.keys(next).length === 0) push("Couldn't create that user.", "error");
      } else {
        push("Couldn't create that user.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Create ${form.role === "admin" ? "administrator" : "adviser"}`}>
      <form onSubmit={submit}>
        <Field label="Account type">
          <select className={inputClass} value={form.role} onChange={set("role")}>
            <option value="adviser">Adviser</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
        {form.role === "adviser" && <Field label="Full name">
          <input
            className={`${inputClass} ${fieldErrors.full_name ? "!border-danger-500" : ""}`}
            value={form.full_name}
            onChange={set("full_name")}
            aria-invalid={Boolean(fieldErrors.full_name)}
            required
          />
          {fieldErrors.full_name && (
            <span role="alert" className="block text-xs text-danger mt-1.5">{fieldErrors.full_name}</span>
          )}
        </Field>}
        <Field label="Email address">
          <input
            type="email"
            inputMode="email"
            autoComplete="off"
            className={`${inputClass} ${fieldErrors.email ? "!border-danger-500" : ""}`}
            value={form.email}
            onChange={set("email")}
            aria-invalid={Boolean(fieldErrors.email)}
            required
          />
          {fieldErrors.email ? (
            <span role="alert" className="block text-xs text-danger mt-1.5">{fieldErrors.email}</span>
          ) : (
            <span className="block text-xs text-fg/55 mt-1.5">The {form.role === "admin" ? "administrator" : "adviser"} signs in with this email.</span>
          )}
        </Field>
        <Field label="Password">
          <input
            type={showPw ? "text" : "password"}
            className={`${inputClass} ${fieldErrors.password ? "!border-danger-500" : ""}`}
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
            required
          />
          {fieldErrors.password && (
            <span role="alert" className="block text-xs text-danger mt-1.5">{fieldErrors.password}</span>
          )}
        </Field>
        <Field label="Confirm password">
          <input
            type={showPw ? "text" : "password"}
            className={`${inputClass} ${mismatch ? "!border-danger-500" : ""}`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          {mismatch && <span className="block text-xs text-danger mt-1.5">Passwords do not match.</span>}
        </Field>
        <label className="flex items-center gap-2 text-sm text-fg/70 mb-4 -mt-1 cursor-pointer select-none">
          <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
          Show passwords
        </label>
        <ModalActions
          onCancel={handleClose}
          submitLabel={`Create ${form.role === "admin" ? "administrator" : "adviser"}`}
          loading={saving}
          disabled={mismatch}
        />
      </form>
    </Modal>
  );
}

function ResetUserPasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { push } = useToast();
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const close = () => {
    if (saving) return;
    setPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await usersApi.resetPassword(user.id, password);
      setPassword("");
      setConfirmPassword("");
      onSaved();
    } catch (err) {
      const details = err.response?.data?.password;
      const message = Array.isArray(details) ? details.join(" ") : details || "Couldn't reset the password.";
      setError(message);
      push(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!user} onClose={close} title={`Reset ${user?.role ?? "user"} password`}>
      <form onSubmit={submit}>
        <p className="text-sm text-fg/65 mb-4">Set a temporary password for {user?.email}. Share it securely with them. Their existing sessions will be signed out.</p>
        <Field label="New password">
          <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Field label="Confirm new password">
          <input className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </Field>
        {mismatch && <p className="text-xs text-danger mb-3">Passwords do not match.</p>}
        {error && <p role="alert" className="text-xs text-danger mb-3">{error}</p>}
        <ModalActions onCancel={close} submitLabel="Reset password" loading={saving} disabled={!password || mismatch} />
      </form>
    </Modal>
  );
}
