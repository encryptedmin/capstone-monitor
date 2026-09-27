import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import LoginPage from "./pages/LoginPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentMilestones from "./pages/student/StudentMilestones";
import StudentSubmissions from "./pages/student/StudentSubmissions";

import AdviserDashboard from "./pages/adviser/AdviserDashboard";
import AdviserGroupDetail from "./pages/adviser/AdviserGroupDetail";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminGroups from "./pages/admin/AdminGroups";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute roles={["student"]} />}>
              <Route element={<AppShell />}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/milestones" element={<StudentMilestones />} />
                <Route path="/student/submissions" element={<StudentSubmissions />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={["adviser"]} />}>
              <Route element={<AppShell />}>
                <Route path="/adviser" element={<AdviserDashboard />} />
                <Route path="/adviser/groups/:groupId" element={<AdviserGroupDetail />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route element={<AppShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/groups" element={<AdminGroups />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
