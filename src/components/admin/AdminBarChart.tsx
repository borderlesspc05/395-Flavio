interface BarItem {
  label: string;
  count: number;
}

interface AdminBarChartProps {
  title: string;
  subtitle?: string;
  items: BarItem[];
  accent?: 'bronze' | 'warm';
}

export function AdminBarChart({ title, subtitle, items, accent = 'bronze' }: AdminBarChartProps) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <article className={`admin-chart-card admin-chart-card--${accent}`}>
      <header className="admin-chart-head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {items.length === 0 ? (
        <p className="admin-chart-empty">Sem dados ainda.</p>
      ) : (
        <ul className="admin-bar-chart" role="list">
          {items.map((item, index) => {
            const pct = Math.round((item.count / max) * 100);
            return (
              <li key={`${item.label}-${index}`} className="admin-bar-row">
                <div className="admin-bar-meta">
                  <span className="admin-bar-label" title={item.label}>
                    {item.label}
                  </span>
                  <strong className="admin-bar-value">{item.count}</strong>
                </div>
                <div className="admin-bar-track" aria-hidden>
                  <span
                    className="admin-bar-fill"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
