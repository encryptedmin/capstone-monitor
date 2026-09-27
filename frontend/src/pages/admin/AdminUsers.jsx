import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import {
  LightCard,
  RoleBadge,
  Button,
  Modal,
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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { push } = useToast();

  const load = async (role) => {
    setLoading(true);
    const { data } = await usersApi.list(role || undefined);
    setUsers(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => {
    load(roleFilter);
  }, [roleFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Remove this user? This cannot be undone.")) return;
    await usersApi.remove(id);
    push("User removed.", "success");
    load(roleFilter);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl text-white mb-1">Users</h1>
          <p className="text-white/40 text-sm">Create and manage student, adviser, and admin accounts.</p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Create user
        </Button>
      </div>

      <div className="flex gap-1.5 mb-5">
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
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {u.student_profile?.full_name || u.adviser_profile?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{u.username}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-ink/30 hover:text-danger-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
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
          load(roleFilter);
        }}
      />
    </div>
  );
}

function CreateUserModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
    full_name: "",
    section: "",
    school_year: "",
  });
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.create(form);
      push("User created.", "success");
      setForm({
        username: "",
        email: "",
        password: "",
        role: "student",
        full_name: "",
        section: "",
        school_year: "",
      });
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
    <Modal open={open} onClose={onClose} title="Create user">
      <form onSubmit={submit}>
        <Field label="Role">
          <select className={inputClass} value={form.role} onChange={set("role")}>
            <option value="student">Student</option>
            <option value="adviser">Faculty Adviser</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
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
            type="password"
            className={inputClass}
            value={form.password}
            onChange={set("password")}
            required
          />
        </Field>
        {form.role === "student" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section">
              <input className={inputClass} value={form.section} onChange={set("section")} />
            </Field>
            <Field label="School year">
              <input
                className={inputClass}
                value={form.school_year}
                onChange={set("school_year")}
                placeholder="2025-2026"
              />
            </Field>
          </div>
        )}
        <Button type="submit" loading={saving} className="w-full mt-2">
          Create account
        </Button>
      </form>
    </Modal>
  );
}
