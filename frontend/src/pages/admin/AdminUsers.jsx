import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Check, Ban, RotateCcw } from "lucide-react";
import { usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
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
  pending: "bg-accent-500/15 text-accent-500",
  active: "bg-cyan-100 text-cyan-500",
  disabled: "bg-danger-100 text-danger-500",
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
          <h1 className="font-display text-2xl text-white mb-1">Users</h1>
          <p className="text-white/40 text-sm">
            Approve student registrations, create advisers, and enable, disable, or remove accounts.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Create adviser
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1.5">
          {ROLE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setRoleFilter(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                roleFilter === t.key ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm rounded-lg border border-white/15 bg-white/[0.06] text-white px-3 py-1.5 outline-none focus:border-accent-400"
        >
          {STATUS_TABS.map((s) => (
            <option key={s.key} value={s.key} className="text-ink">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/40 border-b border-black/[0.06]">
                <th className="px-4 py-3 font-medium">Name</th>
                {roleFilter === "student" && <th className="px-4 py-3 font-medium">Section</th>}
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {u.student_profile?.full_name || u.adviser_profile?.full_name || "—"}
                  </td>
                  {roleFilter === "student" && (
                    <td className="px-4 py-3 text-ink/60">{u.student_profile?.section || "-"}</td>
                  )}
                  <td className="px-4 py-3 text-ink/60">{u.username}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <AccountStatusBadge status={u.account_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {u.account_status === "pending" && (
                        <button
                          onClick={() => approve(u.id)}
                          title="Approve"
                          className="text-ink/40 hover:text-cyan-500 transition-colors"
                        >
                          <Check size={15} />
                        </button>
                      )}
                      {u.account_status === "active" ? (
                        <button
                          onClick={() => disable(u.id)}
                          title="Disable"
                          className="text-ink/40 hover:text-danger-500 transition-colors"
                        >
                          <Ban size={15} />
                        </button>
                      ) : u.account_status === "disabled" ? (
                        <button
                          onClick={() => approve(u.id)}
                          title="Re-enable"
                          className="text-ink/40 hover:text-cyan-500 transition-colors"
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(u.id)}
                        title="Delete"
                        className="text-ink/30 hover:text-danger-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  username: "",
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
  const { push } = useToast();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const mismatch = confirmPassword.length > 0 && form.password !== confirmPassword;

  const reset = () => {
    setForm(EMPTY_USER_FORM);
    setConfirmPassword("");
    setShowPw(false);
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
    try {
      await usersApi.create({ ...form, role: "adviser" });
      push("Adviser account created.", "success");
      reset();
      onSaved();
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Couldn't create that user.";
      push(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create adviser">
      <form onSubmit={submit}>
        <Field label="Full name">
          <input className={inputClass} value={form.full_name} onChange={set("full_name")} required />
        </Field>
        <Field label="Username">
          <input className={inputClass} value={form.username} onChange={set("username")} required />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Password">
          <input
            type={showPw ? "text" : "password"}
            className={inputClass}
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            required
          />
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
          {mismatch && <span className="block text-xs text-danger-500 mt-1.5">Passwords do not match.</span>}
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink/60 mb-4 -mt-1 cursor-pointer select-none">
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
