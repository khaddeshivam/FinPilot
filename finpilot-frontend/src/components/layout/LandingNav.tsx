import { useEffect, useRef, useState, useCallback, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';

// ─── Scroll state hook ────────────────────────────────────────────────────────
// Single rAF-throttled listener drives three boolean signals:
//   atTop   — scrollY < THRESHOLD_TOP   → transparent hero state
//   compact — scrollY > THRESHOLD_COMPACT → floating pill
//   hidden  — scrolling DOWN past THRESHOLD_HIDE with MIN_DELTA hysteresis
//
// Mutable refs hold all intermediate values; setState is called at most
// once per rAF tick, and bails out early when nothing has changed.
const THRESHOLD_TOP     = 24;    // px
const THRESHOLD_COMPACT = 80;    // px
const THRESHOLD_HIDE    = 120;   // px — must scroll past this before hide kicks in
const MIN_DELTA         = 10;    // px — direction hysteresis

type NavScrollState = { atTop: boolean; compact: boolean; hidden: boolean };

function useNavScroll(): NavScrollState {
  const [state, setState] = useState<NavScrollState>({
    atTop: true, compact: false, hidden: false,
  });

  // All mutable scroll tracking lives in refs — no state thrash between rAF ticks
  const lastY    = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const hiddenRef = useRef(false);
  const rafId    = useRef(0);

  useEffect(() => {
    function tick() {
      rafId.current = 0;
      const y     = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;

      const atTop   = y < THRESHOLD_TOP;
      const compact = y > THRESHOLD_COMPACT;

      // Update hidden ref: only engage direction logic past the threshold
      if (y <= THRESHOLD_HIDE) {
        hiddenRef.current = false;
      } else if (delta > MIN_DELTA) {
        hiddenRef.current = true;
      } else if (delta < -MIN_DELTA) {
        hiddenRef.current = false;
      }
      // Within hysteresis band → keep previous hidden value unchanged

      const hidden = hiddenRef.current;

      setState(prev => {
        if (prev.atTop === atTop && prev.compact === compact && prev.hidden === hidden) return prev;
        return { atTop, compact, hidden };
      });
    }

    function onScroll() {
      if (!rafId.current) rafId.current = requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    tick(); // seed initial state without waiting for first scroll
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return state;
}

// ─── Brand ───────────────────────────────────────────────────────────────────
function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="FinPilot home"
      className="fp-nav-wordmark"
    >
      <span className="fp-nav-mark" aria-hidden="true">
        <span className="fp-nav-mark-dot" />
      </span>
      <span>finpilot</span>
    </Link>
  );
}

// ─── Dropdown data ────────────────────────────────────────────────────────────
type DropdownItem = { title: string; description: string; href: string };
type DropdownSection = { id: string; label: string; items: DropdownItem[] };

const PRODUCT: DropdownItem[] = [
  { title: 'Overview',      description: 'See the full financial picture.',              href: '/#product' },
  { title: 'Dashboard',     description: 'Understand your money at a glance.',           href: '/#product' },
  { title: 'Transactions',  description: 'See where every rupee moves.',                 href: '/#product' },
  { title: 'Cash Flow',     description: 'Income, spending and what remains.',           href: '/#product' },
  { title: 'Budgets',       description: 'Know what is changing before you overspend.',  href: '/#product' },
  { title: 'Goals',         description: 'See where your money is taking you.',          href: '/#simulator' },
];

const INTELLIGENCE: DropdownItem[] = [
  { title: 'FinPilot Radar',  description: 'Changes that need your attention.',          href: '/#how' },
  { title: 'What Changed',    description: 'Understand what moved and why.',             href: '/#how' },
  { title: 'Ask FinPilot',    description: 'Ask your financial data anything.',          href: '/#ask' },
  { title: 'What If?',        description: 'Explore the impact of a decision.',          href: '/#simulator' },
  { title: 'Morning Brief',   description: 'Your financial snapshot, summarised.',       href: '/#how' },
];

const HOW: DropdownItem[] = [
  { title: 'Track',      description: 'Connect your financial picture.',          href: '/#product' },
  { title: 'Understand', description: 'See where your money goes.',               href: '/#product' },
  { title: 'Detect',     description: 'Find changes and unusual activity.',       href: '/#how' },
  { title: 'Explain',    description: 'Understand why it happened.',              href: '/#how' },
  { title: 'Forecast',   description: 'See what is likely to happen next.',       href: '/#simulator' },
  { title: 'Act',        description: 'Decide with context, not guesswork.',      href: '/#simulator' },
];

const RESOURCES: DropdownItem[] = [
  { title: 'How FinPilot works',       description: 'Learn the FinPilot approach.',                  href: '/#how' },
  { title: 'Financial Intelligence',   description: 'How FinPilot understands your money.',          href: '/#how' },
  { title: 'Security',                 description: 'How your information is handled.',              href: '/#product' },
  { title: 'Documentation',            description: 'Product and integration information.',          href: '/#product' },
];

const NAV_ITEMS: DropdownSection[] = [
  { id: 'product',       label: 'Product',        items: PRODUCT },
  { id: 'intelligence',  label: 'Intelligence',   items: INTELLIGENCE },
  { id: 'how',           label: 'How it works',   items: HOW },
  { id: 'resources',     label: 'Resources',      items: RESOURCES },
];

// ─── Desktop dropdown ─────────────────────────────────────────────────────────
function DesktopDropdown({
  section,
  isIntelligence,
}: {
  section: DropdownSection;
  isIntelligence?: boolean;
}) {
  const cols = section.items.length > 4 ? 2 : 1;
  return (
    <div
      className={`fp-dropdown${isIntelligence ? ' fp-dropdown--intel' : ''}`}
      role="region"
      aria-label={section.label}
    >
      <p className="fp-dropdown-label">{section.label.toUpperCase()}</p>
      <div className={`fp-dropdown-grid${cols === 2 ? ' fp-dropdown-grid--2' : ''}`}>
        {section.items.map((item) => (
          <a key={item.title} href={item.href} className="fp-dropdown-item">
            <span className="fp-dropdown-item-title">
              {item.title}
              <span className="fp-dropdown-arrow" aria-hidden="true">→</span>
            </span>
            <span className="fp-dropdown-item-desc">{item.description}</span>
          </a>
        ))}
      </div>
      {isIntelligence && (
        <div className="fp-dropdown-track">
          {['TRACK', 'UNDERSTAND', 'DETECT', 'EXPLAIN', 'FORECAST', 'ACT'].map((step, i, arr) => (
            <span key={step} className="fp-dropdown-track-item">
              {step}
              {i < arr.length - 1 && <span className="fp-dropdown-track-sep" aria-hidden="true">→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Desktop Nav ─────────────────────────────────────────────────────────────
function DesktopNav({ activeSection }: { activeSection: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const enter = useCallback((id: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(id);
  }, []);

  const leave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(null), 120);
  }, []);

  const toggle = useCallback((id: string) => {
    setOpen((prev) => (prev === id ? null : id));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handle(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  return (
    <nav ref={navRef} className="fp-nav-desktop" aria-label="Primary">
      {NAV_ITEMS.map((section) => {
        const isOpen = open === section.id;
        return (
          <div
            key={section.id}
            className="fp-nav-item"
            onMouseEnter={() => enter(section.id)}
            onMouseLeave={leave}
          >
            <button
              type="button"
              className={[
                'fp-nav-btn',
                isOpen ? 'fp-nav-btn--open' : '',
                !isOpen && activeSection === section.id ? 'fp-nav-btn--active' : '',
              ].filter(Boolean).join(' ')}
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-controls={`dropdown-${section.id}`}
              onClick={() => toggle(section.id)}
              onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === 'Enter' || e.key === ' ') toggle(section.id);
              }}
            >
              {section.label}
              <svg
                className={`fp-nav-chevron${isOpen ? ' fp-nav-chevron--open' : ''}`}
                width="10" height="6" viewBox="0 0 10 6" fill="none"
                aria-hidden="true"
              >
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div
              id={`dropdown-${section.id}`}
              className={`fp-dropdown-wrap${isOpen ? ' fp-dropdown-wrap--open' : ''}`}
              role="dialog"
              aria-label={`${section.label} menu`}
              onMouseEnter={() => enter(section.id)}
              onMouseLeave={leave}
            >
              <DesktopDropdown
                section={section}
                isIntelligence={section.id === 'intelligence'}
              />
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ─── Mobile accordion section ─────────────────────────────────────────────────
function MobileSection({ section, onNavigate }: { section: DropdownSection; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fp-mobile-section">
      <button
        type="button"
        className="fp-mobile-section-btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {section.label}
        <svg
          className={`fp-mobile-chevron${open ? ' fp-mobile-chevron--open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="fp-mobile-items">
          {section.items.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="fp-mobile-item"
              onClick={onNavigate}
            >
              <span className="fp-mobile-item-title">{item.title}</span>
              <span className="fp-mobile-item-desc">{item.description}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section observer hook ────────────────────────────────────────────────────
// Watches the four named anchors and returns which one is currently in view.
// Falls back to '' (none) at the very top. Cheap — four observers, no scroll math.
const SECTION_IDS = ['product', 'how', 'simulator', 'ask'] as const;
const SECTION_TO_NAV: Record<string, string> = {
  product:   'product',
  how:       'how',
  simulator: 'intelligence',
  ask:       'intelligence',
};

function useActiveSection(): string {
  const [active, setActive] = useState('');
  useEffect(() => {
    const map = new Map<string, boolean>();
    const observers: IntersectionObserver[] = [];
    SECTION_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          map.set(id, entry.isIntersecting);
          // pick the first intersecting in document order
          const found = SECTION_IDS.find(s => map.get(s));
          setActive(found ? (SECTION_TO_NAV[found] ?? '') : '');
        },
        { threshold: 0.25 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);
  return active;
}

// ─── Main LandingNav ─────────────────────────────────────────────────────────
export default function LandingNav() {
  const { atTop, compact, hidden } = useNavScroll();
  const activeSection = useActiveSection();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Escape closes mobile menu
  useEffect(() => {
    function handle(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Build header class string
  const headerClass = [
    'fp-nav-header',
    atTop    ? 'fp-nav-header--top'     : '',
    compact  ? 'fp-nav-header--compact' : '',
    hidden   ? 'fp-nav-header--hidden'  : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <header className={headerClass} role="banner">
        <div className="fp-nav-inner">
          <Wordmark />
          <DesktopNav activeSection={activeSection} />
          <div className="fp-nav-auth">
            <Link to="/login" className="fp-nav-login">Log in</Link>
            <Link to="/register" className="fp-nav-cta">
              Get started
              <span className="fp-nav-cta-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button
            type="button"
            className="fp-nav-hamburger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="fp-mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className={`fp-hamburger-bar${mobileOpen ? ' fp-hamburger-bar--1-open' : ''}`} />
            <span className={`fp-hamburger-bar${mobileOpen ? ' fp-hamburger-bar--2-open' : ''}`} />
            <span className={`fp-hamburger-bar${mobileOpen ? ' fp-hamburger-bar--3-open' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fp-mobile-overlay"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <div
        id="fp-mobile-menu"
        className={`fp-mobile-menu${mobileOpen ? ' fp-mobile-menu--open' : ''}`}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
      >
        <div className="fp-mobile-menu-inner">
          <div className="fp-mobile-sections">
            {NAV_ITEMS.map((section) => (
              <MobileSection key={section.id} section={section} onNavigate={closeMobile} />
            ))}
          </div>
          <div className="fp-mobile-auth">
            <Link to="/login" className="fp-mobile-login" onClick={closeMobile}>Log in</Link>
            <Link to="/register" className="fp-mobile-cta" onClick={closeMobile}>
              Get started →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
