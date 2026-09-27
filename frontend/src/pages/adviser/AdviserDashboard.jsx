import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, ArrowUpRight, Users2 } from "lucide-react";
import { groupsApi } from "../../lib/api";
import { GlassCard, ProgressBar, EmptyState, Spinner } from "../../components/ui";

export default function AdviserDashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupsApi.list().then(({ data }) => {
      setGroups(data.results ?? data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-white mb-1">Your assigned groups</h1>
      <p className="text-white/40 text-sm mb-7">
        Review submissions, update milestones, and leave feedback for each team.
      </p>

      {groups.length === 0 ? (
        <GlassCard className="p-2">
          <EmptyState
            icon={FolderKanban}
            title="No capstone groups assigned yet"
            description="Your department administrator will assign groups to you."
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => {
            const completed = g.milestones_completed ?? 0;
            const total = g.milestones_total ?? 0;
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={`/adviser/groups/${g.id}`}>
                  <GlassCard className="p-5 h-full hover:bg-white/[0.12] transition-colors group">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-display text-lg text-white pr-2">{g.capstone_title}</h3>
                      <ArrowUpRight
                        size={16}
                        className="text-white/30 group-hover:text-white/70 transition-colors shrink-0 mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-white/45 text-xs mb-4">
                      <Users2 size={13} /> {g.member_count} member{g.member_count === 1 ? "" : "s"}
                    </div>
                    <ProgressBar value={completed} total={total} colorClass="bg-gold-500" />
                    <p className="text-white/40 text-xs mt-2">
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
