import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowRight, CheckCircle, X } from 'lucide-react';
import { auth } from '../config/firebase';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { getInitialForm } from '../services/initialForm';
import { actionCanvasesApi, objectivesApi, teamApi, reportsApi, api } from '../services/api';
import type {
  ActionCanvas,
  InitialFormData,
  Objective,
  TeamMember,
  TeamMemberDevelopmentEntry,
} from '../types';
import { MidDashboard } from '../components/mid/MidDashboard';
import { useCycle } from '../context/CycleContext';
import { buildMidDashboard, getWaveProgressForMid } from '../services/midDashboard';
import type { MemberCheckInSummary } from '../services/midIntelligence';
import type { MidDashboardData } from '../types/mid';

function mapTeamMember(raw: Record<string, unknown>): TeamMember {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? raw.nome ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? raw.cargo ?? ''),
    department: String(raw.department ?? raw.departamento ?? '') || undefined,
    phone: String(raw.phone ?? raw.telefone ?? '') || undefined,
    location: String(raw.location ?? raw.localizacao ?? '') || undefined,
    hireDate: String(raw.hireDate ?? raw.dataContratacao ?? '') || undefined,
    status: (raw.status as TeamMember['status']) || 'active',
    skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : undefined,
    performance: typeof raw.performance === 'number' ? raw.performance : undefined,
    projectsCompleted:
      typeof raw.projectsCompleted === 'number' ? raw.projectsCompleted : undefined,
    userId: raw.userId ? String(raw.userId) : undefined,
  };
}

function summarizeCheckIns(
  member: TeamMember,
  entries: TeamMemberDevelopmentEntry[]
): MemberCheckInSummary {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latest = sorted[0];
  return {
    memberId: member.id,
    memberName: member.name,
    lastAt: latest?.createdAt ?? null,
    latestScore: latest?.score,
    trend: latest?.trend,
  };
}

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
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [postDiagnosticNotice, setPostDiagnosticNotice] = useState(
    () => locationState?.postDiagnosticNotice ?? null
  );
  const [formCompletedAt, setFormCompletedAt] = useState<Date | null>(null);
  const [formData, setFormData] = useState<InitialFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [canvases, setCanvases] = useState<ActionCanvas[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [memberCheckIns, setMemberCheckIns] = useState<MemberCheckInSummary[]>([]);
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
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserId(u?.uid ?? null);
      setUserDisplayName(u?.displayName ?? null);
    });
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
      api.get('/api/me').then((r) => r.data).catch(() => null),
    ])
      .then(async ([form, objs, teamRes, reportsRes, canvasRes, me]) => {
        if (cancelled) return;
        setFormData(form.data);
        setFormCompletedAt(form.completedAt);
        const objList = Array.isArray(objs) ? objs : objs?.items ?? [];
        setObjectives(objList);

        const rawTeam = Array.isArray(teamRes) ? teamRes : teamRes?.items ?? [];
        const mappedTeam = (rawTeam as Record<string, unknown>[]).map(mapTeamMember);
        setTeam(mappedTeam);

        if (me?.displayName) {
          setUserDisplayName(String(me.displayName));
        }

        const checkIns = await Promise.all(
          mappedTeam.slice(0, 40).map(async (member) => {
            try {
              const entries = await teamApi.listDevelopment(member.id);
              return summarizeCheckIns(member, Array.isArray(entries) ? entries : []);
            } catch {
              return summarizeCheckIns(member, []);
            }
          })
        );
        if (!cancelled) setMemberCheckIns(checkIns);

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
        formCompletedAt,
        cycleId: activeCycle?.id,
        cycleLabel: activeCycle?.label,
        cycleCreatedAt: activeCycle?.createdAt,
        userDisplayName,
        memberCheckIns,
        objectives,
        canvases,
        team,
        reports,
      }),
    [
      formData,
      formCompletedAt,
      activeCycle?.id,
      activeCycle?.label,
      activeCycle?.createdAt,
      userDisplayName,
      memberCheckIns,
      objectives,
      canvases,
      team,
      reports,
    ]
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

      <nav className="mid-wave-strip" aria-label="Progresso Sprint Waves">
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
