import { motion } from "framer-motion";
import { ListChecks, FileText, Users2, ArrowUpRight, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMyGroup } from "./useMyGroup";
import {
  Avatar,
  GlassCard,
  LightCard,
  PageHeader,
  ProgressRing,
  Skeleton,
  StatCard,
  StatusBadge,
  EmptyState,
  Button,
} from "../../components/ui";

const cardIn = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

function memberName(m) {
  if (m.is_listed_partner) return m.student_name_snapshot;
  return (
    m.student_detail?.student_profile?.full_name || m.student_detail?.email || m.student_name_snapshot
  );
}

export default function StudentDashboard() {
  const { group, milestones, submissions, loading } = useMyGroup();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="space-y-7" aria-busy="true">
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!group) {
    return (
      <GlassCard className="p-8 text-center">
        <Users2 size={26} className="text-fg/55 mx-auto mb-3" />
        <h1 className="font-display text-xl font-semibold text-fg mb-1">No capstone title yet</h1>
        <p className="text-fg/62 text-sm mb-5">
          Choose an adviser and upload your proposed title to get started.
        </p>
        <Link to="/student/adviser">
          <Button>Choose an adviser</Button>
        </Link>
      </GlassCard>
    );
  }

  if (group.status === "pending") {
    return (
      <GlassCard className="p-8 text-center">
        <Clock size={26} className="text-accent mx-auto mb-3" />
        <h1 className="font-display text-xl font-semibold text-fg mb-1">Request pending</h1>
        <p className="text-fg/62 text-sm mb-5">
          "{group.capstone_title}" is awaiting a decision from{" "}
          {group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.email}.
        </p>
        <Link to="/student/adviser">
          <Button variant="ghost">View request</Button>
        </Link>
      </GlassCard>
    );
  }

  if (group.status === "rejected") {
    return (
      <GlassCard className="p-8 text-center">
        <XCircle size={26} className="text-danger mx-auto mb-3" />
        <h1 className="font-display text-xl font-semibold text-fg mb-1">Title declined</h1>
        <p className="text-fg/62 text-sm mb-5">
          "{group.capstone_title}" was declined
          {group.rejection_reason ? `: ${group.rejection_reason}` : "."} Choose a different adviser
          to try again.
        </p>
        <Link to="/student/adviser">
          <Button>Choose another adviser</Button>
        </Link>
      </GlassCard>
    );
  }

  const completed = milestones.filter((m) => m.status === "completed").length;
  const recentSubmissions = submissions.slice(0, 4);
  // The signed-in student first, then everyone else. Partners have no account,
  // so their name comes from the snapshot.
  const members = [...(group.members ?? [])].sort(
    (a, b) => Number(b.student === user?.id) - Number(a.student === user?.id)
  );

  const stats = [
    {
      label: "Milestones completed",
      value: `${completed} / ${milestones.length}`,
      icon: ListChecks,
      tone: "cyan",
    },
    { label: "Submissions on file", value: submissions.length, icon: FileText, tone: "violet" },
    {
      label: "Faculty adviser",
      value: group.adviser_detail?.adviser_profile?.full_name || group.adviser_detail?.email || "Unassigned",
      icon: Users2,
      tone: "accent",
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Your capstone project" title={group.capstone_title} />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} custom={i} variants={cardIn} initial="hidden" animate="show">
            <StatCard icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
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
              <h2 className="font-display text-lg font-semibold text-fg">Overall progress</h2>
              <Link
                to="/student/milestones"
                className="text-xs text-fg/62 hover:text-fg flex items-center gap-1"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <ProgressRing value={completed} total={milestones.length} />
              <p className="text-sm text-fg/62">
                <span className="block font-display text-lg font-semibold text-fg tabular-nums">
                  {completed} of {milestones.length}
                </span>
                milestones marked completed by your adviser.
              </p>
            </div>
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
              <h2 className="font-display text-lg font-semibold text-fg">Recent submissions</h2>
              <Link
                to="/student/submissions"
                className="text-xs text-fg/62 hover:text-fg flex items-center gap-1"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            {recentSubmissions.length === 0 ? (
              <EmptyState icon={FileText} title="No submissions yet" />
            ) : (
              <ul className="divide-y divide-fg/[0.05]">
                {recentSubmissions.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-fg truncate">{s.milestone_title}</p>
                      <p className="text-xs text-fg/55">
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

      <motion.div custom={5} variants={cardIn} initial="hidden" animate="show">
        <LightCard className="p-6">
          <h2 className="font-display text-lg font-semibold text-fg mb-4">Group members</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const isMe = m.student != null && m.student === user?.id;
              const name = memberName(m);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-fg/[0.04] ring-1 ring-inset ring-fg/10 px-3.5 py-3"
                >
                  <Avatar name={name} size={34} />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isMe ? "bg-accent-500/15 text-accent" : "bg-fg/10 text-fg/62"
                    }`}
                  >
                    {isMe ? "You" : "Partner"}
                  </span>
                </li>
              );
            })}
          </ul>
        </LightCard>
      </motion.div>
    </div>
  );
}
