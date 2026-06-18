import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowRight, ClipboardList, Layers3, Sparkles } from 'lucide-react';
import { auth } from '../config/firebase';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ORGANIZATIONAL_SCANS } from '../constants/organizationalScans';
import { createEmptyDiagnosticData } from '../constants/diagnosticFlow';
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

  const hubIntro = ORGANIZATIONAL_SCANS[0];
  const scanAnswers = useMemo(
    () => parseOrganizationalScanData(formData[ORGANIZATIONAL_SCAN_DATA_KEY]),
    [formData],
  );
  const activeScans = useMemo(
    () => getActiveFocusedScans(ORGANIZATIONAL_SCANS, scanAnswers),
    [scanAnswers],
  );

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
      <header className="organizational-scans-hero">
        <p className="organizational-scan-card-step">Diagnóstico organizacional</p>
        <h1 className="premium-display">Como você quer diagnosticar?</h1>
        <p>{hubIntro.intro}</p>
        {hubIntro.guidance ? <p>{hubIntro.guidance}</p> : null}
      </header>

      <div className="diagnostic-path-grid" role="list">
        <article className="diagnostic-path-card">
          <div className="diagnostic-path-card-icon" aria-hidden>
            <Layers3 size={22} />
          </div>
          <h2>Diagnóstico completo</h2>
          <p>Canvas Magnus Waves 1.1 a 1.5. Mais profundo, com múltiplas fases e lentes de análise.</p>
          <button
            type="button"
            className="diagnostic-primary-button"
            onClick={() => navigate('/dashboard/initial-form')}
          >
            Abrir canvas completo
            <ArrowRight size={16} aria-hidden />
          </button>
        </article>

        <article className="diagnostic-path-card is-focused">
          <div className="diagnostic-path-card-icon" aria-hidden>
            <Sparkles size={22} />
          </div>
          <h2>Diagnóstico focado</h2>
          <p>
            Um scan temático substitui o canvas quando você precisa de algo mais rápido. Escolha apenas o tema
            prioritário.
          </p>
          <p className="diagnostic-path-card-note">Não é obrigatório responder todos os scans abaixo.</p>
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
          Selecione o scan que melhor representa o desafio atual. Você pode responder um por vez e concluir o
          ciclo com aquele que fizer mais sentido.
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

      <div className="organizational-scan-actions">
        <button
          type="button"
          className="diagnostic-secondary-button"
          onClick={() => navigate('/dashboard/inicio')}
        >
          <ClipboardList size={16} aria-hidden />
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
