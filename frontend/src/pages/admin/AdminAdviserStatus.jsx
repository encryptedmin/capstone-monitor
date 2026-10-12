import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ClipboardList, FolderKanban, UserCheck } from "lucide-react";
import { groupsApi, schoolYearsApi } from "../../lib/api";
import {
  Button,
  EmptyState,
  LightCard,
  Modal,
  Spinner,
  inputClass,
} from "../../components/ui";

export default function AdminAdviserStatus() {
  const [rows, setRows] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedAdviserId, setSelectedAdviserId] = useState(null);
  const [modalAdviser, setModalAdviser] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: statusData }, { data: yearData }] = await Promise.all([
        groupsApi.adviserStatus({ school_year: selectedSchoolYear }),
        schoolYears.length ? Promise.resolve({ data: schoolYears }) : schoolYearsApi.list(),
      ]);
      setRows(statusData.results ?? statusData);
      if (!schoolYears.length) setSchoolYears(yearData.results ?? yearData);
      setLoading(false);
    };

    load();
  }, [selectedSchoolYear]);

  const adviserRows = useMemo(() => {
    return rows.map((row) => ({
      adviser: row.adviser,
      acceptedGroups: row.accepted_groups ?? [],
      capacity: row.capacity ?? 0,
      isFull: row.is_full,
      slotsRemaining: row.slots_remaining ?? 0,
    }));
  }, [rows]);

  const selectedRow = adviserRows.find((row) => row.adviser.id === selectedAdviserId);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Adviser Status</h1>
          <p className="text-fg/55 text-sm">
            View adviser availability and the accepted capstone projects they currently handle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-64">
            <CalendarRange
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg/58"
            />
            <select
              className={`${inputClass} pl-9`}
              value={selectedSchoolYear}
              onChange={(event) => {
                setSelectedSchoolYear(event.target.value);
                setSelectedAdviserId(null);
                setModalAdviser(null);
              }}
            >
              <option value="all">All AY ranges</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
          </label>
          {selectedRow && (
            <Button
              icon={ClipboardList}
              onClick={() => setModalAdviser(selectedRow)}
            >
              View projects
            </Button>
          )}
        </div>
      </div>

      {adviserRows.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={UserCheck} title="No advisers found" />
        </LightCard>
      ) : (
        <LightCard className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-fg/[0.06] px-5 py-3 text-xs font-medium uppercase tracking-wide text-fg/55">
            <span>Adviser</span>
            <span>Status</span>
            <span>Load</span>
            <span>Slots</span>
          </div>

          <div className="divide-y divide-fg/[0.06]">
            {adviserRows.map((row) => {
              const isSelected = selectedAdviserId === row.adviser.id;
              const name = row.adviser.adviser_profile?.full_name || row.adviser.email;

              return (
                <button
                  key={row.adviser.id}
                  type="button"
                  onClick={() => setSelectedAdviserId(row.adviser.id)}
                  className={`grid w-full gap-3 px-5 py-4 text-left transition-colors md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] md:items-center ${
                    isSelected ? "bg-accent-500/10" : "hover:bg-fg/[0.025]"
                  }`}
                >
                  <div>
                    <p className="font-medium text-fg">{name}</p>
                    <p className="text-xs text-fg/55">
                      {row.adviser.email}
                      {!row.adviser.is_active ? " - Disabled account" : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="md:hidden text-xs font-medium text-fg/55">Status</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        row.isFull ? "bg-danger-500/15 text-danger" : "bg-cyan-500/15 text-cyan"
                      }`}
                    >
                      {row.isFull ? "Full" : "Available"}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-fg">
                      {row.acceptedGroups.length} of {row.capacity}
                    </p>
                    <p className="text-xs text-fg/55">accepted groups</p>
                  </div>

                  <div>
                    <p className="text-sm text-fg">{row.slotsRemaining}</p>
                    <p className="text-xs text-fg/55">remaining</p>
                  </div>
                </button>
              );
            })}
          </div>
        </LightCard>
      )}

      <ProjectsModal row={modalAdviser} onClose={() => setModalAdviser(null)} />
    </div>
  );
}

function ProjectsModal({ row, onClose }) {
  const name = row?.adviser.adviser_profile?.full_name || row?.adviser.email || "Adviser";

  return (
    <Modal open={!!row} onClose={onClose} title={`${name}'s capstone projects`} width="max-w-2xl">
      {row?.acceptedGroups.length ? (
        <ul className="space-y-3">
          {row.acceptedGroups.map((group) => (
            <li
              key={group.id}
              className="rounded-lg border border-fg/[0.06] bg-fg/[0.025] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <FolderKanban size={18} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-fg">{group.capstone_title}</p>
                  <p className="text-xs text-fg/58">
                    {group.school_year_label || "No term set"} - {group.member_count} member(s)
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={FolderKanban} title="No accepted capstone projects" />
      )}
      <Button type="button" variant="ghostLight" className="mt-5 w-full" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}
