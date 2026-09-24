import { NavLink } from 'react-router-dom';
import { mobileNavItems } from './Sidebar';

export default function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 py-1.5 backdrop-blur md:hidden"
      aria-label="Mobile"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-ink' : 'text-muted'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
