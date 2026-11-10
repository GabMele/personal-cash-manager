export default function Badge({ color, children, solid }: { color: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: solid ? color : `${color}26`, color: solid ? "#0b0b14" : color, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}
