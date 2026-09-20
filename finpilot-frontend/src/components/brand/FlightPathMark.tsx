// The site's one signature visual element: an ascending, slightly irregular
// line (not a perfectly straight diagonal) tracing up and to the right,
// ending in a glowing marker. It does triple duty deliberately - it echoes
// "Pilot" (a flight path), it echoes the trend chart already in the product
// (money over time), and it reads simply as "things going up." No literal
// airplane icon - that would tip into cliché.
//
// animate=true draws the line in on load (used once, in the hero).
// animate=false renders it already complete (used as a quieter echo
// elsewhere, e.g. the auth page brand panel) - the draw-in moment
// shouldn't repeat every time someone sees the mark.
export default function FlightPathMark({ animate = false, className = '' }: { animate?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 400 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 10 170 C 60 165, 90 140, 120 130 C 160 116, 190 145, 230 110 C 270 75, 300 95, 340 50 C 360 28, 375 22, 390 15"
        stroke="var(--color-signal)"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        className={animate ? 'flight-path-line' : ''}
      />
      <circle cx="390" cy="15" r="5" fill="var(--color-signal)" />
      <circle cx="390" cy="15" r="10" fill="var(--color-signal)" opacity="0.25" />
    </svg>
  );
}
