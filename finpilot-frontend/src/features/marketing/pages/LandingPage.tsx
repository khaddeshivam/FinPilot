import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type Preview = 'Overview' | 'Cash flow' | 'Goals';

const questions = [
  ['Where did my spending change?', 'Dining is up 18% this month.', 'Three more dinners out than your normal rhythm, mostly on weekends.'],
  ['Can I save a little more?', 'A ₹4,800 monthly transfer is within reach.', 'Core spending has stayed stable for four consecutive months.'],
  ['What needs my attention?', 'Your transport budget is nearly spent.', 'A few unplanned rides moved the category closer to its limit than usual.'],
] as const;

function Brand() {
  return <span className="fp-brand"><i aria-hidden="true"><b /></i>finpilot</span>;
}

function Button({ children, to, onClick }: { children: React.ReactNode; to?: string; onClick?: () => void }) {
  const className = 'fp-button';
  return to ? <Link className={className} to={to}>{children} <span>→</span></Link> : <button className={className} onClick={onClick}>{children}</button>;
}

export default function LandingPage() {
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState<Preview>('Overview');
  const [flow, setFlow] = useState(0);
  const [question, setQuestion] = useState(0);
  const [contribution, setContribution] = useState(4800);
  const [approved, setApproved] = useState(false);
  const months = Math.ceil(84000 / contribution);
  const finish = useMemo(() => { const date = new Date(); date.setMonth(date.getMonth() + months); return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); }, [months]);
  const scroll = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenu(false); };
  const bars = preview === 'Overview' ? [40, 58, 48, 73, 62, 89, 78] : preview === 'Cash flow' ? [68, 51, 81, 55, 76, 62, 91] : [32, 42, 49, 58, 67, 75, 84];
  const stat = preview === 'Overview' ? ['Your financial pulse', '₹2,84,600', '+₹12,480 this month'] : preview === 'Cash flow' ? ['Cash flow', '₹18,240', 'Available after essentials'] : ['Home fund', '₹78,000', '48% of your target'];

  return <main className="fp-shell" id="top">
    <div className="fp-grid" aria-hidden="true" />
    <header className="fp-header"><nav className="fp-nav">
      <a href="#top" onClick={() => scroll('top')} aria-label="FinPilot home"><Brand /></a>
      <div className="fp-links"><a href="#product" onClick={() => scroll('product')}>Product</a><a href="#how" onClick={() => scroll('how')}>How it works</a><a href="#simulator" onClick={() => scroll('simulator')}>Simulator</a></div>
      <div className="fp-auth"><Link to="/login">Sign in</Link><Button to="/register">Get started</Button></div>
      <button className="fp-menu" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? '×' : '☰'}</button>
    </nav>{menu && <div className="fp-mobile"><a href="#product" onClick={() => scroll('product')}>Product</a><a href="#how" onClick={() => scroll('how')}>How it works</a><a href="#simulator" onClick={() => scroll('simulator')}>Simulator</a><Link to="/login">Sign in</Link><Button to="/register">Get started</Button></div>}</header>

    <section className="fp-hero"><div className="fp-copy"><p className="fp-label">01 <span /> Financial intelligence, made human</p><h1>Know what your<br />money is <em>saying.</em></h1><p className="fp-description">FinPilot turns financial data into clear context, considered recommendations, and decisions you stay in control of.</p><div className="fp-cta"><Button to="/register">Try FinPilot</Button><button onClick={() => scroll('product')}>See how it thinks ↓</button></div><small>● Built for decisions, not just dashboards.</small></div>
      <div className="fp-orbit"><i /><i /><span className="fp-signal">signal ·</span><span className="fp-context">· context</span><div className="fp-signal-card"><div className="fp-card-title"><Brand /><span>● LIVE SIGNAL</span></div><p>THIS MONTH, SO FAR</p><strong>₹12,480</strong><b>↗ 16.4% more than usual</b><svg viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 62C20 48 30 70 49 52S78 61 95 41s28 12 46-8 26 13 45-9 30 6 48-14 34 8 66-6" /><path d="M0 71C20 57 30 75 52 60s29 7 46-11 27 7 46-12 29 8 47-11 31 4 48-16 33 4 61-6" /></svg><div className="fp-notice">✦ <span><b>A gentle signal:</b> Your usual surplus is growing. There may be room to put some of it to work.</span></div></div></div>
    </section>

    <section className="fp-section" id="product"><div className="fp-heading"><p className="fp-label">02 <span /> A calmer way to see money</p><h2>Everything you need.<br /><em>Nothing you don’t.</em></h2><p>One clear surface for the signals that deserve your attention.</p></div><div className="fp-preview"><div className="fp-tabs" role="tablist">{(['Overview', 'Cash flow', 'Goals'] as Preview[]).map((name) => <button key={name} role="tab" aria-selected={name === preview} onClick={() => setPreview(name)}>{name}</button>)}</div><div className="fp-screen"><aside><Brand /><span className="active">Overview</span><span>Accounts</span><span>Activity</span><span>Planning</span></aside><div className="fp-screen-main"><div className="fp-welcome"><div><p>Good morning, Shivam</p><h3>{stat[0]}</h3></div><small>Sep 2026</small></div><div className="fp-value"><p>NET POSITION</p><strong>{stat[1]}</strong><b>{stat[2]}</b><div className="fp-bars">{bars.map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div></div><div className="fp-small-cards"><div><p>SPENDING SIGNAL</p><b>Dining out <em>↑ 18%</em></b><small>Worth noticing, not worrying about.</small></div><div><p>UPCOMING</p><b>Rent · 3 days</b><small>₹18,000 · already planned</small></div></div></div></div></div></section>

    <section className="fp-section fp-story" id="how"><div><p className="fp-label">03 <span /> The intelligence layer</p><h2>From a number to<br />a <em>next move.</em></h2><p>FinPilot does not just report what happened. It helps make sense of what changed, why it matters, and what you might consider next.</p></div><div className="fp-flow">{[['Signal', 'Your monthly surplus has risen for four months.'], ['Context', 'Your core spending stayed stable while income grew.'], ['Recommendation', 'Consider moving ₹4,800 toward your home fund.']].map(([title, text], index) => <button className={flow === index ? 'selected' : ''} onClick={() => setFlow(index)} key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p><small>{index === 0 ? 'A pattern worth seeing.' : index === 1 ? 'The reason behind the number.' : 'A useful next step, never an order.'}</small></div><b>{index === 2 ? '✓' : '→'}</b></button>)}</div><div className="fp-human"><span>Human approval is the final step.</span><b>Nothing moves until you say yes.</b></div></section>

    <section className="fp-section fp-spending"><div><p className="fp-label">04 <span /> See the pattern</p><h2>Spending is more than<br />a list of <em>transactions.</em></h2><p>FinPilot groups the noise into rhythms you can understand: what is changing, what is recurring, and what can wait.</p><Button to="/register">Explore your patterns</Button></div><div className="fp-category"><div><p>CATEGORY RHYTHM</p><small>This month</small></div><h3>Food & dining</h3><div className="fp-donut"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" /><circle className="value" cx="60" cy="60" r="48" /></svg><b>₹8,240<small>of ₹10,000</small></b></div><p className="fp-row"><span><i /> Groceries</span><b>₹4,120</b></p><p className="fp-row"><span><i /> Eating out</span><b>₹4,120</b></p><div className="fp-notice">✦ <span>You are spending in line with last month—apart from a few more restaurant visits.</span></div></div></section>

    <section className="fp-section fp-dark" id="simulator"><div><p className="fp-label">05 <span /> Make the future tangible</p><h2>Small moves.<br /><em>Real momentum.</em></h2><p>Try a contribution amount and see the difference a steady rhythm can make.</p></div><div className="fp-simulator"><div><p>HOME FUND</p><b>₹78,000 <small>saved so far</small></b></div><label htmlFor="contribution">Monthly contribution <strong>₹{contribution.toLocaleString('en-IN')}</strong></label><input id="contribution" type="range" min="2000" max="12000" step="200" value={contribution} onChange={(event) => setContribution(Number(event.target.value))} /><article><p>You could reach your target by</p><strong>{finish}</strong><small>At this pace, your ₹1,62,000 goal is {months} months away.</small></article><div className="fp-timeline"><i /><i /><i /><i /><i /><b style={{ left: `${Math.min(95, 12 + (contribution - 2000) / 120)}%` }} /></div><small className="fp-disclaimer">This is a planning illustration, not financial advice.</small></div></section>

    <section className="fp-section fp-ask"><div><p className="fp-label">06 <span /> Ask in plain language</p><h2>Your financial life,<br /><em>in conversation.</em></h2><p>Start with the question on your mind. FinPilot connects the answer to its underlying information, so reasoning stays visible.</p></div><div className="fp-ask-card"><header>✦ <div><b>Ask FinPilot</b><small>GROUNDED IN YOUR DATA</small></div></header><div className="fp-questions">{questions.map(([prompt], index) => <button className={question === index ? 'selected' : ''} key={prompt} onClick={() => setQuestion(index)}>{prompt}</button>)}</div><article><p>FINPILOT’S READ</p><h3>{questions[question][1]}</h3><span>{questions[question][2]}</span><div><small>Grounded in your trends</small><small>Reasoning stays visible</small><small>No automatic action</small></div></article></div></section>

    <section className="fp-section fp-approval"><div><p className="fp-label">07 <span /> The human in the loop</p><h2>Good advice waits<br />for a <em>yes.</em></h2><p>FinPilot can prepare the next step. You decide whether it belongs in your life.</p></div><div className="fp-approval-card"><header><small>RECOMMENDATION READY</small><b className={approved ? 'approved' : ''}>● {approved ? 'approved' : 'awaiting approval'}</b></header><div className="fp-recommend"><i>↗</i><div><h3>Move ₹4,800 to your home fund</h3><p>Scheduled after your fixed outgoings</p></div><strong>₹4,800<small>one-time transfer</small></strong></div><p className="fp-reason">This amount has appeared as surplus for four consecutive months. Keeping your existing cash buffer intact leaves room for the unexpected.</p><footer>{approved ? <b className="fp-confirm">✓ Approved and ready when you are.</b> : <><Button onClick={() => setApproved(true)}>Approve recommendation ✓</Button><button className="fp-outline">Review details</button></>}</footer></div></section>

    <footer className="fp-footer"><div><Brand /><h2>Your money already knows.<br /><em>Now you can, too.</em></h2></div><div><b>EXPLORE</b><a href="#product" onClick={() => scroll('product')}>Product</a><a href="#how" onClick={() => scroll('how')}>How it works</a><a href="#ask" onClick={() => scroll('ask')}>Ask FinPilot</a></div><div><b>PRINCIPLES</b><span>Read-only by default</span><span>Reasoning stays visible</span><span>Nothing moves without you</span></div><div><b>GET STARTED</b><span>A calmer, clearer relationship with money starts with seeing the whole picture.</span><Button to="/register">Create an account</Button></div><small>© {new Date().getFullYear()} FinPilot · Made for decisions, not dashboards.</small></footer>
  </main>;
}
