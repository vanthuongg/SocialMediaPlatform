/**
 * Admin dashboard shell — just sub-routes.
 * Layout is handled by AdminLayout in router.jsx.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import PageLoader from '@/shared/components/PageLoader.jsx';

const AdminOverviewPage  = lazy(() => import('./AdminOverviewPage.jsx'));
const ModeratorDashboardPage = lazy(() => import('./ModeratorDashboardPage.jsx'));
const AdminUsersPage     = lazy(() => import('./AdminUsersPage.jsx'));
const AdminPostsPage     = lazy(() => import('./AdminPostsPage.jsx'));
const AdminReelsPage     = lazy(() => import('./AdminReelsPage.jsx'));
const AdminGroupsPage    = lazy(() => import('./AdminGroupsPage.jsx'));
const AdminReportsPage   = lazy(() => import('./AdminReportsPage.jsx'));
const AdminSettingsPage  = lazy(() => import('./AdminSettingsPage.jsx'));

function AdminOnlyRoute({ children }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/admin-panel" replace />;
  return children;
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Route admins to overview, moderators to their own dashboard */}
        <Route index element={user?.role === 'admin' ? <AdminOverviewPage /> : <ModeratorDashboardPage />} />
        <Route path="users"   element={<AdminOnlyRoute><AdminUsersPage /></AdminOnlyRoute>} />
        <Route path="posts"   element={<AdminPostsPage />} />
        <Route path="reels"   element={<AdminReelsPage />} />
        <Route path="groups"  element={<AdminGroupsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={
          <AdminOnlyRoute><AdminSettingsPage /></AdminOnlyRoute>
        } />
      </Routes>
    </Suspense>
  );
}
