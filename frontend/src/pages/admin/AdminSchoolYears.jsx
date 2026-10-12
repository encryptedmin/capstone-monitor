import { useEffect, useState } from "react";
import { Plus, CalendarRange, Star } from "lucide-react";
import { schoolYearsApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import {
  LightCard,
  Button,
  Modal,
  ModalActions,
  Field,
  inputClass,
  EmptyState,
  Spinner,
} from "../../components/ui";

// A capstone term always runs Capstone 1 in the 2nd semester of the starting
// AY and Capstone 2 in the 1st semester of the following AY.
function capstoneTerms(startYear) {
  const year = Number(startYear);
  return {
    capstone1: { semester: 2, year },
    capstone2: { semester: 1, year: year + 1 },
  };
}

const ayLabel = (year) => `AY ${year}-${year + 1}`;

export default function AdminSchoolYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await schoolYearsApi.list();
    setYears(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setActiveTerm = async (id) => {
    try {
      await schoolYearsApi.update(id, { is_active: true });
      push("Active capstone term updated.", "success");
      load();
    } catch {
      push("Couldn't update the active term.", "error");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">School Years</h1>
          <p className="text-fg/55 text-sm">
            Capstone terms span two semesters across an academic-year boundary. The active term is
            what new registrations default to.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Add term
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size={26} />
        </div>
      ) : years.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={CalendarRange} title="No capstone terms yet" />
        </LightCard>
      ) : (
        <LightCard className="p-2">
          <ul className="divide-y divide-fg/[0.06]">
            {years.map((y) => (
              <li key={y.id} className="flex items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-medium text-fg">{y.label}</p>
                  {y.is_active && (
                    <span className="inline-flex items-center gap-1 text-xs text-cyan mt-0.5">
                      <Star size={11} fill="currentColor" /> Active for registration
                    </span>
                  )}
                </div>
                {!y.is_active && (
                  <Button variant="ghostLight" onClick={() => setActiveTerm(y.id)}>
                    Set active
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </LightCard>
      )}

      <AddTermModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

function AddTermModal({ open, onClose, onSaved }) {
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const yearValid = Number.isInteger(Number(startYear)) && Number(startYear) >= 2000 && Number(startYear) <= 2099;
  const terms = yearValid ? capstoneTerms(startYear) : null;

  const handleClose = () => {
    setStartYear(new Date().getFullYear());
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!terms) return;
    setSaving(true);
    try {
      await schoolYearsApi.create({
        start_semester: terms.capstone1.semester,
        start_year: terms.capstone1.year,
        end_semester: terms.capstone2.semester,
        end_year: terms.capstone2.year,
      });
      push("Capstone term added.", "success");
      setStartYear(new Date().getFullYear());
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(" ") : "Couldn't add that term.";
      push(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add capstone term">
      <form onSubmit={submit}>
        <p className="text-xs text-fg/62 mb-4">
          Enter the academic year Capstone 1 starts in. Capstone 2 is set automatically to the
          following academic year.
        </p>
        <Field label="Capstone 1 starting AY (e.g. 2026 for AY 2026-2027)">
          <input
            type="number"
            min="2000"
            max="2099"
            className={inputClass}
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            required
          />
        </Field>
        <div className="mt-4 mb-5 rounded-xl bg-fg/[0.05] ring-1 ring-inset ring-fg/10 px-4 py-3 text-sm text-fg space-y-1.5">
          <p>
            <span className="font-medium">Capstone 1:</span>{" "}
            {terms ? `2nd Semester, ${ayLabel(terms.capstone1.year)}` : "—"}
          </p>
          <p>
            <span className="font-medium">Capstone 2:</span>{" "}
            {terms ? `1st Semester, ${ayLabel(terms.capstone2.year)}` : "—"}
          </p>
        </div>
        <ModalActions onCancel={handleClose} submitLabel="Add term" loading={saving} />
      </form>
    </Modal>
  );
}
