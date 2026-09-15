export interface LineSeries {
  label: string;
  /** Nom de variable CSS, ex. "--accent". */
  colorVar: string;
  data: (number | null)[];
  /** Trait pointillé — utilisé pour une moyenne mobile superposée. */
  dashed?: boolean;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_X = 8;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 26;

/** Courbes multi-séries — inline SVG, sans dépendance, même esprit que
 * DonutChart/BarList. `null` dans une série crée un trou dans le tracé
 * (nouveau sous-chemin) plutôt qu'une chute à zéro. */
export function LineChart({ xLabels, series }: { xLabels: string[]; series: LineSeries[] }) {
  const n = xLabels.length;
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const valeurs = series.flatMap((s) => s.data).filter((v): v is number => v !== null);
  const max = Math.max(1, ...valeurs);

  function x(i: number): number {
    return PADDING_X + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  }
  function y(v: number): number {
    return PADDING_TOP + plotHeight - (v / max) * plotHeight;
  }

  function pathFor(data: (number | null)[]): string {
    let d = "";
    let enCours = false;
    data.forEach((v, i) => {
      if (v === null) {
        enCours = false;
        return;
      }
      d += `${enCours ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      enCours = true;
    });
    return d.trim();
  }

  const description =
    series.map((s) => `${s.label} : ${s.data.filter((v) => v !== null).join(", ")}`).join(" — ") || "aucune donnée";

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Évolution mensuelle — ${description}`}
      >
        {[0, 0.5, 1].map((frac) => (
          <line
            key={frac}
            x1={PADDING_X}
            x2={WIDTH - PADDING_X}
            y1={PADDING_TOP + plotHeight * (1 - frac)}
            y2={PADDING_TOP + plotHeight * (1 - frac)}
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}
        {series.map((s) => (
          <path
            key={s.label}
            d={pathFor(s.data)}
            fill="none"
            stroke={`var(${s.colorVar})`}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {xLabels.map((label, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text
              key={`${label}-${i}`}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontSize: 9 }}
            >
              {label}
            </text>
          ) : null,
        )}
      </svg>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: `var(${s.colorVar})` }}
              aria-hidden
            />
            <span className="text-muted">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
