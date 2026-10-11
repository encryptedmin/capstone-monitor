import { motion } from "framer-motion";
import { ListChecks, Check } from "lucide-react";
import { useMyGroup } from "./useMyGroup";
import { LightCard, StatusBadge, EmptyState, Spinner } from "../../components/ui";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentMilestones() {
  const { milestones, loading } = useMyGroup();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-white mb-1">Milestones</h1>
      <p className="text-white/40 text-sm mb-7">
        The checkpoints your adviser uses to track your capstone's progress, in order.
      </p>

      {milestones.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={ListChecks} title="No milestones have been set yet" />
        </LightCard>
      ) : (
        <LightCard className="p-6 md:p-8">
          <ol className="relative">
            {milestones.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="relative pl-12 pb-9 last:pb-0"
              >
                {i < milestones.length - 1 && (
                  <span className="absolute left-[15px] top-8 bottom-0 w-px bg-black/[0.08]" />
                )}
                <span
                  className={`absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    m.status === "completed"
                      ? "bg-cyan-500 text-white"
                      : "bg-black/[0.06] text-ink/50"
                  }`}
                >
                  {m.status === "completed" ? <Check size={15} /> : i + 1}
                </span>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-medium text-ink">{m.title}</h3>
                  <StatusBadge status={m.status} />
                </div>
                {m.description && <p className="text-sm text-ink/55 mb-1">{m.description}</p>}
                <p className="text-xs text-ink/40">Due {formatDate(m.deadline)}</p>
              </motion.li>
            ))}
          </ol>
        </LightCard>
      )}
    </div>
  );
}
