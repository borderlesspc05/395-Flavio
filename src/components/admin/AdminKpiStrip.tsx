import type { AdminDashboard } from '../../services/adminApi';

type TabId = 'users' | 'requests' | 'insights' | 'settings' | 'support';

type Props = {
  tab: TabId;
  summary: AdminDashboard['summary'];
};

export function AdminKpiStrip({ tab, summary }: Props) {
  if (tab === 'requests') {
    return (
      <section className="admin-kpi-row admin-kpi-row--tab">
        <article className="admin-kpi">
          <div>
            <strong>{summary.totalRequests}</strong>
            <span>Requisições totais</span>
          </div>
        </article>
        <article className="admin-kpi admin-kpi--highlight">
          <div>
            <strong className="admin-kpi-text">{summary.topRequestTypeLabel}</strong>
            <span>Tipo mais usado</span>
          </div>
        </article>
        <article className="admin-kpi">
          <div>
            <strong>{summary.errorRatePercent}%</strong>
            <span>Taxa de erro</span>
          </div>
        </article>
        <article className="admin-kpi">
          <div>
            <strong>{summary.avgDurationMs}ms</strong>
            <span>Tempo médio</span>
          </div>
        </article>
      </section>
    );
  }

  if (tab === 'insights') {
    return (
      <section className="admin-kpi-row admin-kpi-row--tab">
        <article className="admin-kpi admin-kpi--highlight">
          <div>
            <strong className="admin-kpi-text">{summary.topChallengeCategory}</strong>
            <span>Problema mais citado</span>
          </div>
        </article>
        <article className="admin-kpi">
          <div>
            <strong>{summary.diagnosticsCompleted}</strong>
            <span>Diagnósticos concluídos</span>
          </div>
        </article>
        <article className="admin-kpi">
          <div>
            <strong className="admin-kpi-text">{summary.topSubjectLabel}</strong>
            <span>Módulo mais usado</span>
          </div>
        </article>
      </section>
    );
  }

  if (tab === 'users') {
    return (
      <section className="admin-kpi-row admin-kpi-row--tab">
        <article className="admin-kpi">
          <div>
            <strong>{summary.totalUsers}</strong>
            <span>Usuários cadastrados</span>
          </div>
        </article>
        <article className="admin-kpi">
          <div>
            <strong>{summary.activeSubscriptions}</strong>
            <span>Assinaturas ativas</span>
          </div>
        </article>
      </section>
    );
  }

  return null;
}
