import { useEffect, useState } from "react";
import { Pin, Megaphone, FileBox, Download } from "lucide-react";
import { announcementsApi, templatesApi } from "../../lib/api";
import { LightCard, EmptyState, Spinner } from "../../components/ui";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([announcementsApi.list(), templatesApi.list()]).then(([a, t]) => {
      setAnnouncements(a.data.results ?? a.data);
      setTemplates(t.data.results ?? t.data);
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
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-fg mb-1">Announcements</h1>
        <p className="text-fg/55 text-sm">Department notices and downloadable documentation templates.</p>
      </div>

      <div>
        <h2 className="text-fg/78 font-medium text-sm mb-3">Notices</h2>
        {announcements.length === 0 ? (
          <LightCard className="p-2">
            <EmptyState icon={Megaphone} title="No announcements yet" />
          </LightCard>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <LightCard key={a.id} className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  {a.is_pinned && <Pin size={13} className="text-accent" />}
                  <p className="font-medium text-fg">{a.title}</p>
                </div>
                <p className="text-sm text-fg/70 whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-fg/50 mt-2">
                  {a.posted_by_name || "Admin"} · {formatDate(a.created_at)}
                </p>
              </LightCard>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-fg/78 font-medium text-sm mb-3">Documentation templates</h2>
        {templates.length === 0 ? (
          <LightCard className="p-2">
            <EmptyState icon={FileBox} title="No templates posted yet" />
          </LightCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <LightCard key={t.id} className="p-5">
                <FileBox size={18} className="text-accent mb-3" />
                <p className="font-medium text-fg mb-1">{t.title}</p>
                {t.description && <p className="text-sm text-fg/66 mb-3">{t.description}</p>}
                <a
                  href={t.file}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:brightness-90"
                >
                  <Download size={14} /> Download
                </a>
              </LightCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
