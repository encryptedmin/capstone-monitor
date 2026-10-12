import { useEffect, useState } from "react";
import { Save, Eye } from "lucide-react";
import { settingsApi, schoolYearsApi, usersApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { LightCard, Button, Field, inputClass, Spinner } from "../../components/ui";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [years, setYears] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: y }, { data: a }] = await Promise.all([
      settingsApi.get(),
      schoolYearsApi.list(),
      usersApi.list("adviser"),
    ]);
    setSettings(s);
    setYears(y.results ?? y);
    setAdvisers(a.results ?? a);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { data } = await settingsApi.update({
        default_adviser_capacity: settings.default_adviser_capacity,
        display_school_year: settings.display_school_year || null,
      });
      setSettings(data);
      push("Settings saved.", "success");
    } catch {
      push("Couldn't save settings.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveCapacity = async (adviserId, value) => {
    try {
      await usersApi.setAdviserCapacity(adviserId, value === "" ? null : value);
      push("Adviser capacity updated.", "success");
      load();
    } catch {
      push("Couldn't update that adviser's capacity.", "error");
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Settings</h1>
        <p className="text-fg/55 text-sm">Advisory capacity and admin data display.</p>
      </div>

      <LightCard className="p-6">
        <h2 className="font-display font-semibold text-lg text-fg mb-1">Department-wide</h2>
        <p className="text-sm text-fg/62 mb-5">
          These apply to every adviser and every dashboard/report unless overridden below.
        </p>
        <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2">
          <Field label="Default adviser capacity (max groups per adviser)">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={settings.default_adviser_capacity}
              onChange={(e) =>
                setSettings((s) => ({ ...s, default_adviser_capacity: Number(e.target.value) }))
              }
              required
            />
          </Field>
          <Field label="Displayed school year (admin filter)">
            <select
              className={inputClass}
              value={settings.display_school_year ?? ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  display_school_year: e.target.value ? Number(e.target.value) : null,
                }))
              }
            >
              <option value="">Show all school years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2 flex items-center gap-2 text-xs text-fg/58 -mt-2">
            <Eye size={13} />
            When a school year is selected, admin group lists and reports use that term. Students
            and advisers still see their own capstone records.
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" icon={Save} loading={savingSettings}>
              Save settings
            </Button>
          </div>
        </form>
      </LightCard>

      <LightCard className="p-6">
        <h2 className="font-display font-semibold text-lg text-fg mb-1">Per-adviser capacity overrides</h2>
        <p className="text-sm text-fg/62 mb-5">
          Leave blank to use the department default ({settings.default_adviser_capacity}).
        </p>
        {advisers.length === 0 ? (
          <p className="text-sm text-fg/55">No advisers yet.</p>
        ) : (
          <ul className="divide-y divide-fg/[0.06]">
            {advisers.map((a) => (
              <AdviserCapacityRow key={a.id} adviser={a} onSave={saveCapacity} />
            ))}
          </ul>
        )}
      </LightCard>
    </div>
  );
}

function AdviserCapacityRow({ adviser, onSave }) {
  const [value, setValue] = useState(adviser.adviser_profile?.capacity_override ?? "");

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-fg">
          {adviser.adviser_profile?.full_name || adviser.email}
        </p>
        <p className="text-xs text-fg/55">
          Effective capacity: {adviser.adviser_profile?.effective_capacity}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder="default"
          className="w-24 rounded-lg border border-fg/10 bg-fg/[0.02] px-3 py-1.5 text-sm outline-none focus:border-accent-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button variant="ghostLight" onClick={() => onSave(adviser.id, value)}>
          Save
        </Button>
      </div>
    </li>
  );
}
