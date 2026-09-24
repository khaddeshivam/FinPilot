export default function Surface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[22px] border border-line bg-surface ${className}`}>{children}</section>
  );
}
