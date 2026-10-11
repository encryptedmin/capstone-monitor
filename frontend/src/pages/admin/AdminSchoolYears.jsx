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

const SEMESTERS = [
  { value: 1, label: "1st Semester" },
  { value: 2, label: "2nd Semester" },
];

function nextCapstoneTerm(startSemester, startYear) {
  const semester = Number(startSemester);
  const year = Number(startYear);
  if (semester === 2) {
    return { semester: 1, year: year + 1 };
  }
  return { semester: 2, year };
}

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
          <h1 className="font-display text-2xl text-white mb-1">School Years</h1>
          <p className="text-white/40 text-sm">
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
          <ul className="divide-y divide-black/[0.06]">
            {years.map((y) => (
              <li key={y.id} className="flex items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-medium text-ink">{y.label}</p>
                  {y.is_active && (
                    <span className="inline-flex items-center gap-1 text-xs text-cyan-500 mt-0.5">
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
  const [startSemester, setStartSemester] = useState(2);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endSemester, setEndSemester] = useState(1);
  const [endYear, setEndYear] = useState(new Date().getFullYear() + 1);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    const next = nextCapstoneTerm(startSemester, startYear);
    setEndSemester(next.semester);
    setEndYear(next.year);
  }, [startSemester, startYear]);

  const reset = () => {
    const year = new Date().getFullYear();
    setStartSemester(2);
    setStartYear(year);
    const next = nextCapstoneTerm(2, year);
    setEndSemester(next.semester);
    setEndYear(next.year);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolYearsApi.create({
        start_semester: Number(startSemester),
        start_year: Number(startYear),
        end_semester: Number(endSemester),
        end_year: Number(endYear),
      });
      push("Capstone term added.", "success");
      reset();
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
        <p className="text-xs text-ink/50 mb-4">
          Choose the starting semester. The continuation term is filled in automatically.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start semester">
            <select className={inputClass} value={startSemester} onChange={(e) => setStartSemester(e.target.value)}>
              {SEMESTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Start AY (e.g. 2026 for AY 2026-2027)">
            <input
              type="number"
              className={inputClass}
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="End semester">
            <select className={`${inputClass} bg-black/[0.04]`} value={endSemester} disabled>
              {SEMESTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="End AY (e.g. 2027 for AY 2027-2028)">
            <input
              type="number"
              className={`${inputClass} bg-black/[0.04]`}
              value={endYear}
              readOnly
              required
            />
          </Field>
        </div>
        <ModalActions onCancel={handleClose} submitLabel="Add term" loading={saving} />
      </form>
    </Modal>
  );
}
