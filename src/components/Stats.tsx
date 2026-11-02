export function Stats({ items }: { items: [label: string, value: number][] }) {
  return (
    <dl className="grid w-full grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] tracking-wider text-muted uppercase">{label}</dt>
          <dd className="text-xl font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
