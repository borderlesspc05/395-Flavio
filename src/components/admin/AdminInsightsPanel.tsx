import { AdminBarChart } from './AdminBarChart';
import { AdminCollapsibleSection } from './AdminCollapsibleSection';
import { AdminTableToolbar } from './AdminTableToolbar';
import type { AdminClientAnalytics } from '../../services/adminApi';
import { useAdminTable } from '../../hooks/useAdminTable';

type Props = {
  analytics: AdminClientAnalytics;
  onSelectUser?: (userId: string, userName?: string) => void;
};

export function AdminInsightsPanel({ analytics, onSelectUser }: Props) {
  const table = useAdminTable(analytics.recentChallenges, {
    pageSize: 10,
    filterFn: (row, q) =>
      (row.organization ?? '').toLowerCase().includes(q) ||
      (row.stage ?? '').toLowerCase().includes(q) ||
      row.challenge.toLowerCase().includes(q) ||
      row.categories.some((c) => c.toLowerCase().includes(q)),
  });

  return (
    <div className="admin-panel-stack">
      <AdminCollapsibleSection
        title="Distribuição dos diagnósticos"
        subtitle={`${analytics.diagnostics.formsTotal} iniciados · ${analytics.diagnostics.formsCompleted} concluídos · ${analytics.diagnostics.cyclesActive} ciclos ativos`}
        defaultOpen={false}
      >
        <section className="admin-charts-grid admin-charts-grid--compact">
          <AdminBarChart
            title="Tipo de problema mais citado"
            subtitle="Campo “Esse desafio é mais relacionado a quê?”"
            items={analytics.challengeCategories.map((r) => ({ label: r.label, count: r.count }))}
            accent="bronze"
            maxItems={8}
          />
          <AdminBarChart
            title="Estágio do negócio"
            subtitle="Distribuição entre clientes com diagnóstico"
            items={analytics.businessStages.map((r) => ({ label: r.label, count: r.count }))}
            accent="warm"
            maxItems={8}
          />
          <AdminBarChart
            title="Natureza do problema (Gap Scan)"
            subtitle="“O problema parece ser mais de…”"
            items={analytics.problemNature.map((r) => ({ label: r.label, count: r.count }))}
            accent="bronze"
            maxItems={8}
          />
        </section>
      </AdminCollapsibleSection>

      <section className="admin-card admin-card--table">
        <header className="admin-card-head">
          <h2>Desafios relatados</h2>
          <p>Busca local com paginação — texto real do diagnóstico</p>
        </header>

        <AdminTableToolbar
          query={table.query}
          onQueryChange={table.setQuery}
          queryPlaceholder="Organização, estágio ou desafio…"
          page={table.page}
          totalPages={table.totalPages}
          rangeStart={table.rangeStart}
          rangeEnd={table.rangeEnd}
          totalCount={table.filteredCount}
          onPageChange={table.setPage}
        />

        <div className="admin-table-wrap admin-table-wrap--dense">
          <table className="admin-table admin-table--insights admin-table--dense">
            <thead>
              <tr>
                <th>Organização</th>
                <th>Estágio</th>
                <th>Desafio principal</th>
                <th>Categorias</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {table.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhum diagnóstico com desafio preenchido.</td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={`${row.userId}-${row.challenge.slice(0, 24)}`}>
                    <td>{row.organization ?? '—'}</td>
                    <td>{row.stage ?? '—'}</td>
                    <td className="admin-cell-challenge">{row.challenge}</td>
                    <td>
                      {row.categories.length > 0 ? (
                        <span className="admin-tag-list">
                          {row.categories.slice(0, 3).map((c) => (
                            <span key={c} className="admin-type-pill">
                              {c}
                            </span>
                          ))}
                          {row.categories.length > 3 ? (
                            <span className="admin-type-pill">+{row.categories.length - 3}</span>
                          ) : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {onSelectUser ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          onClick={() => onSelectUser(row.userId)}
                        >
                          Ver
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
