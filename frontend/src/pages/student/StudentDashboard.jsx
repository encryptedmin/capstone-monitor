import { motion } from "framer-motion";
import { ListChecks, FileText, Users2, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyGroup } from "./useMyGroup";
import { GlassCard, LightCard, ProgressBar, StatusBadge, EmptyState, Spinner } from "../../components/ui";

const cardIn = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

export default function StudentDashboard() {
  const { group, milestones, submissions, loading } = useMyGroup();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  if (!group) {
    return (
      <GlassCard className="p-2">
        <EmptyState
          icon={Users2}
          title="You haven't been added to a capstone group yet"
          description="Ask your department administrator or adviser to enroll you into a group."
        />
      </GlassCard>
    );
  }

  const completed = milestones.filter((m) => m.status === "completed").length;
  const recentSubmissions = submissions.slice(0, 4);

  const stats = [
    {
      label: "Milestones completed",
      value: `${completed} / ${milestones.length}`,
      icon: ListChecks,
    },
    { label: "Submissions on file", value: submissions.length, icon: FileText },
    {
      label: "Faculty adviser",
      value: group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.username || "Unassigned",
      icon: Users2,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-white/40 text-sm">Your capstone project</p>
        <h1 className="font-display text-2xl md:text-3xl text-white mt-1">
          {group.capstone_title}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} custom={i} variants={cardIn} initial="hidden" animate="show">
            <GlassCard className="p-5">
              <s.icon size={18} className="text-gold-400 mb-3" />
              <p className="text-white text-xl font-display">{s.value}</p>
              <p className="text-white/45 text-xs mt-0.5">{s.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <motion.div
          custom={3}
          variants={cardIn}
          initial="hidden"
          animate="show"
          className="lg:col-span-2"
        >
          <LightCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-ink">Overall progress</h2>
              <Link
                to="/student/milestones"
                className="text-xs text-ink/50 hover:text-ink flex items-center gap-1"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <p className="text-3xl font-display text-ink mb-2">
              {milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0}%
            </p>
            <ProgressBar value={completed} total={milestones.length} colorClass="bg-teal-500" />
            <p className="text-xs text-ink/40 mt-3">
              {completed} of {milestones.length} milestones marked completed by your adviser.
            </p>
          </LightCard>
        </motion.div>

        <motion.div
          custom={4}
          variants={cardIn}
          initial="hidden"
          animate="show"
          className="lg:col-span-3"
        >
          <LightCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-ink">Recent submissions</h2>
              <Link
                to="/student/submissions"
                className="text-xs text-ink/50 hover:text-ink flex items-center gap-1"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            {recentSubmissions.length === 0 ? (
              <EmptyState icon={FileText} title="No submissions yet" />
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {recentSubmissions.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{s.milestone_title}</p>
                      <p className="text-xs text-ink/40">
                        {new Date(s.submitted_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </LightCard>
        </motion.div>
      </div>
    </div>
  );
}
