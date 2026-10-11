import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  ListChecks,
  FileText,
  MessageSquarePlus,
  Eye,
  Ban,
  RotateCcw,
} from "lucide-react";
import { groupsApi, milestonesApi, submissionsApi, usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { PdfViewerModal } from "../../components/PdfViewerModal";
import {
  LightCard,
  EmptyState,
  Spinner,
  Button,
  Modal,
  ModalActions,
  Field,
  inputClass,
} from "../../components/ui";

const STATUS_OPTIONS = ["pending", "in_progress", "completed", "overdue"];
const SUBMISSION_OPTIONS = ["pending", "approved", "revision_needed", "rejected"];

export default function AdviserGroupDetail() {
  const { groupId } = useParams();
  const id = Number(groupId);
  const [group, setGroup] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("milestones");
  const [msModalOpen, setMsModalOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: g }, { data: ms }, { data: subs }] = await Promise.all([
      groupsApi.get(id),
      milestonesApi.list(),
      submissionsApi.list(),
    ]);
    setGroup(g);
    setMilestones((ms.results ?? ms).filter((m) => m.group === id));
    setSubmissions((subs.results ?? subs).filter((s) => s.group === id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateMilestoneStatus = async (milestoneId, status) => {
    await milestonesApi.update(milestoneId, { status });
    push("Milestone status updated.", "success");
    load();
  };

  const updateSubmissionStatus = async (submissionId, status) => {
    await submissionsApi.update(submissionId, { status });
    push("Submission status updated.", "success");
    load();
  };

  const toggleStudentActive = async (student, nextActive) => {
    const verb = nextActive ? "re-enable" : "disable";
    if (!confirm(`${nextActive ? "Re-enable" : "Disable"} ${student.student_profile?.full_name || student.username}? ${nextActive ? "" : "Their files stay on record, but they won't be able to sign in or submit anything new."}`)) return;
    try {
      await usersApi.setActive(student.id, nextActive);
      push(`Student ${verb}d.`, "success");
      load();
    } catch (err) {
      push(err.response?.data?.detail || `Couldn't ${verb} that student.`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  if (!group) {
    return <EmptyState icon={FileText} title="Group not found" />;
  }

  return (
    <div>
      <Link
        to="/adviser"
        className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={14} /> Back to groups
      </Link>
      <h1 className="font-display text-2xl text-white mb-1">{group.capstone_title}</h1>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {group.members.map((m) => {
          const student = m.student_detail;
          if (!student) {
            return (
              <span key={m.id} className="text-white/40 text-sm">
                {m.student_name_snapshot} (removed)
              </span>
            );
          }
          const isActive = student.account_status === "active";
          return (
            <span
              key={m.id}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 pl-3 pr-1.5 py-1 text-sm text-white/80"
            >
              {student.student_profile?.full_name || student.username}
              <button
                onClick={() => toggleStudentActive(student, !isActive)}
                title={isActive ? "Disable student" : "Re-enable student"}
                className={`p-1 rounded-full transition-colors ${
                  isActive ? "text-white/40 hover:text-danger-500 hover:bg-white/10" : "text-accent-400 hover:bg-white/10"
                }`}
              >
                {isActive ? <Ban size={12} /> : <RotateCcw size={12} />}
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: "milestones", label: "Milestones", icon: ListChecks },
          { key: "submissions", label: "Submissions", icon: FileText },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "milestones" && (
        <LightCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-ink">Milestones</h2>
            <Button variant="ghostLight" icon={Plus} onClick={() => setMsModalOpen(true)}>
              Add milestone
            </Button>
          </div>
          {milestones.length === 0 ? (
            <EmptyState icon={ListChecks} title="No milestones yet" />
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {milestones.map((m) => (
                <li key={m.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{m.title}</p>
                    <p className="text-xs text-ink/40">
                      Due{" "}
                      {new Date(m.deadline).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <select
                    value={m.status}
                    onChange={(e) => updateMilestoneStatus(m.id, e.target.value)}
                    className="text-xs rounded-full border border-black/10 bg-black/[0.02] px-3 py-1.5 outline-none focus:border-accent-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </LightCard>
      )}

      {tab === "submissions" && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <LightCard className="p-2">
              <EmptyState icon={FileText} title="No submissions yet" />
            </LightCard>
          ) : (
            submissions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <LightCard className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium text-ink">{s.milestone_title}</p>
                      <p className="text-xs text-ink/40 mt-0.5">
                        Submitted{" "}
                        {new Date(s.submitted_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <select
                      value={s.status}
                      onChange={(e) => updateSubmissionStatus(s.id, e.target.value)}
                      className="text-xs rounded-full border border-black/10 bg-black/[0.02] px-3 py-1.5 outline-none focus:border-accent-500"
                    >
                      {SUBMISSION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 mb-2">
                    <button
                      onClick={() =>
                        setPreviewFile({ url: s.file, title: s.milestone_title })
                      }
                      className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
                    >
                      <Eye size={14} /> View submission
                    </button>
                    <button
                      onClick={() => setFeedbackTarget(s)}
                      className="inline-flex items-center gap-1.5 text-sm text-accent-500 hover:brightness-90"
                    >
                      <MessageSquarePlus size={14} /> Add feedback
                    </button>
                  </div>

                  {s.feedback?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-2.5">
                      {s.feedback.map((f) => (
                        <p key={f.id} className="text-sm text-ink/70">
                          <span className="text-ink/40">{f.adviser_name}:</span> {f.comment}
                        </p>
                      ))}
                    </div>
                  )}
                </LightCard>
              </motion.div>
            ))
          )}
        </div>
      )}

      <AddMilestoneModal
        open={msModalOpen}
        onClose={() => setMsModalOpen(false)}
        groupId={id}
        onSaved={() => {
          setMsModalOpen(false);
          load();
        }}
      />
      <FeedbackModal
        submission={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        onSaved={() => {
          setFeedbackTarget(null);
          load();
        }}
      />
      <PdfViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function AddMilestoneModal({ open, onClose, groupId, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await milestonesApi.create({
        group: groupId,
        title,
        description,
        deadline: new Date(deadline).toISOString(),
      });
      push("Milestone added.", "success");
      setTitle("");
      setDescription("");
      setDeadline("");
      onSaved();
    } catch {
      push("Couldn't add that milestone.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add milestone">
      <form onSubmit={submit}>
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 1-3 Defense"
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Deadline">
          <input
            type="date"
            className={inputClass}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </Field>
        <ModalActions onCancel={handleClose} submitLabel="Add milestone" loading={saving} />
      </form>
    </Modal>
  );
}

function FeedbackModal({ submission, onClose, onSaved }) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const handleClose = () => {
    setComment("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submissionsApi.giveFeedback({ submission: submission.id, comment });
      push("Feedback posted.", "success");
      setComment("");
      onSaved();
    } catch {
      push("Couldn't post that feedback.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!submission} onClose={handleClose} title="Add feedback">
      <form onSubmit={submit}>
        <Field label={`On: ${submission?.milestone_title ?? ""}`}>
          <textarea
            className={inputClass}
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What should the student revise or improve?"
            required
          />
        </Field>
        <ModalActions onCancel={handleClose} submitLabel="Post feedback" loading={saving} />
      </form>
    </Modal>
  );
}
