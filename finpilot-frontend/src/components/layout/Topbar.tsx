import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../features/auth/api/authApi';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import Avatar from '../ui/Avatar';
import IconButton from '../ui/IconButton';

export default function Topbar() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setQuickAdd = useUiStore((s) => s.setQuickAdd);
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setNoticeOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-end gap-2 bg-canvas/90 px-4 backdrop-blur-md sm:px-8 lg:px-12">
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="mr-auto hidden h-10 items-center gap-3 rounded-full border border-line bg-white px-3 text-[13px] text-muted transition-colors hover:bg-white md:flex"
      >
        <Search size={15} />
        <span>Search FinPilot</span>
        <kbd className="ml-6 rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
      </button>
      <IconButton label="Search" className="md:hidden" onClick={() => setCommandOpen(true)}>
        <Search size={16} />
      </IconButton>
      <IconButton label="Add" onClick={() => setQuickAdd(true)}>
        <Plus size={16} />
      </IconButton>
      <div className="relative" ref={menuRef}>
        <IconButton label="Notifications" onClick={() => setNoticeOpen((v) => !v)}>
          <Bell size={16} />
        </IconButton>
        {noticeOpen && (
          <div className="fp-panel absolute right-0 top-12 w-72 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_32px_rgba(17,19,21,0.08)]">
            <p className="text-sm font-medium text-ink">Notifications</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              No alerts right now. Budget warnings and spending changes will appear here when they show up in your data.
            </p>
          </div>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full transition-opacity hover:opacity-80"
          aria-label="Account menu"
        >
          <Avatar name={user?.fullName} />
        </button>
        {menuOpen && (
          <div className="fp-panel absolute right-0 top-12 w-56 rounded-2xl border border-line bg-white py-2 shadow-[0_12px_32px_rgba(17,19,21,0.08)]">
            <div className="border-b border-line px-3 py-2">
              <p className="truncate text-sm font-medium">{user?.fullName ?? 'FinPilot'}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-canvas"
              onClick={() => {
                setMenuOpen(false);
                navigate('/settings');
              }}
            >
              Settings
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-canvas"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
