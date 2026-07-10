import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowRight, ClipboardList, Layers3, Sparkles } from 'lucide-react';
import { auth } from '../config/firebase';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ORGANIZATIONAL_SCANS } from '../constants/organizationalScans';
import { createEmptyDiagnosticData, isSolutionPickReady } from '../constants/diagnosticFlow';
import { getInitialForm } from '../services/initialForm';
import {
  ORGANIZATIONAL_SCAN_DATA_KEY,
  parseOrganizationalScanData,
} from '../services/organizationalScanStorage';
import type { InitialFormData } from '../types';
import {
  getActiveFocusedScans,
  getScanCompletion,
  getScanStatus,
  getScanStatusLabel,
} from '../utils/organizationalScans';
import '../styles/organizational-scans.css';

export function OrganizationalScansHubPage() {
  const navigate = useViewTransitionNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<InitialFormData>(createEmptyDiagnosticData());

  const scanAnswers = useMemo(
    () => parseOrganizationalScanData(formData[ORGANIZATIONAL_SCAN_DATA_KEY]),
    [formData],
  );
  const activeScans = useMemo(
    () => getActiveFocusedScans(ORGANIZATIONAL_SCANS, scanAnswers),
    [scanAnswers],
  );
  const solutionPickReady = useMemo(() => isSolutionPickReady(formData), [formData]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getInitialForm(userId)
      .then(({ data }) => {
        if (!cancelled) setFormData(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <p className="form-loading">Carregando opções de diagnóstico...</p>;
  }

  return (
    <div className="organizational-scans-page">
      <header className="organizational-scans-hero sprint-wave-header">
        <div className="sprint-wave-title-group">
          <div className="sprint-wave-icon-wrapper" aria-hidden>
            <ClipboardList size={26} />
          </div>
          <div className="sprint-wave-title-copy">
            <span className="organizational-scan-card-step sprint-wave-eyebrow">SPRINT WAVES™ · Onda 1</span>
            <h1 className="premium-display sprint-wave-title">Diagnóstico</h1>
            <p className="sprint-wave-subtitle">
              Escolha o diagnóstico completo ou um scan focado para gerar o Solution Pick.
            </p>
          </div>
        </div>
      </header>

      <div className="diagnostic-path-grid" role="list">
        <article className="diagnostic-path-card is-primary">
          <div className="diagnostic-path-card-icon" aria-hidden>
            <Layers3 size={22} />
          </div>
          <h2>Diagnóstico completo</h2>
          <p>
            Canvas Sprint Waves e <strong>Solution Pick</strong>, com resumo executivo e planos
            priorizados.
          </p>
          <button
            type="button"
            className="diagnostic-primary-button"
            onClick={() => navigate('/dashboard/initial-form')}
          >
            Abrir diagnóstico completo
            <ArrowRight size={16} aria-hidden />
          </button>
        </article>

        <article className="diagnostic-path-card is-focused">
          <div className="diagnostic-path-card-icon" aria-hidden>
            <Sparkles size={22} />
          </div>
          <h2>Diagnóstico focado</h2>
          <p>
            Scan temático, mais rápido. Ao concluir, siga para o <strong>Solution Pick</strong>.
          </p>
          {solutionPickReady ? (
            <button
              type="button"
              className="diagnostic-secondary-button"
              onClick={() => navigate('/dashboard/solution-pick')}
            >
              Ir para Solution Pick
              <ArrowRight size={16} aria-hidden />
            </button>
          ) : null}
        </article>
      </div>

      {activeScans.length > 0 ? (
        <p className="diagnostic-path-active" role="status">
          Scans em andamento ou concluídos:{' '}
          {activeScans.map((scan) => scan.title).join(', ')}
        </p>
      ) : null}

      <section className="organizational-scans-picker" aria-labelledby="scan-picker-title">
        <h2 id="scan-picker-title">Escolha um tema para o diagnóstico focado</h2>
        <p className="organizational-scans-picker-lead">
          Selecione o scan que melhor representa o desafio atual. Ao concluir, você passa pelo Solution Pick
          com resumo da situação da empresa e escolha de planos para o Design.
        </p>

        <div className="organizational-scans-grid">
          {ORGANIZATIONAL_SCANS.filter((scan) => scan.id !== 'fullScan').map((scan) => {
            const answers = scanAnswers[scan.id] ?? {};
            const status = getScanStatus(scan, answers);
            const completion = getScanCompletion(scan, answers);
            const isSoon = Boolean(scan.comingSoon);

            return (
              <button
                key={scan.id}
                type="button"
                className={`organizational-scan-card ${status === 'complete' ? 'is-complete' : ''} ${
                  status === 'in_progress' ? 'is-active' : ''
                } ${isSoon ? 'is-soon' : ''}`}
                onClick={() => !isSoon && navigate(`/dashboard/scans/${scan.id}`)}
                disabled={isSoon}
              >
                <div className="organizational-scan-card-head">
                  <span className="organizational-scan-card-step">{scan.step}</span>
                  <span
                    className={`organizational-scan-card-badge ${
                      status === 'complete' ? 'complete' : status === 'in_progress' ? 'active' : ''
                    }`}
                  >
                    {isSoon ? 'Em breve' : getScanStatusLabel(status)}
                  </span>
                </div>
                <h3>{scan.title}</h3>
                <p>{scan.subtitle}</p>
                {!isSoon && status === 'in_progress' ? (
                  <span className="organizational-scan-card-meta">
                    {completion.answered} de {completion.total} perguntas
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="organizational-scan-actions mm-sticky-actions">
        <button
          type="button"
          className="diagnostic-secondary-button"
          onClick={() => navigate('/dashboard/inicio')}
        >
          <ClipboardList size={16} aria-hidden />
          Voltar ao início
        </button>
        {solutionPickReady ? (
          <button
            type="button"
            className="diagnostic-primary-button"
            onClick={() => navigate('/dashboard/solution-pick')}
          >
            Solution Pick
            <ArrowRight size={16} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
