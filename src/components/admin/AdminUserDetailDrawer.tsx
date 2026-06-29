import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { adminApi, type AdminUserDetail } from '../../services/adminApi';
import { PLAN_LABELS } from '../../constants/plans';
import type { PlanId } from '../../constants/plans';

type Props = {
  userId: string | null;
  userName?: string;
  onClose: () => void;
};

export function AdminUserDetailDrawer({ userId, userName, onClose }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    adminApi
      .getUserDetail(userId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o cliente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  const title =
    detail?.profile?.displayName ||
    detail?.profile?.email ||
    userName ||
    'Cliente';

  return (
    <div className="admin-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="admin-drawer"
        role="dialog"
        aria-label={`Detalhes de ${title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-drawer-head">
          <div>
            <p className="admin-eyebrow">Cliente</p>
            <h2>{title}</h2>
            {detail?.profile?.email ? <p className="admin-drawer-sub">{detail.profile.email}</p> : null}
          </div>
          <button type="button" className="admin-drawer-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        {loading ? (
          <div className="admin-drawer-loading">
            <Loader2 size={24} className="admin-spin" />
            <span>Carregando…</span>
          </div>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : detail ? (
          <div className="admin-drawer-body">
            <section className="admin-drawer-section">
              <h3>Plano & uso</h3>
              <dl className="admin-dl">
                <div>
                  <dt>Plano</dt>
                  <dd>{PLAN_LABELS[detail.plan.planId as PlanId] ?? detail.plan.planName}</dd>
                </div>
                <div>
                  <dt>Assinatura</dt>
                  <dd>{detail.plan.hasActiveSubscription ? 'Ativa' : 'Sem assinatura ativa'}</dd>
                </div>
                <div>
                  <dt>Requisições (total)</dt>
                  <dd>{detail.profile?.requestCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Projetos ativos</dt>
                  <dd>
                    {detail.plan.maxOpenCycles == null
                      ? 'Ilimitado'
                      : detail.plan.maxOpenCycles === 1
                        ? '1 projeto'
                        : `${detail.plan.maxOpenCycles} projetos`}
                  </dd>
                </div>
                <div>
                  <dt>IA em paralelo</dt>
                  <dd>
                    {detail.plan.concurrencyLimit == null
                      ? 'Ilimitado'
                      : `${detail.plan.concurrencyLimit} operação(ões)`}
                  </dd>
                </div>
                <div>
                  <dt>Último acesso</dt>
                  <dd>
                    {detail.profile?.lastSeenAt
                      ? new Date(detail.profile.lastSeenAt).toLocaleString('pt-BR')
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {detail.diagnostic ? (
              <section className="admin-drawer-section">
                <h3>Diagnóstico</h3>
                <dl className="admin-dl">
                  {detail.diagnostic.organization ? (
                    <div>
                      <dt>Organização</dt>
                      <dd>{detail.diagnostic.organization}</dd>
                    </div>
                  ) : null}
                  {detail.diagnostic.stage ? (
                    <div>
                      <dt>Estágio</dt>
                      <dd>{detail.diagnostic.stage}</dd>
                    </div>
                  ) : null}
                  {detail.diagnostic.mainChallenge ? (
                    <div className="admin-dl--block">
                      <dt>Desafio principal</dt>
                      <dd>{detail.diagnostic.mainChallenge}</dd>
                    </div>
                  ) : null}
                  {detail.diagnostic.challengeCategories?.length ? (
                    <div>
                      <dt>Categorias</dt>
                      <dd>{detail.diagnostic.challengeCategories.join(', ')}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section className="admin-drawer-section">
              <h3>Atividade no produto</h3>
              <div className="admin-mini-stats">
                <span>{detail.counts.objectives} objetivos</span>
                <span>{detail.counts.actionCanvases} action canvas</span>
                <span>{detail.counts.reports} relatórios</span>
                <span>{detail.counts.conversations} conversas IA</span>
              </div>
              {detail.cycles.length > 0 ? (
                <ul className="admin-cycle-list">
                  {detail.cycles.map((c) => (
                    <li key={c.id}>
                      <strong>{c.label}</strong>
                      <span>{c.status}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {detail.gate && !detail.gate.skipped ? (
              <section className="admin-drawer-section">
                <h3>Gate Zero</h3>
                <p>
                  Caminho: <strong>{detail.gate.selectedPath ?? detail.gate.aiRecommendedPath ?? '—'}</strong>
                </p>
                {detail.gate.rationale ? <p className="admin-drawer-muted">{detail.gate.rationale}</p> : null}
              </section>
            ) : null}

            <section className="admin-drawer-section">
              <h3>Últimas requisições</h3>
              {detail.recentRequests.length === 0 ? (
                <p className="admin-drawer-muted">Nenhuma requisição registrada.</p>
              ) : (
                <ul className="admin-req-list">
                  {detail.recentRequests.slice(0, 12).map((r) => (
                    <li key={r.id}>
                      <span>{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                      <span>{r.typeLabel}</span>
                      <span className={r.statusCode >= 400 ? 'is-error' : ''}>
                        {r.statusCode} · {r.durationMs}ms
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
