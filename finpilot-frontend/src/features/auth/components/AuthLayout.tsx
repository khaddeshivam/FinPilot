import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import FlightPathMark from '../../../components/brand/FlightPathMark';
import '../auth.css';

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export default function AuthLayout({ children, eyebrow, title, description }: AuthLayoutProps) {
  return <main className="fpa-page">
    <aside className="fpa-brand-panel" aria-label="FinPilot introduction">
      <Link to="/" className="fpa-brand">finpilot<span>°</span></Link>
      <div className="fpa-brand-copy"><p className="fpa-eyebrow">FINANCIAL CLARITY, BUILT FOR YOU</p><h1>{title}</h1><p>{description}</p><FlightPathMark className="fpa-flight-path" animate /></div>
      <div className="fpa-brand-footer"><ShieldCheck size={16} /><span>Your data stays yours.</span></div>
    </aside>
    <section className="fpa-form-panel">
      <Link to="/" className="fpa-mobile-brand">finpilot<span>°</span></Link>
      <div className="fpa-card">
        <p className="fpa-form-eyebrow">{eyebrow}</p>
        {children}
      </div>
      <Link className="fpa-back-link" to="/"><ArrowUpRight size={15} /> Back to FinPilot</Link>
    </section>
  </main>;
}
