import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, logout as apiLogout } from '../../auth/api/authApi';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';
import Skeleton from '../../../components/ui/Skeleton';

export default function SettingsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });

  async function handleLogout() {
    // Revoke the refresh token server-side first (best-effort — we log out
    // locally regardless of whether the API call succeeds).
    try {
      if (refreshToken) await apiLogout(refreshToken);
    } catch {
      // best-effort: proceed with local logout regardless
    } finally {
      logout();
      queryClient.clear();
      navigate('/login');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Your account, kept simple." />
      <Surface className="p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Profile</p>
        {isLoading ? (
          <Skeleton className="mt-4 h-16" />
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Name</dt>
              <dd>{user?.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Email</dt>
              <dd>{user?.email}</dd>
            </div>
          </dl>
        )}
      </Surface>
      <Surface className="p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Session</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Your session is saved for this browser tab. Closing the tab clears it.
          Logging out also revokes the refresh token on the server.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </Surface>
    </div>
  );
}
