import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, Check, ChevronRight, Globe2, Menu, ShieldCheck, Sparkles, WalletCards, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './LandingPage.css';
import binderClip from '../../../assets/figma/floating-red-binder-clip.png';
import banknotes from '../../../assets/figma/floating-banknotes.png';
import briefcase from '../../../assets/figma/floating-leather-briefcase.png';
import rolledBanknote from '../../../assets/figma/floating-rolled-banknote.png';
import paymentToken from '../../../assets/figma/floating-mint-payment-token.png';

const navigation = [['Platform', 'workspace'], ['Solutions', 'solutions'], ['Why FinPilot', 'why-finpilot'], ['Resources', 'resources']] as const;
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function useLandingMotion() {
  const [activeSection, setActiveSection] = useState('workspace');
  const [hasScrolled, setHasScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      pageRef.current?.style.setProperty('--fpl-reading-progress', `${max > 0 ? (window.scrollY / max) * 100 : 0}%`);
      setHasScrolled(window.scrollY > 12);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateProgress); };
    window.addEventListener('scroll', onScroll, { passive: true });
    updateProgress();
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('[data-landing-section]')];
    const revealObserver = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.classList.add('is-revealed'); revealObserver.unobserve(target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -8%' });
    const navigationObserver = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) setActiveSection((target as HTMLElement).id);
    }), { threshold: 0.35, rootMargin: '-18% 0px -55%' });
    sections.forEach((section) => { revealObserver.observe(section); navigationObserver.observe(section); });
    return () => { revealObserver.disconnect(); navigationObserver.disconnect(); };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { activeSection, hasScrolled, menuOpen, pageRef, setMenuOpen };
}

function WorkspacePreview() {
  return <div className="fpl-workspace" aria-label="Preview of the FinPilot workspace">
    <aside className="fpl-workspace-nav"><b>finpilot</b><button className="fpl-agency">Shivam's workspace <ChevronRight size={13} /></button>{['Overview', 'Accounts', 'Transactions', 'Budgets', 'Insights'].map((item, index) => <span className={index === 0 ? 'active' : ''} key={item}>{item}</span>)}<small>Settings & support</small></aside>
    <div className="fpl-workspace-body"><div className="fpl-workspace-top"><span>Workspace / Overview</span><button>Make a payment <ArrowUpRight size={13} /></button></div><h3>Your money. In good hands.</h3><p>A little less admin. A lot more possibility.</p><div className="fpl-metrics"><article className="primary"><span>Available balance</span><strong>₹1,24,850</strong><small>INR</small></article><article><span>This month’s spending</span><strong>₹42,600</strong><small>On track</small></article><article><span>Income this month</span><strong>₹68,240</strong><small>4 payments received</small></article></div><div className="fpl-workspace-lower"><article className="fpl-transactions"><header><b>Recent transactions</b><span>View all <ArrowUpRight size={12} /></span></header>{[['Atlas Talent Ltd', 'Invoice paid', '+ ₹12,500'], ['June contractor payroll', 'Completed', '− ₹42,600'], ['Harbor Partners', 'Invoice paid', '+ ₹8,750']].map(([name, state, amount]) => <div key={name}><b>{name}</b><span>{state}</span><strong>{amount}</strong></div>)}</article><article className="fpl-spending"><span>Spending by category</span><strong>₹42,600</strong><div><i /><i /><i /><i /><i /><i /></div><small>Keep an eye on Food & dining</small></article></div></div>
  </div>;
}

