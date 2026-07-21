import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  Download,
  Waves,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { useCycle } from '../context/CycleContext';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ORGANIZATIONAL_SCANS } from '../constants/organizationalScans';
import { createEmptyDiagnosticData, isPhasesThroughTeamScanComplete, isSolutionPickReady, getDiagnosticCompletion } from '../constants/diagnosticFlow';
import { getInitialForm } from '../services/initialForm';
import {
  ORGANIZATIONAL_SCAN_DATA_KEY,
  parseOrganizationalScanData,
} from '../services/organizationalScanStorage';
import { readStashedEvolution } from '../services/evolutionLoopStorage';
import type { InitialFormData } from '../types';
import type { EvolutionLoopResult } from '../types/evolutionLoop';
import {
  buildCycleBriefingText,
  downloadTextFile,
  suggestScansForFocus,
} from '../utils/cycleBriefing';
import {
  getActiveFocusedScans,
  getScanCompletion,
  getScanStatus,
  getScanStatusLabel,
} from '../utils/organizationalScans';
import { PhaseInfoButton } from '../components/ui/PhaseInfoButton';
import { PhaseLockBanner } from '../components/ui/PhaseLockBanner';
import { usePhaseLock } from '../hooks/usePhaseLock';
import '../styles/organizational-scans.css';

type ScansLocationState = {
  fromEvolutionLoop?: boolean;
  fromNewCycle?: boolean;
} | null;

