export interface BarDatum {
  label: string;
  value: number;
}

/** Liste de barres horizontales — pour une répartition simple (ex. stock par fournisseur). */
export function BarList({ data, colorVar = "--accent" }: { data: BarDatum[]; colorVar?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted">{d.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.05]">
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: `var(${colorVar})` }}
            />
          </span>
          <span className="w-7 shrink-0 text-right font-medium tabular-nums text-foreground">
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