export default function LandingPage() {
  const { activeSection, hasScrolled, menuOpen, pageRef, setMenuOpen } = useLandingMotion();
  const onHeroPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || !window.matchMedia('(pointer: fine)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--fpl-pointer-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 2}`);
    event.currentTarget.style.setProperty('--fpl-pointer-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 2}`);
  };
  return <main className="fpl-page" ref={pageRef}><div className="fpl-reading-progress" aria-hidden="true" /><header className={`fpl-header ${hasScrolled ? 'is-scrolled' : ''}`}><nav className="fpl-nav" aria-label="Main navigation"><Link to="/" className="fpl-logo">finpilot<span>°</span></Link><div className="fpl-links">{navigation.map(([label, id]) => <button key={id} className={activeSection === id ? 'is-active' : ''} aria-current={activeSection === id ? 'page' : undefined} onClick={() => scrollTo(id)}>{label}</button>)}</div><div className="fpl-actions"><Link to="/login">Log in</Link><Link to="/register" className="fpl-lime-button">Get started <ArrowUpRight size={15} /></Link></div><button className="fpl-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button></nav>{menuOpen && <div className="fpl-mobile-menu">{navigation.map(([label, id]) => <button key={id} className={activeSection === id ? 'is-active' : ''} onClick={() => { scrollTo(id); setMenuOpen(false); }}>{label}</button>)}<Link to="/login">Log in</Link><Link to="/register" className="fpl-lime-button">Get started <ArrowUpRight size={15} /></Link></div>}</header>
    <section className="fpl-hero" onPointerMove={onHeroPointerMove} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--fpl-pointer-x', '0'); event.currentTarget.style.setProperty('--fpl-pointer-y', '0'); }}><img className="fpl-float fpl-clip" src={binderClip} alt="" fetchPriority="high" /><img className="fpl-float fpl-cash" src={banknotes} alt="" loading="lazy" /><img className="fpl-float fpl-case" src={briefcase} alt="" loading="lazy" /><img className="fpl-float fpl-roll" src={rolledBanknote} alt="" loading="lazy" /><img className="fpl-float fpl-token" src={paymentToken} alt="" loading="lazy" /><div className="fpl-hero-content"><div className="fpl-eyebrow"><i /> FINANCIAL CLARITY, BUILT FOR YOU</div><h1><em>Great with life.</em><br />Now great with money.</h1><p>See every rupee. Understand the full picture. Make your next move with a calmer, more connected workspace.</p><Link to="/register" className="fpl-lime-button fpl-hero-cta">Get started for free <ArrowUpRight size={16} /></Link><small>No credit card required <b>·</b> Set up in minutes</small></div><button className="fpl-scroll-cue" onClick={() => scrollTo('workspace')} aria-label="Scroll to the FinPilot workspace preview"><span /></button></section>
    <section id="workspace" data-landing-section className="fpl-showcase fpl-reveal"><div className="fpl-section-kicker"><span>YOUR NEXT CHAPTER. A CLEARER VIEW.</span><span>01 / THE FINPILOT WORKSPACE</span></div><WorkspacePreview /><p className="fpl-preview-note">Illustrative product preview — figures are sample data, not customer financial information.</p></section>
    <section id="solutions" data-landing-section className="fpl-split fpl-split-soft fpl-reveal"><div><p className="fpl-overline">ONE WORKSPACE. EVERY ANGLE.</p><h2>More than a dashboard.<br /><em>A better point of view.</em></h2><p className="fpl-body-copy">Connect your accounts, spending, budgets, and financial questions in one place. FinPilot makes the details feel lighter, so you can focus on what is ahead.</p><Link to="/register" className="fpl-text-link">Explore your workspace <ArrowUpRight size={16} /></Link></div><div className="fpl-feature-grid">{[[WalletCards, 'Everything in one place', 'Accounts, balances, and everyday movement — all together.'], [BarChart3, 'See what changed', 'Clear trends turn activity into something useful.'], [Sparkles, 'Understand the why', 'Thoughtful insights built around your real life.'], [Globe2, 'Plan the next move', 'A clearer route from today to your next goal.']].map(([Icon, title, text]) => { const FeatureIcon = Icon as typeof WalletCards; return <article key={title as string}><FeatureIcon size={23} /><h3>{title as string}</h3><p>{text as string}</p><ArrowUpRight className="fpl-card-arrow" size={16} aria-hidden="true" /></article>; })}</div></section>
    <section id="why-finpilot" data-landing-section className="fpl-why fpl-reveal"><div className="fpl-why-copy"><p className="fpl-overline">A LITTLE LESS ADMIN. A LOT MORE POSSIBILITY.</p><h2>Money works better<br />when it feels <em>human.</em></h2><p className="fpl-body-copy">FinPilot is designed to give you the context behind every number, and the confidence to decide what comes next.</p></div><div className="fpl-steps">{[['01', 'Connect your world', 'Bring your accounts, transactions, and plans together.'], ['02', 'See the whole picture', 'Know where you stand, without stitching together spreadsheets.'], ['03', 'Move with confidence', 'Use clear context to make a considered next move.']].map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><Check size={19} /></article>)}</div></section>
    <section id="resources" data-landing-section className="fpl-resources fpl-reveal"><div><p className="fpl-overline">BUILT TO EARN YOUR TRUST.</p><h2>Your financial life,<br /><em>handled with care.</em></h2></div><div className="fpl-resource-list"><article><ShieldCheck size={22} /><div><h3>Your data stays yours</h3><p>Clear controls and a product built around your privacy.</p></div></article><article><Sparkles size={22} /><div><h3>Intelligence you can question</h3><p>Useful context, visible reasoning, and no mysterious automatic moves.</p></div></article><article><Globe2 size={22} /><div><h3>A workspace that grows with you</h3><p>From your everyday financial picture to your next meaningful goal.</p></div></article></div></section>
    <section className="fpl-closing"><p className="fpl-overline">YOUR NEXT CHAPTER STARTS HERE.</p><h2>Spend less time<br />figuring it out.</h2><p>Start building a clearer relationship with your money today.</p><Link to="/register" className="fpl-lime-button">Get started for free <ArrowUpRight size={16} /></Link></section><footer className="fpl-footer"><Link to="/" className="fpl-logo">finpilot<span>°</span></Link><span>© {new Date().getFullYear()} FinPilot. Made for clearer next moves.</span><div><Link to="/login">Log in</Link><Link to="/register">Get started</Link></div></footer>
  </main>;
}
