import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, Check, X, Eye } from "lucide-react";
import { groupsApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { PdfViewerModal } from "../../components/PdfViewerModal";
import { LightCard, Button, Modal, ModalActions, Field, inputClass, EmptyState, Spinner } from "../../components/ui";

export default function AdviserRequests() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await groupsApi.list({ status: "pending" });
    const list = data.results ?? data;
    setGroups(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id) => {
    try {
      await groupsApi.accept(id);
      push("Title accepted -- the group now counts toward your advisory load.", "success");
      load();
    } catch (err) {
      const msg = err.response?.data?.detail || "Couldn't accept that request.";
      push(msg, "error");
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
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Title requests</h1>
      <p className="text-fg/55 text-sm mb-7">
        Students awaiting your decision on their proposed capstone title.
      </p>

      {groups.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={Inbox} title="No pending requests" description="You're all caught up." />
        </LightCard>
      ) : (
        <div className="space-y-4">
          {groups.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <LightCard className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-fg">{g.capstone_title}</p>
                    <p className="text-xs text-fg/55 mt-0.5">
                      {g.requested_by_detail?.student_profile?.full_name || g.requested_by_detail?.email} -{" "}
                      {g.school_year_label || "No term set"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghostLight" icon={Eye} onClick={() => setPreviewFile({ url: g.title_document, title: g.capstone_title })}>
                      View document
                    </Button>
                    <Button icon={Check} onClick={() => accept(g.id)}>
                      Accept
                    </Button>
                    <Button variant="danger" icon={X} onClick={() => setRejectTarget(g)}>
                      Reject
                    </Button>
                  </div>
                </div>
              </LightCard>
            </motion.div>
          ))}
        </div>
      )}

      <RejectModal group={rejectTarget} onClose={() => setRejectTarget(null)} onDone={() => { setRejectTarget(null); load(); }} />
      <PdfViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function RejectModal({ group, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await groupsApi.reject(group.id, reason);
      push("Request declined.", "success");
      setReason("");
      onDone();
    } catch {
      push("Couldn't reject that request.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!group} onClose={handleClose} title={`Decline "${group?.capstone_title ?? ""}"`}>
      <form onSubmit={submit}>
        <Field label="Reason (shown to the student)">
          <textarea
            className={inputClass}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Title overlaps with an existing project -- please propose something more specific."
          />
        </Field>
        <ModalActions onCancel={handleClose} submitLabel="Decline request" loading={saving} />
      </form>
    </Modal>
  );
}
