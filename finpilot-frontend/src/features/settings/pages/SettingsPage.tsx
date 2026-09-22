import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../auth/api/authApi';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';
import Skeleton from '../../../components/ui/Skeleton';

export default function SettingsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });

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
          Access tokens stay in memory. Refreshing the tab signs you out — a deliberate tradeoff until cookie-based
          sessions exist.
        </p>
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </Button>
        </div>
      </Surface>
    </div>
  );
}
