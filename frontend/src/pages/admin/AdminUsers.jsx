import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Check, Ban, RotateCcw } from "lucide-react";
import { usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
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
  const { push } = useToast();

  const load = async (role, status) => {
    setLoading(true);
    const { data } = await usersApi.list(role || undefined, status ? { status } : {});
    setUsers(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => {
    load(roleFilter, statusFilter);
  }, [roleFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Remove this user? Their capstone files, titles, and submissions are kept on record. This cannot be undone.")) return;
    await usersApi.remove(id);
    push("User removed.", "success");
    load(roleFilter, statusFilter);
  };

  const approve = async (id) => {
    await usersApi.setActive(id, true);
    push("Account approved.", "success");
    load(roleFilter, statusFilter);
  };

  const disable = async (id) => {
    if (!confirm("Disable this account? They'll keep all their files, but won't be able to sign in or submit anything new.")) return;
    await usersApi.setActive(id, false);
    push("Account disabled.", "success");
    load(roleFilter, statusFilter);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Users</h1>
          <p className="text-fg/55 text-sm">
            Approve student registrations, create advisers, and enable, disable, or remove accounts.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Create adviser
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
              {users.map((u) => (
                <tr key={u.id} className="border-b border-fg/[0.04] last:border-0">
                  <td className="px-4 py-3 text-fg">
                    {u.student_profile?.full_name || u.adviser_profile?.full_name || "—"}
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
                        <button
                          onClick={() => approve(u.id)}
                          title="Approve"
                          aria-label="Approve"
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-cyan transition-colors"
                        >
                          <Check size={15} />
                        </button>
                      )}
                      {u.account_status === "active" ? (
                        <button
                          onClick={() => disable(u.id)}
                          title="Disable"
                          aria-label="Disable"
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-danger transition-colors"
                        >
                          <Ban size={15} />
                        </button>
                      ) : u.account_status === "disabled" ? (
                        <button
                          onClick={() => approve(u.id)}
                          title="Re-enable"
                          aria-label="Re-enable"
                          className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-cyan transition-colors"
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(u.id)}
                        title="Delete"
                          aria-label="Delete"
                        className="rounded-lg p-2 text-fg/60 hover:bg-fg/[0.08] hover:text-danger transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
      await usersApi.create({ ...form, email: form.email.trim().toLowerCase(), role: "adviser" });
      push("Adviser account created.", "success");
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
    <Modal open={open} onClose={handleClose} title="Create adviser">
      <form onSubmit={submit}>
        <Field label="Full name">
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
        </Field>
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
            <span className="block text-xs text-fg/55 mt-1.5">The adviser signs in with this email.</span>
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
          submitLabel="Create adviser"
          loading={saving}
          disabled={mismatch}
        />
      </form>
    </Modal>
  );
}
