import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { reportsApi } from '../services/api';

interface ReportStats {
  totalObjectives?: number;
  objectivesCompleted?: number;
  objectivesInProgress?: number;
  completionRate?: number;
  teamSize?: number;
  aiObjectives?: number;
}

interface ReportDetail {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  titulo?: string;
  conteudo?: string;
  resumo?: string;
  stats?: ReportStats;
  content?: Record<string, unknown>;
}

function normalizeReport(raw: Record<string, unknown>): ReportDetail {
  return {
    id: String(raw.id),
    title: String(raw.title ?? raw.titulo ?? 'Relatório'),
    type: String(raw.type ?? 'completo'),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    titulo: raw.titulo ? String(raw.titulo) : undefined,
    conteudo: raw.conteudo ? String(raw.conteudo) : undefined,
    resumo: raw.resumo ? String(raw.resumo) : undefined,
    stats: (raw.stats as ReportStats) || undefined,
    content: raw.content as Record<string, unknown> | undefined,
  };
}

export function RelatoriosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const autoGenerateHandled = useRef(false);
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.list();
      const list = (Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => normalizeReport(r));
      setReports(list);
    } catch {
      setError('Não foi possível carregar os relatórios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const report = await reportsApi.generate('completo');
      const normalized = normalizeReport(report as Record<string, unknown>);
      setReports((prev) => [normalized, ...prev]);
      setSelectedId(normalized.id);
      setDetail(normalized);
    } catch {
      setError('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    const state = location.state as { autoGenerate?: boolean } | null;
    if (!state?.autoGenerate || autoGenerateHandled.current) return;
    autoGenerateHandled.current = true;
    navigate(location.pathname, { replace: true, state: {} });
    void handleGenerate();
  }, [location, navigate, handleGenerate]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await reportsApi.get(id);
      setDetail(normalizeReport(data as Record<string, unknown>));
    } catch {
      setError('Não foi possível carregar o relatório.');
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadReport = () => {
    if (!detail?.conteudo) return;
    const blob = new Blob([detail.conteudo], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${detail.id}.md`;
    a.click();
  };

  if (selectedId && detail) {
    const stats = detail.stats;
    return (
      <div className="relatorios-page">
        <div className="relatorio-view-header">
          <button type="button" className="back-button" onClick={() => { setSelectedId(null); setDetail(null); }}>
            <ArrowLeft size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Voltar
          </button>
          <div className="relatorio-view-title-group">
            <h1 className="relatorio-view-title">{detail.titulo || detail.title}</h1>
            <span className="relatorio-view-date">
              {new Date(detail.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <button type="button" className="download-button" onClick={downloadReport}>
            <Download size={18} />
            Baixar
          </button>
        </div>

        {detailLoading ? (
          <div className="relatorios-loading">Carregando...</div>
        ) : (
          <div className="relatorio-content">
            {stats && (
              <section className="relatorio-section">
                <h2 className="relatorio-section-title">
                  <BarChart3 size={22} />
                  Estatísticas
                </h2>
                <div className="statistics-grid">
                  <div className="stat-card">
                    <div className="stat-icon-wrapper objectives">
                      <Target size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.totalObjectives ?? 0}</div>
                      <div className="stat-label">Objetivos totais</div>
                      <div className="stat-breakdown">
                        <span className="stat-item">Concluídos: {stats.objectivesCompleted ?? 0}</span>
                        <span className="stat-item">Em andamento: {stats.objectivesInProgress ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper conversations">
                      <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.completionRate ?? 0}%</div>
                      <div className="stat-label">Taxa de conclusão</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrapper team">
                      <Users size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.teamSize ?? 0}</div>
                      <div className="stat-label">Equipe ativa</div>
                      <div className="stat-breakdown">
                        <span className="stat-item">Objetivos IA: {stats.aiObjectives ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {detail.resumo && (
              <section className="relatorio-section">
                <h2 className="relatorio-section-title">
                  <Sparkles size={22} />
                  Resumo executivo
                </h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{detail.resumo}</p>
              </section>
            )}

            {detail.conteudo && (
              <section className="relatorio-section">
                <h2 className="relatorio-section-title">
                  <FileText size={22} />
                  Conteúdo completo
                </h2>
                <div className="message-text">
                  <ReactMarkdown>{detail.conteudo}</ReactMarkdown>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relatorios-page">
      <header className="relatorios-header">
        <div className="relatorios-header-content">
          <div className="relatorios-icon-wrapper">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="relatorios-title">Relatórios</h1>
            <p className="relatorios-subtitle">Gere e visualize relatórios estratégicos do seu negócio</p>
          </div>
        </div>
      </header>

      <section className="relatorios-generate-section">
        <h2 className="section-title">Gerar novo relatório</h2>
        <p className="section-description">
          O relatório consolida objetivos, equipe e progresso com análise consultiva.
        </p>
        <button type="button" className="generate-button" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 size={20} className="spinning" /> : <Sparkles size={20} />}
          {generating ? 'Gerando relatório...' : 'Gerar relatório completo'}
        </button>
      </section>

      {error && <div className="relatorios-error">{error}</div>}

      <section className="relatorios-list-section">
        <h2 className="section-title">Relatórios gerados</h2>
        {loading ? (
          <div className="relatorios-loading">
            <Loader2 size={32} className="spinning" />
            <p>Carregando relatórios...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="relatorios-empty">
            <FileText size={48} style={{ opacity: 0.4, marginBottom: 16 }} />
            <p>Nenhum relatório gerado ainda.</p>
          </div>
        ) : (
          <div className="relatorios-list">
            {reports.map((report) => (
              <article key={report.id} className="report-card">
                <div className="report-card-header">
                  <div className="report-icon-wrapper">
                    <FileText size={24} />
                  </div>
                  <div className="report-card-content">
                    <h3 className="report-card-title">{report.titulo || report.title}</h3>
                    <p className="report-card-date">
                      {new Date(report.createdAt).toLocaleString('pt-BR')}
                    </p>
                    {report.stats && (
                      <div className="report-card-stats">
                        <span className="report-stat">
                          {report.stats.totalObjectives ?? 0} objetivos
                        </span>
                        <span className="report-stat">
                          {report.stats.completionRate ?? 0}% conclusão
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="report-card-actions">
                  <button type="button" className="view-button" onClick={() => openDetail(report.id)}>
                    Ver detalhes
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
