import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, ArrowUpRight, Users2 } from "lucide-react";
import { groupsApi } from "../../lib/api";
import { GlassCard, PageHeader, ProgressBar, EmptyState, Skeleton } from "../../components/ui";

export default function AdviserDashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupsApi.list().then(({ data }) => {
      const list = data.results ?? data;
      // Pending title requests live on the dedicated "Title requests" page;
      // this view is only the groups you've already accepted.
      setGroups(list.filter((g) => g.status === "accepted"));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-16 w-2/3 mb-7" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty adviser"
        title="Your assigned groups"
        description="Review submissions, update milestones, and leave feedback for each team."
      />

      {groups.length === 0 ? (
        <GlassCard className="p-2">
          <EmptyState
            icon={FolderKanban}
            title="No accepted groups yet"
            description="Accept a student's title request from Title Requests to see it here."
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => {
            const completed = g.milestones_completed ?? 0;
            const total = g.milestones_total ?? 0;
            return (
              <motion.div
                className="h-full"
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={`/adviser/groups/${g.id}`} className="block h-full rounded-2xl">
                  <GlassCard className="glass-hover p-5 h-full group">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-display text-lg font-semibold text-fg pr-2">{g.capstone_title}</h3>
                      <ArrowUpRight
                        size={16}
                        className="text-fg/45 group-hover:text-fg/78 transition-colors shrink-0 mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-fg/58 text-xs mb-4">
                      <Users2 size={13} /> {g.member_count} member{g.member_count === 1 ? "" : "s"}
                    </div>
                    <ProgressBar value={completed} total={total}  />
                    <p className="text-fg/55 text-xs mt-2">
                      {completed} of {total} milestones completed
                    </p>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
