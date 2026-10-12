import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentMilestones from "./pages/student/StudentMilestones";
import StudentSubmissions from "./pages/student/StudentSubmissions";
import ChooseAdviser from "./pages/student/ChooseAdviser";
import StudentAnnouncements from "./pages/student/Announcements";

import AdviserDashboard from "./pages/adviser/AdviserDashboard";
import AdviserGroupDetail from "./pages/adviser/AdviserGroupDetail";
import AdviserRequests from "./pages/adviser/AdviserRequests";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminGroups from "./pages/admin/AdminGroups";
import AdminSchoolYears from "./pages/admin/AdminSchoolYears";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminPdfReport from "./pages/admin/AdminPdfReport";
import AdminAdviserStatus from "./pages/admin/AdminAdviserStatus";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute roles={["student"]} />}>
                <Route element={<AppShell />}>
                  <Route path="/student" element={<StudentDashboard />} />
                  <Route path="/student/adviser" element={<ChooseAdviser />} />
                  <Route path="/student/milestones" element={<StudentMilestones />} />
                  <Route path="/student/submissions" element={<StudentSubmissions />} />
                  <Route path="/student/announcements" element={<StudentAnnouncements />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={["adviser"]} />}>
                <Route element={<AppShell />}>
                  <Route path="/adviser" element={<AdviserDashboard />} />
                  <Route path="/adviser/requests" element={<AdviserRequests />} />
                  <Route path="/adviser/groups/:groupId" element={<AdviserGroupDetail />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route path="/admin/report" element={<AdminPdfReport />} />
                <Route element={<AppShell />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/groups" element={<AdminGroups />} />
                  <Route path="/admin/adviser-status" element={<AdminAdviserStatus />} />
                  <Route path="/admin/school-years" element={<AdminSchoolYears />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
