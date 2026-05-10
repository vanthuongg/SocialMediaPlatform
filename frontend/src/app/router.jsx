// [auto] Fixed auth guard redirect logic
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import MainLayout from '@/shared/components/layouts/MainLayout.jsx';
import AuthLayout from '@/shared/components/layouts/AuthLayout.jsx';
import AdminLayout from '@/shared/components/layouts/AdminLayout.jsx';
import PageLoader from '@/shared/components/PageLoader.jsx';

// Lazy-loaded feature pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage.jsx'));
const BannedPage = lazy(() => import('@/features/auth/pages/BannedPage.jsx'));

const FeedPage = lazy(() => import('@/features/feed/pages/FeedPage.jsx'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage.jsx'));
const EditProfilePage = lazy(() => import('@/features/profile/pages/EditProfilePage.jsx'));
const ReelsPage = lazy(() => import('@/features/reels/pages/ReelsPage.jsx'));
const MessagesPage = lazy(() => import('@/features/messages/pages/MessagesPage.jsx'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage.jsx'));
const SearchPage = lazy(() => import('@/features/search/pages/SearchPage.jsx'));
const FriendsPage = lazy(() => import('@/features/friends/pages/FriendsPage.jsx'));
const SavedPostsPage = lazy(() => import('@/features/posts/pages/SavedPostsPage.jsx'));
const PostDetailPage = lazy(() => import('@/features/posts/pages/PostDetailPage.jsx'));
const SettingsPage = lazy(() => import('@/features/profile/pages/SettingsPage.jsx'));
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage.jsx'));
const GroupsPage = lazy(() => import('@/features/groups/pages/GroupsPage.jsx'));
const CreateGroupPage = lazy(() => import('@/features/groups/pages/CreateGroupPage.jsx'));
const GroupDetailPage = lazy(() => import('@/features/groups/pages/GroupDetailPage.jsx'));
const HashtagPage = lazy(() => import('@/features/search/pages/HashtagPage.jsx'));
const NotFoundPage = lazy(() => import('@/shared/components/NotFoundPage.jsx'));

/**
 * Protected route — redirects unauthenticated users to /login.
 */
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/**
 * Guest route — redirects authenticated users away from auth pages.
 * - admin/moderator → /admin-panel
 * - regular user → /feed
 * Exception: allow through if URL carries a ban error param.
 */
function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return children;
  // Allow banned users to see the error page
  const params = new URLSearchParams(window.location.search);
  if (params.get('error')) return children;
  // Route by role
  if (['admin', 'moderator'].includes(user?.role)) {
    return <Navigate to="/admin-panel" replace />;
  }
  return <Navigate to="/feed" replace />;
}

/**
 * Admin route — requires admin or moderator role.
 */
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!['admin', 'moderator'].includes(user?.role)) return <Navigate to="/feed" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        </Route>

        {/* Public ban notification page — no auth required */}
        <Route path="/banned" element={<BannedPage />} />

        {/* Main app routes */}
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/saved" element={<SavedPostsPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/create" element={<CreateGroupPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/hashtag/:tag" element={<HashtagPage />} />
          <Route path="/:username" element={<ProfilePage />} />
          <Route path="/:username/edit" element={<EditProfilePage />} />
        </Route>

        {/* Admin routes — own layout, no MainLayout */}
        <Route path="/admin-panel/*" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="*" element={<AdminDashboardPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
