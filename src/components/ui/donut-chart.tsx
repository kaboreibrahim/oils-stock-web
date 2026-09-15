export interface DonutDatum {
  label: string;
  value: number;
  /** Nom de variable CSS, ex. "--accent". */
  colorVar: string;
}

/** Anneau de répartition — inline SVG, sans dépendance. Une seule vraie
 * légende à droite, valeur totale au centre. */
export function DonutChart({
  data,
  size = 132,
  thickness = 18,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let acc = 0;
  const arcs = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const arc = { ...d, dash, offset: -acc };
    acc += dash;
    return arc;
  });

  const description = data.map((d) => `${d.label} : ${d.value}`).join(", ") || "aucune donnée";

  return (
    <div className="flex items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Répartition du stock — ${description}`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--line)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`var(${arc.colorVar})`}
                strokeWidth={thickness}
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={arc.offset}
              />
            ))}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground font-semibold"
          style={{ fontSize: size * 0.19 }}
        >
          {total}
        </text>
      </svg>
      <ul className="flex flex-col gap-2.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: `var(${d.colorVar})` }}
              aria-hidden
            />
            <span className="text-muted">{d.label}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