export function OrganizationalScansHubPage() {
  const navigate = useViewTransitionNavigate();
  const location = useLocation();
  const { activeCycle } = useCycle();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<InitialFormData>(createEmptyDiagnosticData());
  const [evolution, setEvolution] = useState<EvolutionLoopResult | null>(null);

  const locationState = location.state as ScansLocationState;
  const cycleNumber = activeCycle?.cycleNumber ?? 1;
  const previousCycleNumber = Math.max(1, cycleNumber - 1);
  const isVersionTwoPlus = cycleNumber >= 2 || Boolean(locationState?.fromEvolutionLoop) || Boolean(evolution);
  const { locks, setLocks, cycle } = usePhaseLock('diagnostic');

  const scanAnswers = useMemo(
    () => parseOrganizationalScanData(formData[ORGANIZATIONAL_SCAN_DATA_KEY]),
    [formData],
  );
  const activeScans = useMemo(
    () => getActiveFocusedScans(ORGANIZATIONAL_SCANS, scanAnswers),
    [scanAnswers],
  );
  const solutionPickReady = useMemo(() => isSolutionPickReady(formData), [formData]);
  const scanSuggestions = useMemo(
    () => (evolution ? suggestScansForFocus(evolution.nextWave.focus) : []),
    [evolution],
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    setEvolution(readStashedEvolution());
  }, [activeCycle?.id, location.key]);

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

  const handleDownloadBriefing = () => {
    if (!evolution) return;
    const text = buildCycleBriefingText(evolution, previousCycleNumber, cycleNumber);
    downloadTextFile(`sprint-briefing-ciclo-${cycleNumber}.txt`, text);
  };

  if (loading) {
    return <p className="form-loading">Carregando opções de diagnóstico...</p>;
  }

  return (
    <div className="organizational-scans-page">
      <PhaseLockBanner
        phase="diagnostic"
        locks={locks}
        cycle={cycle}
        onLocksChange={setLocks}
      />
      <header className="organizational-scans-hero sprint-wave-header">
        <div className="sprint-wave-title-group">
          <div className="sprint-wave-icon-wrapper" aria-hidden>
            <ClipboardList size={26} />
          </div>
          <div className="sprint-wave-title-copy">
            <span className="organizational-scan-card-step sprint-wave-eyebrow">
              SPRINT WAVES™ · Onda {cycleNumber}
            </span>
            <div className="design-plans-title-row organizational-scans-title-row">
              <h1 className="premium-display sprint-wave-title">Diagnóstico</h1>
              <PhaseInfoButton title="Como escolher o diagnóstico">
                <p>
                  Escolha o caminho de diagnóstico que alimenta o Solution Pick. Em ambos, ao
                  concluir você segue para planos de ação dentro da sua esfera de influência.
                </p>
                <ul>
                  <li>
                    <strong>Completo (~90 min)</strong> — canvas Sprint Waves com profundidade
                    máxima
                  </li>
                  <li>
                    <strong>Focado</strong> — scan temático mais rápido, incluindo SWOT Analysis
                  </li>
                </ul>
              </PhaseInfoButton>
            </div>
            <p className="sprint-wave-subtitle">
              {isVersionTwoPlus
                ? 'Use os aprendizados do ciclo anterior para escolher o diagnóstico completo ou um scan focado.'
                : 'Escolha o diagnóstico completo ou um scan focado para gerar o Solution Pick.'}
            </p>
          </div>
        </div>
      </header>

      <section className="organizational-scans-picker" aria-labelledby="scan-picker-title">
        <h2 id="scan-picker-title">Escolha um tema para o diagnóstico</h2>
        <p className="organizational-scans-picker-lead">
          Selecione o scan que melhor representa o desafio atual. Ao concluir, você passa pelo
          Solution Pick com resumo da situação da empresa e escolha de planos para o Design.
        </p>
      </section>

      {evolution && isVersionTwoPlus ? (
        <section className="cycle-briefing" aria-labelledby="cycle-briefing-title">
          <div className="cycle-briefing-head">
            <div>
              <p className="cycle-briefing-eyebrow">
                <Waves size={14} aria-hidden />
                Versão {cycleNumber}.0 · Loop contínuo
              </p>
              <h2 id="cycle-briefing-title">
                O que aprendemos no ciclo {previousCycleNumber}.0
              </h2>
            </div>
            <button
              type="button"
              className="cycle-briefing-download"
              onClick={handleDownloadBriefing}
            >
              <Download size={16} aria-hidden />
              Baixar resumo
            </button>
          </div>

          <p className="cycle-briefing-summary">{evolution.summary}</p>

          <div className="cycle-briefing-focus">
            <p className="cycle-briefing-focus-label">Foco sugerido para este ciclo</p>
            <h3>{evolution.nextWave.title}</h3>
            <p>
              <strong>{evolution.nextWave.focus}</strong>
            </p>
            <p>{evolution.nextWave.rationale}</p>
          </div>

          <div className="cycle-briefing-columns">
            <article>
              <h3>Continuar</h3>
              <ul>
                {evolution.continuar.length > 0 ? (
                  evolution.continuar.map((item) => (
                    <li key={`keep-${item.practice}`}>
                      <strong>{item.practice}</strong>
                      {item.rationale ? <span>{item.rationale}</span> : null}
                    </li>
                  ))
                ) : (
                  <li className="is-empty">Nenhuma prática destacada.</li>
                )}
              </ul>
            </article>
            <article>
              <h3>Ajustar</h3>
              <ul>
                {evolution.ajustar.length > 0 ? (
                  evolution.ajustar.map((item) => (
                    <li key={`adj-${item.practice}`}>
                      <strong>{item.practice}</strong>
                      {item.rationale ? <span>{item.rationale}</span> : null}
                    </li>
                  ))
                ) : (
                  <li className="is-empty">Nenhum ajuste prioritário.</li>
                )}
              </ul>
            </article>
            <article>
              <h3>Abandonar</h3>
              <ul>
                {evolution.abandonar.length > 0 ? (
                  evolution.abandonar.map((item) => (
                    <li key={`drop-${item.practice}`}>
                      <strong>{item.practice}</strong>
                      {item.rationale ? <span>{item.rationale}</span> : null}
                    </li>
                  ))
                ) : (
                  <li className="is-empty">Nenhuma prática para encerrar.</li>
                )}
              </ul>
            </article>
          </div>

          {scanSuggestions.length > 0 ? (
            <div className="cycle-briefing-suggestions">
              <h3>Diagnósticos sugeridos agora</h3>
              <ul>
                {scanSuggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/scans/${suggestion.id}`)}
                    >
                      {suggestion.title}
                      <ArrowRight size={14} aria-hidden />
                    </button>
                    <span>{suggestion.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="cycle-briefing-rag-note">
                A memória RAG do projeto permanece ativa: o Solution Pick e a IA usam o contexto
                acumulado dos ciclos anteriores para personalizar recomendações.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeScans.length > 0 ? (
        <p className="diagnostic-path-active" role="status">
          Scans em andamento ou concluídos:{' '}
          {activeScans.map((scan) => scan.title).join(', ')}
        </p>
      ) : null}

      <div className="organizational-scans-grid">
        {ORGANIZATIONAL_SCANS.map((scan) => {
            const isFullScan = scan.id === 'fullScan';
            const answers = scanAnswers[scan.id] ?? {};
            const canvasComplete = isPhasesThroughTeamScanComplete(formData);
            const canvasProgress = getDiagnosticCompletion(formData);
            const status = isFullScan
              ? canvasComplete
                ? 'complete'
                : canvasProgress.requiredPercent > 0
                  ? 'in_progress'
                  : 'not_started'
              : getScanStatus(scan, answers);
            const completion = isFullScan
              ? {
                  answered: canvasProgress.requiredAnswered,
                  total: canvasProgress.requiredTotal,
                }
              : getScanCompletion(scan, answers);
            const isSoon = Boolean(scan.comingSoon);
            const isSuggested = !isFullScan && scanSuggestions.some((s) => s.id === scan.id);

            return (
              <button
                key={scan.id}
                type="button"
                className={`organizational-scan-card ${isFullScan ? 'is-full-scan' : ''} ${
                  status === 'complete' ? 'is-complete' : ''
                } ${status === 'in_progress' ? 'is-active' : ''} ${isSoon ? 'is-soon' : ''} ${
                  isSuggested ? 'is-suggested' : ''
                }`}
                onClick={() => {
                  if (isSoon) return;
                  if (isFullScan) {
                    navigate('/dashboard/initial-form');
                    return;
                  }
                  navigate(`/dashboard/scans/${scan.id}`);
                }}
                disabled={isSoon}
              >
                <div className="organizational-scan-card-head">
                  <span className="organizational-scan-card-step">{scan.step}</span>
                  <span
                    className={`organizational-scan-card-badge ${
                      status === 'complete' ? 'complete' : status === 'in_progress' ? 'active' : ''
                    }`}
                  >
                    {isSoon
                      ? 'Em breve'
                      : isSuggested
                        ? 'Sugerido'
                        : isFullScan && status === 'not_started'
                          ? 'Canvas'
                          : getScanStatusLabel(status)}
                  </span>
                </div>
                <h3>{scan.title}</h3>
                <p>{scan.subtitle}</p>
                <div className="organizational-scan-card-meta-row">
                  {typeof scan.estimatedMinutes === 'number' ? (
                    <span className="organizational-scan-card-minutes">
                      <Clock3 size={13} aria-hidden />~{scan.estimatedMinutes} min
                    </span>
                  ) : null}
                  {!isSoon && status === 'in_progress' && completion.total > 0 ? (
                    <span className="organizational-scan-card-meta">
                      {completion.answered} de {completion.total} perguntas
                    </span>
                  ) : null}
                </div>
                {scan.guidance || scan.intro ? (
                  <span
                    className="organizational-scan-card-info"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <PhaseInfoButton title={scan.title} label="Info">
                      <p>{scan.intro}</p>
                      {scan.guidance
                        ? scan.guidance.split('\n\n').map((para) => (
                            <p key={para.slice(0, 24)}>{para}</p>
                          ))
                        : null}
                    </PhaseInfoButton>
                  </span>
                ) : null}
              </button>
            );
          })}
      </div>

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
