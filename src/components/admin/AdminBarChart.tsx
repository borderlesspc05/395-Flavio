interface BarItem {
  label: string;
  count: number;
}

interface AdminBarChartProps {
  title: string;
  subtitle?: string;
  items: BarItem[];
  accent?: 'bronze' | 'warm';
  maxItems?: number;
}

function collapseItems(items: BarItem[], maxItems?: number): BarItem[] {
  if (!maxItems || items.length <= maxItems) return items;
  const head = items.slice(0, maxItems);
  const rest = items.slice(maxItems);
  const otherCount = rest.reduce((sum, i) => sum + i.count, 0);
  if (otherCount <= 0) return head;
  return [...head, { label: 'Outros', count: otherCount }];
}

export function AdminBarChart({
  title,
  subtitle,
  items,
  accent = 'bronze',
  maxItems,
}: AdminBarChartProps) {
  const chartItems = collapseItems(items, maxItems);
  const max = Math.max(...chartItems.map((i) => i.count), 1);

  return (
    <article className={`admin-chart-card admin-chart-card--${accent}`}>
      <header className="admin-chart-head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {chartItems.length === 0 ? (
        <p className="admin-chart-empty">Sem dados ainda.</p>
      ) : (
        <ul className="admin-bar-chart" role="list">
          {chartItems.map((item, index) => {
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
