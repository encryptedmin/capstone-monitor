import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi } from "../lib/api";
import { EmptyState, IconButton } from "./ui";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  const load = async () => {
    const { data } = await notificationsApi.list();
    setItems(data.results ?? data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000); // poll every 20s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unreadCount = items.filter((i) => !i.is_read).length;

  const markAll = async () => {
    await notificationsApi.markAllRead();
    load();
  };

  const markOne = async (id) => {
    await notificationsApi.markRead(id);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton
        label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-60" />
            <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-gradient px-1 text-[10px] font-semibold text-white ring-2 ring-[var(--surface-solid)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl overflow-hidden z-50 origin-top-right"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-fg/[0.06]">
              <p className="font-display font-semibold text-sm text-fg">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-xs text-fg/62 hover:text-fg"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <EmptyState icon={Bell} title="You're all caught up" />
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markOne(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-fg/[0.04] last:border-0 hover:bg-fg/[0.05] transition-colors ${
                      !n.is_read ? "bg-accent-500/[0.09] border-l-2 border-l-accent-500" : ""
                    }`}
                  >
                    <p className="text-sm text-fg leading-snug">{n.message}</p>
                    <p className="text-xs text-fg/55 mt-1">{timeAgo(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
