import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListChecks,
  FileText,
  LogOut,
  Cpu,
  CalendarRange,
  Settings,
  Megaphone,
  Inbox,
  UserSearch,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { Avatar, IconButton, RoleBadge, ThemeToggle } from "./ui";

const NAV_BY_ROLE = {
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/groups", label: "Capstone Groups", icon: FolderKanban },
    { to: "/admin/adviser-status", label: "Adviser Status", icon: UserCheck },
    { to: "/admin/school-years", label: "School Years", icon: CalendarRange },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
  adviser: [
    { to: "/adviser", label: "My Groups", icon: FolderKanban, end: true },
    { to: "/adviser/requests", label: "Title Requests", icon: Inbox },
  ],
  student: [
    { to: "/student", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/student/adviser", label: "My Adviser", icon: UserSearch },
    { to: "/student/milestones", label: "Milestones", icon: ListChecks },
    { to: "/student/submissions", label: "Submissions", icon: FileText },
    { to: "/student/announcements", label: "Announcements", icon: Megaphone },
  ],
};

const PAGE_LABEL = "Capstone Monitor";

const ROLE_LABEL = { admin: "Administrator", adviser: "Faculty Adviser", student: "Student" };

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(61,109,245,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]">
        <Cpu size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-fg text-[15px] font-semibold leading-tight">{PAGE_LABEL}</p>
        <p className="text-[11px] text-fg/55 truncate">Information Technology Education</p>
      </div>
    </div>
  );
}

function NavList({ nav, onNavigate, group }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Main">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} className="relative block rounded-xl">
          {({ isActive }) => (
            <span
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive ? "text-fg font-medium" : "text-fg/65 hover:text-fg hover:bg-fg/[0.06]"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={`${group}-pill`}
                  className="absolute inset-0 rounded-xl bg-fg/[0.09] ring-1 ring-inset ring-fg/[0.12] shadow-[0_8px_24px_-12px_rgba(61,109,245,0.6)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {isActive && (
                <motion.span
                  layoutId={`${group}-bar`}
                  className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-brand-gradient"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={18} className={`relative ${isActive ? "text-accent" : ""}`} />
              <span className="relative">{label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard({ user, displayName, onLogout }) {
  return (
    <div className="mt-4 rounded-2xl bg-fg/[0.05] ring-1 ring-inset ring-fg/10 p-3">
      <div className="flex items-center gap-3">
        <Avatar name={displayName} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg truncate">{displayName}</p>
          <p className="text-xs text-fg/55 truncate">{ROLE_LABEL[user.role] ?? user.role}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-fg/70
          hover:bg-danger-500/15 hover:text-danger transition-colors"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nav = NAV_BY_ROLE[user.role] ?? [];

  const displayName =
    user.student_profile?.full_name || user.adviser_profile?.full_name || user.email;

  // Longest matching nav entry names the current page in the header.
  const current = [...nav]
    .filter((n) => location.pathname === n.to || location.pathname.startsWith(`${n.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const pageTitle = current?.label ?? (location.pathname.includes("/groups/") ? "Group details" : PAGE_LABEL);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-accent-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar: a floating glass panel */}
      <aside className="hidden md:block shrink-0 p-3 pr-0">
        <div className="glass sticky top-3 flex h-[calc(100dvh-1.5rem)] w-64 flex-col rounded-3xl p-4">
          <div className="mb-7 mt-1">
            <Brand />
          </div>
          <NavList nav={nav} group="desktop" />
          <UserCard user={user} displayName={displayName} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 backdrop-blur-sm"
              style={{ background: "var(--scrim)" }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="glass-strong absolute left-3 top-3 bottom-3 flex w-72 max-w-[85vw] flex-col rounded-3xl p-4"
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className="mb-6 mt-1 flex items-center justify-between">
                <Brand />
                <IconButton label="Close menu" onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </IconButton>
              </div>
              <NavList nav={nav} group="mobile" onNavigate={() => setDrawerOpen(false)} />
              <UserCard user={user} displayName={displayName} onLogout={handleLogout} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 p-3 md:pl-4 gap-3">
        <header className="glass sticky top-3 z-30 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton label="Open menu" className="md:hidden" onClick={() => setDrawerOpen(true)}>
              <Menu size={18} />
            </IconButton>
            <div className="min-w-0">
              <p className="text-xs text-fg/55 truncate">Welcome back, {displayName}</p>
              <p className="font-display text-fg font-semibold leading-tight truncate">{pageTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:block">
              <RoleBadge role={user.role} />
            </span>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        <motion.main
          id="main"
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 w-full max-w-7xl mx-auto px-1 md:px-3 py-3 pb-10"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
