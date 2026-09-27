import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListChecks,
  FileText,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { RoleBadge } from "./ui";

const NAV_BY_ROLE = {
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/groups", label: "Capstone Groups", icon: FolderKanban },
  ],
  adviser: [
    { to: "/adviser", label: "My Groups", icon: FolderKanban, end: true },
  ],
  student: [
    { to: "/student", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/student/milestones", label: "Milestones", icon: ListChecks },
    { to: "/student/submissions", label: "Submissions", icon: FileText },
  ],
};

const PAGE_LABEL = "Capstone Monitor";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = NAV_BY_ROLE[user.role] ?? [];

  const displayName =
    user.student_profile?.full_name || user.adviser_profile?.full_name || user.username;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen app-mesh flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col glass border-r border-white/10 px-5 py-6">
        <div className="flex items-center gap-2.5 px-1 mb-9">
          <div className="h-9 w-9 rounded-xl bg-gold-500 flex items-center justify-center">
            <GraduationCap size={19} className="text-base-900" />
          </div>
          <div>
            <p className="font-display text-white text-[15px] leading-tight">{PAGE_LABEL}</p>
            <p className="text-[11px] text-white/40">ITE Department</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-white/10">
          <div>
            <p className="text-white/40 text-xs">Welcome back</p>
            <p className="text-white font-medium">{displayName}</p>
          </div>
          <div className="flex items-center gap-4">
            <RoleBadge role={user.role} />
            <NotificationBell />
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 px-6 md:px-8 py-7 overflow-y-auto"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
