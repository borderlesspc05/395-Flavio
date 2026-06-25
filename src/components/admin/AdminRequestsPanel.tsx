import { Loader2, RefreshCw } from 'lucide-react';
import { AdminBarChart } from './AdminBarChart';
import { AdminCollapsibleSection } from './AdminCollapsibleSection';
import { AdminTableToolbar } from './AdminTableToolbar';
import type { AdminDashboard } from '../../services/adminApi';
import { useAdminRequestLogs } from '../../hooks/useAdminRequestLogs';

type Props = {
  charts: Pick<AdminDashboard, 'requestsByDay' | 'requestsByType' | 'requestsBySubject' | 'requestHealth'>;
  onSelectUser: (userId: string, userName?: string) => void;
  refreshToken?: number;
};

export function AdminRequestsPanel({ charts, onSelectUser, refreshToken = 0 }: Props) {
  const {
    rows,
    typeOptions,
    page,
    setPage,
    total,
    totalPages,
    rangeStart,
    rangeEnd,
    queryInput,
    setQueryInput,
    typeFilter,
    setTypeFilter,
    errorsOnly,
    setErrorsOnly,
    loading,
    refreshing,
    error,
  } = useAdminRequestLogs(refreshToken);

  const dayChartItems = charts.requestsByDay.map((d) => ({ label: d.label, count: d.count }));
  const typeChartItems = charts.requestsByType.map((t) => ({ label: t.label, count: t.count }));
  const subjectChartItems = charts.requestsBySubject.map((s) => ({ label: s.subject, count: s.count }));

  const showTable = rows.length > 0 || !loading;

  return (
    <div className="admin-panel-stack">
      <AdminCollapsibleSection
        title="Gráficos de uso"
        subtitle={`${charts.requestHealth.total} requisições · ${charts.requestHealth.errorRatePercent}% erros · média ${charts.requestHealth.avgDurationMs}ms`}
        defaultOpen={false}
      >
        <section className="admin-charts-grid admin-charts-grid--compact">
          <AdminBarChart
            title="Volume diário (14 dias)"
            subtitle="Requisições à API por dia"
            items={dayChartItems}
            accent="warm"
          />
          <AdminBarChart
            title="Tipos de requisição"
            subtitle="Top categorias"
            items={typeChartItems}
            accent="bronze"
            maxItems={8}
          />
          <AdminBarChart
            title="Módulos Magnus"
            subtitle="Área do produto"
            items={subjectChartItems}
            accent="warm"
            maxItems={8}
          />
        </section>
      </AdminCollapsibleSection>

      <section className={`admin-card admin-card--table admin-log-card ${refreshing ? 'is-refreshing' : ''}`}>
        <header className="admin-card-head admin-card-head--row">
          <div>
            <h2>Log de requisições</h2>
            <p>Histórico mantido na sessão — busque por usuário, rota ou tipo</p>
          </div>
          {refreshing ? (
            <span className="admin-sync-badge" aria-live="polite">
              <RefreshCw size={14} className="admin-spin" />
              Atualizando
            </span>
          ) : null}
        </header>

        <AdminTableToolbar
          query={queryInput}
          onQueryChange={setQueryInput}
          queryPlaceholder="Usuário, rota, tipo ou status…"
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalCount={total}
          onPageChange={setPage}
        >
          <label className="admin-table-filter">
            <span className="sr-only">Filtrar por tipo</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos os tipos</option>
              {typeOptions.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label} ({t.count})
                </option>
              ))}
            </select>
          </label>
          <label className="admin-table-filter admin-table-filter--check">
            <input
              type="checkbox"
              checked={errorsOnly}
              onChange={(e) => setErrorsOnly(e.target.checked)}
            />
            Só erros
          </label>
        </AdminTableToolbar>

        {error ? (
          <p className="admin-error admin-card-inline-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="admin-table-wrap admin-table-wrap--dense admin-table-wrap--stable">
          {loading && !showTable ? (
            <div className="admin-table-loading">
              <Loader2 size={20} className="admin-spin" />
              <span>Carregando log…</span>
            </div>
          ) : (
            <table className="admin-table admin-table--requests admin-table--dense">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Tempo</th>
                </tr>
              </thead>
              <tbody className={refreshing ? 'is-dimmed' : undefined}>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Nenhuma requisição encontrada.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td className="admin-cell-date">
                        {new Date(r.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        {r.userId && r.userId !== 'demo-user' ? (
                          <button
                            type="button"
                            className="admin-link-user"
                            onClick={() => onSelectUser(r.userId!, r.userName)}
                          >
                            {r.userName}
                          </button>
                        ) : (
                          <span className="admin-user-name">{r.userName}</span>
                        )}
                      </td>
                      <td>
                        <span className="admin-type-pill" title={r.path}>
                          {r.typeLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-pill ${r.statusCode >= 400 ? 'is-error' : 'is-ok'}`}
                        >
                          {r.statusCode}
                        </span>
                      </td>
                      <td className="admin-cell-mono">{r.durationMs}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
