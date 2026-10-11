import { useEffect, useState } from "react";
import { UserSearch, Upload, Clock, XCircle, CheckCircle2, Users } from "lucide-react";
import { useMyGroup } from "./useMyGroup";
import { advisersApi, groupsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  LightCard,
  GlassCard,
  Button,
  EmptyState,
  Spinner,
  Field,
  inputClass,
} from "../../components/ui";

export default function ChooseAdviser() {
  const { group, loading, reload } = useMyGroup();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  if (group?.status === "accepted") {
    return (
      <GlassCard className="p-8 text-center">
        <CheckCircle2 size={26} className="text-cyan-500 mx-auto mb-3" />
        <h1 className="font-display text-xl text-white mb-1">You're all set</h1>
        <p className="text-white/50 text-sm">
          {group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.username} accepted
          "{group.capstone_title}". Head to your dashboard to start tracking milestones.
        </p>
      </GlassCard>
    );
  }

  if (group?.status === "pending") {
    return (
      <GlassCard className="p-8 text-center">
        <Clock size={26} className="text-accent-400 mx-auto mb-3" />
        <h1 className="font-display text-xl text-white mb-1">Request pending</h1>
        <p className="text-white/50 text-sm">
          Your title "{group.capstone_title}" is awaiting a decision from{" "}
          {group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.username}.
          You'll be notified once they respond.
        </p>
      </GlassCard>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-white mb-1">Choose your adviser</h1>
      <p className="text-white/40 text-sm mb-7">
        Pick an adviser with an open slot and upload your proposed capstone title document.
      </p>

      {group?.status === "rejected" && (
        <LightCard className="p-5 mb-6 border-l-4 !border-l-danger-500">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="text-danger-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-ink">
                Your previous request, "{group.capstone_title}", was declined.
              </p>
              {group.rejection_reason && (
                <p className="text-sm text-ink/60 mt-1">Reason: {group.rejection_reason}</p>
              )}
              <p className="text-sm text-ink/50 mt-1">Pick a different adviser below and resubmit.</p>
            </div>
          </div>
        </LightCard>
      )}

      <RequestForm onSubmitted={reload} />
    </div>
  );
}

function RequestForm({ onSubmitted }) {
  const { user } = useAuth();
  const [advisers, setAdvisers] = useState([]);
  const [loadingAdvisers, setLoadingAdvisers] = useState(true);
  const [adviserId, setAdviserId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  const schoolYearId = user?.student_profile?.school_year;

  useEffect(() => {
    advisersApi.directory(schoolYearId ? { school_year: schoolYearId } : {}).then(({ data }) => {
      setAdvisers(data);
      setLoadingAdvisers(false);
    });
  }, [schoolYearId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!adviserId || !title || !file) return;
    if (!schoolYearId) {
      push("Your account has no capstone term set -- contact your administrator.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("adviser", adviserId);
      formData.append("capstone_title", title);
      formData.append("title_document", file);
      formData.append("school_year", schoolYearId);
      await groupsApi.requestTitle(formData);
      push("Title request submitted. Your adviser has been notified.", "success");
      onSubmitted();
    } catch (err) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(" ") : "Couldn't submit that request.";
      push(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <LightCard className="p-6">
          <h2 className="font-display text-lg text-ink mb-4">Available advisers</h2>
          {loadingAdvisers ? (
            <div className="flex justify-center py-10">
              <Spinner size={20} />
            </div>
          ) : advisers.length === 0 ? (
            <EmptyState icon={Users} title="No advisers configured yet" />
          ) : (
            <ul className="space-y-2">
              {advisers.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={!a.is_vacant}
                    onClick={() => setAdviserId(String(a.id))}
                    className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left border transition-colors ${
                      !a.is_vacant
                        ? "opacity-40 cursor-not-allowed border-black/5 bg-black/[0.02]"
                        : String(adviserId) === String(a.id)
                        ? "border-accent-500 bg-accent-500/[0.07]"
                        : "border-black/10 hover:bg-black/[0.03]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <UserSearch size={15} className="text-ink/40" />
                      <span className="text-sm font-medium text-ink">{a.full_name}</span>
                    </span>
                    <span className="text-xs text-ink/45">
                      {a.is_vacant ? `${a.slots_remaining} slot(s) open` : "Full"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </LightCard>
      </div>

      <div className="lg:col-span-2">
        <LightCard className="p-6">
          <h2 className="font-display text-lg text-ink mb-4">Your title request</h2>
          <form onSubmit={submit}>
            <Field label="Proposed capstone title">
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <Field label="Title document">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className={inputClass}
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </Field>
            <p className="text-xs text-ink/40 mb-4">
              {!schoolYearId
                ? "Your account has no capstone term set -- contact your administrator."
                : adviserId
                ? "Adviser selected from the list on the left."
                : "Select an adviser with an open slot first."}
            </p>
            <Button
              type="submit"
              icon={Upload}
              loading={submitting}
              disabled={!adviserId || !schoolYearId}
              className="w-full"
            >
              Submit request
            </Button>
          </form>
        </LightCard>
      </div>
    </div>
  );
}
