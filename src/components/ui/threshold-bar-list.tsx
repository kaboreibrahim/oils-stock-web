export interface ThresholdBarDatum {
  label: string;
  value: number;
  threshold: number;
}

/** Variante de BarList avec un repère de seuil sur la même piste — répond à
 * "stock actuel vs seuil, par article" d'un coup d'œil. Rouge si sous le
 * seuil, sinon même bleu que BarList. */
export function ThresholdBarList({ data }: { data: ThresholdBarDatum[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.value, d.threshold]));

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => {
        const enAlerte = d.value < d.threshold;
        return (
          <li key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate text-muted" title={d.label}>
              {d.label}
            </span>
            <span className="relative h-2 flex-1 rounded-full bg-foreground/[0.05]">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: enAlerte ? "var(--crit)" : "var(--accent)",
                }}
              />
              <span
                className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-muted"
                style={{ left: `${(d.threshold / max) * 100}%` }}
                title={`Seuil : ${d.threshold}`}
              />
            </span>
            <span className="w-7 shrink-0 text-right font-medium tabular-nums text-foreground">{d.value}</span>
          </li>
        );
      })}
    </ul>
  );
}
