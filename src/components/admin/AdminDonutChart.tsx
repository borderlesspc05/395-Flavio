interface DonutSegment {
  label: string;
  count: number;
}

interface AdminDonutChartProps {
  title: string;
  segments: DonutSegment[];
}

const PALETTE = ['#c9a962', '#ffbc7d', '#af9270', '#8b7355', '#6e8f9e', '#5a7a6a'];

export function AdminDonutChart({ title, segments }: AdminDonutChartProps) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  const top = segments[0];

  let offset = 0;
  const gradientStops =
    total === 0
      ? 'rgba(175,146,112,0.2) 0% 100%'
      : segments
          .map((seg, i) => {
            const pct = (seg.count / total) * 100;
            const start = offset;
            offset += pct;
            return `${PALETTE[i % PALETTE.length]} ${start}% ${offset}%`;
          })
          .join(', ');

  return (
    <article className="admin-chart-card admin-chart-card--donut">
      <header className="admin-chart-head">
        <h3>{title}</h3>
        <p>Distribuição proporcional</p>
      </header>
      <div className="admin-donut-layout">
        <div
          className="admin-donut-ring"
          style={{ background: `conic-gradient(${gradientStops})` }}
          role="img"
          aria-label={`Total ${total} requisições`}
        >
          <div className="admin-donut-hole">
            <strong>{total}</strong>
            <span>total</span>
          </div>
        </div>
        <ul className="admin-donut-legend">
          {segments.slice(0, 6).map((seg, i) => (
            <li key={seg.label}>
              <span className="admin-donut-swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="admin-donut-legend-label">{seg.label}</span>
              <span className="admin-donut-legend-pct">
                {total ? Math.round((seg.count / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      {top && total > 0 && (
        <p className="admin-donut-insight">
          Mais frequente: <strong>{top.label}</strong> ({Math.round((top.count / total) * 100)}%)
        </p>
      )}
    </article>
  );
}
