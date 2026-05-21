import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Bot,
  Target,
  ArrowRight,
  FileText,
  Clock,
  Crosshair,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { getInitialForm } from '../services/initialForm';
import { objectivesApi, teamApi, reportsApi, activitiesApi } from '../services/api';
import { MagnusWavesProgress } from '../components/MagnusWavesProgress';
import { STAGE_DESCRIPTIONS, PRIORITY_LABELS, type InitialFormData, type Objective } from '../types';

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatActivityDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function activityIndicatorType(type: string): 'success' | 'info' {
  const t = type.toLowerCase();
  if (t.includes('report') || t.includes('relatorio') || t.includes('objective') || t.includes('objetivo')) {
    return 'success';
  }
  return 'info';
}

export function DashboardHome() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [formCompletedAt, setFormCompletedAt] = useState<Date | null>(null);
  const [formData, setFormData] = useState<InitialFormData | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [objectivesDone, setObjectivesDone] = useState(0);
  const [objectivesTotal, setObjectivesTotal] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [recommendations, setRecommendations] = useState<Objective[]>([]);
  const [activities, setActivities] = useState<{ action: string; date: string; type: string }[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setFormLoading(true);
    getInitialForm(userId)
      .then(({ data, completedAt }) => {
        if (!cancelled) {
          setFormData(data);
          setFormCompletedAt(completedAt);
        }
      })
      .finally(() => !cancelled && setFormLoading(false));
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setStatsLoading(true);
    Promise.all([
      objectivesApi.list(),
      teamApi.list(),
      reportsApi.list(),
      activitiesApi.list({ limit: '5' }),
    ])
      .then(([objs, team, reports, acts]) => {
        if (cancelled) return;
        const list = Array.isArray(objs) ? objs : objs?.items ?? [];
        const done = list.filter((o: Objective) => o.status === 'concluido').length;
        setObjectivesDone(done);
        setObjectivesTotal(list.length);
        const open = list
          .filter((o: Objective) => o.status !== 'concluido')
          .sort((a: Objective, b: Objective) => {
            const order = { alta: 0, media: 1, baixa: 2 };
            return (order[a.prioridade] ?? 1) - (order[b.prioridade] ?? 1);
          })
          .slice(0, 6);
        setRecommendations(open);
        setTeamCount(Array.isArray(team) ? team.length : team?.items?.length ?? 0);
        setReportsCount(Array.isArray(reports) ? reports.length : 0);
        const actList = Array.isArray(acts) ? acts : acts?.items ?? [];
        setActivities(
          actList.slice(0, 5).map((a: { title?: string; type?: string; createdAt?: string }) => ({
            action: a.title || 'Atividade',
            date: formatActivityDate(a.createdAt),
            type: activityIndicatorType(a.type || ''),
          }))
        );
      })
      .finally(() => !cancelled && setStatsLoading(false));
    return () => { cancelled = true; };
  }, [userId]);

  const formComplete = !!formCompletedAt;

  return (
    <div className="dashboard-home">
      <div className="dashboard-home-header">
        <div>
          <h1 className="dashboard-home-title">People Sprint — Magnus Mind</h1>
          <p className="dashboard-home-subtitle">
            Clareza para agir, estrutura para sustentar. Diagnóstico → Design → Difusão → Domínio.
          </p>
        </div>
      </div>

      <MagnusWavesProgress
        progress={{
          formComplete,
          objectivesTotal,
          reportsCount,
        }}
      />

      <div className="dashboard-home-grid">
        <div className="dashboard-card status-card">
          <div className="card-header">
            <div className={`card-icon-wrapper ${formComplete ? 'success' : 'warning'}`}>
              {formComplete ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            </div>
            <div className="card-title-group">
              <h3 className="card-title">Diagnóstico</h3>
              <span className={`card-status-badge ${formComplete ? 'completed' : 'incomplete'}`}>
                {formLoading ? '...' : formComplete ? 'Completo' : 'Incompleto'}
              </span>
            </div>
          </div>
          <div className="card-content">
            <p className="card-description">
              {formLoading
                ? 'Carregando...'
                : formComplete && formCompletedAt
                  ? `Seu formulário foi completado em ${formatDate(formCompletedAt)}`
                  : 'Complete o diagnóstico antes de priorizar soluções — sem verdade, toda ação vira ruído.'}
            </p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${formComplete ? 100 : 0}%` }} />
            </div>
            <button type="button" className="card-action-button" onClick={() => navigate('/dashboard/initial-form')}>
              {formComplete ? 'Ver formulário' : 'Completar formulário'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="dashboard-card stage-card">
          <div className="card-header">
            <div className="card-icon-wrapper info">
              <TrendingUp size={24} />
            </div>
            <div className="card-title-group">
              <h3 className="card-title">Estágio do Negócio</h3>
            </div>
          </div>
          <div className="card-content">
            {formLoading ? (
              <p className="card-description">Carregando...</p>
            ) : formData?.estagioNegocio ? (
              <>
                <div className="stage-badge">{formData.estagioNegocio}</div>
                <p className="card-description">
                  {STAGE_DESCRIPTIONS[formData.estagioNegocio] ?? 'Definido no formulário inicial.'}
                </p>
              </>
            ) : (
              <p className="card-description">
                Complete o formulário inicial para definir o estágio do seu negócio.
              </p>
            )}
          </div>
        </div>

        <div className="dashboard-card stats-card">
          <div className="card-header">
            <div className="card-icon-wrapper primary">
              <BarChart3 size={24} />
            </div>
            <div className="card-title-group">
              <h3 className="card-title">Estatísticas</h3>
            </div>
          </div>
          <div className="card-content">
            {statsLoading ? (
              <p className="card-description">Carregando...</p>
            ) : (
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{objectivesDone}/{objectivesTotal}</div>
                  <div className="stat-label">Objetivos</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{teamCount}</div>
                  <div className="stat-label">Equipe</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{reportsCount}</div>
                  <div className="stat-label">Relatórios</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header-row">
          <div className="section-title-group">
            <Lightbulb size={24} className="section-icon" />
            <h2 className="section-title">Recomendações</h2>
          </div>
          <p className="section-inline-subtitle">
            Objetivos em aberto — priorize as ações com base na análise do seu negócio
          </p>
        </div>
        {statsLoading ? (
          <div className="activity-list-loading">
            <p>Carregando recomendações...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="activity-list-empty">
            <p>Nenhum objetivo em aberto. Conclua o Design (MM Blueprint) e inicie a Difusão em Objetivos.</p>
          </div>
        ) : (
          <div className="recommendations-grid">
            {recommendations.map((obj) => (
              <button
                key={obj.id}
                type="button"
                className="recommendation-card recommendation-card-clickable"
                onClick={() => navigate('/dashboard/objetivos')}
              >
                <div className="recommendation-header">
                  <h4 className="recommendation-title">{obj.titulo}</h4>
                  <span className={`priority-badge ${obj.prioridade}`}>
                    {PRIORITY_LABELS[obj.prioridade]}
                  </span>
                </div>
                <p className="recommendation-description">{obj.descricao}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="section-header-row">
          <div className="section-title-group">
            <Crosshair size={24} className="section-icon" />
            <h2 className="section-title">Ações Rápidas</h2>
          </div>
        </div>
        <div className="quick-actions-grid">
          <Link to="/dashboard/initial-form" className="quick-action-card">
            <FileText size={32} className="action-icon" />
            <span className="action-label">Human-to-Business Canvas</span>
          </Link>
          <Link to="/dashboard/consultoria-ia" className="quick-action-card">
            <Bot size={32} className="action-icon" />
            <span className="action-label">MM Blueprint (IA)</span>
          </Link>
          <Link
            to="/dashboard/objetivos"
            state={{ openCreateModal: true }}
            className="quick-action-card"
          >
            <Target size={32} className="action-icon" />
            <span className="action-label">Difusão — Novo objetivo</span>
          </Link>
          <Link
            to="/dashboard/relatorios"
            state={{ autoGenerate: true }}
            className="quick-action-card"
          >
            <BarChart3 size={32} className="action-icon" />
            <span className="action-label">MID — Kirkpatrick 4</span>
          </Link>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header-row">
          <div className="section-title-group">
            <Clock size={24} className="section-icon" />
            <h2 className="section-title">Atividade Recente</h2>
          </div>
        </div>
        {statsLoading ? (
          <div className="activity-list-loading">
            <p>Carregando atividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="activity-list-empty">
            <p>Assim que você realizar ações no sistema, elas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((act, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-indicator ${act.type === 'success' ? 'success' : 'info'}`} />
                <div className="activity-content">
                  <p className="activity-action">{act.action}</p>
                  <span className="activity-date">{act.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
