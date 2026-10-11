import { useEffect, useState } from "react";
import { Plus, Megaphone, Pin, Trash2, FileBox, Download } from "lucide-react";
import { announcementsApi, templatesApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import {
  LightCard,
  Button,
  Modal,
  ModalActions,
  Field,
  inputClass,
  EmptyState,
  Spinner,
} from "../../components/ui";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminAnnouncements() {
  const [tab, setTab] = useState("announcements");

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl text-white mb-1">Announcements</h1>
          <p className="text-white/40 text-sm">Post department notices and share documentation templates.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: "announcements", label: "Announcements" },
          { key: "templates", label: "Document Templates" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "announcements" ? <AnnouncementsTab /> : <TemplatesTab />}
    </div>
  );
}

function AnnouncementsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await announcementsApi.list();
    setItems(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    await announcementsApi.remove(id);
    push("Announcement deleted.", "success");
    load();
  };

  const togglePin = async (item) => {
    await announcementsApi.update(item.id, { is_pinned: !item.is_pinned });
    load();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Post announcement
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={22} />
        </div>
      ) : items.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={Megaphone} title="No announcements yet" />
        </LightCard>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <LightCard key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && <Pin size={13} className="text-accent-500" />}
                    <p className="font-medium text-ink">{a.title}</p>
                  </div>
                  <p className="text-sm text-ink/60 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-ink/35 mt-2">
                    {a.posted_by_name || "Admin"} · {formatDate(a.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(a)}
                    title={a.is_pinned ? "Unpin" : "Pin"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      a.is_pinned ? "text-accent-500" : "text-ink/30 hover:text-accent-500"
                    }`}
                  >
                    <Pin size={15} />
                  </button>
                  <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg text-ink/30 hover:text-danger-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </LightCard>
          ))}
        </div>
      )}

      <PostAnnouncementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

function PostAnnouncementModal({ open, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const reset = () => {
    setTitle("");
    setBody("");
    setIsPinned(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await announcementsApi.create({ title, body, is_pinned: isPinned });
      push("Announcement posted.", "success");
      reset();
      onSaved();
    } catch {
      push("Couldn't post that announcement.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Post announcement">
      <form onSubmit={submit}>
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Message">
          <textarea className={inputClass} rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink/60 mb-4 cursor-pointer select-none">
          <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
          Pin to top
        </label>
        <ModalActions onCancel={handleClose} submitLabel="Post" loading={saving} />
      </form>
    </Modal>
  );
}

function TemplatesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await templatesApi.list();
    setItems(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Delete this template?")) return;
    await templatesApi.remove(id);
    push("Template deleted.", "success");
    load();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Upload template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={22} />
        </div>
      ) : items.length === 0 ? (
        <LightCard className="p-2">
          <EmptyState icon={FileBox} title="No templates uploaded yet" />
        </LightCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <LightCard key={t.id} className="p-5">
              <FileBox size={18} className="text-accent-500 mb-3" />
              <p className="font-medium text-ink mb-1">{t.title}</p>
              {t.description && <p className="text-sm text-ink/55 mb-3">{t.description}</p>}
              <div className="flex items-center justify-between">
                <a
                  href={t.file}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent-500 hover:brightness-90"
                >
                  <Download size={14} /> Download
                </a>
                <button onClick={() => remove(t.id)} className="text-ink/30 hover:text-danger-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </LightCard>
          ))}
        </div>
      )}

      <UploadTemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

function UploadTemplateModal({ open, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const reset = () => {
    setTitle("");
    setDescription("");
    setFile(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("file", file);
      await templatesApi.create(formData);
      push("Template uploaded.", "success");
      reset();
      onSaved();
    } catch {
      push("Couldn't upload that template.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload documentation template">
      <form onSubmit={submit}>
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 1-3 Format"
            required
          />
        </Field>
        <Field label="Description (optional)">
          <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="File">
          <input type="file" className={inputClass} onChange={(e) => setFile(e.target.files[0])} required />
        </Field>
        <ModalActions onCancel={handleClose} submitLabel="Upload" loading={saving} />
      </form>
    </Modal>
  );
}
