import { useEffect, useState } from "react";
import { Plus, UserPlus, X, FolderKanban } from "lucide-react";
import { groupsApi, usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import {
  LightCard,
  Button,
  Modal,
  Field,
  inputClass,
  EmptyState,
  ProgressBar,
  Spinner,
} from "../../components/ui";

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageGroup, setManageGroup] = useState(null);

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: a }, { data: s }] = await Promise.all([
      groupsApi.list(),
      usersApi.list("adviser"),
      usersApi.list("student"),
    ]);
    setGroups(g.results ?? g);
    setAdvisers(a.results ?? a);
    setStudents(s.results ?? s);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl text-white mb-1">Capstone Groups</h1>
          <p className="text-white/40 text-sm">Create teams, assign advisers, and enroll students.</p>
        </div>
        <Button icon={Plus} onClick={() => setCreateOpen(true)}>
          Create group
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size={26} />
        </div>
      ) : groups.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={FolderKanban} title="No capstone groups yet" />
        </LightCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <LightCard key={g.id} className="p-5">
              <h3 className="font-display text-lg text-ink mb-1">{g.capstone_title}</h3>
              <p className="text-xs text-ink/45 mb-3">
                Adviser: {g.adviser_detail?.adviser_profile?.full_name || g.adviser_detail?.username || "Unassigned"}
              </p>
              <ProgressBar
                value={g.milestones_completed}
                total={g.milestones_total}
                colorClass="bg-teal-500"
              />
              <p className="text-xs text-ink/40 mt-2 mb-4">{g.member_count} member(s) enrolled</p>
              <Button variant="ghostLight" icon={UserPlus} onClick={() => setManageGroup(g)} className="w-full">
                Manage members
              </Button>
            </LightCard>
          ))}
        </div>
      )}

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        advisers={advisers}
        onSaved={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <ManageMembersModal
        group={manageGroup}
        students={students}
        onClose={() => setManageGroup(null)}
        onChanged={load}
      />
    </div>
  );
}

function CreateGroupModal({ open, onClose, advisers, onSaved }) {
  const [title, setTitle] = useState("");
  const [adviser, setAdviser] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await groupsApi.create({ capstone_title: title, adviser: adviser || null });
      push("Capstone group created.", "success");
      setTitle("");
      setAdviser("");
      onSaved();
    } catch {
      push("Couldn't create that group.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create capstone group">
      <form onSubmit={submit}>
        <Field label="Capstone title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Faculty adviser">
          <select className={inputClass} value={adviser} onChange={(e) => setAdviser(e.target.value)}>
            <option value="">Unassigned for now</option>
            {advisers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.adviser_profile?.full_name || a.username}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" loading={saving} className="w-full mt-2">
          Create group
        </Button>
      </form>
    </Modal>
  );
}

function ManageMembersModal({ group, students, onClose, onChanged }) {
  const [studentId, setStudentId] = useState("");
  const { push } = useToast();

  if (!group) return null;

  const enrolledIds = new Set(group.members.map((m) => m.student));
  const available = students.filter((s) => !enrolledIds.has(s.id));

  const addMember = async (e) => {
    e.preventDefault();
    if (!studentId) return;
    try {
      await groupsApi.addMember({ group: group.id, student: studentId });
      push("Student enrolled.", "success");
      setStudentId("");
      onChanged();
    } catch {
      push("Couldn't add that student.", "error");
    }
  };

  const removeMember = async (memberId) => {
    await groupsApi.removeMember(memberId);
    push("Student removed from group.", "success");
    onChanged();
  };

  return (
    <Modal open={!!group} onClose={onClose} title={`Members · ${group.capstone_title}`}>
      <ul className="mb-5 space-y-2">
        {group.members.length === 0 && <p className="text-sm text-ink/40">No students enrolled yet.</p>}
        {group.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-lg bg-black/[0.03] px-3.5 py-2.5"
          >
            <span className="text-sm text-ink">
              {m.student_detail?.student_profile?.full_name || m.student_detail?.username}
            </span>
            <button onClick={() => removeMember(m.id)} className="text-ink/30 hover:text-danger-500">
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addMember} className="flex gap-2">
        <select
          className={inputClass}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="" disabled>
            Select a student to enroll
          </option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.student_profile?.full_name || s.username}
            </option>
          ))}
        </select>
        <Button type="submit" icon={UserPlus}>
          Add
        </Button>
      </form>
    </Modal>
  );
}
