import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, MessageSquare, Eye, RefreshCw, History } from "lucide-react";
import { useMyGroup } from "./useMyGroup";
import { submissionsApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { PdfViewerModal } from "../../components/PdfViewerModal";
import {
  LightCard,
  StatusBadge,
  EmptyState,
  Spinner,
  Button,
  Modal,
  ModalActions,
  Field,
  inputClass,
} from "../../components/ui";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentSubmissions() {
  const { group, milestones, submissions, loading, reload } = useMyGroup();
  const [modalOpen, setModalOpen] = useState(false);
  const [milestoneId, setMilestoneId] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null);
  const { push } = useToast();

  const closeModal = () => {
    setModalOpen(false);
    setFile(null);
    setMilestoneId("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !milestoneId) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("group", group.id);
      formData.append("milestone", milestoneId);
      formData.append("file", file);
      await submissionsApi.create(formData);
      push("Submission uploaded. Your adviser has been notified.", "success");
      setModalOpen(false);
      setFile(null);
      setMilestoneId("");
      reload();
    } catch {
      push("Couldn't upload that file. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Submissions</h1>
          <p className="text-fg/55 text-sm">Upload your capstone documents for review.</p>
        </div>
        {group && (
          <Button icon={Upload} onClick={() => setModalOpen(true)}>
            New submission
          </Button>
        )}
      </div>

      {submissions.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState
            icon={FileText}
            title="No submissions yet"
            description="Upload your first document against a milestone to get started."
          />
        </LightCard>
      ) : (
        <div className="space-y-4">
          {submissions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <LightCard className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-fg">{s.milestone_title}</p>
                    <p className="text-xs text-fg/55 mt-0.5">
                      Submitted {formatDateTime(s.submitted_at)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPreviewFile({ url: s.file, title: s.milestone_title })}
                    className="inline-flex items-center gap-1.5 text-sm text-fg/70 hover:text-fg"
                  >
                    <Eye size={14} /> View submission
                  </button>
                  {(s.status === "rejected" || s.status === "revision_needed") && (
                    <button
                      onClick={() => setResubmitTarget(s)}
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:brightness-90"
                    >
                      <RefreshCw size={14} /> Resubmit
                    </button>
                  )}
                </div>

                {s.resubmission_count > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-fg/55 mt-2">
                    <History size={12} /> Resubmitted {s.resubmission_count}{" "}
                    {s.resubmission_count === 1 ? "time" : "times"}
                  </p>
                )}

                {s.feedback?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-fg/[0.06] space-y-3">
                    {s.feedback.map((f) => (
                      <div key={f.id} className="flex gap-2.5">
                        <MessageSquare size={15} className="text-accent mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-fg/80">{f.comment}</p>
                          <p className="text-xs text-fg/50 mt-0.5">
                            {f.adviser_name} · {formatDateTime(f.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LightCard>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="New submission">
        <form onSubmit={handleUpload}>
          <Field label="Milestone">
            <select
              className={inputClass}
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a milestone
              </option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="File">
            <input
              type="file"
              className={inputClass}
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </Field>
          <ModalActions onCancel={closeModal} submitLabel="Upload submission" loading={submitting} />
        </form>
      </Modal>
      <PdfViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <ResubmitModal
        submission={resubmitTarget}
        onClose={() => setResubmitTarget(null)}
        onSaved={() => {
          setResubmitTarget(null);
          reload();
        }}
      />
    </div>
  );
}

function ResubmitModal({ submission, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await submissionsApi.resubmit(submission.id, formData);
      push("Resubmitted. Your adviser has been notified.", "success");
      setFile(null);
      onSaved();
    } catch (err) {
      push(err.response?.data?.detail || "Couldn't resubmit that file.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!submission} onClose={handleClose} title={`Resubmit · ${submission?.milestone_title ?? ""}`}>
      <form onSubmit={submit}>
        <p className="text-sm text-fg/66 mb-4">
          The new file replaces your previous upload. Your adviser will see it as pending review
          again.
        </p>
        <Field label="Replacement file">
          <input
            type="file"
            className={inputClass}
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </Field>
        <ModalActions onCancel={handleClose} submitLabel="Resubmit" loading={saving} />
      </form>
    </Modal>
  );
}
