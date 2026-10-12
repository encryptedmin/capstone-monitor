import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, ExternalLink, FolderKanban, ListChecks, FileClock } from "lucide-react";
import { reportsApi, schoolYearsApi } from "../../lib/api";
import {
  LightCard,
  Button,
  Skeleton,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatCard,
  inputClass,
} from "../../components/ui";

const cardIn = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      reportsApi.analytics(selectedSchoolYear),
      schoolYears.length ? Promise.resolve({ data: schoolYears }) : schoolYearsApi.list(),
    ])
      .then(([analyticsRes, yearsRes]) => {
        if (cancelled) return;
        setData(analyticsRes.data);
        if (!schoolYears.length) {
          setSchoolYears(yearsRes.data.results ?? yearsRes.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSchoolYear]);

  const selectedScope =
    selectedSchoolYear === "all"
      ? "All AY ranges"
      : schoolYears.find((year) => String(year.id) === String(selectedSchoolYear))?.label ||
        "Selected AY range";

  const openPdfReport = () => {
    const params = new URLSearchParams({
      school_year: selectedSchoolYear,
      scope: selectedScope,
    });
    window.open(`/admin/report?${params.toString()}`, "_blank");
  };

  if (loading && !data) {
    return (
      <div className="space-y-7" aria-busy="true">
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const stats = [
    { label: "Capstone groups", value: data.group_count, icon: FolderKanban, tone: "accent" },
    {
      label: "Milestones completed",
      value: `${data.milestones.completed} / ${data.milestones.total}`,
      icon: ListChecks,
      tone: "cyan",
    },
    {
      label: "Submissions pending review",
      value: data.submissions.pending_review,
      icon: FileClock,
      tone: "violet",
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Department overview"
        title="ITE Capstone Analytics"
        description={selectedScope}
        actions={
          <>
            <label className="relative min-w-64">
              <CalendarRange
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg/55"
              />
              <select
                className={`${inputClass} pl-9`}
                value={selectedSchoolYear}
                onChange={(event) => setSelectedSchoolYear(event.target.value)}
                aria-label="Filter by academic year range"
              >
                <option value="all">All AY ranges</option>
                {schoolYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
            </label>
            <Button icon={ExternalLink} onClick={openPdfReport}>
              View PDF report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} custom={i} variants={cardIn} initial="hidden" animate="show">
            <StatCard icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
          </motion.div>
        ))}
      </div>

      <motion.div custom={3} variants={cardIn} initial="hidden" animate="show">
        <LightCard className="p-6">
          <h2 className="font-display text-lg font-semibold text-fg mb-4">Progress by group</h2>
          {data.per_group.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No capstone groups yet" />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-fg/55 border-b border-fg/[0.08]">
                    <th className="pb-2.5 font-medium">Capstone title</th>
                    <th className="pb-2.5 font-medium">Adviser</th>
                    <th className="pb-2.5 font-medium">Members</th>
                    <th className="pb-2.5 font-medium">Milestones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_group.map((g) => (
                    <tr key={g.group} className="border-b border-fg/[0.05] last:border-0">
                      <td className="py-3 pr-4 text-fg">{g.group}</td>
                      <td className="py-3 pr-4 text-fg/70">{g.adviser || "Unassigned"}</td>
                      <td className="py-3 pr-4 text-fg/70">{g.members}</td>
                      <td className="py-3 text-fg/70 min-w-44">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <ProgressBar value={g.milestones_completed} total={g.milestones_total} />
                          </div>
                          <span className="tabular-nums text-xs w-11 text-right">
                            {g.milestones_completed} / {g.milestones_total}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LightCard>
      </motion.div>
    </div>
  );
}
