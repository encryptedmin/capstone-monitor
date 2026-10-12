import { useEffect, useState } from "react";
import { UserSearch, Upload, Clock, XCircle, CheckCircle2, Users, Plus, X, Info } from "lucide-react";
import { useMyGroup } from "./useMyGroup";
import { advisersApi, groupsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { cleanName, flattenErrors, splitPartnerErrors, validatePartners } from "../../lib/names";
import {
  LightCard,
  GlassCard,
  Button,
  EmptyState,
  Modal,
  Spinner,
  Field,
  inputClass,
} from "../../components/ui";

// Backend limit: 1 to 2 partners per capstone.
const MAX_PARTNERS = 2;

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
        <CheckCircle2 size={26} className="text-cyan mx-auto mb-3" />
        <h1 className="font-display font-semibold text-xl text-fg mb-1">You're all set</h1>
        <p className="text-fg/62 text-sm">
          {group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.email} accepted
          "{group.capstone_title}". Head to your dashboard to start tracking milestones.
        </p>
      </GlassCard>
    );
  }

  if (group?.status === "pending") {
    return (
      <GlassCard className="p-8 text-center">
        <Clock size={26} className="text-accent mx-auto mb-3" />
        <h1 className="font-display font-semibold text-xl text-fg mb-1">Request pending</h1>
        <p className="text-fg/62 text-sm">
          Your title "{group.capstone_title}" is awaiting a decision from{" "}
          {group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.email}.
          You'll be notified once they respond.
        </p>
      </GlassCard>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Choose your adviser</h1>
      <p className="text-fg/55 text-sm mb-7">
        Pick an adviser with an open slot and upload your proposed capstone title document.
      </p>

      {group?.status === "rejected" && (
        <LightCard className="p-5 mb-6 border-l-4 !border-l-danger-500">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="text-danger mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-fg">
                Your previous request, "{group.capstone_title}", was declined.
              </p>
              {group.rejection_reason && (
                <p className="text-sm text-fg/70 mt-1">Reason: {group.rejection_reason}</p>
              )}
              <p className="text-sm text-fg/62 mt-1">Pick a different adviser below and resubmit.</p>
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
  const [partners, setPartners] = useState([""]);
  const [touched, setTouched] = useState([false]);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({ byIndex: {}, general: [] });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { push } = useToast();

  const schoolYearId = user?.student_profile?.school_year;
  const ownName = user?.student_profile?.full_name || "";
  const adviserName = advisers.find((a) => String(a.id) === String(adviserId))?.full_name;

  const partnerErrors = validatePartners(partners, ownName);
  const partnersValid = partnerErrors.every((e) => !e);
  const formValid = Boolean(adviserId && title.trim() && file && schoolYearId && partnersValid);

  useEffect(() => {
    advisersApi.directory(schoolYearId ? { school_year: schoolYearId } : {}).then(({ data }) => {
      setAdvisers(data);
      setLoadingAdvisers(false);
    });
  }, [schoolYearId]);

  const setPartner = (index, value) => {
    setPartners((list) => list.map((p, i) => (i === index ? value : p)));
    setServerErrors({ byIndex: {}, general: [] });
  };
  const touchPartner = (index) =>
    setTouched((list) => list.map((t, i) => (i === index ? true : t)));
  const addPartner = () => {
    setPartners((list) => (list.length < MAX_PARTNERS ? [...list, ""] : list));
    setTouched((list) => (list.length < MAX_PARTNERS ? [...list, false] : list));
  };
  const removePartner = (index) => {
    setPartners((list) => list.filter((_, i) => i !== index));
    setTouched((list) => list.filter((_, i) => i !== index));
    setServerErrors({ byIndex: {}, general: [] });
  };

  // Step 1: validate, then ask the student to confirm.
  const submit = (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!partnersValid) return;
    if (!adviserId || !title.trim() || !file) return;
    if (!schoolYearId) {
      push("Your account has no capstone term set -- contact your administrator.", "error");
      return;
    }
    setConfirmOpen(true);
  };

  // Step 2: send the request.
  const sendRequest = async () => {
    const partnerNames = partners.map(cleanName);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("adviser", adviserId);
      formData.append("capstone_title", title.trim());
      formData.append("title_document", file);
      formData.append("school_year", schoolYearId);
      partnerNames.forEach((n) => formData.append("partner_names", n));
      await groupsApi.requestTitle(formData);
      push("Title request submitted. Your adviser has been notified.", "success");
      setConfirmOpen(false);
      onSubmitted();
    } catch (err) {
      setConfirmOpen(false);
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const { partner_names: partnerError, ...rest } = data;
        if (partnerError !== undefined) {
          setServerErrors(splitPartnerErrors(partnerError, partnerNames));
          setTouched(partnerNames.map(() => true));
        }
        const otherMessages = flattenErrors(rest);
        if (otherMessages.length > 0 || partnerError === undefined) {
          push(otherMessages.join(" ") || "Couldn't submit that request.", "error");
        }
      } else {
        push("Couldn't submit that request.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <LightCard className="p-6">
          <h2 className="font-display font-semibold text-lg text-fg mb-4">Available advisers</h2>
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
                        ? "opacity-40 cursor-not-allowed border-fg/5 bg-fg/[0.02]"
                        : String(adviserId) === String(a.id)
                        ? "border-accent-500 bg-accent-500/[0.07]"
                        : "border-fg/10 hover:bg-fg/[0.03]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <UserSearch size={15} className="text-fg/55" />
                      <span className="text-sm font-medium text-fg">{a.full_name}</span>
                    </span>
                    <span className="text-xs text-fg/58">
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
          <h2 className="font-display font-semibold text-lg text-fg mb-4">Your title request</h2>
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
            <fieldset className="mb-4">
              <legend className="block text-sm font-medium text-fg/75 mb-1.5">
                Capstone partner(s)
              </legend>
              <p className="text-xs text-fg/55 mb-3">
                Enter your partner's full name exactly as they would register it. Your partner will
                NOT get their own account; you manage the capstone for the whole group.
              </p>
              {partners.map((name, i) => {
                const clientError = touched[i] || attempted ? partnerErrors[i] : "";
                const messages = [...(clientError ? [clientError] : []), ...(serverErrors.byIndex[i] ?? [])];
                const errorId = `partner-error-${i}`;
                return (
                  <div key={i} className="mb-2.5">
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass} ${messages.length ? "!border-danger-500" : ""}`}
                        value={name}
                        onChange={(e) => setPartner(i, e.target.value)}
                        onBlur={() => touchPartner(i)}
                        placeholder={`Partner ${i + 1} full name`}
                        aria-label={`Partner ${i + 1} full name`}
                        aria-invalid={messages.length > 0}
                        aria-describedby={messages.length ? errorId : undefined}
                        autoComplete="off"
                      />
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => removePartner(i)}
                          aria-label={`Remove partner ${i + 1}`}
                          title="Remove partner"
                          className="shrink-0 rounded-xl border border-fg/10 px-3 text-fg/60 hover:bg-fg/[0.08] hover:text-danger transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {messages.length > 0 && (
                      <div id={errorId} role="alert" className="mt-1.5 space-y-0.5">
                        {messages.map((m) => (
                          <p key={m} className="text-xs text-danger">
                            {m}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {serverErrors.general.length > 0 && (
                <div role="alert" className="mb-2.5 space-y-0.5">
                  {serverErrors.general.map((m) => (
                    <p key={m} className="text-xs text-danger">
                      {m}
                    </p>
                  ))}
                </div>
              )}
              {partners.length < MAX_PARTNERS && (
                <Button type="button" variant="subtle" icon={Plus} onClick={addPartner} className="!px-2 !py-1.5">
                  Add another partner
                </Button>
              )}
            </fieldset>
            <p className="text-xs text-fg/55 mb-4">
              {!schoolYearId
                ? "Your account has no capstone term set -- contact your administrator."
                : !adviserId
                ? "Select an adviser with an open slot first."
                : !partnersValid
                ? "Add your partner's full name to continue."
                : "Adviser selected from the list on the left."}
            </p>
            <Button type="submit" icon={Upload} disabled={!formValid} className="w-full">
              Submit request
            </Button>
          </form>
        </LightCard>
      </div>

      <Modal open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title="Confirm title request">
        <dl className="space-y-3 text-sm mb-4">
          <div>
            <dt className="text-fg/55 text-xs">Capstone title</dt>
            <dd className="text-fg font-medium">{title.trim()}</dd>
          </div>
          <div>
            <dt className="text-fg/55 text-xs">Adviser</dt>
            <dd className="text-fg">{adviserName || "-"}</dd>
          </div>
          <div>
            <dt className="text-fg/55 text-xs">Partner(s)</dt>
            <dd className="text-fg">{partners.map(cleanName).join(", ")}</dd>
          </div>
        </dl>
        <div className="flex items-start gap-2.5 rounded-xl bg-accent-500/10 ring-1 ring-inset ring-accent-500/25 px-3.5 py-3 mb-5">
          <Info size={16} className="text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-fg/80">
            Listed partners will be unable to register their own accounts.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghostLight"
            className="flex-1"
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
          >
            Go back
          </Button>
          <Button type="button" icon={Upload} className="flex-1" loading={submitting} onClick={sendRequest}>
            Confirm and submit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
