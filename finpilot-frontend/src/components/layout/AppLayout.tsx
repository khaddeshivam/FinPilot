import { Outlet } from 'react-router-dom';
import CommandPalette from './CommandPalette';
import MobileNav from './MobileNav';
import QuickAdd from './QuickAdd';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TransactionDrawer from '../../features/transactions/components/TransactionDrawer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-[72px]">
        <Topbar />
        <main className="flex-1 pb-24 md:pb-10">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 lg:px-12">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <QuickAdd />
      <TransactionDrawer />
    </div>
  );
}
