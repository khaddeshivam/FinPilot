import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Nav data ─────────────────────────────────────────────────────────────────
const NAV = [
  {
    label: 'Product',
    links: [
      { text: 'Dashboard',    href: '/#product' },
      { text: 'Transactions', href: '/#product' },
      { text: 'Cash Flow',    href: '/#product' },
      { text: 'Budgets',      href: '/#product' },
      { text: 'Goals',        href: '/#simulator' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { text: 'FinPilot Radar', href: '/#how' },
      { text: 'What Changed',   href: '/#how' },
      { text: 'Ask FinPilot',   href: '/#ask' },
      { text: 'What If?',       href: '/#simulator' },
      { text: 'Morning Brief',  href: '/#how' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { text: 'How it works',  href: '/#how' },
      { text: 'Security',      href: '/#product' },
      { text: 'Documentation', href: '/#product' },
    ],
  },
  {
    label: 'Company',
    links: [
      { text: 'About',   href: '/#top' },
      { text: 'Contact', href: '/#top' },
    ],
  },
];

// ─── Intersection trigger ─────────────────────────────────────────────────────
function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.06) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
      },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

// ─── Mobile accordion ─────────────────────────────────────────────────────────
function MobileGroup({ label, links }: { label: string; links: { text: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fpf-mob-group">
      <button
        type="button"
        className="fpf-mob-toggle"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {label}
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <ul className="fpf-mob-links" role="list">
          {links.map(l => (
            <li key={l.text}>
              <a href={l.href} className="fpf-link">{l.text}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Trajectory SVG ───────────────────────────────────────────────────────────
function TrajectoryScene({ visible, hovered }: { visible: boolean; hovered: boolean }) {
  return (
    <svg
      className={['fpf-svg', visible && 'fpf-svg--in', hovered && 'fpf-svg--hover'].filter(Boolean).join(' ')}
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Far plane — barely-there background arcs */}
      <path className="fpf-p fpf-p-far" pathLength="1"
        d="M-40 380 C 100 350, 220 310, 380 275 S 600 265, 760 240"
        style={{ animationDelay: '0ms' }} />
      <path className="fpf-p fpf-p-far" pathLength="1"
        d="M 600 390 C 750 365, 880 335, 1020 300 S 1160 270, 1260 245"
        style={{ animationDelay: '150ms' }} />

      {/* Mid plane */}
      <path className="fpf-p fpf-p-mid" pathLength="1"
        d="M 0 370 C 80 350, 180 320, 300 285 C 420 250, 500 260, 600 230"
        style={{ animationDelay: '80ms' }} />

      {/* Primary — the main ascending financial trajectory */}
      <path
        className={['fpf-p fpf-p-primary', hovered && 'fpf-p-primary--on'].filter(Boolean).join(' ')}
        pathLength="1"
        d="M -40 395 C 80 370, 190 335, 320 295 C 450 255, 550 262, 660 225 C 760 192, 860 195, 980 162 C 1080 134, 1160 118, 1260 95"
        style={{ animationDelay: '200ms' }} />
      <circle
        className={['fpf-dot fpf-dot-primary', hovered && 'fpf-dot--on'].filter(Boolean).join(' ')}
        cx="1260" cy="95" r="5"
        style={{ animationDelay: '1050ms' }} />

      {/* Savings branch diverging from primary */}
      <path className="fpf-p fpf-p-branch" pathLength="1"
        d="M 660 225 C 700 232, 740 248, 790 262 C 840 276, 900 280, 960 288"
        style={{ animationDelay: '720ms' }} />
      <circle className="fpf-dot fpf-dot-branch" cx="960" cy="288" r="4"
        style={{ animationDelay: '1380ms' }} />

      {/* Goal path — foreground, coral */}
      <path
        className={['fpf-p fpf-p-goal', hovered && 'fpf-p-goal--on'].filter(Boolean).join(' ')}
        pathLength="1"
        d="M 60 400 C 130 378, 210 350, 310 318 C 400 290, 460 295, 530 272"
        style={{ animationDelay: '500ms' }} />
      <circle className="fpf-dot fpf-dot-goal" cx="530" cy="272" r="5"
        style={{ animationDelay: '1250ms' }} />

      {/* Origin marker */}
      <circle className="fpf-dot fpf-dot-origin" cx="0" cy="395" r="3"
        style={{ animationDelay: '180ms' }} />
    </svg>
  );
}

// ─── Main footer ──────────────────────────────────────────────────────────────
export default function LandingFooter() {
  const footerRef  = useRef<HTMLElement | null>(null);
  const visible    = useInView(footerRef);
  const [hovered, setHovered] = useState(false);
  const year = new Date().getFullYear();

  return (
    <footer ref={footerRef} className="fpf-footer" aria-label="Site footer">

      {/* ════════════════════════════════════════
          LAYER 1 — NAVIGATION
          ════════════════════════════════════════ */}
      <div className={`fpf-nav-area${visible ? ' fpf-in' : ''}`}>
        {/* Desktop grid */}
        <nav className="fpf-nav-grid" aria-label="Footer navigation">
          {NAV.map(group => (
            <div key={group.label} className="fpf-nav-col">
              <p className="fpf-nav-label" aria-hidden="true">{group.label}</p>
              <ul role="list" className="fpf-nav-list">
                {group.links.map(l => (
                  <li key={l.text}>
                    <a href={l.href} className="fpf-link">
                      <span className="fpf-link-text">{l.text}</span>
                      <span className="fpf-link-arrow" aria-hidden="true">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mobile accordions */}
        <div className="fpf-nav-mob" aria-label="Footer navigation mobile">
          {NAV.map(group => (
            <MobileGroup key={group.label} label={group.label} links={group.links} />
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          LAYER 2 — METADATA
          ════════════════════════════════════════ */}
      <div className={`fpf-meta${visible ? ' fpf-in' : ''}`} style={{ animationDelay: '150ms' }}>
        <span className="fpf-meta-copy">© {year} FinPilot</span>
        <div className="fpf-meta-right">
          <a href="/#product" className="fpf-meta-link">Privacy</a>
          <a href="/#product" className="fpf-meta-link">Terms</a>
        </div>
      </div>

      {/* ════════════════════════════════════════
          LAYER 3 — MONUMENT
          This is a positioned container. Children:
            - .fpf-stage  (absolute fill, z=1) — trajectories only
            - .fpf-close  (relative, z=10) — closing text + CTA
            - .fpf-objs   (absolute fill, z=20) — signal data fragments
            - .fpf-wm     (relative, z=15) — the giant wordmark
          ════════════════════════════════════════ */}
      <div className="fpf-monument">

        {/* Trajectory SVG — behind everything (z=1) */}
        <div className="fpf-stage" aria-hidden="true">
          <TrajectoryScene visible={visible} hovered={hovered} />
        </div>

        {/* Closing statement — sits in flow above wordmark */}
        <div className={`fpf-close${visible ? ' fpf-in' : ''}`}
          style={{ animationDelay: '350ms' }}>
          <p className="fpf-close-eyebrow">08 · Financial intelligence</p>
          <p className="fpf-close-headline">Know where your<br/>money is going.</p>
          <Link to="/register" className="fpf-close-cta">
            Explore FinPilot →
          </Link>
        </div>

        {/* Signal objects — floating data fragments (z=20, above wordmark) */}
        <div className="fpf-objs" aria-hidden="true">
          {/* A — upper-left */}
          <div className={`fpf-obj fpf-obj-a${visible ? ' fpf-in' : ''}`}
            style={{ animationDelay: '1100ms' }}>
            <span className="fpf-obj-label">Available</span>
            <span className="fpf-obj-value">₹48,200</span>
          </div>

          {/* B — left, mid */}
          <div className={`fpf-obj fpf-obj-b${visible ? ' fpf-in' : ''}`}
            style={{ animationDelay: '1400ms' }}>
            <span className="fpf-obj-label">Monthly surplus</span>
            <span className="fpf-obj-value">+₹4,800</span>
            <span className="fpf-obj-sub">4 months consistent</span>
          </div>

          {/* C — right */}
          <div className={`fpf-obj fpf-obj-c${visible ? ' fpf-in' : ''}`}
            style={{ animationDelay: '1700ms' }}>
            <span className="fpf-obj-label">Goal · Home fund</span>
            <span className="fpf-obj-value">Mar 2027</span>
          </div>

          {/* D — far right, slightly faded/depth */}
          <div className={`fpf-obj fpf-obj-d${visible ? ' fpf-in' : ''}`}
            style={{ animationDelay: '1950ms' }}>
            <span className="fpf-obj-label">Signal</span>
            <span className="fpf-obj-value fpf-obj-value--muted">● Active</span>
          </div>
        </div>

        {/* Giant wordmark — anchored to bottom, bottom clips intentionally */}
        <div
          className={`fpf-wm${visible ? ' fpf-in' : ''}`}
          style={{ animationDelay: '500ms' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-hidden="true"
        >
          <span className="fpf-wm-text">FINPILOT</span>
        </div>

      </div>
    </footer>
  );
}
