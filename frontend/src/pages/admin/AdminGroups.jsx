import { useEffect, useState } from "react";
import { CalendarRange, UserPlus, X, FolderKanban, Eye } from "lucide-react";
import { groupsApi, schoolYearsApi, usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { PdfViewerModal } from "../../components/PdfViewerModal";
import {
  LightCard,
  Button,
  Modal,
  inputClass,
  EmptyState,
  ProgressBar,
  StatusBadge,
  Spinner,
} from "../../components/ui";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [manageGroup, setManageGroup] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: s }, { data: y }] = await Promise.all([
      groupsApi.list({
        school_year: selectedSchoolYear,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
      usersApi.list("student"),
      schoolYears.length ? Promise.resolve({ data: schoolYears }) : schoolYearsApi.list(),
    ]);
    setGroups(g.results ?? g);
    setStudents(s.results ?? s);
    if (!schoolYears.length) setSchoolYears(y.results ?? y);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [selectedSchoolYear, statusFilter]);

  const visibleGroups = groups;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Capstone Groups</h1>
          <p className="text-fg/55 text-sm">
            Groups are created when a student requests a title and an adviser accepts it. You can
            still enroll additional members or reassign an adviser here.
          </p>
        </div>
        <label className="relative min-w-64">
          <CalendarRange
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg/58"
          />
          <select
            className={`${inputClass} pl-9`}
            value={selectedSchoolYear}
            onChange={(event) => setSelectedSchoolYear(event.target.value)}
          >
            <option value="all">All AY ranges</option>
            {schoolYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-1.5 mb-5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === t.key ? "bg-fg/15 text-fg" : "text-fg/62 hover:text-fg/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size={26} />
        </div>
      ) : visibleGroups.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={FolderKanban} title="No capstone groups found" />
        </LightCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((g) => (
            <LightCard key={g.id} className="p-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-display font-semibold text-lg text-fg">{g.capstone_title}</h3>
                <StatusBadge status={g.status} />
              </div>
              <p className="text-xs text-fg/58 mb-1">
                Adviser: {g.adviser_detail?.adviser_profile?.full_name || g.adviser_detail?.email || "Unassigned"}
              </p>
              <p className="text-xs text-fg/58 mb-3">{g.school_year_label || "No term set"}</p>
              {g.status === "accepted" && (
                <>
                  <ProgressBar value={g.milestones_completed} total={g.milestones_total} colorClass="bg-cyan-500" />
                  <p className="text-xs text-fg/55 mt-2 mb-4">{g.member_count} member(s) enrolled</p>
                </>
              )}
              <div className="flex items-center gap-2">
                {g.title_document && (
                  <Button
                    variant="ghostLight"
                    icon={Eye}
                    onClick={() => setPreviewFile({ url: g.title_document, title: g.capstone_title })}
                  >
                    Title doc
                  </Button>
                )}
                <Button variant="ghostLight" icon={UserPlus} onClick={() => setManageGroup(g)} className="flex-1">
                  Members
                </Button>
              </div>
            </LightCard>
          ))}
        </div>
      )}

      <ManageMembersModal
        group={manageGroup}
        students={students}
        onClose={() => setManageGroup(null)}
        onChanged={load}
      />
      <PdfViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function ManageMembersModal({ group, students, onClose, onChanged }) {
  const [studentId, setStudentId] = useState("");
  const { push } = useToast();

  if (!group) return null;

  // Listed partners have no account (student is null), so they never block anyone.
  const enrolledIds = new Set(group.members.map((m) => m.student).filter((id) => id != null));
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

  const removeMember = async (member) => {
    if (
      member.is_listed_partner &&
      !confirm(
        `Remove ${member.student_name_snapshot} from this capstone? This person will be able to register their own account.`
      )
    ) {
      return;
    }
    try {
      await groupsApi.removeMember(member.id);
      push(member.is_listed_partner ? "Partner removed from group." : "Student removed from group.", "success");
      onChanged();
    } catch {
      push("Couldn't remove that member.", "error");
    }
  };

  return (
    <Modal open={!!group} onClose={onClose} title={`Members - ${group.capstone_title}`}>
      <ul className="mb-5 space-y-2">
        {group.members.length === 0 && <p className="text-sm text-fg/55">No students enrolled yet.</p>}
        {group.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-lg bg-fg/[0.03] px-3.5 py-2.5"
          >
            <span className="flex flex-wrap items-center gap-2 text-sm text-fg">
              {m.is_listed_partner
                ? m.student_name_snapshot
                : m.student_detail?.student_profile?.full_name ||
                  m.student_detail?.email ||
                  m.student_name_snapshot}
              {m.is_listed_partner && (
                <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[11px] font-medium text-fg/62">
                  Partner (no account)
                </span>
              )}
              {!m.is_listed_partner && !m.student_detail && (
                <span className="text-xs text-fg/55">(removed)</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => removeMember(m)}
              aria-label={`Remove ${m.student_name_snapshot || "member"}`}
              title="Remove from group"
              className="rounded-lg p-1.5 text-fg/45 hover:bg-fg/[0.08] hover:text-danger"
            >
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
              {s.student_profile?.full_name || s.email}
            </option>
          ))}
        </select>
        <Button type="submit" icon={UserPlus}>
          Add
        </Button>
      </form>
      <Button type="button" variant="ghostLight" className="w-full mt-4" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}
