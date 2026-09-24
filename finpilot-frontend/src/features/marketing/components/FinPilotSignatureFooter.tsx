import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ─── Navigation data ────────────────────────────────────────────────────────
const NAV_COLS = [
  {
    label: 'Product',
    links: [
      { text: 'Dashboard',    to: '/dashboard' },
      { text: 'Transactions', to: '/transactions' },
      { text: 'Cash Flow',    to: '/dashboard' },
      { text: 'Budgets',      to: '/budgets' },
      { text: 'Goals',        to: '/dashboard' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { text: 'FinPilot Radar', to: '/insights' },
      { text: 'What Changed',   to: '/insights' },
      { text: 'Ask FinPilot',   to: '/ai' },
      { text: 'What If?',       to: '/dashboard' },
      { text: 'Morning Brief',  to: '/insights' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { text: 'How it works',  to: '/#how' },
      { text: 'Security',      to: '/#product' },
      { text: 'Documentation', to: '/help' },
    ],
  },
  {
    label: 'Company',
    links: [
      { text: 'About',   to: '/#top' },
      { text: 'Contact', to: '/#top' },
      { text: 'Careers', to: '/#top' },
      { text: 'Updates', to: '/#top' },
    ],
  },
] as const;

const SOCIAL = [
  {
    label: 'GitHub',
    href: 'https://github.com',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 23.227 24 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
] as const;

// ─── Mobile accordion ────────────────────────────────────────────────────────
function MobileGroup({
  label,
  links,
}: {
  label: string;
  links: readonly { text: string; to: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fps-mob-group">
      <button
        type="button"
        className="fps-mob-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
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
        <ul className="fps-mob-links" role="list">
          {links.map((l) => (
            <li key={l.text}>
              <Link to={l.to} className="fps-link">{l.text}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Trajectory SVG ──────────────────────────────────────────────────────────
function Trajectory({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`fps-traj${visible ? ' fps-traj--in' : ''}`}
      viewBox="0 0 1200 480"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="fps-tpath fps-tpath--primary"
        pathLength="1"
        d="M -40 420 C 100 380, 220 330, 380 285 C 520 245, 640 258, 760 218 C 880 178, 980 182, 1100 148 C 1160 132, 1210 118, 1260 100"
        style={{ animationDelay: '100ms' }}
      />
      <path
        className="fps-tpath fps-tpath--soft"
        pathLength="1"
        d="M 60 440 C 180 408, 300 368, 460 328 C 600 292, 700 302, 820 268 C 920 240, 1020 250, 1120 222"
        style={{ animationDelay: '300ms' }}
      />
      <circle
        className={`fps-tdot${visible ? ' fps-tdot--in' : ''}`}
        cx="1100" cy="148" r="5"
        style={{ animationDelay: '900ms' }}
      />
      <circle
        className={`fps-tdot${visible ? ' fps-tdot--in' : ''}`}
        cx="0" cy="420" r="3.5"
        style={{ animationDelay: '150ms' }}
      />
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function FinPilotSignatureFooter() {
  const footerRef = useRef<HTMLElement | null>(null);
  const tiltRef   = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);

  const tiltState = useRef({
    rotX: 12, rotY: -22, rotZ: -7,
    velX: 0,  velY: 0,  velZ: 0,
    smMX: 0,  smMY: 0,
    rawMX: 0, rawMY: 0,
    isHovering: false,
    rafId: 0,
    t: 0,
    lastTime: 0,
    ty: 0,
  });

  const year = new Date().getFullYear();

  // ── IntersectionObserver for entrance ──────────────────────────────────────
  useEffect(() => {
    if (!footerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
      },
      { threshold: 0.05 }
    );
    obs.observe(footerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Card tilt rAF loop ─────────────────────────────────────────────────────
  const startTilt = useCallback(() => {
    const s = tiltState.current;

    function idle(t: number) {
      return {
        rx:  12 + Math.sin(t * 0.45) * 4  + Math.sin(t * 0.19) * 1.5,
        ry: -22 + Math.cos(t * 0.34) * 5  + Math.cos(t * 0.17) * 2,
        rz:  -7 + Math.sin(t * 0.27) * 2.5,
        ty:       Math.sin(t * 0.52) * 10 + Math.sin(t * 0.25) * 4,
      };
    }

    function tick(now: number) {
      const dt = s.lastTime ? Math.min((now - s.lastTime) / 1000, 0.05) : 0.016;
      s.lastTime = now;
      s.t += dt;

      s.smMX = s.smMX + (s.rawMX - s.smMX) * 0.06;
      s.smMY = s.smMY + (s.rawMY - s.smMY) * 0.06;

      const base = idle(s.t);
      let tRX = base.rx;
      let tRY = base.ry;
      let tRZ = base.rz;
      let tTY = base.ty;

      if (s.isHovering) {
        tRX = base.rx + s.smMY * -4;
        tRY = base.ry + s.smMX * 5;
        tRZ = base.rz + s.smMX * 1.5;
        tTY = base.ty - 12;
      }

      const SPRING = 0.07, DAMP = 0.74;
      s.velX = (s.velX + (tRX - s.rotX) * SPRING) * DAMP;
      s.velY = (s.velY + (tRY - s.rotY) * SPRING) * DAMP;
      s.velZ = (s.velZ + (tRZ - s.rotZ) * SPRING) * DAMP;
      s.rotX += s.velX;
      s.rotY += s.velY;
      s.rotZ += s.velZ;
      s.ty = s.ty + (tTY - s.ty) * 0.07;

      const scene = tiltRef.current;
      if (scene) {
        const tf = (rx: number, ry: number, rz: number, ty: number) =>
          `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) translateY(${ty}px)`;

        const front = scene.querySelector<HTMLElement>('.fps-card--front');
        const mid   = scene.querySelector<HTMLElement>('.fps-card--mid');
        const back  = scene.querySelector<HTMLElement>('.fps-card--back');
        if (front) front.style.transform = tf(s.rotX,        s.rotY,        s.rotZ,        s.ty);
        if (mid)   mid.style.transform   = tf(s.rotX * 0.55, s.rotY * 0.55, s.rotZ * 0.55, s.ty * 0.65);
        if (back)  back.style.transform  = tf(s.rotX * 0.22, s.rotY * 0.22, s.rotZ * 0.22, s.ty * 0.35);

        const shine = scene.querySelector<HTMLElement>('.fps-card-shine');
        if (shine) {
          const sx = Math.round(50 + s.smMX * 32);
          const sy = Math.round(32 + s.smMY * 28);
          shine.style.setProperty('--sx', `${sx}%`);
          shine.style.setProperty('--sy', `${sy}%`);
        }
      }

      s.rafId = requestAnimationFrame(tick);
    }

    s.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.rafId);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cancel = startTilt();
    return cancel;
  }, [visible, startTilt]);

  // ── Mouse/pointer events ───────────────────────────────────────────────────
  useEffect(() => {
    const footer = footerRef.current;
    const scene  = tiltRef.current;
    if (!footer || !scene) return;

    function onMove(e: MouseEvent) {
      const r = scene!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top  + r.height / 2;
      tiltState.current.rawMX = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2)));
      tiltState.current.rawMY = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2)));
    }
    function onEnter() { tiltState.current.isHovering = true; }
    function onLeave() { tiltState.current.isHovering = false; }

    scene.addEventListener('mouseenter', onEnter);
    scene.addEventListener('mouseleave', onLeave);
    footer.addEventListener('mousemove', onMove);
    return () => {
      scene.removeEventListener('mouseenter', onEnter);
      scene.removeEventListener('mouseleave', onLeave);
      footer.removeEventListener('mousemove', onMove);
    };
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <footer ref={footerRef} className="fps-footer" aria-label="Site footer">

      {/* ── Layer 1: Navigation ── */}
      <div className={`fps-nav-area${visible ? ' fps-in' : ''}`}>
        <div className="fps-brand-col">
          <div className="fps-brand-logo">
            FinPilot <span className="fps-brand-star" aria-hidden="true">✦</span>
          </div>
          <p className="fps-brand-tagline">
            Smarter money.<br />A brighter you.
          </p>
          <div className="fps-social-row">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="fps-social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                {s.icon}
                <span className="fps-social-label">{s.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Desktop nav columns */}
        <nav className="fps-nav-grid" aria-label="Footer navigation">
          {NAV_COLS.map((col) => (
            <div key={col.label} className="fps-nav-col">
              <p className="fps-nav-label">{col.label}</p>
              <ul role="list" className="fps-nav-list">
                {col.links.map((l) => (
                  <li key={l.text}>
                    <Link to={l.to} className="fps-link">
                      <span className="fps-link-text">{l.text}</span>
                      <span className="fps-link-arrow" aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mobile accordions */}
        <div className="fps-nav-mob">
          {NAV_COLS.map((col) => (
            <MobileGroup key={col.label} label={col.label} links={col.links} />
          ))}
        </div>
      </div>

      {/* ── Layer 2: Legal bar ── */}
      <div className={`fps-bar${visible ? ' fps-in' : ''}`} style={{ animationDelay: '120ms' }}>
        <span className="fps-bar-copy">© {year} FinPilot. All rights reserved.</span>
        <div className="fps-bar-links">
          <a href="/#product" className="fps-bar-link">Privacy</a>
          <a href="/#product" className="fps-bar-link">Terms</a>
          <a href="/#product" className="fps-bar-link">Security</a>
          <a href="/#product" className="fps-bar-link">Cookies</a>
        </div>
      </div>

      {/* ── Layer 3: Signature stage ── */}
      <section className="fps-stage" aria-label="Financial intelligence">
        {/* Trajectory SVG — behind everything */}
        <div className="fps-traj-wrap" aria-hidden="true">
          <Trajectory visible={visible} />
        </div>

        {/* Left column: editorial copy */}
        <div className={`fps-editorial${visible ? ' fps-in' : ''}`} style={{ animationDelay: '200ms' }}>
          <p className="fps-stage-label">08 · Financial Intelligence</p>
          <h2 className="fps-stage-heading">
            Know where your<br />money is going.
          </h2>
          <p className="fps-stage-body">
            Turn transactions, bills, cash flow and goals<br className="fps-br-desk" />
            into a clearer financial future.
          </p>
          <Link to="/register" className="fps-stage-cta">
            Explore FinPilot
            <span className="fps-cta-arrow" aria-hidden="true">→</span>
          </Link>
          <p className="fps-stage-aside" aria-hidden="true">
            Simple<br />Decisions<br />Brighter<br />Tomorrows
          </p>
        </div>

        {/* Right column: visual objects */}
        <div className={`fps-objects${visible ? ' fps-in' : ''}`} style={{ animationDelay: '350ms' }}>
          {/* Financial card */}
          <div className="fps-card-scene" ref={tiltRef} aria-hidden="true">
            <div className="fps-card fps-card--back" />
            <div className="fps-card fps-card--mid" />
            <div className="fps-card fps-card--front">
              <div className="fps-card-shine" />
              <div className="fps-card-logo">FinPilot ✦</div>
              <div className="fps-card-chip" />
              <div className="fps-card-tap"><span /><span /><span /></div>
              <div className="fps-card-stripe" />
              <div className="fps-card-edge" />
            </div>
          </div>
          {/* Allocation ring */}
          <div className="fps-ring-wrap" aria-hidden="true">
            <svg className="fps-ring-svg" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="66" className="fps-ring-track" />
              <circle cx="80" cy="80" r="66" className="fps-ring-arc fps-ring-arc--primary" />
              <circle cx="80" cy="80" r="66" className="fps-ring-arc fps-ring-arc--secondary" />
              <circle cx="80" cy="80" r="50" className="fps-ring-inner" />
            </svg>
            <div className="fps-ring-dot" />
          </div>
          {/* Green signal orb */}
          <div className="fps-signal-orb" aria-hidden="true" />
        </div>
      </section>

      {/* ── Layer 4: Giant wordmark ── */}
      <div
        className={`fps-wordmark${visible ? ' fps-in' : ''}`}
        style={{ animationDelay: '500ms' }}
        aria-hidden="true"
      >
        <span className="fps-wordmark-text">FINPILOT</span>
      </div>

    </footer>
  );
}
