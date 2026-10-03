import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, ListChecks, FileClock, Eye } from "lucide-react";
import { reportsApi } from "../../lib/api";
import { GlassCard, LightCard, Button, Spinner, EmptyState } from "../../components/ui";
import { PdfViewerModal } from "../../components/PdfViewerModal";

const cardIn = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    reportsApi.analytics().then(({ data }) => setData(data));
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={26} />
      </div>
    );
  }

  const stats = [
    { label: "Capstone groups", value: data.group_count, icon: FolderKanban },
    {
      label: "Milestones completed",
      value: `${data.milestones.completed} / ${data.milestones.total}`,
      icon: ListChecks,
    },
    { label: "Submissions pending review", value: data.submissions.pending_review, icon: FileClock },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-white/40 text-sm">Department overview</p>
          <h1 className="font-display text-2xl md:text-3xl text-white mt-1">
            ITE Capstone Analytics
          </h1>
        </div>
        <Button
          icon={Eye}
          onClick={() =>
            setPreviewFile({ url: "/reports/pdf/", title: "Capstone progress report" })
          }
        >
          View PDF report
        </Button>
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

      <motion.div custom={3} variants={cardIn} initial="hidden" animate="show">
        <LightCard className="p-6">
          <h2 className="font-display text-lg text-ink mb-4">Progress by group</h2>
          {data.per_group.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No capstone groups yet" />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/40 border-b border-black/[0.06]">
                    <th className="pb-2.5 font-medium">Capstone title</th>
                    <th className="pb-2.5 font-medium">Adviser</th>
                    <th className="pb-2.5 font-medium">Members</th>
                    <th className="pb-2.5 font-medium">Milestones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_group.map((g) => (
                    <tr key={g.group} className="border-b border-black/[0.04] last:border-0">
                      <td className="py-3 text-ink">{g.group}</td>
                      <td className="py-3 text-ink/60">{g.adviser || "Unassigned"}</td>
                      <td className="py-3 text-ink/60">{g.members}</td>
                      <td className="py-3 text-ink/60">
                        {g.milestones_completed} / {g.milestones_total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LightCard>
      </motion.div>
      <PdfViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
