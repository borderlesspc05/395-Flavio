import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowRight, CheckCircle, X } from 'lucide-react';
import { auth } from '../config/firebase';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { getInitialForm } from '../services/initialForm';
import { actionCanvasesApi, objectivesApi, teamApi, reportsApi } from '../services/api';
import type { ActionCanvas, InitialFormData, Objective, TeamMember } from '../types';
import { MidDashboard } from '../components/mid/MidDashboard';
import { useCycle } from '../context/CycleContext';
import { buildMidDashboard, getWaveProgressForMid } from '../services/midDashboard';
import type { MidDashboardData } from '../types/mid';

export function DashboardHome() {
  const { activeCycle } = useCycle();
  const location = useLocation();
  const navigate = useViewTransitionNavigate();
  const locationState = location.state as
    | {
        postDiagnosticNotice?: {
          title: string;
          message: string;
          nextStepLabel?: string;
          completedAt?: string;
        };
      }
    | undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [postDiagnosticNotice, setPostDiagnosticNotice] = useState(
    () => locationState?.postDiagnosticNotice ?? null
  );
  const [formCompletedAt, setFormCompletedAt] = useState<Date | null>(null);
  const [formData, setFormData] = useState<InitialFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [canvases, setCanvases] = useState<ActionCanvas[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [reports, setReports] = useState<
    Array<{
      resumo?: string;
      stats?: {
        completionRate?: number;
        objectivesCompleted?: number;
        totalObjectives?: number;
        teamSize?: number;
      };
    }>
  >([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!locationState?.postDiagnosticNotice) return;
    setPostDiagnosticNotice(locationState.postDiagnosticNotice);
    navigate('/dashboard/inicio', { replace: true });
  }, [locationState, navigate]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getInitialForm(userId),
      objectivesApi.list(),
      teamApi.list(),
      reportsApi.list(),
      actionCanvasesApi.list().catch(() => []),
    ])
      .then(([form, objs, teamRes, reportsRes, canvasRes]) => {
        if (cancelled) return;
        setFormData(form.data);
        setFormCompletedAt(form.completedAt);
        const objList = Array.isArray(objs) ? objs : objs?.items ?? [];
        setObjectives(objList);
        setTeam(Array.isArray(teamRes) ? teamRes : teamRes?.items ?? []);
        const reportList = Array.isArray(reportsRes) ? reportsRes : [];
        setReports(
          reportList.map((r) => ({
            resumo: r.resumo,
            stats: r.stats,
          }))
        );
        setCanvases((Array.isArray(canvasRes) ? canvasRes : []) as ActionCanvas[]);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const midData: MidDashboardData = useMemo(
    () =>
      buildMidDashboard({
        formData,
        formComplete: !!formCompletedAt,
        cycleId: activeCycle?.id,
        cycleLabel: activeCycle?.label,
        objectives,
        canvases,
        team,
        reports,
      }),
    [formData, formCompletedAt, activeCycle?.id, activeCycle?.label, objectives, canvases, team, reports]
  );

  const waveChips = useMemo(
    () =>
      getWaveProgressForMid({
        formComplete: !!formCompletedAt,
        objectivesTotal: objectives.length,
        reportsCount: reports.length,
      }),
    [formCompletedAt, objectives.length, reports.length]
  );

  return (
    <div className="dashboard-home dashboard-home--mid">
      {postDiagnosticNotice && (
        <div className="dashboard-post-submit-banner" role="status" aria-live="polite">
          <div className="dashboard-post-submit-content">
            <div className="dashboard-post-submit-icon" aria-hidden>
              <CheckCircle size={22} />
            </div>
            <div className="dashboard-post-submit-text">
              <h3>{postDiagnosticNotice.title}</h3>
              <p>{postDiagnosticNotice.message}</p>
              {postDiagnosticNotice.nextStepLabel && (
                <span className="dashboard-post-submit-next-step">
                  {postDiagnosticNotice.nextStepLabel}
                </span>
              )}
            </div>
          </div>
          <div className="dashboard-post-submit-actions">
            <button
              type="button"
              className="dashboard-post-submit-btn"
              onClick={() => navigate('/dashboard/design')}
            >
              Ir para Design
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="dashboard-post-submit-close"
              onClick={() => setPostDiagnosticNotice(null)}
              aria-label="Fechar aviso de confirmação"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <nav className="mid-wave-strip" aria-label="Progresso Magnus Waves">
        {waveChips.map((wave) => (
          <span
            key={wave.id}
            className={`mid-wave-chip ${wave.status === 'active' ? 'is-active' : ''} ${wave.status === 'complete' ? 'is-complete' : ''}`}
          >
            {wave.number} · {wave.label}
          </span>
        ))}
      </nav>

      <MidDashboard data={midData} loading={loading} />
    </div>
  );
}
